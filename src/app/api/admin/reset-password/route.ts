import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    throw new Error('Supabase admin credentials not configured.');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the requesting user is an admin
    const supabase = await createServerClient();
    const {
      data: { user: requestingUser },
    } = await supabase.auth.getUser();

    if (!requestingUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', requestingUser.id)
      .single();

    if ((profile as any)?.rol !== 'admin') {
      return NextResponse.json({ error: 'Permisos insuficientes. Se requiere rol administrador.' }, { status: 403 });
    }

    // 2. Parse payload
    const body = await request.json();
    const { userId, newPassword, mustChangePassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Campos requeridos: userId, newPassword.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener mínimo 6 caracteres.' }, { status: 400 });
    }

    // 3. Update password directly via Admin API (no email required)
    const adminClient = createAdminClient();
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 4. Update must_change_password flag in perfiles table
    const { error: perfilError } = await adminClient
      .from('perfiles')
      .update({ must_change_password: mustChangePassword ?? false } as any)
      .eq('id', userId);

    if (perfilError) {
      console.warn('[reset-password] Could not update must_change_password flag:', perfilError.message);
      // Not a fatal error — password was already changed
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[reset-password]', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
