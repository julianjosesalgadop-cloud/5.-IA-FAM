'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface PasoConfig {
  id: number;
  label: string;
  description: string;
}

export interface CatalogoItem {
  label: string;
  activo: boolean;
  orden: number;
}

export interface CampoConfig {
  label: string;
  placeholder: string;
  visible: boolean;
  requerido: boolean;
}

export interface FormConfig {
  pasos: PasoConfig[];
  tiposReclamacion: CatalogoItem[];
  tiposServicio: CatalogoItem[];
  tiposDocPaso1: { label: string; activo: boolean }[];
  conceptosCotizacion: CatalogoItem[];
  opcionesDeducible: { label: string; value: number; activo: boolean }[];
  culpabilidades: CatalogoItem[];
  causasRaiz: string[]; // string[] for compatibility with ConfiguracionView
  autorizadosPor: { label: string; activo: boolean }[];
  cargos: { label: string; activo: boolean }[];
  campoConfig: Record<string, CampoConfig>;
}

const defaultPasos: PasoConfig[] = [
  { id: 1, label: 'Información General', description: 'Datos del incidente y vehículo' },
  { id: 2, label: 'Datos Financieros', description: 'Valores y deducibles' },
  { id: 3, label: 'Conductor & Recobros', description: 'Responsabilidad y recuperación' },
  { id: 4, label: 'Comité & Autorización', description: 'Seguridad vial y aprobación' },
];

const defaultTiposReclamacion: CatalogoItem[] = [
  { label: 'Siniestro', activo: true, orden: 0 },
  { label: 'Vidrios', activo: true, orden: 1 },
  { label: 'Carrocería', activo: true, orden: 2 },
  { label: 'Repuestos', activo: true, orden: 3 },
  { label: 'Pérdida parcial', activo: true, orden: 4 },
  { label: 'Afectación por orden público', activo: true, orden: 5 },
  { label: 'Otro', activo: true, orden: 6 },
];

const defaultTiposServicio: CatalogoItem[] = [
  { label: 'Intermunicipal', activo: true, orden: 0 },
  { label: 'Especial', activo: true, orden: 1 },
  { label: 'Urbano', activo: true, orden: 2 },
  { label: 'Otro', activo: true, orden: 3 },
];

const defaultTiposDocPaso1 = [
  { label: 'Solicitud', activo: true },
  { label: 'Documento Vario', activo: true },
];

const defaultConceptosCot: CatalogoItem[] = [
  { label: 'SINIESTRO', activo: true, orden: 0 },
  { label: 'FACTURA', activo: true, orden: 1 },
  { label: 'ELECTRICO', activo: true, orden: 2 },
  { label: 'LLANTAS', activo: true, orden: 3 },
  { label: 'PANORAMICO', activo: true, orden: 4 },
  { label: 'PARABRISAS', activo: true, orden: 5 },
  { label: 'INSTALACIÓN', activo: true, orden: 6 },
  { label: 'VIDRIOS', activo: true, orden: 7 },
  { label: 'ESPEJOS', activo: true, orden: 8 },
  { label: 'OTROS', activo: true, orden: 9 },
];

const defaultDeducibles = [
  { label: '50%', value: 50, activo: true },
  { label: '15%', value: 15, activo: true },
  { label: '10%', value: 10, activo: true },
];

const defaultCulpabilidades: CatalogoItem[] = [
  { label: 'Conductor', activo: true, orden: 0 },
  { label: 'Tercero', activo: true, orden: 1 },
  { label: 'Compartida', activo: true, orden: 2 },
  { label: 'Sin definir', activo: true, orden: 3 },
];

const defaultCausasRaiz = [
  'Error humano',
  'Exceso de velocidad',
  'Maniobra indebida',
  'Condiciones climáticas',
  'Falla mecánica',
  'Tercero involucrado',
];

const defaultAutorizadosPor = [
  { label: 'MARTHA BIBIANA RINCON REYES', activo: true },
];

const defaultCargos = [
  { label: 'GERENTE ADMINISTRATIVA Y FINANCIERA', activo: true },
];

