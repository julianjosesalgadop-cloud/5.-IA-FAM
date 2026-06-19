-- =============================================
-- MIGRACIÓN 003: Gestión avanzada de usuarios
-- Campos: cargo, numero_documento, must_change_password
-- =============================================

-- Agregar campo: cargo del usuario
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS cargo TEXT;

-- Agregar campo: número de documento de identidad
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS numero_documento TEXT;

-- Agregar campo: flag para forzar cambio de contraseña en el próximo inicio de sesión
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Actualizar la política de RLS para que el admin pueda actualizar todos los perfiles
-- (incluyendo los nuevos campos)
DROP POLICY IF EXISTS "Admin puede gestionar perfiles" ON public.perfiles;
CREATE POLICY "Admin puede gestionar perfiles"
  ON public.perfiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );

-- Política para que cada usuario pueda leer su propio perfil
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.perfiles;
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON public.perfiles
  FOR SELECT
  USING (id = auth.uid());

-- Política para que cada usuario pueda actualizar su own must_change_password (cuando cambia su contraseña)
DROP POLICY IF EXISTS "Usuarios pueden marcar contraseña cambiada" ON public.perfiles;
CREATE POLICY "Usuarios pueden marcar contraseña cambiada"
  ON public.perfiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

COMMENT ON COLUMN public.perfiles.cargo IS 'Cargo o puesto del usuario dentro de la organización';
COMMENT ON COLUMN public.perfiles.numero_documento IS 'Número de documento de identidad del usuario';
COMMENT ON COLUMN public.perfiles.must_change_password IS 'Si es TRUE, el usuario debe cambiar su contraseña al próximo inicio de sesión';
