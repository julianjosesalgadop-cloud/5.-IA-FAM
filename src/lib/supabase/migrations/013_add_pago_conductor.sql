-- ===============================================================
-- MIGRACIÓN 013: Agregar columnas de pago de conductor a expedientes
-- ===============================================================

ALTER TABLE public.expedientes 
  ADD COLUMN IF NOT EXISTS estado_pago_conductor TEXT CHECK (estado_pago_conductor IN ('Pendiente', 'Pagado')),
  ADD COLUMN IF NOT EXISTS fecha_pago_conductor DATE,
  ADD COLUMN IF NOT EXISTS soporte_pago_conductor TEXT;

-- Notificar a Supabase / PostgREST para recargar la caché del esquema
NOTIFY pgrst, 'reload schema';
