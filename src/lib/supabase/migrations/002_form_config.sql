-- ==========================================
-- MIGRACIÓN 002: TABLA DE CONFIGURACIÓN DE CAMPOS Y SEMILLAS DE CATÁLOGOS
-- ==========================================

-- 1. Crear la tabla de configuración de campos
CREATE TABLE IF NOT EXISTS public.campos_configuracion (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  placeholder TEXT,
  visible BOOLEAN NOT NULL DEFAULT true,
  requerido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.campos_configuracion ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad para campos_configuracion
DROP POLICY IF EXISTS "campos_config_select" ON public.campos_configuracion;
CREATE POLICY "campos_config_select" ON public.campos_configuracion 
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "campos_config_all" ON public.campos_configuracion;
CREATE POLICY "campos_config_all" ON public.campos_configuracion 
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin' AND activo = true)
  );

-- Eliminar configuración con claves obsoletas si existen
DELETE FROM public.campos_configuracion WHERE id IN ('recobro_vehiculo', 'recobro_abogado', 'recobro_empresa');

-- 2. Insertar valores iniciales para configuración de campos (valores por defecto)
INSERT INTO public.campos_configuracion (id, label, placeholder, visible, requerido) VALUES
  ('fecha_incidente', 'Fecha del Incidente', '', true, true),
  ('placa', 'Placa', 'Ej: ABC123', true, true),
  ('numero_interno', 'Número Interno', 'Ej: 1024', true, true),
  ('tipo_servicio', 'Tipo de Servicio', '', true, true),
  ('propietarios', 'Propietarios', '', true, true),
  ('tipo_reclamacion', 'Tipo de Reclamación', '', true, true),
  ('ciudad_origen', 'Ciudad Origen', 'Ej: Sogamoso', true, false),
  ('ciudad_destino', 'Ciudad Destino', 'Ej: Bogotá', true, false),
  ('concepto', 'Concepto / Descripción', 'Escriba una descripción...', true, false),
  ('cotizaciones_proveedor', 'Taller / Proveedor', 'Ej: Talleres Unidos', true, true),
  ('cotizaciones_tipo_documento', 'Tipo de Documento', '', true, false),
  ('cotizaciones_numero_documento', 'Número de Documento', 'Número de doc', true, false),
  ('valor_cotizacion', 'Valor Cotización', '$ 0', true, false),
  ('valor_negociado', 'Valor Negociado', '$ 0', true, false),
  ('valor_deducible', 'Valor Deducible', '$ 0', true, false),
  ('valor_a_pagar', 'Valor a Pagar', '$ 0', true, false),
  ('valor_salvamento', 'Valor Salvamento', '$ 0', true, false),
  ('valor_final_aprobado', 'Valor Final Aprobado', '$ 0', true, false),
  ('nombre_conductor', 'Nombre Conductor', 'Nombre completo', true, false),
  ('id_conductor', 'Número de Documento', 'Cédula o nit', true, false),
  ('celular_conductor', 'Celular', 'Ej: 310...', true, false),
  ('culpabilidad', 'Culpabilidad', '', true, false),
  ('valor_descuento_conductor', 'Descuento Conductor', '$ 0', true, false),
  ('memorando_descuento', 'N° Memorando Descuento', 'Ej: MEMO-001', true, false),
  ('valor_recobro_vehiculo', 'Recobro Vehículo', '$ 0', true, false),
  ('valor_recobro_abogado', 'Recobro Abogado', '$ 0', true, false),
  ('valor_recobro_empresa', 'Recobro Empresa', '$ 0', true, false),
  ('fecha_comite', 'Fecha Comité', '', true, false),
  ('numero_acta', 'Número Acta', 'Ej: ACTA 0001', true, false),
  ('causa_raiz', 'Causa Raíz', '', true, false),
  ('observaciones_comite', 'Observaciones', 'Observaciones...', true, false),
  ('autorizado_por', 'Autorizado Por', '', true, false),
  ('cargo_autorizador', 'Cargo', '', true, false),
  ('fecha_autorizacion', 'Fecha Autorización', '', true, false),
  ('memorando_pago_nombre', 'Nombre Memorando Pago', 'Ej: MEMO-PAGO-001', true, false),
  ('memorando_pago_archivo', 'PDF Memorando de Pago', '', true, false)
