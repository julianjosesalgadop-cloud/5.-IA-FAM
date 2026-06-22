'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sliders, 
  Settings, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle, 
  XCircle,
  RotateCcw,
  Save,
  Check,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { getMockUser } from '@/lib/services/dbService';
import { useFormConfig, CatalogoItem, PasoConfig, CampoConfig } from '@/hooks/useFormConfig';

// Default values to allow resetting individual sections
const DEFAULT_CATALOGS = {
  tiposReclamacion: [
    { label: 'Siniestro', activo: true, orden: 0 },
    { label: 'Vidrios', activo: true, orden: 1 },
    { label: 'Carrocería', activo: true, orden: 2 },
    { label: 'Repuestos', activo: true, orden: 3 },
    { label: 'Pérdida parcial', activo: true, orden: 4 },
    { label: 'Afectación por orden público', activo: true, orden: 5 },
    { label: 'Otro', activo: true, orden: 6 },
  ],
  tiposServicio: [
    { label: 'Intermunicipal', activo: true, orden: 0 },
    { label: 'Especial', activo: true, orden: 1 },
    { label: 'Urbano', activo: true, orden: 2 },
    { label: 'Otro', activo: true, orden: 3 },
  ],
  tiposDocPaso1: [
    { label: 'Solicitud', activo: true },
    { label: 'Documento Vario', activo: true },
  ],
  conceptosCotizacion: [
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
  ],
  opcionesDeducible: [
    { label: '50%', value: 50, activo: true },
    { label: '15%', value: 15, activo: true },
    { label: '10%', value: 10, activo: true },
  ],
  culpabilidades: [
    { label: 'Conductor', activo: true, orden: 0 },
    { label: 'Tercero', activo: true, orden: 1 },
    { label: 'Compartida', activo: true, orden: 2 },
    { label: 'Sin definir', activo: true, orden: 3 },
  ],
  causasRaiz: [
    'Error humano',
    'Exceso de velocidad',
    'Maniobra indebida',
    'Condiciones climáticas',
    'Falla mecánica',
    'Tercero involucrado',
  ],
  autorizadosPor: [
    { label: 'MARTHA BIBIANA RINCON REYES', activo: true },
  ],
  cargos: [
    { label: 'GERENTE ADMINISTRATIVA Y FINANCIERA', activo: true },
  ],
  pasos: [
    { id: 1, label: 'Información General', description: 'Datos del incidente y vehículo' },
    { id: 2, label: 'Datos Financieros', description: 'Valores y deducibles' },
    { id: 3, label: 'Conductor & Recobros', description: 'Responsabilidad y recuperación' },
    { id: 4, label: 'Comité & Autorización', description: 'Seguridad vial y aprobación' },
  ],
  campoConfig: {
    // Paso 1
    fecha_incidente: { label: 'Fecha del Incidente', placeholder: '', visible: true, requerido: true },
    placa: { label: 'Placa', placeholder: 'Ej: ABC123', visible: true, requerido: true },
    numero_interno: { label: 'Número Interno', placeholder: 'Ej: 1024', visible: true, requerido: true },
    tipo_servicio: { label: 'Tipo de Servicio', placeholder: '', visible: true, requerido: true },
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
    nombre_conductor: { label: 'Nombre Conductor', placeholder: 'Nombre completo', visible: true, requerido: false },
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
  } as Record<string, CampoConfig>,
};

