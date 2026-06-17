import { NextRequest, NextResponse } from 'next/server';
import { onedriveService } from '@/lib/services/onedriveService';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return new NextResponse('Falta itemId.', { status: 400 });
    }

    await onedriveService.deleteFile(itemId);
    return new NextResponse('Archivo eliminado de OneDrive.', { status: 200 });
  } catch (error: any) {
    console.error('Error en API delete OneDrive:', error);
    return new NextResponse(error?.message || 'Error interno al eliminar de OneDrive', { status: 500 });
  }
}