const defaultCamposConfig: Record<string, CampoConfig> = {
  // Paso 1
  fecha_incidente: { label: 'Fecha del Incidente', placeholder: '', visible: true, requerido: true },
  placa: { label: 'Placa', placeholder: 'Ej: ABC123', visible: true, requerido: true },
  numero_interno: { label: 'Número Interno', placeholder: 'Ej: 1024', visible: true, requerido: true },
  tipo_servicio: { label: 'Tipo de Servicio', placeholder: '', visible: true, requerido: true },
  propietarios: { label: 'Propietarios', placeholder: '', visible: true, requerido: true },
  tipo_reclamacion: { label: 'Tipo de Reclamación', placeholder: '', visible: true, requerido: true },
  ciudad_origen: { label: 'Ciudad Origen', placeholder: 'Ej: Sogamoso', visible: true, requerido: false },
  ciudad_destino: { label: 'Ciudad Destino', placeholder: 'Ej: Bogotá', visible: true, requerido: false },
  concepto: { label: 'Concepto / Descripción', placeholder: 'Escriba una descripción...', visible: true, requerido: false },
  
  // Paso 2
  cotizaciones_proveedor: { label: 'Taller / Proveedor', placeholder: 'Ej: Talleres Unidos', visible: true, requerido: true },
  cotizaciones_tipo_documento: { label: 'Tipo de Documento', placeholder: '', visible: true, requerido: false },
  cotizaciones_numero_documento: { label: 'Número de Documento', placeholder: 'Número de doc', visible: true, requerido: false },
  valor_cotizacion: { label: 'Valor Cotización', placeholder: '$ 0', visible: true, requerido: false },
  valor_negociado: { label: 'Valor Negociado', placeholder: '$ 0', visible: true, requerido: false },
  valor_salvamento: { label: 'Valor Salvamento', placeholder: '$ 0', visible: true, requerido: false },
  valor_final_aprobado: { label: 'Valor Final Aprobado', placeholder: '$ 0', visible: true, requerido: false },

  // Paso 3
  nombre_conductor: { label: 'Nombre Conductor', placeholder: 'Nombre completo', visible: true, requerido: false },
  id_conductor: { label: 'Número de Documento', placeholder: 'Cédula o nit', visible: true, requerido: false },
  celular_conductor: { label: 'Celular', placeholder: 'Ej: 310...', visible: true, requerido: false },
  culpabilidad: { label: 'Culpabilidad', placeholder: '', visible: true, requerido: false },
  valor_descuento_conductor: { label: 'Descuento Conductor', placeholder: '$ 0', visible: true, requerido: false },
  memorando_descuento: { label: 'N° Memorando Descuento', placeholder: 'Ej: MEMO-001', visible: true, requerido: false },
  recobro_vehiculo: { label: 'Recobro Vehículo', placeholder: '$ 0', visible: true, requerido: false },
  recobro_abogado: { label: 'Recobro Abogado', placeholder: '$ 0', visible: true, requerido: false },
  recobro_empresa: { label: 'Recobro Empresa', placeholder: '$ 0', visible: true, requerido: false },

  // Paso 4
  fecha_comite: { label: 'Fecha Comité', placeholder: '', visible: true, requerido: false },
  numero_acta: { label: 'Número Acta', placeholder: 'Ej: ACTA 0001', visible: true, requerido: false },
  causa_raiz: { label: 'Causa Raíz', placeholder: '', visible: true, requerido: false },
  observaciones_comite: { label: 'Observaciones', placeholder: 'Observaciones...', visible: true, requerido: false },
  autorizado_por: { label: 'Autorizado Por', placeholder: '', visible: true, requerido: false },
  cargo_autorizador: { label: 'Cargo', placeholder: '', visible: true, requerido: false },
  fecha_autorizacion: { label: 'Fecha Autorización', placeholder: '', visible: true, requerido: false },
  memorando_pago_nombre: { label: 'Nombre Memorando Pago', placeholder: 'Ej: MEMO-PAGO-001', visible: true, requerido: false },
  memorando_pago_archivo: { label: 'PDF Memorando de Pago', placeholder: '', visible: true, requerido: false },
};

