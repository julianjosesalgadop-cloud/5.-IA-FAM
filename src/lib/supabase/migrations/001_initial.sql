-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- TABLA: perfiles
-- =====================
CREATE TABLE IF NOT EXISTS public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT,
  rol TEXT NOT NULL DEFAULT 'consultor' CHECK (rol IN ('admin', 'analista', 'consultor')),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- TABLA: catalogos
-- =====================
CREATE TABLE IF NOT EXISTS public.catalogos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  valor TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tipo, valor)
);

-- =====================
-- SECUENCIA para número de expediente
-- =====================
CREATE SEQUENCE IF NOT EXISTS expediente_seq_2024 START 1;
CREATE SEQUENCE IF NOT EXISTS expediente_seq_2025 START 1;
CREATE SEQUENCE IF NOT EXISTS expediente_seq_2026 START 1;

CREATE OR REPLACE FUNCTION generate_expediente_number()
RETURNS TEXT AS $$
DECLARE
  year_num INT := EXTRACT(YEAR FROM now());
  seq_num BIGINT;
  seq_name TEXT;
BEGIN
  seq_name := 'expediente_seq_' || year_num;
  -- Create sequence for new year if needed
  EXECUTE 'CREATE SEQUENCE IF NOT EXISTS ' || seq_name || ' START 1';
  EXECUTE 'SELECT nextval($1)' INTO seq_num USING seq_name;
  RETURN 'FAM-' || year_num || '-' || LPAD(seq_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- TABLA: expedientes
-- =====================
CREATE TABLE IF NOT EXISTS public.expedientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_expediente TEXT UNIQUE NOT NULL DEFAULT generate_expediente_number(),

  -- Información general
  fecha_incidente DATE NOT NULL,
  placa TEXT NOT NULL,
  numero_interno TEXT,
  tipo_servicio TEXT,
  propietario TEXT NOT NULL,
  propietarios JSONB DEFAULT '[]'::jsonb,
  tipo_reclamacion TEXT NOT NULL,
  ciudad_origen TEXT,
  ciudad_destino TEXT,
  concepto TEXT,

  -- Información financiera
  valor_cotizacion NUMERIC(15,2),
  valor_negociado NUMERIC(15,2),
  porcentaje_deducible NUMERIC(5,2) CHECK (porcentaje_deducible IN (10, 15, 50)),
  valor_deducible NUMERIC(15,2),
  valor_a_pagar NUMERIC(15,2),
  valor_salvamento NUMERIC(15,2),
  valor_final_aprobado NUMERIC(15,2),
  cotizaciones JSONB DEFAULT '[]'::jsonb,

  -- Conductor
  nombre_conductor TEXT,
  tipo_documento_conductor TEXT CHECK (tipo_documento_conductor IN ('CC', 'CE', 'TI', 'NIT', 'PP')),
  id_conductor TEXT,
  celular_conductor TEXT,
  culpabilidad TEXT CHECK (culpabilidad IN ('Conductor', 'Tercero', 'Compartida', 'Sin definir')),
  valor_descuento_conductor NUMERIC(15,2),
  memorando_descuento TEXT,

  -- Recobros
  valor_recobro_vehiculo NUMERIC(15,2),
  porcentaje_recobro_vehiculo NUMERIC(6,2),
  valor_recobro_abogado NUMERIC(15,2),
  porcentaje_recobro_abogado NUMERIC(6,2),
  valor_recobro_empresa NUMERIC(15,2),
  porcentaje_recobro_empresa NUMERIC(6,2),

  -- Comité de Seguridad Vial
  fecha_comite DATE,
  causa_raiz TEXT,
  observaciones_comite TEXT,
  numero_acta TEXT,

  -- Autorización
  autorizado_por TEXT,
  cargo_autorizador TEXT,
  fecha_autorizacion DATE,
  memorando_pago_nombre TEXT,
  memorando_pago_storage_path TEXT,
  memorando_pago_archivo_nombre TEXT,
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Revisado', 'Aprobado', 'Rechazado')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

-- =====================
-- TABLA: documentos
-- =====================
CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id UUID NOT NULL REFERENCES public.expedientes(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  tipo_documento TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  tamanio_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================
-- TABLA: auditoria
-- =====================
CREATE TABLE IF NOT EXISTS public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id UUID REFERENCES public.expedientes(id),
  usuario_id UUID REFERENCES auth.users(id),
  usuario_email TEXT,
  accion TEXT NOT NULL CHECK (accion IN ('CREAR', 'EDITAR', 'ELIMINAR', 'ESTADO', 'FINANCIERO', 'DOCUMENTO')),
  campo_modificado TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- ÍNDICES
-- =====================
CREATE INDEX IF NOT EXISTS idx_expedientes_placa ON public.expedientes(placa);
CREATE INDEX IF NOT EXISTS idx_expedientes_estado ON public.expedientes(estado);
CREATE INDEX IF NOT EXISTS idx_expedientes_tipo ON public.expedientes(tipo_reclamacion);
CREATE INDEX IF NOT EXISTS idx_expedientes_fecha ON public.expedientes(fecha_incidente);
CREATE INDEX IF NOT EXISTS idx_expedientes_deleted ON public.expedientes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documentos_expediente ON public.documentos(expediente_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_expediente ON public.auditoria(expediente_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON public.auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria(created_at);

-- =====================
-- TRIGGER: updated_at
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_expedientes_updated_at
  BEFORE UPDATE ON public.expedientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- TRIGGER: auto-crear perfil al registrar usuario
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre, rol)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'nombre', COALESCE(new.raw_user_meta_data->>'rol', 'consultor'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =====================
-- ROW LEVEL SECURITY
-- =====================
ALTER TABLE public.expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Políticas expedientes
CREATE POLICY "expedientes_select" ON public.expedientes FOR SELECT TO authenticated USING (
  deleted_at IS NULL OR
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "expedientes_insert" ON public.expedientes FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'analista') AND activo = true)
);
CREATE POLICY "expedientes_update" ON public.expedientes FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'analista') AND activo = true)
);
CREATE POLICY "expedientes_delete" ON public.expedientes FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin' AND activo = true)
);