ON CONFLICT (id) DO UPDATE 
SET label = EXCLUDED.label, 
    placeholder = EXCLUDED.placeholder, 
    visible = EXCLUDED.visible, 
    requerido = EXCLUDED.requerido;

-- 3. Insertar semillas de catálogos en la tabla catalogos
INSERT INTO public.catalogos (tipo, valor, orden, activo) VALUES
  -- Tipos de Reclamación
  ('TIPO_RECLAMACION', 'Siniestro', 0, true),
  ('TIPO_RECLAMACION', 'Vidrios', 1, true),
  ('TIPO_RECLAMACION', 'Carrocería', 2, true),
  ('TIPO_RECLAMACION', 'Repuestos', 3, true),
  ('TIPO_RECLAMACION', 'Pérdida parcial', 4, true),
  ('TIPO_RECLAMACION', 'Afectación por orden público', 5, true),
  ('TIPO_RECLAMACION', 'Otro', 6, true),
  
  -- Tipos de Servicio
  ('TIPO_SERVICIO', 'Intermunicipal', 0, true),
  ('TIPO_SERVICIO', 'Especial', 1, true),
  ('TIPO_SERVICIO', 'Urbano', 2, true),
  ('TIPO_SERVICIO', 'Otro', 3, true),

  -- Tipos de Documento Paso 1
  ('TIPO_DOC_PASO1', 'Solicitud', 0, true),
  ('TIPO_DOC_PASO1', 'Documento Vario', 1, true),

  -- Conceptos Cotización
  ('CONCEPTO_COTIZACION', 'SINIESTRO', 0, true),
  ('CONCEPTO_COTIZACION', 'FACTURA', 1, true),
  ('CONCEPTO_COTIZACION', 'ELECTRICO', 2, true),
  ('CONCEPTO_COTIZACION', 'LLANTAS', 3, true),
  ('CONCEPTO_COTIZACION', 'PANORAMICO', 4, true),
  ('CONCEPTO_COTIZACION', 'PARABRISAS', 5, true),
  ('CONCEPTO_COTIZACION', 'INSTALACIÓN', 6, true),
  ('CONCEPTO_COTIZACION', 'VIDRIOS', 7, true),
  ('CONCEPTO_COTIZACION', 'ESPEJOS', 8, true),
  ('CONCEPTO_COTIZACION', 'OTROS', 9, true),

  -- Opciones Deducible
  ('OPCIONES_DEDUCIBLE', '50%', 50, true),
  ('OPCIONES_DEDUCIBLE', '15%', 15, true),
  ('OPCIONES_DEDUCIBLE', '10%', 10, true),

  -- Culpabilidad
  ('CULPABILIDAD', 'Conductor', 0, true),
  ('CULPABILIDAD', 'Tercero', 1, true),
  ('CULPABILIDAD', 'Compartida', 2, true),
  ('CULPABILIDAD', 'Sin definir', 3, true),

  -- Causas Raíz
  ('CAUSA_RAIZ', 'Error humano', 0, true),
  ('CAUSA_RAIZ', 'Exceso de velocidad', 1, true),
  ('CAUSA_RAIZ', 'Maniobra indebida', 2, true),
  ('CAUSA_RAIZ', 'Condiciones climáticas', 3, true),
  ('CAUSA_RAIZ', 'Falla mecánica', 4, true),
  ('CAUSA_RAIZ', 'Tercero involucrado', 5, true),

  -- Autorizado Por
  ('AUTORIZADO_POR', 'MARTHA BIBIANA RINCON REYES', 0, true),

  -- Cargo Autorizador
  ('CARGO_AUTORIZADOR', 'GERENTE ADMINISTRATIVA Y FINANCIERA', 0, true),

  -- Pasos de Formulario
  ('PASO_FORMULARIO', '{"label": "Información General", "description": "Datos del incidente y vehículo"}', 1, true),
  ('PASO_FORMULARIO', '{"label": "Datos Financieros", "description": "Valores y deducibles"}', 2, true),
  ('PASO_FORMULARIO', '{"label": "Conductor & Recobros", "description": "Responsabilidad y recuperación"}', 3, true),
  ('PASO_FORMULARIO', '{"label": "Comité & Autorización", "description": "Seguridad vial y aprobación"}', 4, true)
ON CONFLICT (tipo, valor) DO NOTHING;
