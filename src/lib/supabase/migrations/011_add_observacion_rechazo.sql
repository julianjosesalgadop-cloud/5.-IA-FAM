-- Migration: Add observacion_rechazo to public.expedientes table
ALTER TABLE public.expedientes ADD COLUMN IF NOT EXISTS observacion_rechazo TEXT;

-- Notify postgrest/Supabase to reload schema cache
NOTIFY pgrst, 'reload schema';