-- Políticas documentos
CREATE POLICY "documentos_select" ON public.documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "documentos_insert" ON public.documentos FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'analista') AND activo = true)
);
CREATE POLICY "documentos_delete" ON public.documentos FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin' AND activo = true)
);

-- Políticas auditoría
CREATE POLICY "auditoria_select" ON public.auditoria FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "auditoria_insert" ON public.auditoria FOR INSERT TO authenticated WITH CHECK (true);

-- Políticas catálogos
CREATE POLICY "catalogos_select" ON public.catalogos FOR SELECT TO authenticated USING (activo = true);
CREATE POLICY "catalogos_all" ON public.catalogos FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- Políticas perfiles
CREATE POLICY "perfiles_select" ON public.perfiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfiles_update" ON public.perfiles FOR UPDATE TO authenticated USING (
  id = auth.uid() OR EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- =====================
-- STORAGE BUCKET
-- =====================
INSERT INTO storage.buckets (id, name, public) VALUES ('expedientes-documentos', 'expedientes-documentos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'expedientes-documentos');
CREATE POLICY "storage_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'expedientes-documentos' AND
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'analista') AND activo = true)
);
CREATE POLICY "storage_delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'expedientes-documentos' AND
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin' AND activo = true)
);

-- =====================
-- DATOS INICIALES: Catálogos
-- =====================
INSERT INTO public.catalogos (tipo, valor, orden) VALUES
  ('CAUSA_RAIZ', 'Error humano', 1),
  ('CAUSA_RAIZ', 'Exceso de velocidad', 2),
  ('CAUSA_RAIZ', 'Maniobra indebida', 3),
  ('CAUSA_RAIZ', 'Condiciones climáticas', 4),
  ('CAUSA_RAIZ', 'Falla mecánica', 5),
  ('CAUSA_RAIZ', 'Tercero involucrado', 6)
ON CONFLICT (tipo, valor) DO NOTHING;
