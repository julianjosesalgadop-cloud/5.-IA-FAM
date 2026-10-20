import { NextRequest, NextResponse } from 'next/server';
import { onedriveService } from '@/lib/services/onedriveService';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const expedienteId = formData.get('expedienteId') as string;
    const numeroExpediente = formData.get('numeroExpediente') as string;

    if (!file || !expedienteId) {
      return new NextResponse('Datos insuficientes.', { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use human-readable numeroExpediente (e.g. FAM-2026-001) if available, otherwise fall back to UUID
    const folderName = numeroExpediente || expedienteId;

    const result = await onedriveService.uploadFile(buffer, file.name, folderName);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en API upload OneDrive:', error);
    return new NextResponse(error?.message || 'Error interno en carga de OneDrive', { status: 500 });
  }
}
