'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

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
  claseVehiculo: CatalogoItem[];
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

const defaultClasesVehiculo: CatalogoItem[] = [
  { label: 'Bus', activo: true, orden: 0 },
  { label: 'Buseta', activo: true, orden: 1 },
  { label: 'Microbus', activo: true, orden: 2 },
  { label: 'Camioneta', activo: true, orden: 3 },
  { label: 'Servicio Especial', activo: true, orden: 4 },
  { label: 'Otro (Cúal...)', activo: true, orden: 5 },
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
  clase_vehiculo: { label: 'Clase de Vehículo', placeholder: '', visible: true, requerido: true },
  clase_vehiculo_otro: { label: 'Clase de Vehículo (Otro)', placeholder: 'Especifique clase...', visible: true, requerido: false },
  propietarios: { label: 'Propietarios', placeholder: '', visible: true, requerido: true },
  tipo_reclamacion: { label: 'Tipo de Reclamación', placeholder: '', visible: true, requerido: true },
  ciudad_origen: { label: 'Ciudad Origen', placeholder: 'EJ: SOGAMOSO', visible: true, requerido: false },
  ciudad_destino: { label: 'Ciudad Destino', placeholder: 'EJ: BOGOTÁ', visible: true, requerido: false },
  concepto: { label: 'Concepto / Descripción', placeholder: 'Escriba una descripción...', visible: true, requerido: false },
  
  // Paso 2
  cotizaciones_proveedor: { label: 'Taller / Proveedor', placeholder: 'Ej: Talleres Unidos', visible: true, requerido: true },
  cotizaciones_tipo_documento: { label: 'Tipo de Documento', placeholder: '', visible: true, requerido: false },
  cotizaciones_numero_documento: { label: 'Número de Documento', placeholder: 'Número de doc', visible: true, requerido: false },
  valor_cotizacion: { label: 'Valor Cotización', placeholder: '$ 0', visible: true, requerido: false },
  valor_negociado: { label: 'Valor Negociado', placeholder: '$ 0', visible: true, requerido: false },
  valor_deducible: { label: 'Valor Deducible', placeholder: '$ 0', visible: true, requerido: false },
  valor_a_pagar: { label: 'Valor a Pagar', placeholder: '$ 0', visible: true, requerido: false },
  valor_salvamento: { label: 'Valor Salvamento', placeholder: '$ 0', visible: true, requerido: false },
  valor_final_aprobado: { label: 'Valor Final Aprobado', placeholder: '$ 0', visible: true, requerido: false },

  // Paso 3
  nombre_conductor: { label: 'Nombre Conductor', placeholder: 'Ej: JUAN PEREZ (solo primer nombre y primer apellido)', visible: true, requerido: false },
  id_conductor: { label: 'Número de Documento', placeholder: 'Cédula o nit', visible: true, requerido: false },
  celular_conductor: { label: 'Celular', placeholder: 'Ej: 310...', visible: true, requerido: false },
  culpabilidad: { label: 'Culpabilidad', placeholder: '', visible: true, requerido: false },
  valor_descuento_conductor: { label: 'Descuento Conductor', placeholder: '$ 0', visible: true, requerido: false },
  memorando_descuento: { label: 'N° Memorando Descuento', placeholder: 'Ej: MEMO-001', visible: true, requerido: false },
  valor_recobro_vehiculo: { label: 'Recobro Vehículo', placeholder: '$ 0', visible: true, requerido: false },
  valor_recobro_abogado: { label: 'Recobro Abogado', placeholder: '$ 0', visible: true, requerido: false },
  valor_recobro_empresa: { label: 'Recobro Empresa', placeholder: '$ 0', visible: true, requerido: false },

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
    claseVehiculo: defaultClasesVehiculo,
    campoConfig: defaultCamposConfig,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loading) {
      toast.loading('Cargando configuración...', { id: 'loading-form-config' });
    } else {
      toast.dismiss('loading-form-config');
    }
  }, [loading]);

  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        const IS_MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
        let dbConfigs: Record<string, any> = {};

        if (!IS_MOCK_MODE) {
          try {
            const supabase = createClient();
            
            // 1. Fetch catalogos list options
            const { data: dbCatalogos, error: catError } = await supabase
              .from('catalogos')
              .select('*')
              .order('orden', { ascending: true });
            
            if (!catError && dbCatalogos) {
              const grouped: Record<string, any[]> = {};
              (dbCatalogos as any[]).forEach(row => {
                if (!grouped[row.tipo]) grouped[row.tipo] = [];
                grouped[row.tipo].push(row);
              });

              const mapCatalog = (dbType: string, isSimpleString = false) => {
                const items = grouped[dbType] || [];
                if (isSimpleString) {
                  return items.filter(i => i.activo).map(i => i.valor);
                }
                return items.map(i => ({
                  label: i.valor,
                  activo: i.activo,
                  orden: i.orden ?? 0,
                  ...(dbType === 'OPCIONES_DEDUCIBLE' ? { value: parseFloat(i.valor) } : {})
                }));
              };

              dbConfigs['fam_config_tipos_reclamacion'] = mapCatalog('TIPO_RECLAMACION');
              dbConfigs['fam_config_tipos_servicio'] = mapCatalog('TIPO_SERVICIO');
              dbConfigs['fam_config_clases_vehiculo'] = mapCatalog('CLASE_VEHICULO');
              dbConfigs['fam_config_tipos_doc_paso1'] = mapCatalog('TIPO_DOC_PASO1');
              dbConfigs['fam_config_conceptos_cot'] = mapCatalog('CONCEPTO_COTIZACION');
              dbConfigs['fam_config_deducibles'] = mapCatalog('OPCIONES_DEDUCIBLE');
              dbConfigs['fam_config_culpabilidades'] = mapCatalog('CULPABILIDAD');
              dbConfigs['fam_config_causas'] = mapCatalog('CAUSA_RAIZ', true);
              dbConfigs['fam_config_autorizados_por'] = mapCatalog('AUTORIZADO_POR');
              dbConfigs['fam_config_cargos'] = mapCatalog('CARGO_AUTORIZADOR');

              if (grouped['PASO_FORMULARIO']) {
                dbConfigs['fam_config_pasos_form'] = grouped['PASO_FORMULARIO'].map(i => {
                  try {
                    const parsed = JSON.parse(i.valor);
                    return {
                      id: i.orden ?? 0,
                      label: parsed.label,
                      description: parsed.description
                    };
                  } catch {
                    return { id: i.orden ?? 0, label: i.valor, description: '' };
                  }
                });
              }
            }

            // 2. Fetch campos_configuracion table
            const { data: dbCampos, error: camposError } = await supabase
              .from('campos_configuracion')
              .select('*');
            
            if (!camposError && dbCampos) {
              const loadedCampos: Record<string, CampoConfig> = {};
              (dbCampos as any[]).forEach(row => {
                loadedCampos[row.id] = {
                  label: row.label,
                  placeholder: row.placeholder || '',
                  visible: row.visible,
                  requerido: row.requerido
                };
              });
              dbConfigs['fam_config_campos'] = loadedCampos;
            }
          } catch (dbErr) {
            console.error('Error querying configuration from Supabase:', dbErr);
          }
        }

        const getJSON = <T>(key: string, fallback: T): T => {
          if (dbConfigs[key] !== undefined && dbConfigs[key] !== null && (!Array.isArray(dbConfigs[key]) || dbConfigs[key].length > 0)) return dbConfigs[key] as T;
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
        const storedClasesVehiculo = getJSON<CatalogoItem[]>('fam_config_clases_vehiculo', defaultClasesVehiculo);
        const storedTiposDocPaso1 = getJSON<{ label: string; activo: boolean }[]>('fam_config_tipos_doc_paso1', defaultTiposDocPaso1);
        const storedConceptosCot = getJSON<CatalogoItem[]>('fam_config_conceptos_cot', defaultConceptosCot);
        const storedDeducibles = getJSON<{ label: string; value: number; activo: boolean }[]>('fam_config_deducibles', defaultDeducibles);
        const storedCulpabilidades = getJSON<CatalogoItem[]>('fam_config_culpabilidades', defaultCulpabilidades);
        
        let storedCausasRaiz = defaultCausasRaiz;
        if (dbConfigs['fam_config_causas'] !== undefined && dbConfigs['fam_config_causas'] !== null && dbConfigs['fam_config_causas'].length > 0) {
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
          claseVehiculo: storedClasesVehiculo,
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
        else if (key === 'fam_config_clases_vehiculo') updated.claseVehiculo = value;
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
                  
                  if (key === 'fam_config_campos') {
                    // Save campos_configuracion
                    const promises = Object.keys(value).map(fieldId => {
                      const field = value[fieldId];
                      return supabase
                        .from('campos_configuracion')
                        .upsert({
                          id: fieldId,
                          label: field.label,
                          placeholder: field.placeholder || null,
                          visible: field.visible === true,
                          requerido: field.requerido === true
                        } as any);
                    });
                    Promise.all(promises).then(results => {
                      const errors = results.filter(r => r.error);
                      if (errors.length > 0) console.error('Error saving campos_configuracion:', errors.map(e => e.error));
                    });
                  } else if (key === 'fam_config_pasos_form') {
                    // Save steps
                    supabase
                      .from('catalogos')
                      .delete()
                      .eq('tipo', 'PASO_FORMULARIO')
                      .then(() => {
                        const insertData = (value as PasoConfig[]).map(step => ({
                          tipo: 'PASO_FORMULARIO',
                          valor: JSON.stringify({ label: step.label, description: step.description }),
                          activo: true,
                          orden: step.id
                        }));
                        supabase
                          .from('catalogos')
                          .insert(insertData as any)
                          .then(({ error }) => {
                            if (error) console.error('Error saving steps to database:', error);
                          });
                      });
                  } else {
                    // Map our config key to database catalog type
                    const keyMap: Record<string, string> = {
                      'fam_config_tipos_reclamacion': 'TIPO_RECLAMACION',
                      'fam_config_tipos_servicio': 'TIPO_SERVICIO',
                      'fam_config_tipos_doc_paso1': 'TIPO_DOC_PASO1',
                      'fam_config_conceptos_cot': 'CONCEPTO_COTIZACION',
                      'fam_config_deducibles': 'OPCIONES_DEDUCIBLE',
                      'fam_config_culpabilidades': 'CULPABILIDAD',
                      'fam_config_causas': 'CAUSA_RAIZ',
                      'fam_config_autorizados_por': 'AUTORIZADO_POR',
                      'fam_config_cargos': 'CARGO_AUTORIZADOR',
                      'fam_config_clases_vehiculo': 'CLASE_VEHICULO'
                    };

                    const dbType = keyMap[key];
                    if (dbType) {
                      supabase
                        .from('catalogos')
                        .delete()
                        .eq('tipo', dbType)
                        .then(() => {
                          let insertData: any[] = [];
                          if (key === 'fam_config_causas') {
                            insertData = (value as string[]).map((val, idx) => ({
                              tipo: dbType,
                              valor: val,
                              activo: true,
                              orden: idx
                            }));
                          } else {
                            insertData = (value as any[]).map((item, idx) => ({
                              tipo: dbType,
                              valor: String(item.label || item.value || ''),
                              activo: item.activo !== false,
                              orden: item.orden ?? idx
                            }));
                          }

                          if (insertData.length > 0) {
                            supabase
                              .from('catalogos')
                              .insert(insertData as any)
                              .then(({ error }) => {
                                if (error) console.error('Error writing catalog to database:', error);
                              });
                          }
                        });
                    }
                  }

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
