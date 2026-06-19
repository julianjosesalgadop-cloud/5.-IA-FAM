-- Migration: Fix RLS policies for expedientes selection and auditoria visibility
-- =========================================================================

-- 1. Drop and recreate expedientes SELECT policy to ensure all roles can view all active cases
DROP POLICY IF EXISTS "expedientes_select" ON public.expedientes;
CREATE POLICY "expedientes_select" ON public.expedientes
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

-- 2. Drop and recreate auditoria SELECT policy to allow all authenticated users to see the change history
DROP POLICY IF EXISTS "auditoria_select" ON public.auditoria;
CREATE POLICY "auditoria_select" ON public.auditoria
  FOR SELECT TO authenticated USING (true);
