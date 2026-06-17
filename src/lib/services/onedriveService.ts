const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const ONEDRIVE_USER = 'auxsistemas@flotasugamuxisa.com.co';

async function getAccessToken(): Promise<string> {
  // Clean quotes from environment variables if any
  const clientId = AZURE_CLIENT_ID?.replace(/"/g, '') || '';
  const clientSecret = AZURE_CLIENT_SECRET?.replace(/"/g, '') || '';
  const tenantId = AZURE_TENANT_ID?.replace(/"/g, '') || '';

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Las variables de entorno de Azure/OneDrive no están completamente configuradas.');
  }

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    scope: 'https://graph.microsoft.com/.default',
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`Error al obtener token de Azure AD: ${JSON.stringify(errData)}`);
  }

  const data = await res.json();
  return data.access_token;
}

export const onedriveService = {
  uploadFile: async (fileBuffer: Buffer, fileName: string, expedienteId: string): Promise<{ itemId: string; storagePath: string }> => {
    const token = await getAccessToken();
    
    // Sanitize the filename to avoid OData URL parsing issues (e.g. parentheses or spaces in path)
    const cleanFileName = fileName
      .replace(/[\s()\[\]]/g, '_') // Replace spaces, (), [] with underscores
      .replace(/[^a-zA-Z0-9._-]/g, ''); // Keep only safe chars

    // Graph PUT API supports files up to 250MB in a single request.
    const sanitizedFileName = encodeURIComponent(cleanFileName);
    const path = `SIGFAM/expedientes/${expedienteId}/${sanitizedFileName}`;
    const url = `https://graph.microsoft.com/v1.0/users/${ONEDRIVE_USER}/drive/root:/${path}:/content`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(fileBuffer),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error al subir a OneDrive (Graph API): ${errText}`);
    }

    const data = await res.json();
    return {
      itemId: data.id,
      storagePath: `onedrive:${data.id}`,
    };
  },

  deleteFile: async (itemId: string): Promise<void> => {
    const token = await getAccessToken();
    const url = `https://graph.microsoft.com/v1.0/users/${ONEDRIVE_USER}/drive/items/${itemId}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok && res.status !== 404) {
      const errText = await res.text();
      throw new Error(`Error al eliminar de OneDrive (Graph API): ${errText}`);
    }
  },

  getFileStream: async (itemId: string): Promise<{ stream: ReadableStream; contentType: string; fileName: string }> => {
    const token = await getAccessToken();
    
    // 1. Get file metadata
    const metaUrl = `https://graph.microsoft.com/v1.0/users/${ONEDRIVE_USER}/drive/items/${itemId}`;
    const metaRes = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!metaRes.ok) {
      throw new Error(`Error al obtener metadatos de OneDrive: ${await metaRes.text()}`);
    }
    const metaData = await metaRes.json();
    const fileName = metaData.name || 'documento.pdf';
    const contentType = metaData.file?.mimeType || 'application/pdf';

    // 2. Get file content
    const contentUrl = `https://graph.microsoft.com/v1.0/users/${ONEDRIVE_USER}/drive/items/${itemId}/content`;
    const contentRes = await fetch(contentUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!contentRes.ok) {
      throw new Error(`Error al descargar contenido de OneDrive: ${await contentRes.text()}`);
    }

    if (!contentRes.body) {
      throw new Error('El cuerpo de respuesta de descarga está vacío.');
    }

    return {
      stream: contentRes.body,
      contentType,
      fileName,
    };
  },
};
