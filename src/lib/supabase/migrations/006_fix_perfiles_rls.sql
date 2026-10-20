-- Migration: Fix infinite recursion in perfiles RLS policies
-- ==========================================================

-- 1. Drop all potentially conflicting policies on perfiles
DROP POLICY IF EXISTS "perfiles_select" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_update" ON public.perfiles;
DROP POLICY IF EXISTS "Admin puede gestionar perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.perfiles;
DROP POLICY IF EXISTS "Usuarios pueden marcar contraseña cambiada" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_select_policy" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_insert_policy" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_update_policy" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_delete_policy" ON public.perfiles;

-- 2. Enable RLS
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- 3. Create non-recursive policies
-- SELECT: All authenticated users can view profiles (needed for user lists and headers)
CREATE POLICY "perfiles_select_policy" ON public.perfiles
  FOR SELECT TO authenticated USING (true);

-- INSERT: Only admins can create profiles
CREATE POLICY "perfiles_insert_policy" ON public.perfiles
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- UPDATE: Admins can update any profile, and users can update their own profile
CREATE POLICY "perfiles_update_policy" ON public.perfiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid() OR EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
  )
  WITH CHECK (
    id = auth.uid() OR EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- DELETE: Only admins can delete profiles
CREATE POLICY "perfiles_delete_policy" ON public.perfiles
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
  );
