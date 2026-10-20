import { NextRequest, NextResponse } from 'next/server';
import { onedriveService } from '@/lib/services/onedriveService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    const customFileName = searchParams.get('fileName');

    if (!itemId) {
      return new NextResponse('Falta itemId.', { status: 400 });
    }

    const { stream, contentType, fileName } = await onedriveService.getFileStream(itemId);
    const finalFileName = customFileName || fileName;

    return new NextResponse(stream, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(finalFileName)}"`,
      },
    });
  } catch (error: any) {
    console.error('Error en API download OneDrive:', error);
    return new NextResponse(error?.message || 'Error interno al descargar de OneDrive', { status: 500 });
  }
}
