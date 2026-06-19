import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Admin client that uses the service role key — ONLY runs on the server
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
    const { email, password, nombre, rol, cargo, numero_documento, must_change_password } = body;

    if (!email || !password || !nombre || !rol) {
      return NextResponse.json({ error: 'Campos requeridos: email, password, nombre, rol.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener mínimo 6 caracteres.' }, { status: 400 });
    }

    // 3. Create user in Supabase Auth using Admin API
    const adminClient = createAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Mark as confirmed — no email needed
      user_metadata: { nombre, rol },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'No se pudo crear el usuario.' }, { status: 500 });
    }

    // 4. Insert profile in perfiles table
    const { data: perfilData, error: perfilError } = await adminClient
      .from('perfiles')
      .insert({
        id: authData.user.id,
        email,
        nombre,
        rol,
        cargo: cargo || null,
        numero_documento: numero_documento || null,
        activo: true,
        must_change_password: must_change_password ?? false,
      } as any)
      .select()
      .single();

    if (perfilError) {
      // Rollback: delete auth user if profile insert fails
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: `Error creando perfil: ${perfilError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, perfil: perfilData }, { status: 201 });
  } catch (err: any) {
    console.error('[create-user]', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
