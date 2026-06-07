import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const IS_MOCK_MODE =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('your-anon-key');

  if (IS_MOCK_MODE) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: any) {
          cookiesToSet.forEach((c: any) => request.cookies.set(c.name, c.value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach((c: any) => supabaseResponse.cookies.set(c.name, c.value, c.options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/expedientes') ||
    request.nextUrl.pathname.startsWith('/reportes') ||
    request.nextUrl.pathname.startsWith('/configuracion') ||
    request.nextUrl.pathname.startsWith('/auditoria');

  if (!user && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