export function useFormConfig() {
  const [config, setConfig] = useState<FormConfig>({
    pasos: defaultPasos,
    tiposReclamacion: defaultTiposReclamacion,
    tiposServicio: defaultTiposServicio,
    tiposDocPaso1: defaultTiposDocPaso1,
    conceptosCotizacion: defaultConceptosCot,
    opcionesDeducible: defaultDeducibles,
    culpabilidades: defaultCulpabilidades,
    causasRaiz: defaultCausasRaiz,
    autorizadosPor: defaultAutorizadosPor,
    cargos: defaultCargos,
    campoConfig: defaultCamposConfig,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        const IS_MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
        let dbConfigs: Record<string, any> = {};

        if (!IS_MOCK_MODE) {
          try {
            const supabase = createClient();
            const { data, error } = await supabase
              .from('catalogos')
              .select('tipo, valor')
              .in('tipo', [
                'fam_config_pasos_form',
                'fam_config_tipos_reclamacion',
                'fam_config_tipos_servicio',
                'fam_config_tipos_doc_paso1',
                'fam_config_conceptos_cot',
                'fam_config_deducibles',
                'fam_config_culpabilidades',
                'fam_config_causas',
                'fam_config_autorizados_por',
                'fam_config_cargos',
                'fam_config_campos'
              ]);
            
            if (!error && data) {
              (data as any[]).forEach((row: any) => {
                try {
                  dbConfigs[row.tipo] = JSON.parse(row.valor);
                } catch (e) {
                  console.error('Error parsing config row', row.tipo, e);
                }
              });
            }
          } catch (dbErr) {
            console.error('Error querying catalogos table from Supabase:', dbErr);
          }
        }

        const getJSON = <T>(key: string, fallback: T): T => {
          if (dbConfigs[key] !== undefined) return dbConfigs[key] as T;
          if (typeof window === 'undefined') return fallback;
          const stored = localStorage.getItem(key);
          if (!stored) return fallback;
          try {
            return JSON.parse(stored) as T;
          } catch {
            return fallback;
          }
        };

        const storedPasos = getJSON<PasoConfig[]>('fam_config_pasos_form', defaultPasos);
        const storedTiposReclamacion = getJSON<CatalogoItem[]>('fam_config_tipos_reclamacion', defaultTiposReclamacion);
        const storedTiposServicio = getJSON<CatalogoItem[]>('fam_config_tipos_servicio', defaultTiposServicio);
        const storedTiposDocPaso1 = getJSON<{ label: string; activo: boolean }[]>('fam_config_tipos_doc_paso1', defaultTiposDocPaso1);
        const storedConceptosCot = getJSON<CatalogoItem[]>('fam_config_conceptos_cot', defaultConceptosCot);
        const storedDeducibles = getJSON<{ label: string; value: number; activo: boolean }[]>('fam_config_deducibles', defaultDeducibles);
        const storedCulpabilidades = getJSON<CatalogoItem[]>('fam_config_culpabilidades', defaultCulpabilidades);
        
        let storedCausasRaiz = defaultCausasRaiz;
        if (dbConfigs['fam_config_causas'] !== undefined) {
          storedCausasRaiz = dbConfigs['fam_config_causas'];
        } else if (typeof window !== 'undefined') {
          const rawCausas = localStorage.getItem('fam_config_causas');
          if (rawCausas) {
            try {
              const parsed = JSON.parse(rawCausas);
              if (Array.isArray(parsed)) {
                if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
                  storedCausasRaiz = parsed.map((item: any) => typeof item === 'string' ? item : item.label);
                } else {
                  storedCausasRaiz = parsed as string[];
                }
              }
            } catch (e) {
              console.error('Error parsing fam_config_causas:', e);
            }
          }
        }

        const storedAutorizadosPor = getJSON<{ label: string; activo: boolean }[]>('fam_config_autorizados_por', defaultAutorizadosPor);
        const storedCargos = getJSON<{ label: string; activo: boolean }[]>('fam_config_cargos', defaultCargos);
        
        const rawCampos = getJSON<Record<string, CampoConfig>>('fam_config_campos', defaultCamposConfig);
        const storedCampos = { ...defaultCamposConfig, ...rawCampos };

        setConfig({
          pasos: storedPasos,
          tiposReclamacion: storedTiposReclamacion,
          tiposServicio: storedTiposServicio,
          tiposDocPaso1: storedTiposDocPaso1,
          conceptosCotizacion: storedConceptosCot,
          opcionesDeducible: storedDeducibles,
          culpabilidades: storedCulpabilidades,
          causasRaiz: storedCausasRaiz,
          autorizadosPor: storedAutorizadosPor,
          cargos: storedCargos,
          campoConfig: storedCampos,
        });
      } catch (err) {
        console.error('Error loading form configuration:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConfiguration();
  }, []);

  const saveConfig = (key: string, value: any) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
      
      setConfig((prev) => {
        const updated = { ...prev };
        if (key === 'fam_config_pasos_form') updated.pasos = value;
        else if (key === 'fam_config_tipos_reclamacion') updated.tiposReclamacion = value;
        else if (key === 'fam_config_tipos_servicio') updated.tiposServicio = value;
        else if (key === 'fam_config_tipos_doc_paso1') updated.tiposDocPaso1 = value;
        else if (key === 'fam_config_conceptos_cot') updated.conceptosCotizacion = value;
        else if (key === 'fam_config_deducibles') updated.opcionesDeducible = value;
        else if (key === 'fam_config_culpabilidades') updated.culpabilidades = value;
        else if (key === 'fam_config_causas') updated.causasRaiz = value;
        else if (key === 'fam_config_autorizados_por') updated.autorizadosPor = value;
        else if (key === 'fam_config_cargos') updated.cargos = value;
        else if (key === 'fam_config_campos') updated.campoConfig = value;
        return updated;
      });

      // Background save to database if not in mock mode
      const IS_MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
      if (!IS_MOCK_MODE) {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            // Read active profile to verify admin role
            supabase
              .from('perfiles')
              .select('rol')
              .eq('id', user.id)
              .single()
              .then(({ data: profile }) => {
                if (profile && (profile as any).rol === 'admin') {
                  // Delete old key and insert new config value
                  supabase
                    .from('catalogos')
                    .delete()
                    .eq('tipo', key)
                    .then(() => {
                      supabase
                        .from('catalogos')
                        .insert({
                          tipo: key,
                          valor: JSON.stringify(value),
                          activo: true,
                          orden: 0
                        } as any)
                        .then(({ error }) => {
                          if (error) {
                            console.error('Error writing config to database:', error);
                          }
                        });
                    });
                }
              });
          }
        });
      }
    } catch (err) {
      console.error('Error saving form configuration:', err);
    }
  };

  return {
    ...config,
    loading,
    saveConfig,
  };
}