export function ParametrizacionView() {
  const [currentUser] = useState(() => getMockUser());
  const config = useFormConfig();
  const [activeTab, setActiveTab] = useState<'pasos' | 'paso1' | 'paso2' | 'paso3' | 'paso4'>('pasos');

  // Local states to handle edits before saving
  const [localPasos, setLocalPasos] = useState<PasoConfig[]>([]);
  const [localCampos, setLocalCampos] = useState<Record<string, CampoConfig>>({});
  
  const [localTiposReclamacion, setLocalTiposReclamacion] = useState<CatalogoItem[]>([]);
  const [localTiposServicio, setLocalTiposServicio] = useState<CatalogoItem[]>([]);
  const [localTiposDocPaso1, setLocalTiposDocPaso1] = useState<{ label: string; activo: boolean }[]>([]);
  const [localConceptosCot, setLocalConceptosCot] = useState<CatalogoItem[]>([]);
  const [localDeducibles, setLocalDeducibles] = useState<{ label: string; value: number; activo: boolean }[]>([]);
  const [localCulpabilidades, setLocalCulpabilidades] = useState<CatalogoItem[]>([]);
  const [localCausasRaiz, setLocalCausasRaiz] = useState<string[]>([]);
  const [localAutorizadosPor, setLocalAutorizadosPor] = useState<{ label: string; activo: boolean }[]>([]);
  const [localCargos, setLocalCargos] = useState<{ label: string; activo: boolean }[]>([]);

  // Sync from Hook when config loads
  useEffect(() => {
    if (!config.loading) {
      setLocalPasos(config.pasos);
      setLocalCampos(config.campoConfig);
      setLocalTiposReclamacion(config.tiposReclamacion);
      setLocalTiposServicio(config.tiposServicio);
      setLocalTiposDocPaso1(config.tiposDocPaso1);
      setLocalConceptosCot(config.conceptosCotizacion);
      setLocalDeducibles(config.opcionesDeducible);
      setLocalCulpabilidades(config.culpabilidades);
      setLocalCausasRaiz(config.causasRaiz);
      setLocalAutorizadosPor(config.autorizadosPor);
      setLocalCargos(config.cargos);
    }
  }, [config.loading, config.pasos, config.campoConfig, config.tiposReclamacion, config.tiposServicio, config.tiposDocPaso1, config.conceptosCotizacion, config.opcionesDeducible, config.culpabilidades, config.causasRaiz, config.autorizadosPor, config.cargos]);

  if (currentUser.rol !== 'admin') {
    return (
      <Card className="max-w-4xl border-destructive bg-destructive/5 p-6 text-center mx-auto">
        <CardHeader>
          <CardTitle className="text-destructive font-bold text-xl">Acceso Denegado</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            No tienes permisos para visualizar ni ingresar al módulo de Parametrización. Solo los administradores tienen acceso.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4">
          <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
            Volver al Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isReadOnly = currentUser.rol !== 'admin';

  const handleSavePasos = () => {
    config.saveConfig('fam_config_pasos_form', localPasos);
    toast.success('Pasos del formulario guardados correctamente.');
  };

  const handleResetPasos = () => {
    setLocalPasos(DEFAULT_CATALOGS.pasos);
    config.saveConfig('fam_config_pasos_form', DEFAULT_CATALOGS.pasos);
    toast.success('Pasos del formulario restablecidos a valores predeterminados.');
  };

  const handleSaveCampos = (stepKeys: string[]) => {
    const updatedCampos = { ...config.campoConfig };
    stepKeys.forEach(key => {
      if (localCampos[key]) {
        updatedCampos[key] = localCampos[key];
      }
    });
    config.saveConfig('fam_config_campos', updatedCampos);
    toast.success('Configuración de campos guardada correctamente.');
  };

  const handleResetCamposByStep = (stepKeys: string[]) => {
    setLocalCampos(prev => {
      const reset = { ...prev };
      stepKeys.forEach(key => {
        reset[key] = DEFAULT_CATALOGS.campoConfig[key];
      });
      // Save directly to localStorage
      const updatedCampos = { ...config.campoConfig };
      stepKeys.forEach(key => {
        updatedCampos[key] = DEFAULT_CATALOGS.campoConfig[key];
      });
      config.saveConfig('fam_config_campos', updatedCampos);
      return reset;
    });
    toast.success('Campos del paso restablecidos a valores predeterminados.');
  };

  const handleFieldChange = (key: string, field: keyof CampoConfig, value: any) => {
    setLocalCampos(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  // Generic Catalogs Editor Actions (Sorted list with {label, activo, orden})
  const updateCatalogItem = <T extends { label: string; activo: boolean; orden?: number }>(
    list: T[],
    setList: React.Dispatch<React.SetStateAction<T[]>>,
    key: string,
    index: number,
    field: keyof T,
    value: any
  ) => {
    const updated = [...list];
    updated[index] = { ...updated[index], [field]: value };
    setList(updated);
  };

  const deleteCatalogItem = <T extends { label: string }>(
    list: T[],
    setList: React.Dispatch<React.SetStateAction<T[]>>,
    index: number
  ) => {
    const updated = list.filter((_, i) => i !== index);
    setList(updated);
  };

  const moveCatalogItem = <T extends { orden?: number }>(
    list: T[],
    setList: React.Dispatch<React.SetStateAction<T[]>>,
    index: number,
    direction: 'up' | 'down'
  ) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === list.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...list];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Recalculate order indices if they exist
    const ordered = updated.map((item, idx) => ({
      ...item,
      ...(item.orden !== undefined ? { orden: idx } : {})
    }));

    setList(ordered);
  };

  const addCatalogItem = <T extends { label: string; activo: boolean; orden?: number }>(
    list: T[],
    setList: React.Dispatch<React.SetStateAction<T[]>>,
    newItemLabel: string,
    extraProps: Partial<T> = {}
  ) => {
    const trimmed = newItemLabel.trim();
    if (!trimmed) return false;
    if (list.some(item => item.label.toLowerCase() === trimmed.toLowerCase())) {
      toast.warning('Este elemento ya existe en la lista.');
      return false;
    }

    const newItem = {
      label: trimmed,
      activo: true,
      ...(list.length > 0 && 'orden' in list[0] ? { orden: list.length } : {}),
      ...extraProps
    } as unknown as T;

    setList([...list, newItem]);
    return true;
  };

  // Specialized Catalog Save/Reset wrappers
  const saveCatalog = (key: string, value: any, message: string) => {
    config.saveConfig(key, value);
    toast.success(message);
  };

  // Helper render for Field Parameter Card
  const renderFieldConfigCard = (key: string) => {
    const field = localCampos[key];
    if (!field) return null;

    // Check if the field is critical/locked (e.g. Placa or Fecha should not be easily hidden, though we allow it)
    const isCritical = ['placa', 'fecha_incidente'].includes(key);

    return (
      <motion.div 
        layout 
        key={key} 
        className="p-4 rounded-xl border border-border bg-secondary/15 flex flex-col justify-between space-y-4 hover:border-primary/30 transition-all"
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground uppercase">{key}</span>
            {isCritical && (
              <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Crítico
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">{field.label || key}</h4>
            {!field.visible && (
              <span className="text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <EyeOff className="w-2.5 h-2.5" /> Oculto
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Etiqueta (Label)</Label>
              <Input
                value={field.label}
                onChange={(e) => handleFieldChange(key, 'label', e.target.value)}
                disabled={isReadOnly}
                className="h-8 text-xs bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Marcador (Placeholder)</Label>
              <Input
                value={field.placeholder || ''}
                onChange={(e) => handleFieldChange(key, 'placeholder', e.target.value)}
                disabled={isReadOnly || ['fecha_incidente', 'fecha_comite', 'fecha_autorizacion', 'tipo_servicio', 'tipo_reclamacion', 'culpabilidad', 'causa_raiz', 'autorizado_por', 'cargo_autorizador'].includes(key)}
                className="h-8 text-xs bg-background"
                placeholder="N/A"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={field.visible}
                  disabled={isReadOnly}
                  onCheckedChange={(val: boolean) => {
                    handleFieldChange(key, 'visible', val);
                    if (!val) {
                      handleFieldChange(key, 'requerido', false);
                    }
                  }}
                  id={`visible-${key}`}
                />
                <Label htmlFor={`visible-${key}`} className="text-xs cursor-pointer select-none">Visible</Label>
              </div>

              <div className="flex items-center gap-1.5">
                <Switch
                  checked={field.requerido}
                  disabled={isReadOnly || !field.visible}
                  onCheckedChange={(val: boolean) => handleFieldChange(key, 'requerido', val)}
                  id={`req-${key}`}
                />
                <Label htmlFor={`req-${key}`} className="text-xs cursor-pointer select-none">Requerido</Label>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  if (config.loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Cargando parametrización...</p>
      </div>
    );
  }

  // Define keys for each step to handle resets/saves grouped
  const step1Keys = ['fecha_incidente', 'placa', 'numero_interno', 'tipo_servicio', 'propietarios', 'tipo_reclamacion', 'ciudad_origen', 'ciudad_destino', 'concepto'];
  const step2Keys = ['cotizaciones_proveedor', 'cotizaciones_tipo_documento', 'cotizaciones_numero_documento', 'valor_cotizacion', 'valor_negociado', 'valor_deducible', 'valor_a_pagar', 'valor_salvamento', 'valor_final_aprobado'];
  const step3Keys = ['nombre_conductor', 'id_conductor', 'celular_conductor', 'culpabilidad', 'valor_descuento_conductor', 'memorando_descuento', 'valor_recobro_vehiculo', 'valor_recobro_abogado', 'valor_recobro_empresa'];
  const step4Keys = ['fecha_comite', 'numero_acta', 'causa_raiz', 'observaciones_comite', 'autorizado_por', 'cargo_autorizador', 'fecha_autorizacion', 'memorando_pago_nombre', 'memorando_pago_archivo'];

  return (
    <div className="w-full max-w-6xl space-y-6 mx-auto pb-12">
      {isReadOnly && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-500 text-sm flex items-center gap-3 shadow-sm"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Modo de solo lectura</p>
            <p className="text-xs text-muted-foreground">Como Consultor, puedes visualizar la parametrización de los campos y fases, pero no tienes permisos para guardar cambios ni restaurar valores predeterminados.</p>
          </div>
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-border/80 gap-1 overflow-x-auto">
        {(['pasos', 'paso1', 'paso2', 'paso3', 'paso4'] as const).map((tab) => {
          const labels = {
            pasos: '1. Pasos y Fases',
            paso1: '2. Paso 1 — Info General',
            paso2: '3. Paso 2 — Financiero',
            paso3: '4. Paso 3 — Conductor',
            paso4: '5. Paso 4 — Comité/Autorización',
          };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                isActive 
                  ? 'border-primary text-primary font-bold bg-primary/5' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20'
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'pasos' && (
          <motion.div
            key="pasos"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Sliders className="w-5 h-5 text-primary" />
                    Pasos y Fases del Formulario
                  </CardTitle>
                  <CardDescription>Configure los títulos y las descripciones explicativas de cada una de las 4 fases del formulario.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleResetPasos} disabled={isReadOnly} variant="outline" size="sm" className="gap-1">
                    <RotateCcw className="w-3.5 h-3.5" /> Predeterminados
                  </Button>
                  <Button onClick={handleSavePasos} disabled={isReadOnly} size="sm" className="gap-1 shadow-glow-brand">
                    <Save className="w-3.5 h-3.5" /> Guardar Cambios
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {localPasos.map((step, idx) => (
                    <div key={step.id} className="p-4 rounded-xl border border-border bg-secondary/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full">
                          Fase {step.id}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Título de la Fase</Label>
                          <Input
                            value={step.label}
                            onChange={(e) => {
                              const updated = [...localPasos];
                              updated[idx].label = e.target.value;
                              setLocalPasos(updated);
                            }}
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Subtítulo / Descripción</Label>
                          <Input
                            value={step.description}
                            onChange={(e) => {
                              const updated = [...localPasos];
                              updated[idx].description = e.target.value;
                              setLocalPasos(updated);
                            }}
                            className="bg-background text-muted-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'paso1' && (
          <motion.div
            key="paso1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Fields Config */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Campos de Fase 1 — Información General
                  </CardTitle>
                  <CardDescription>Personalice etiquetas, placeholders y reglas de validación para los campos del primer paso.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleResetCamposByStep(step1Keys)} disabled={isReadOnly} variant="outline" size="sm">
                    <RotateCcw className="w-3.5 h-3.5" /> Predeterminados
                  </Button>
                  <Button onClick={() => handleSaveCampos(step1Keys)} disabled={isReadOnly} size="sm" className="shadow-glow-brand">
                    <Save className="w-3.5 h-3.5" /> Guardar Campos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {step1Keys.map(renderFieldConfigCard)}
                </div>
              </CardContent>
            </Card>

            {/* Catalog Editors for Paso 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tipos de Reclamación */}
              <CatalogoEditorCard
                title="Tipos de Reclamación"
                description="Listado del select de tipo de reclamación"
                list={localTiposReclamacion}
                onAdd={(label) => addCatalogItem(localTiposReclamacion, setLocalTiposReclamacion, label)}
                onDelete={(idx) => deleteCatalogItem(localTiposReclamacion, setLocalTiposReclamacion, idx)}
                onToggleActive={(idx, val) => updateCatalogItem(localTiposReclamacion, setLocalTiposReclamacion, 'fam_config_tipos_reclamacion', idx, 'activo', val)}
                onMove={(idx, dir) => moveCatalogItem(localTiposReclamacion, setLocalTiposReclamacion, idx, dir)}
                onSave={() => saveCatalog('fam_config_tipos_reclamacion', localTiposReclamacion, 'Tipos de reclamación guardados correctamente.')}
                onReset={() => {
                  setLocalTiposReclamacion(DEFAULT_CATALOGS.tiposReclamacion);
                  saveCatalog('fam_config_tipos_reclamacion', DEFAULT_CATALOGS.tiposReclamacion, 'Lista de reclamación restablecida.');
                }}
                isReadOnly={isReadOnly}
              />

              {/* Tipos de Servicio */}
              <CatalogoEditorCard
                title="Tipos de Servicio"
                description="Servicio del vehículo (Urbano, Intermunicipal, etc.)"
                list={localTiposServicio}
                onAdd={(label) => addCatalogItem(localTiposServicio, setLocalTiposServicio, label)}
                onDelete={(idx) => deleteCatalogItem(localTiposServicio, setLocalTiposServicio, idx)}
                onToggleActive={(idx, val) => updateCatalogItem(localTiposServicio, setLocalTiposServicio, 'fam_config_tipos_servicio', idx, 'activo', val)}
                onMove={(idx, dir) => moveCatalogItem(localTiposServicio, setLocalTiposServicio, idx, dir)}
                onSave={() => saveCatalog('fam_config_tipos_servicio', localTiposServicio, 'Tipos de servicio guardados correctamente.')}
                onReset={() => {
                  setLocalTiposServicio(DEFAULT_CATALOGS.tiposServicio);
                  saveCatalog('fam_config_tipos_servicio', DEFAULT_CATALOGS.tiposServicio, 'Lista de servicios restablecida.');
                }}
                isReadOnly={isReadOnly}
              />

              {/* Documentos paso 1 */}
              <CatalogoEditorCard
                title="Documentos Adjuntos (Paso 1)"
                description="Tipos de archivos PDF que se exigen subir en Paso 1"
                list={localTiposDocPaso1}
                onAdd={(label) => addCatalogItem(localTiposDocPaso1, setLocalTiposDocPaso1, label)}
                onDelete={(idx) => deleteCatalogItem(localTiposDocPaso1, setLocalTiposDocPaso1, idx)}
                onToggleActive={(idx, val) => updateCatalogItem(localTiposDocPaso1, setLocalTiposDocPaso1, 'fam_config_tipos_doc_paso1', idx, 'activo', val)}
                onSave={() => saveCatalog('fam_config_tipos_doc_paso1', localTiposDocPaso1, 'Documentos del Paso 1 guardados.')}
                onReset={() => {
                  setLocalTiposDocPaso1(DEFAULT_CATALOGS.tiposDocPaso1);
                  saveCatalog('fam_config_tipos_doc_paso1', DEFAULT_CATALOGS.tiposDocPaso1, 'Tipos de documento restablecidos.');
                }}
                isReadOnly={isReadOnly}
              />
            </div>
          </motion.div>
        )}

        {activeTab === 'paso2' && (
          <motion.div
            key="paso2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Fields Config */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Campos de Fase 2 — Datos Financieros
                  </CardTitle>
                  <CardDescription>Personalice etiquetas y visualización para los campos de montos de cotizaciones y salvamentos.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleResetCamposByStep(step2Keys)} disabled={isReadOnly} variant="outline" size="sm">
                    <RotateCcw className="w-3.5 h-3.5" /> Predeterminados
                  </Button>
                  <Button onClick={() => handleSaveCampos(step2Keys)} disabled={isReadOnly} size="sm" className="shadow-glow-brand">
                    <Save className="w-3.5 h-3.5" /> Guardar Campos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {step2Keys.map(renderFieldConfigCard)}
                </div>
              </CardContent>
            </Card>

            {/* Catalog Editors for Paso 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Conceptos de Cotización */}
              <CatalogoEditorCard
                title="Conceptos de Cotización"
                description="Ítems del formulario de cotizaciones (SINIESTRO, INSTALACIÓN, VIDRIOS, etc.)"
                list={localConceptosCot}
                onAdd={(label) => addCatalogItem(localConceptosCot, setLocalConceptosCot, label)}
                onDelete={(idx) => deleteCatalogItem(localConceptosCot, setLocalConceptosCot, idx)}
                onToggleActive={(idx, val) => updateCatalogItem(localConceptosCot, setLocalConceptosCot, 'fam_config_conceptos_cot', idx, 'activo', val)}
                onMove={(idx, dir) => moveCatalogItem(localConceptosCot, setLocalConceptosCot, idx, dir)}
                onSave={() => saveCatalog('fam_config_conceptos_cot', localConceptosCot, 'Conceptos de cotización guardados.')}
                onReset={() => {
                  setLocalConceptosCot(DEFAULT_CATALOGS.conceptosCotizacion);
                  saveCatalog('fam_config_conceptos_cot', DEFAULT_CATALOGS.conceptosCotizacion, 'Conceptos restablecidos.');
                }}
                isReadOnly={isReadOnly}
              />

              {/* Porcentajes de Deducibles */}
              <DeduciblesEditorCard
                list={localDeducibles}
                onAdd={(label, value) => {
                  if (localDeducibles.some(d => d.value === value)) {
                    toast.warning('Este deducible ya existe.');
                    return false;
                  }
                  setLocalDeducibles([...localDeducibles, { label, value, activo: true }]);
                  return true;
                }}
                onDelete={(idx) => deleteCatalogItem(localDeducibles, setLocalDeducibles, idx)}
                onToggleActive={(idx, val) => updateCatalogItem(localDeducibles, setLocalDeducibles, 'fam_config_deducibles', idx, 'activo', val)}
                onSave={() => saveCatalog('fam_config_deducibles', localDeducibles, 'Porcentajes deducibles guardados.')}
                onReset={() => {
                  setLocalDeducibles(DEFAULT_CATALOGS.opcionesDeducible);
                  saveCatalog('fam_config_deducibles', DEFAULT_CATALOGS.opcionesDeducible, 'Deducibles restablecidos.');
                }}
                isReadOnly={isReadOnly}
              />
            </div>
          </motion.div>
        )}

        {activeTab === 'paso3' && (
          <motion.div
            key="paso3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Fields Config */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Campos de Fase 3 — Conductor & Recobros
                  </CardTitle>
                  <CardDescription>Configure etiquetas y visibilidad para los datos del conductor, descuentos y recobros a terceros.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleResetCamposByStep(step3Keys)} disabled={isReadOnly} variant="outline" size="sm">
                    <RotateCcw className="w-3.5 h-3.5" /> Predeterminados
                  </Button>
                  <Button onClick={() => handleSaveCampos(step3Keys)} disabled={isReadOnly} size="sm" className="shadow-glow-brand">
                    <Save className="w-3.5 h-3.5" /> Guardar Campos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {step3Keys.map(renderFieldConfigCard)}
                </div>
              </CardContent>
            </Card>

            {/* Catalog Editors for Paso 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Culpabilidades */}
              <CatalogoEditorCard
                title="Culpabilidades"
                description="Listado del select de nivel de culpabilidad (Conductor, Tercero, etc.)"
                list={localCulpabilidades}
                onAdd={(label) => addCatalogItem(localCulpabilidades, setLocalCulpabilidades, label)}
                onDelete={(idx) => deleteCatalogItem(localCulpabilidades, setLocalCulpabilidades, idx)}
                onToggleActive={(idx, val) => updateCatalogItem(localCulpabilidades, setLocalCulpabilidades, 'fam_config_culpabilidades', idx, 'activo', val)}
                onMove={(idx, dir) => moveCatalogItem(localCulpabilidades, setLocalCulpabilidades, idx, dir)}
                onSave={() => saveCatalog('fam_config_culpabilidades', localCulpabilidades, 'Opciones de culpabilidad guardadas.')}
                onReset={() => {
                  setLocalCulpabilidades(DEFAULT_CATALOGS.culpabilidades);
                  saveCatalog('fam_config_culpabilidades', DEFAULT_CATALOGS.culpabilidades, 'Opciones de culpabilidad restablecidas.');
                }}
                isReadOnly={isReadOnly}
              />
            </div>
          </motion.div>
        )}

        {activeTab === 'paso4' && (
          <motion.div
            key="paso4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Fields Config */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Campos de Fase 4 — Comité & Autorización
                  </CardTitle>
                  <CardDescription>Gestione los campos de actas, observaciones, resoluciones y subida del soporte de pago.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleResetCamposByStep(step4Keys)} disabled={isReadOnly} variant="outline" size="sm">
                    <RotateCcw className="w-3.5 h-3.5" /> Predeterminados
                  </Button>
                  <Button onClick={() => handleSaveCampos(step4Keys)} disabled={isReadOnly} size="sm" className="shadow-glow-brand">
                    <Save className="w-3.5 h-3.5" /> Guardar Campos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {step4Keys.map(renderFieldConfigCard)}
                </div>
              </CardContent>
            </Card>

            {/* Catalog Editors for Paso 4 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Causas Raíz (Compatibility mapping directly to fam_config_causas as string[]) */}
              <CausasRaizEditorCard
                list={localCausasRaiz}
                onAdd={(label) => {
                  const trimmed = label.trim();
                  if (!trimmed) return false;
                  if (localCausasRaiz.includes(trimmed)) {
                    toast.warning('Esta causa raíz ya existe.');
                    return false;
                  }
                  setLocalCausasRaiz([...localCausasRaiz, trimmed]);
                  return true;
                }}
                onDelete={(idx) => {
                  setLocalCausasRaiz(localCausasRaiz.filter((_, i) => i !== idx));
                }}
                onMove={(idx, dir) => {
                  if (dir === 'up' && idx === 0) return;
                  if (dir === 'down' && idx === localCausasRaiz.length - 1) return;
                  const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
                  const updated = [...localCausasRaiz];
                  const temp = updated[idx];
                  updated[idx] = updated[targetIdx];
                  updated[targetIdx] = temp;
                  setLocalCausasRaiz(updated);
                }}
                onSave={() => saveCatalog('fam_config_causas', localCausasRaiz, 'Causas raíz del comité guardadas correctamente.')}
                onReset={() => {
                  setLocalCausasRaiz(DEFAULT_CATALOGS.causasRaiz);
                  saveCatalog('fam_config_causas', DEFAULT_CATALOGS.causasRaiz, 'Causas raíz restablecidas.');
                }}
                isReadOnly={isReadOnly}
              />

              {/* Autorizado Por */}
              <CatalogoEditorCard
                title="Autorizado Por (Firmas)"
                description="Listado de directivos autorizados para firmar los desembolsos"
                list={localAutorizadosPor}
                onAdd={(label) => addCatalogItem(localAutorizadosPor, setLocalAutorizadosPor, label)}
                onDelete={(idx) => deleteCatalogItem(localAutorizadosPor, setLocalAutorizadosPor, idx)}
                onToggleActive={(idx, val) => updateCatalogItem(localAutorizadosPor, setLocalAutorizadosPor, 'fam_config_autorizados_por', idx, 'activo', val)}
                onSave={() => saveCatalog('fam_config_autorizados_por', localAutorizadosPor, 'Lista de autorizadores guardada.')}
                onReset={() => {
                  setLocalAutorizadosPor(DEFAULT_CATALOGS.autorizadosPor);
                  saveCatalog('fam_config_autorizados_por', DEFAULT_CATALOGS.autorizadosPor, 'Autorizadores restablecidos.');
                }}
                isReadOnly={isReadOnly}
              />

              {/* Cargos */}
              <CatalogoEditorCard
                title="Cargos Directivos"
                description="Cargos de las personas que autorizan (Gerente, Director, etc.)"
                list={localCargos}
                onAdd={(label) => addCatalogItem(localCargos, setLocalCargos, label)}
                onDelete={(idx) => deleteCatalogItem(localCargos, setLocalCargos, idx)}
                onToggleActive={(idx, val) => updateCatalogItem(localCargos, setLocalCargos, 'fam_config_cargos', idx, 'activo', val)}
                onSave={() => saveCatalog('fam_config_cargos', localCargos, 'Cargos directivos guardados.')}
                onReset={() => {
                  setLocalCargos(DEFAULT_CATALOGS.cargos);
                  saveCatalog('fam_config_cargos', DEFAULT_CATALOGS.cargos, 'Cargos directivos restablecidos.');
                }}
                isReadOnly={isReadOnly}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-component: CatalogoEditorCard
interface CatalogoEditorCardProps {
  title: string;
  description: string;
  list: any[];
  onAdd: (label: string) => boolean;
  onDelete: (idx: number) => void;
  onToggleActive: (idx: number, val: boolean) => void;
  onMove?: (idx: number, dir: 'up' | 'down') => void;
  onSave: () => void;
  onReset: () => void;
  isReadOnly?: boolean;
}

function CatalogoEditorCard({
  title,
  description,
  list,
  onAdd,
  onDelete,
  onToggleActive,
  onMove,
  onSave,
  onReset,
  isReadOnly = false,
}: CatalogoEditorCardProps) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (onAdd(newItem)) {
      setNewItem('');
    }
  };

  return (
    <Card className="border-border bg-card flex flex-col h-[400px]">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
              <FileText className="w-4 h-4 text-primary" /> {title}
            </CardTitle>
            <CardDescription className="text-xs mt-1 min-h-[32px] line-clamp-2">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      {/* List content scrollable */}
      <CardContent className="flex-1 overflow-y-auto px-4 py-0 space-y-2 min-h-0">
        <div className="border border-border rounded-xl divide-y divide-border/60 overflow-hidden bg-secondary/5">
          {list.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center space-y-1">
              <AlertTriangle className="w-5 h-5 text-amber-500/80 mb-1" />
              <span>Lista vacía.</span>
              <span>Añada un elemento abajo.</span>
            </div>
          ) : (
            list.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-secondary/20 transition-all text-sm gap-2">
                <span className={`font-semibold text-xs flex-1 truncate ${item.activo ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                  {item.label}
                </span>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {onMove && (
                    <>
                      <button
                        onClick={() => onMove(idx, 'up')}
                        disabled={isReadOnly || idx === 0}
                        className="w-6 h-6 rounded bg-background hover:bg-secondary border border-border flex items-center justify-center disabled:opacity-40"
                      >
                        <ArrowUp className="w-3 h-3 text-foreground" />
                      </button>
                      <button
                        onClick={() => onMove(idx, 'down')}
                        disabled={isReadOnly || idx === list.length - 1}
                        className="w-6 h-6 rounded bg-background hover:bg-secondary border border-border flex items-center justify-center disabled:opacity-40"
                      >
                        <ArrowDown className="w-3 h-3 text-foreground" />
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => onToggleActive(idx, !item.activo)}
                    disabled={isReadOnly}
                    className={`w-6 h-6 rounded flex items-center justify-center border ${
                      item.activo 
                        ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/25' 
                        : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/25'
                    }`}
                    title={item.activo ? "Desactivar" : "Activar"}
                  >
                    {item.activo ? <Check className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>

                  <button
                    onClick={() => onDelete(idx)}
                    disabled={isReadOnly}
                    className="w-6 h-6 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center disabled:opacity-40"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Footer controls */}
      <div className="p-4 border-t border-border bg-secondary/15 flex flex-col gap-2">
        <div className="flex gap-1">
          <Input
            placeholder="Añadir nuevo..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            disabled={isReadOnly}
            className="h-8 text-xs bg-background"
          />
          <Button onClick={handleAdd} disabled={isReadOnly} size="sm" className="h-8 px-2 flex-shrink-0">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={onReset} disabled={isReadOnly} variant="outline" size="sm" className="flex-1 h-8 text-[11px] px-0 gap-1">
            <RotateCcw className="w-3 h-3" /> Predeterminados
          </Button>
          <Button onClick={onSave} disabled={isReadOnly} size="sm" className="flex-1 h-8 text-[11px] px-0 gap-1 shadow-glow-brand">
            <Save className="w-3 h-3" /> Guardar
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Sub-component: DeduciblesEditorCard
interface DeduciblesEditorCardProps {
  list: { label: string; value: number; activo: boolean }[];
  onAdd: (label: string, value: number) => boolean;
  onDelete: (idx: number) => void;
  onToggleActive: (idx: number, val: boolean) => void;
  onSave: () => void;
  onReset: () => void;
  isReadOnly?: boolean;
}

function DeduciblesEditorCard({
  list,
  onAdd,
  onDelete,
  onToggleActive,
  onSave,
  onReset,
  isReadOnly = false,
}: DeduciblesEditorCardProps) {
  const [newValue, setNewValue] = useState<number | ''>('');

  const handleAdd = () => {
    if (newValue === '') return;
    const val = Number(newValue);
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error('El deducible debe ser un número entre 0 y 100.');
      return;
    }
    if (onAdd(`${val}%`, val)) {
      setNewValue('');
    }
  };

  return (
    <Card className="border-border bg-card flex flex-col h-[400px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
          <FileText className="w-4 h-4 text-primary" /> Opciones de Porcentaje Deducible
        </CardTitle>
        <CardDescription className="text-xs mt-1">Configuración de los porcentajes de deducible ofrecidos en el Paso 2 (Dato Financiero).</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto px-4 py-0 space-y-2 min-h-0">
        <div className="border border-border rounded-xl divide-y divide-border/60 overflow-hidden bg-secondary/5">
          {list.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500/80 mb-1" />
              <span>Lista vacía.</span>
            </div>
          ) : (
            list.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-secondary/20 transition-all text-sm gap-2">
                <span className={`font-semibold text-xs flex-1 truncate ${item.activo ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                  {item.label} (Valor numérico: {item.value}%)
                </span>
                
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onToggleActive(idx, !item.activo)}
                    disabled={isReadOnly}
                    className={`w-6 h-6 rounded flex items-center justify-center border ${
                      item.activo 
                        ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/25' 
                        : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/25'
                    }`}
                    title={item.activo ? "Desactivar" : "Activar"}
                  >
                    {item.activo ? <Check className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>

                  <button
                    onClick={() => onDelete(idx)}
                    disabled={isReadOnly}
                    className="w-6 h-6 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center disabled:opacity-40"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <div className="p-4 border-t border-border bg-secondary/15 flex flex-col gap-2">
        <div className="flex gap-1">
          <Input
            type="number"
            placeholder="Ej: 20 (% de deducible)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value === '' ? '' : Number(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            disabled={isReadOnly}
            className="h-8 text-xs bg-background"
            min={0}
            max={100}
          />
          <Button onClick={handleAdd} disabled={isReadOnly} size="sm" className="h-8 px-2 flex-shrink-0">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={onReset} disabled={isReadOnly} variant="outline" size="sm" className="flex-1 h-8 text-[11px] px-0 gap-1">
            <RotateCcw className="w-3 h-3" /> Predeterminados
          </Button>
          <Button onClick={onSave} disabled={isReadOnly} size="sm" className="flex-1 h-8 text-[11px] px-0 gap-1 shadow-glow-brand">
            <Save className="w-3 h-3" /> Guardar
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Sub-component: CausasRaizEditorCard (Uses string[] array representation for compatibility)
interface CausasRaizEditorCardProps {
  list: string[];
  onAdd: (label: string) => boolean;
  onDelete: (idx: number) => void;
  onMove: (idx: number, dir: 'up' | 'down') => void;
  onSave: () => void;
  onReset: () => void;
  isReadOnly?: boolean;
}

function CausasRaizEditorCard({
  list,
  onAdd,
  onDelete,
  onMove,
  onSave,
  onReset,
  isReadOnly = false,
}: CausasRaizEditorCardProps) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (isReadOnly) return;
    if (onAdd(newItem)) {
      setNewItem('');
    }
  };

  return (
    <Card className="border-border bg-card flex flex-col h-[400px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
          <FileText className="w-4 h-4 text-primary" /> Causas Raíz (Comité)
        </CardTitle>
        <CardDescription className="text-xs mt-1">Configure las opciones de causa raíz del comité. Sincronizado automáticamente con Configuración.</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto px-4 py-0 space-y-2 min-h-0">
        <div className="border border-border rounded-xl divide-y divide-border/60 overflow-hidden bg-secondary/5">
          {list.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500/80 mb-1" />
              <span>Lista vacía.</span>
            </div>
          ) : (
            list.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-secondary/20 transition-all text-sm gap-2">
                <span className="font-semibold text-xs flex-1 truncate text-foreground">
                  {item}
                </span>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onMove(idx, 'up')}
                    disabled={isReadOnly || idx === 0}
                    className="w-6 h-6 rounded bg-background hover:bg-secondary border border-border flex items-center justify-center disabled:opacity-40"
                  >
                    <ArrowUp className="w-3 h-3 text-foreground" />
                  </button>
                  <button
                    onClick={() => onMove(idx, 'down')}
                    disabled={isReadOnly || idx === list.length - 1}
                    className="w-6 h-6 rounded bg-background hover:bg-secondary border border-border flex items-center justify-center disabled:opacity-40"
                  >
                    <ArrowDown className="w-3 h-3 text-foreground" />
                  </button>

                  <button
                    onClick={() => onDelete(idx)}
                    disabled={isReadOnly}
                    className="w-6 h-6 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center disabled:opacity-40"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <div className="p-4 border-t border-border bg-secondary/15 flex flex-col gap-2">
        <div className="flex gap-1">
          <Input
            placeholder="Añadir causa raíz..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            disabled={isReadOnly}
            className="h-8 text-xs bg-background"
          />
          <Button onClick={handleAdd} disabled={isReadOnly} size="sm" className="h-8 px-2 flex-shrink-0">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={onReset} disabled={isReadOnly} variant="outline" size="sm" className="flex-1 h-8 text-[11px] px-0 gap-1">
            <RotateCcw className="w-3 h-3" /> Predeterminados
          </Button>
          <Button onClick={onSave} disabled={isReadOnly} size="sm" className="flex-1 h-8 text-[11px] px-0 gap-1 shadow-glow-brand">
            <Save className="w-3 h-3" /> Guardar
          </Button>
        </div>
      </div>
    </Card>
  );
}
