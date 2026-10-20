-- ==========================================
-- TABLA: ingresos_fam
-- Registro y control de ingresos mensuales FAM
-- Reemplazo de archivo Excel Ingresos FAM 2025-2026
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ingresos_fam (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  mes_nombre TEXT NOT NULL,
  valor NUMERIC(15,2) NOT NULL DEFAULT 0,
  concepto TEXT DEFAULT 'Aportes Mensuales FAM',
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT uq_ingresos_fam_anio_mes UNIQUE(anio, mes)
);

CREATE INDEX IF NOT EXISTS idx_ingresos_fam_anio ON public.ingresos_fam(anio);
CREATE INDEX IF NOT EXISTS idx_ingresos_fam_mes ON public.ingresos_fam(mes);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_ingresos_fam_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ingresos_fam_updated_at ON public.ingresos_fam;
CREATE TRIGGER trigger_update_ingresos_fam_updated_at
  BEFORE UPDATE ON public.ingresos_fam
  FOR EACH ROW EXECUTE FUNCTION update_ingresos_fam_updated_at();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- Solo visible y editable por Administrador y Analista
-- ==========================================
ALTER TABLE public.ingresos_fam ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ingresos_fam_select" ON public.ingresos_fam;
CREATE POLICY "ingresos_fam_select" ON public.ingresos_fam FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'analista') AND activo = true)
);

DROP POLICY IF EXISTS "ingresos_fam_insert" ON public.ingresos_fam;
CREATE POLICY "ingresos_fam_insert" ON public.ingresos_fam FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'analista') AND activo = true)
);

DROP POLICY IF EXISTS "ingresos_fam_update" ON public.ingresos_fam;
CREATE POLICY "ingresos_fam_update" ON public.ingresos_fam FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'analista') AND activo = true)
);

DROP POLICY IF EXISTS "ingresos_fam_delete" ON public.ingresos_fam;
CREATE POLICY "ingresos_fam_delete" ON public.ingresos_fam FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'analista') AND activo = true)
);

-- ==========================================
-- DATOS INICIALES EXCEL: 2025 y 2026
-- ==========================================
INSERT INTO public.ingresos_fam (anio, mes, mes_nombre, valor, concepto) VALUES
  (2025, 1, 'Enero', 211667972, 'Aportes Mensuales FAM'),
  (2025, 2, 'Febrero', 203140363, 'Aportes Mensuales FAM'),
  (2025, 3, 'Marzo', 204418961, 'Aportes Mensuales FAM'),
  (2025, 4, 'Abril', 205323061, 'Aportes Mensuales FAM'),
  (2025, 5, 'Mayo', 200077286, 'Aportes Mensuales FAM'),
  (2025, 6, 'Junio', 200227722, 'Aportes Mensuales FAM'),
  (2025, 7, 'Julio', 197096022, 'Aportes Mensuales FAM'),
  (2025, 8, 'Agosto', 197736597, 'Aportes Mensuales FAM'),
  (2025, 9, 'Septiembre', 192642742, 'Aportes Mensuales FAM'),
  (2025, 10, 'Octubre', 190050340, 'Aportes Mensuales FAM'),
  (2025, 11, 'Noviembre', 190625812, 'Aportes Mensuales FAM'),
  (2025, 12, 'Diciembre', 205896275, 'Aportes Mensuales FAM'),
  (2026, 1, 'Enero', 203926938, 'Aportes Mensuales FAM'),
  (2026, 2, 'Febrero', 201609101, 'Aportes Mensuales FAM'),
  (2026, 3, 'Marzo', 203342553, 'Aportes Mensuales FAM'),
  (2026, 4, 'Abril', 205968914, 'Aportes Mensuales FAM'),
  (2026, 5, 'Mayo', 206231552, 'Aportes Mensuales FAM'),
  (2026, 6, 'Junio', 200453564, 'Aportes Mensuales FAM'),
  (2026, 7, 'Julio', 198089841, 'Aportes Mensuales FAM'),
  (2026, 8, 'Agosto', 198089841, 'Aportes Mensuales FAM')
ON CONFLICT (anio, mes) DO UPDATE SET
  valor = EXCLUDED.valor,
  mes_nombre = EXCLUDED.mes_nombre,
  concepto = EXCLUDED.concepto;
