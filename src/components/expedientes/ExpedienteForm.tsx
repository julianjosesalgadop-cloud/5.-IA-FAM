'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Save, ChevronLeft, ChevronRight, Trash2, FileText, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { calcDeducible, calcValorAPagar, calcPorcentajeRecobro } from '@/lib/utils';
import { dbService } from '@/lib/services/dbService';
import { useFormConfig } from '@/hooks/useFormConfig';

function formatCOPInput(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : parseInt(String(value).replace(/\D/g, ''), 10);
  if (isNaN(num)) return '';
  return '$ ' + num.toLocaleString('es-CO');
}

function parseCOPInput(value: string): number {
  const clean = value.replace(/\D/g, '');
  if (!clean) return 0;
  return parseInt(clean, 10);
}

function CurrencyInputField({ 
  control, 
  name, 
  placeholder = '$ 0', 
  className,
  disabled,
  onChangeCustom
}: { 
  control: any; 
  name: string; 
  placeholder?: string; 
  className?: string;
  disabled?: boolean;
  onChangeCustom?: (val: number | null) => void;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <Input
          type="text"
          placeholder={placeholder}
          className={className}
          disabled={disabled}
          value={value !== undefined && value !== null ? formatCOPInput(value) : ''}
          onChange={(e) => {
            const rawValue = parseCOPInput(e.target.value);
            const finalVal = e.target.value === '' ? null : rawValue;
            onChange(finalVal);
            if (onChangeCustom) {
              onChangeCustom(finalVal);
            }
          }}
        />
      )}
    />
  );
}


const baseSchema = z.object({
  fecha_incidente: z.string().optional(),
  placa: z.string().optional(),
  numero_interno: z.string().optional(),
  tipo_servicio: z.string().default('Intermunicipal'),
  tipo_servicio_otro: z.string().optional(),
  clase_vehiculo: z.string().optional(),
  clase_vehiculo_otro: z.string().optional(),
  propietario: z.string().optional(),
  propietarios: z.array(z.object({
    nombre: z.string().min(1, 'Requerido'),
    tipo_documento: z.enum(['CC', 'CE', 'TI', 'NIT', 'PP']),
    numero_documento: z.string().min(1, 'Requerido'),
  })).min(1, 'Debe registrar al menos un propietario'),
  tipo_reclamacion: z.string(),
  tipo_reclamacion_otro: z.string().optional(),
  ciudad_origen: z.string().optional(),
  ciudad_destino: z.string().optional(),
  concepto: z.string().optional(),
  valor_cotizacion: z.number().min(0).optional().nullable(),
  cotizaciones: z.array(z.object({
    id: z.string(),
    proveedor: z.string().optional(),
    tipo_documento: z.enum(['CC', 'CE', 'TI', 'NIT', 'PP']).optional().nullable(),
    numero_documento: z.string().optional().nullable(),
    concepto: z.string().min(1, 'Debe seleccionar una opción'),
    concepto_otro: z.string().optional(),
    valor_cotizacion: z.number().min(0),
    valor_negociado: z.number().min(0),
    porcentaje_deducible: z.number().min(0),
    valor_deducible: z.number().min(0).optional().nullable(),
    valor_a_pagar: z.number().min(0).optional().nullable(),
    nombre_archivo: z.string().optional().nullable(),
    storage_path: z.string().optional().nullable(),
    seleccionada: z.boolean().optional(),
  }).refine(val => {
    if (val.concepto === 'OTROS') {
      return !!val.concepto_otro && val.concepto_otro.trim().length > 0;
    }
    return true;
  }, {
    message: 'Debe especificar el concepto cuando se selecciona "OTROS"',
    path: ['concepto_otro']
  })).optional().nullable(),
  valor_negociado: z.number().min(0).optional().nullable(),
  porcentaje_deducible: z.number().optional().nullable(),
  valor_salvamento: z.number().min(0).optional().nullable(),
  valor_final_aprobado: z.number().min(0).optional().nullable(),
  nombre_conductor: z.string().optional(),
  tipo_documento_conductor: z.enum(['CC', 'CE', 'TI', 'NIT', 'PP']).optional().nullable(),
  id_conductor: z.string().optional(),
  celular_conductor: z.string().optional(),
  culpabilidad: z.string().optional().nullable(),
  valor_descuento_conductor: z.number().min(0).optional().nullable(),
  memorando_descuento: z.string().optional(),
  valor_recobro_vehiculo: z.number().min(0).optional().nullable(),
  valor_recobro_abogado: z.number().min(0).optional().nullable(),
  valor_recobro_empresa: z.number().min(0).optional().nullable(),
  fecha_comite: z.string().optional(),
  causa_raiz: z.string().optional(),
  causa_raiz_otra: z.string().optional(),
  observaciones_comite: z.string().optional(),
  numero_acta: z.string().optional().nullable(),
  autorizado_por: z.string().optional(),
  cargo_autorizador: z.string().optional(),
  fecha_autorizacion: z.string().optional(),
  memorando_pago_nombre: z.string().optional().nullable(),
  memorando_pago_storage_path: z.string().optional().nullable(),
  memorando_pago_archivo_nombre: z.string().optional().nullable(),
});

type ExpedienteFormData = z.infer<typeof baseSchema>;

function getExpedienteSchema(campoConfig: Record<string, any>, currentStep: number) {
  const isRequired = (key: string, defaultRequired = false) => {
    // Si estamos en un paso menor al 4, los campos de la Fase 4 (Comité y Autorización) no deben ser requeridos
    const camposFase4 = [
      'fecha_comite',
      'numero_acta',
      'observaciones_comite',
      'autorizado_por',
      'cargo_autorizador',
      'fecha_autorizacion',
      'memorando_pago_nombre',
      'memorando_pago_archivo'
    ];
    if (camposFase4.includes(key) && currentStep < 4) {
      return false;
    }

    const cfg = campoConfig?.[key];
    if (!cfg) return defaultRequired;
    return cfg.visible && cfg.requerido;
  };

  return z.object({
    fecha_incidente: isRequired('fecha_incidente', true) 
      ? z.string().min(1, 'Requerido') 
      : z.string().optional().nullable(),
    placa: isRequired('placa', true) 
      ? z.string().min(1, 'Requerido').toUpperCase() 
      : z.string().optional().nullable(),
    numero_interno: isRequired('numero_interno', true) 
      ? z.string().min(1, 'Requerido') 
      : z.string().optional().nullable(),
    tipo_servicio: z.string().default('Intermunicipal'),
    tipo_servicio_otro: z.string().optional().nullable(),
    clase_vehiculo: isRequired('clase_vehiculo', true)
      ? z.string().min(1, 'Requerido')
      : z.string().optional().nullable(),
    clase_vehiculo_otro: z.string().optional().nullable(),
    propietario: z.string().optional().nullable(),
    propietarios: isRequired('propietarios', true)
      ? z.array(z.object({
          nombre: z.string().min(1, 'Requerido'),
          tipo_documento: z.enum(['CC', 'CE', 'TI', 'NIT', 'PP']),
          numero_documento: z.string().min(1, 'Requerido'),
        })).min(1, 'Debe registrar al menos un propietario')
      : z.array(z.object({
          nombre: z.string().optional().nullable(),
          tipo_documento: z.enum(['CC', 'CE', 'TI', 'NIT', 'PP']).optional().nullable(),
          numero_documento: z.string().optional().nullable(),
        })).optional().nullable(),
    tipo_reclamacion: z.string(),
    tipo_reclamacion_otro: z.string().optional().nullable(),
    ciudad_origen: isRequired('ciudad_origen', false)
      ? z.string().min(1, 'Requerido')
      : z.string().optional().nullable(),
    ciudad_destino: isRequired('ciudad_destino', false)
      ? z.string().min(1, 'Requerido')
      : z.string().optional().nullable(),
    concepto: isRequired('concepto', false)
      ? z.string().min(1, 'Requerido')
      : z.string().optional().nullable(),
    valor_cotizacion: z.number().min(0).optional().nullable(),
    cotizaciones: z.array(z.object({
      id: z.string(),
      proveedor: isRequired('cotizaciones_proveedor', true)
        ? z.string().min(1, 'Requerido')
        : z.string().optional().nullable(),
      tipo_documento: isRequired('cotizaciones_tipo_documento', false)
        ? z.enum(['CC', 'CE', 'TI', 'NIT', 'PP'], { errorMap: () => ({ message: 'Requerido' }) })
        : z.enum(['CC', 'CE', 'TI', 'NIT', 'PP']).optional().nullable(),
      numero_documento: isRequired('cotizaciones_numero_documento', false)
        ? z.string().min(1, 'Requerido')
        : z.string().optional().nullable(),
      concepto: z.string().min(1, 'Debe seleccionar una opción'),
      concepto_otro: z.string().optional().nullable(),
      valor_cotizacion: isRequired('valor_cotizacion', false)
        ? z.number({ invalid_type_error: 'Requerido' }).min(1, 'Monto debe ser positivo')
        : z.number().min(0).optional().nullable(),
      valor_negociado: isRequired('valor_negociado', false)
        ? z.number({ invalid_type_error: 'Requerido' }).min(1, 'Monto debe ser positivo')
        : z.number().min(0).optional().nullable(),
      porcentaje_deducible: z.number().min(0),
      valor_deducible: z.number().min(0).optional().nullable(),
      valor_a_pagar: z.number().min(0).optional().nullable(),
      nombre_archivo: z.string().optional().nullable(),
      storage_path: z.string().optional().nullable(),
      seleccionada: z.boolean().optional(),
    }).refine(val => {
      if (val.concepto === 'OTROS') {
        return !!val.concepto_otro && val.concepto_otro.trim().length > 0;
      }
      return true;
    }, {
      message: 'Debe especificar el concepto cuando se selecciona "OTROS"',
      path: ['concepto_otro']
    })).optional().nullable(),
    valor_negociado: z.number().min(0).optional().nullable(),
    porcentaje_deducible: z.number().optional().nullable(),
    valor_salvamento: isRequired('valor_salvamento', false)
      ? z.number().min(0, 'Monto debe ser positivo')
      : z.number().min(0).optional().nullable(),
    valor_final_aprobado: isRequired('valor_final_aprobado', false)
      ? z.number().min(0, 'Monto debe ser positivo')
      : z.number().min(0).optional().nullable(),
    nombre_conductor: isRequired('nombre_conductor', false)
      ? z.string().min(1, 'Requerido')
      : z.string().optional().nullable(),
    tipo_documento_conductor: isRequired('id_conductor', false)
      ? z.enum(['CC', 'CE', 'TI', 'NIT', 'PP'], { errorMap: () => ({ message: 'Requerido' }) })
      : z.enum(['CC', 'CE', 'TI', 'NIT', 'PP']).optional().nullable(),
    id_conductor: isRequired('id_conductor', false)
      ? z.string().min(1, 'Requerido')
      : z.string().optional().nullable(),
    celular_conductor: isRequired('celular_conductor', false)
      ? z.string().min(1, 'Requerido')
      : z.string().optional().nullable(),
    culpabilidad: z.string().optional().nullable().refine((val) => {
      if (campoConfig.culpabilidad?.visible) {
        return !!val && val !== "";
      }
      return true;
    }, {
      message: 'Debe seleccionar una opción de culpabilidad'
    }),
    valor_descuento_conductor: isRequired('valor_descuento_conductor', false)
      ? z.number().min(0, 'Monto debe ser positivo')
      : z.number().min(0).optional().nullable(),
    memorando_descuento: isRequired('memorando_descuento', false)
      ? z.string().min(1, 'Requerido')
      : z.string().optional().nullable(),
    valor_recobro_vehiculo: isRequired('valor_recobro_vehiculo', false)
      ? z.number().min(0, 'Monto debe ser positivo')
      : z.number().min(0).optional().nullable(),
    valor_recobro_abogado: isRequired('valor_recobro_abogado', false)
      ? z.number().min(0, 'Monto debe ser positivo')
      : z.number().min(0).optional().nullable(),
    valor_recobro_empresa: isRequired('valor_recobro_empresa', false)
      ? z.number().min(0, 'Monto debe ser positivo')
      : z.number().min(0).optional().nullable(),
    fecha_comite: isRequired('fecha_comite', false)
      ? z.string().min(1, 'Requerido')
      : z.string().optional().nullable(),
    causa_raiz: z.string().optional().nullable(),
    causa_raiz_otra: z.string().optional().nullable(),
    observaciones_comite: isRequired('observaciones_comite', false)
      ? z.string().min(1, 'Requerido')
      : z.string().optional().nullable(),
    numero_acta: isRequired('numero_acta', false)
      ? z.string().min(1, 'Requerido').nullable().refine((val) => {
          if (!val) return false;
          return /^ACTA \d{4}$/i.test(val);
        }, {
          message: 'El formato del acta debe ser ACTA #### (ej: ACTA 0001)'
        })
      : z.string().optional().nullable().refine((val) => {
          if (!val) return true;
          return /^ACTA \d{4}$/i.test(val);
        }, {
          message: 'El formato del acta debe ser ACTA #### (ej: ACTA 0001)'
        }),
    autorizado_por: isRequired('autorizado_por', false)
      ? z.string().min(1, 'Requerido')
      : z.string().optional().nullable(),
    cargo_autorizador: isRequired('cargo_autorizador', false)
      ? z.string().min(1, 'Requerido')
      : z.string().optional().nullable(),
    fecha_autorizacion: isRequired('fecha_autorizacion', false)
      ? z.string().min(1, 'Requerido')
      : z.string().optional().nullable(),
    memorando_pago_nombre: isRequired('memorando_pago_nombre', false)
      ? z.string().min(1, 'Requerido').nullable()
      : z.string().optional().nullable(),
    memorando_pago_storage_path: z.string().optional().nullable(),
    memorando_pago_archivo_nombre: z.string().optional().nullable(),
  }).refine(val => {
    if (val.tipo_servicio === 'Otro') {
      return !!val.tipo_servicio_otro && val.tipo_servicio_otro.trim().length > 0;
    }
    return true;
  }, {
    message: 'Debe especificar el tipo de servicio',
    path: ['tipo_servicio_otro']
  }).refine(val => {
    if (val.clase_vehiculo === 'Otro (Cúal...)') {
      return !!val.clase_vehiculo_otro && val.clase_vehiculo_otro.trim().length > 0;
    }
    return true;
  }, {
    message: 'Debe especificar la clase de vehículo',
    path: ['clase_vehiculo_otro']
  }).refine(val => {
    if (val.tipo_reclamacion === 'Otro') {
      return !!val.tipo_reclamacion_otro && val.tipo_reclamacion_otro.trim().length > 0;
    }
    return true;
  }, {
    message: 'Debe especificar el tipo de reclamación',
    path: ['tipo_reclamacion_otro']
  });
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function FormField({ 
  label, 
  children, 
  required,
  extra
}: { 
  label: string; 
  children: React.ReactNode; 
  required?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between w-full h-5">
        <Label>
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </Label>
        {extra}
      </div>
      {children}
    </div>
  );
}

export function ExpedienteForm({ 
  id, 
  defaultValues, 
  onSuccess 
}: { 
  id?: string; 
  defaultValues?: Partial<ExpedienteFormData> & { estado?: string }; 
  onSuccess?: () => void; 
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [isFinalAprobadoManual, setIsFinalAprobadoManual] = useState(() => {
    if (!defaultValues) return false;
    const cots = defaultValues.cotizaciones || [];
    const selectedCots = cots.filter((c) => c.seleccionada);
    const activeCots = selectedCots.length > 0 ? selectedCots : (cots[0] ? [cots[0]] : []);
    const totalNegociado = activeCots.reduce((acc, c) => acc + (c.valor_negociado || 0), 0);
    const totalDeducible = activeCots.reduce((acc, c) => acc + Math.round(((c.valor_negociado || 0) * (c.porcentaje_deducible || 0)) / 100), 0);
    const calculatedTotal = Math.max(0, totalNegociado - totalDeducible);
    
    const savedVal = defaultValues.valor_final_aprobado;
    if (savedVal === undefined || savedVal === null) return false;
    
    return savedVal !== calculatedTotal;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Scroll any parent element with overflow auto/scroll
      let parent = formRef.current?.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        const hasOverflow = style.overflowY === 'auto' || style.overflowY === 'scroll' || 
                            style.overflow === 'auto' || style.overflow === 'scroll';
        if (hasOverflow) {
          parent.scrollTo({ top: 0, behavior: 'smooth' });
        }
        parent = parent.parentElement;
      }
      
      // 2. Also scroll the main container if found
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // 3. Fallback: Scroll window
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  // Estados para archivos adjuntos durante la creación/edición
  const [archivosPaso1, setArchivosPaso1] = useState<{ id: string; file: File; tipo: string }[]>([]);
  const [cotizacionFiles, setCotizacionFiles] = useState<Record<string, File>>({});
  const [memorandoPagoFile, setMemorandoPagoFile] = useState<File | null>(null);

  const [selAutorizadoPor, setSelAutorizadoPor] = useState(() => {
    const val = defaultValues?.autorizado_por;
    if (!val) return '';
    if (val === 'MARTHA BIBIANA RINCON REYES') return 'MARTHA BIBIANA RINCON REYES';
    return 'Otro';
  });

  const [selCargo, setSelCargo] = useState(() => {
    const val = defaultValues?.cargo_autorizador;
    if (!val) return '';
    if (val === 'GERENTE ADMINISTRATIVA Y FINANCIERA') return 'GERENTE ADMINISTRATIVA Y FINANCIERA';
    return 'Otro';
  });

  const [existingActas, setExistingActas] = useState<string[]>([]);

  useEffect(() => {
    const fetchActas = async () => {
      try {
        const list = await dbService.getExpedientes();
        const actas = Array.from(
          new Set(
            list
              .map((e) => e.numero_acta)
              .filter((acta): acta is string => typeof acta === 'string' && acta.trim() !== '')
          )
        ).sort();
        setExistingActas(actas);
      } catch (err) {
        console.error('Error fetching existing actas:', err);
      }
    };
    fetchActas();
  }, [defaultValues?.numero_acta]);

  const formConfig = useFormConfig();

  const activeTiposReclamacion = React.useMemo(() => 
    formConfig.tiposReclamacion?.filter(t => t?.activo && t?.label?.trim()?.toLowerCase() !== 'otro').sort((a, b) => (a?.orden || 0) - (b?.orden || 0)).map(t => t.label) || [],
    [formConfig.tiposReclamacion]
  );
  
  const activeTiposServicio = React.useMemo(() => 
    formConfig.tiposServicio?.filter(t => t?.activo && t?.label?.trim()?.toLowerCase() !== 'otro').sort((a, b) => (a?.orden || 0) - (b?.orden || 0)).map(t => t.label) || [],
    [formConfig.tiposServicio]
  );

  const activeClasesVehiculo = React.useMemo(() => 
    formConfig.claseVehiculo?.filter(t => t?.activo && t?.label?.trim()?.toLowerCase() !== 'otro (cúal...)').sort((a, b) => (a?.orden || 0) - (b?.orden || 0)).map(t => t.label) || [],
    [formConfig.claseVehiculo]
  );

  const activeCulpabilidades = React.useMemo(() => 
    formConfig.culpabilidades?.filter(c => c?.activo).sort((a, b) => (a?.orden || 0) - (b?.orden || 0)).map(c => c.label) || [],
    [formConfig.culpabilidades]
  );

  const activeAutorizadosPor = React.useMemo(() => 
    formConfig.autorizadosPor?.filter(a => a?.activo && a?.label?.trim()?.toLowerCase() !== 'otro').map(a => a.label) || [],
    [formConfig.autorizadosPor]
  );

  const activeCargos = React.useMemo(() => 
    formConfig.cargos?.filter(c => c?.activo && c?.label?.trim()?.toLowerCase() !== 'otro').map(c => c.label) || [],
    [formConfig.cargos]
  );

  const dynamicSchema = React.useMemo(() => {
    return getExpedienteSchema(formConfig.campoConfig, step);
  }, [formConfig.campoConfig, step]);

  useEffect(() => {
    if (defaultValues) {
      const isAuthDefault = defaultValues.autorizado_por && activeAutorizadosPor.includes(defaultValues.autorizado_por);
      if (isAuthDefault) {
        setSelAutorizadoPor(defaultValues.autorizado_por!);
      } else if (defaultValues.autorizado_por) {
        setSelAutorizadoPor('Otro');
      } else {
        setSelAutorizadoPor('');
      }

      const isCargoDefault = defaultValues.cargo_autorizador && activeCargos.includes(defaultValues.cargo_autorizador);
      if (isCargoDefault) {
        setSelCargo(defaultValues.cargo_autorizador!);
      } else if (defaultValues.cargo_autorizador) {
        setSelCargo('Otro');
      } else {
        setSelCargo('');
      }
    }
  }, [defaultValues, activeAutorizadosPor, activeCargos]);

  const handleMemorandoPagoFileChange = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Solo se permiten documentos en formato PDF.');
      return;
    }
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('El tamaño máximo permitido es de 5MB por documento.');
      return;
    }
    setMemorandoPagoFile(file);
    setValue('memorando_pago_archivo_nombre', file.name);
  };

  const handleAddArchivoPaso1 = (file: File, tipo: string) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Solo se permiten documentos en formato PDF.');
      return;
    }
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('El tamaño máximo permitido es de 5MB por documento.');
      return;
    }
    setArchivosPaso1(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), file, tipo }]);
  };

  const handleCotizacionFileChange = (cotId: string, idx: number, file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Solo se permiten documentos en formato PDF.');
      return;
    }
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('El tamaño máximo permitido es de 5MB por documento.');
      return;
    }
    setCotizacionFiles((prev) => ({ ...prev, [cotId]: file }));
    setValue(`cotizaciones.${idx}.nombre_archivo`, file.name);
  };

  // Check if initial causa_raiz is custom
  const initialCausaRaiz = defaultValues?.causa_raiz;
  const isCustomCausaRaiz = initialCausaRaiz && !formConfig.causasRaiz.includes(initialCausaRaiz as any);

  // Check if initial tipo_reclamacion is custom
  const initialTipoReclamacion = defaultValues?.tipo_reclamacion;
  const isCustomTipoReclamacion = initialTipoReclamacion && !activeTiposReclamacion.includes(initialTipoReclamacion as any);

  // Check if initial tipo_servicio is custom
  const initialTipoServicio = (defaultValues as any)?.tipo_servicio;
  const isCustomTipoServicio = initialTipoServicio && !activeTiposServicio.includes(initialTipoServicio);

  // Check if initial clase_vehiculo is custom
  const initialClaseVehiculo = (defaultValues as any)?.clase_vehiculo;
  const isCustomClaseVehiculo = initialClaseVehiculo && !activeClasesVehiculo.includes(initialClaseVehiculo);

  const form = useForm<ExpedienteFormData>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      tipo_reclamacion: isCustomTipoReclamacion ? 'Otro' : (initialTipoReclamacion || ''),
      tipo_reclamacion_otro: isCustomTipoReclamacion ? initialTipoReclamacion : '',
      tipo_servicio: isCustomTipoServicio ? 'Otro' : (initialTipoServicio || 'Intermunicipal'),
      tipo_servicio_otro: isCustomTipoServicio ? initialTipoServicio : '',
      clase_vehiculo: isCustomClaseVehiculo ? 'Otro (Cúal...)' : (initialClaseVehiculo || ''),
      clase_vehiculo_otro: isCustomClaseVehiculo ? initialClaseVehiculo : '',
      culpabilidad: '',
      propietarios: defaultValues?.propietarios && defaultValues.propietarios.length > 0
        ? defaultValues.propietarios
        : [{ nombre: defaultValues?.propietario || '', tipo_documento: 'CC', numero_documento: '' }],
      tipo_documento_conductor: defaultValues?.tipo_documento_conductor || 'CC',
      cotizaciones: defaultValues?.cotizaciones || [{ 
        id: '1', 
        proveedor: '', 
        tipo_documento: 'NIT',
        numero_documento: '',
        concepto: '', 
        concepto_otro: '', 
        valor_cotizacion: 0, 
        valor_negociado: 0, 
        porcentaje_deducible: 10, 
        valor_deducible: 0, 
        valor_a_pagar: 0,
        nombre_archivo: null,
        storage_path: null
      }],
      ...defaultValues,
      causa_raiz: isCustomCausaRaiz ? 'Otro' : (initialCausaRaiz || ''),
      causa_raiz_otra: isCustomCausaRaiz ? initialCausaRaiz : '',
    },
  });

  const { register, watch, setValue, formState: { errors }, control } = form;

  // Manejar fallos de validación al intentar guardar el formulario
  const onInvalidSubmit = (formErrors: any) => {
    const errorKeys = Object.keys(formErrors);
    if (errorKeys.length === 0) return;

    const getFieldLabel = (key: string): string => {
      if (key === 'cotizaciones') {
        const cotErrors = formErrors.cotizaciones;
        if (Array.isArray(cotErrors)) {
          const subFields = new Set<string>();
          cotErrors.forEach((err: any) => {
            if (err) {
              Object.keys(err).forEach(subKey => {
                if (subKey === 'proveedor') subFields.add('Taller / Proveedor');
                else if (subKey === 'tipo_documento') subFields.add('Tipo de Documento');
                else if (subKey === 'numero_documento') subFields.add('Número de Documento');
                else if (subKey === 'concepto') subFields.add('Concepto de la Cotización');
                else if (subKey === 'valor_cotizacion') subFields.add('Valor Cotización');
                else if (subKey === 'valor_negociado') subFields.add('Valor Negociado');
                else if (subKey === 'concepto_otro') subFields.add('Especificar Concepto');
              });
            }
          });
          if (subFields.size > 0) {
            return Array.from(subFields).join(', ');
          }
        }
        return 'Cotizaciones';
      }
      const cfg = formConfig.campoConfig[key];
      if (cfg?.label) return cfg.label;
      const specialLabels: Record<string, string> = {
        propietarios: 'Propietarios',
        tipo_reclamacion_otro: 'Otro Tipo de Reclamación',
        tipo_servicio_otro: 'Otro Tipo de Servicio',
        clase_vehiculo_otro: 'Clase de Vehículo (Otro)',
        causa_raiz_otra: 'Otra Causa Raíz',
      };
      return specialLabels[key] || key;
    };

    const step1Fields = [
      'fecha_incidente', 'tipo_reclamacion', 'tipo_reclamacion_otro', 
      'placa', 'numero_interno', 'tipo_servicio', 'tipo_servicio_otro', 
      'clase_vehiculo', 'clase_vehiculo_otro',
      'propietarios', 'ciudad_origen', 'ciudad_destino', 'concepto'
    ];
    const step2Fields = [
      'cotizaciones', 'valor_cotizacion', 'valor_negociado', 
      'valor_salvamento', 'valor_final_aprobado'
    ];
    const step3Fields = [
      'nombre_conductor', 'tipo_documento_conductor', 'id_conductor', 
      'celular_conductor', 'culpabilidad', 'valor_descuento_conductor', 
      'memorando_descuento', 'valor_recobro_vehiculo', 'valor_recobro_abogado', 
      'valor_recobro_empresa'
    ];
    
    // Buscar paso del primer error para redireccionar
    const firstErrorKey = errorKeys[0];
    let targetStep = 4;
    if (step1Fields.includes(firstErrorKey)) {
      targetStep = 1;
    } else if (step2Fields.includes(firstErrorKey)) {
      targetStep = 2;
    } else if (step3Fields.includes(firstErrorKey)) {
      targetStep = 3;
    }
    
    if (targetStep !== step) {
      setStep(targetStep);
    }

    // Agrupar errores por paso
    const missingStep1 = errorKeys.filter(k => step1Fields.includes(k)).map(k => getFieldLabel(k));
    const missingStep2 = errorKeys.filter(k => step2Fields.includes(k)).map(k => getFieldLabel(k));
    const missingStep3 = errorKeys.filter(k => step3Fields.includes(k)).map(k => getFieldLabel(k));
    const missingStep4 = errorKeys.filter(k => !step1Fields.includes(k) && !step2Fields.includes(k) && !step3Fields.includes(k)).map(k => getFieldLabel(k));

    const messageParts = [];
    if (missingStep1.length > 0) messageParts.push(`Paso 1: ${missingStep1.join(', ')}`);
    if (missingStep2.length > 0) messageParts.push(`Paso 2: ${missingStep2.join(', ')}`);
    if (missingStep3.length > 0) messageParts.push(`Paso 3: ${missingStep3.join(', ')}`);
    if (missingStep4.length > 0) messageParts.push(`Paso 4: ${missingStep4.join(', ')}`);

    toast.error(
      <div className="space-y-1 text-left">
        <p className="font-bold text-sm">No se pudo guardar el expediente</p>
        <p className="text-xs text-muted-foreground">Faltan diligenciar los siguientes campos obligatorios:</p>
        <div className="text-xs space-y-1 mt-2 font-semibold border-l-2 border-destructive pl-2">
          {messageParts.map((part, index) => (
            <p key={index}>{part}</p>
          ))}
        </div>
      </div>,
      { duration: 6000 }
    );
  };

  const cotizaciones = watch('cotizaciones') || [];

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'cotizaciones',
  });

  // Auto-seleccionar cotización si solo hay una
  React.useEffect(() => {
    if (cotizaciones.length === 1 && !cotizaciones[0]?.seleccionada) {
      setValue('cotizaciones.0.seleccionada', true);
    }
  }, [cotizaciones.length, setValue, cotizaciones]);
  const { fields: propietariosFields, append: appendPropietario, remove: removePropietario } = useFieldArray({
    control,
    name: 'propietarios',
  });
  const watchCausaRaiz = watch('causa_raiz');

  // Calcular totales financieros de cotizaciones en tiempo de renderizado (Suma de cotizaciones seleccionadas)
  const selectedCots = cotizaciones.filter((c) => c.seleccionada);
  const activeCots = selectedCots.length > 0 ? selectedCots : (cotizaciones[0] ? [cotizaciones[0]] : []);

  const selectedValorCotizacion = activeCots.reduce((acc, c) => acc + (c.valor_cotizacion || 0), 0);
  const totalCotizacion = cotizaciones.reduce((acc, c) => acc + (c.valor_cotizacion || 0), 0);
  const totalNegociado = activeCots.reduce((acc, c) => acc + (c.valor_negociado || 0), 0);
  const totalDeducible = activeCots.reduce((acc, c) => acc + Math.round(((c.valor_negociado || 0) * (c.porcentaje_deducible || 0)) / 100), 0);
  const totalAPagar = Math.max(0, totalNegociado - totalDeducible);

  // Sincronizar valor_final_aprobado con el cálculo neto a pagar (totalAPagar) si no es manual
  React.useEffect(() => {
    if (!isFinalAprobadoManual) {
      setValue('valor_final_aprobado', totalAPagar);
    }
  }, [totalAPagar, setValue, isFinalAprobadoManual]);

  const valorRecVehiculo = watch('valor_recobro_vehiculo') || 0;
  const valorRecAbogado = watch('valor_recobro_abogado') || 0;
  const valorRecEmpresa = watch('valor_recobro_empresa') || 0;
  
  const pctVehiculo = calcPorcentajeRecobro(valorRecVehiculo, totalNegociado);
  const pctAbogado = calcPorcentajeRecobro(valorRecAbogado, totalNegociado);
  const pctEmpresa = calcPorcentajeRecobro(valorRecEmpresa, totalNegociado);

  const onSubmit = async (data: ExpedienteFormData) => {
    setIsSubmitting(true);
    try {
      // Calcular valores deducibles y a pagar para cada cotización individual para el payload
      const updatedCotizaciones = (data.cotizaciones || []).map((cot) => {
        const vNeg = cot.valor_negociado || 0;
        const pct = cot.porcentaje_deducible || 0;
        const vDed = Math.round((vNeg * pct) / 100);
        const vPag = Math.max(0, vNeg - vDed);
        return {
          ...cot,
          valor_deducible: vDed,
          valor_a_pagar: vPag,
        };
      });

      // Sumar valores de todas las cotizaciones seleccionadas para guardar datos consolidados
      const selectedCotsData = updatedCotizaciones.filter((c) => c.seleccionada);
      const activeCotsData = selectedCotsData.length > 0 ? selectedCotsData : (updatedCotizaciones[0] ? [updatedCotizaciones[0]] : []);

      const finalValorCotizacion = activeCotsData.reduce((acc, c) => acc + (c.valor_cotizacion || 0), 0);
      const finalNegociado = activeCotsData.reduce((acc, c) => acc + (c.valor_negociado || 0), 0);
      const finalDeducible = activeCotsData.reduce((acc, c) => acc + (c.valor_deducible || 0), 0);
      const finalAPagar = Math.max(0, finalNegociado - finalDeducible);

      const firstActiveCot = activeCotsData[0];

      const { causa_raiz_otra, tipo_reclamacion_otro, tipo_servicio_otro, clase_vehiculo_otro, ...restData } = data;
      const finalCausaRaiz = data.causa_raiz === 'Otro' ? (causa_raiz_otra || 'Otro') : data.causa_raiz;
      const finalTipoReclamacion = data.tipo_reclamacion === 'Otro' ? (tipo_reclamacion_otro || 'Otro') : data.tipo_reclamacion;
      const finalTipoServicio = data.tipo_servicio === 'Otro' ? (tipo_servicio_otro || 'Otro') : data.tipo_servicio;
      const finalClaseVehiculo = data.clase_vehiculo === 'Otro (Cúal...)' ? (clase_vehiculo_otro || 'Otro') : data.clase_vehiculo;
      const finalData = {
        ...restData,
        causa_raiz: finalCausaRaiz,
        tipo_reclamacion: finalTipoReclamacion,
        tipo_servicio: finalTipoServicio,
        clase_vehiculo: finalClaseVehiculo,
        clase_vehiculo_otro: data.clase_vehiculo === 'Otro (Cúal...)' ? clase_vehiculo_otro : '',
        fecha_comite: data.fecha_comite ? data.fecha_comite : null,
        fecha_autorizacion: data.fecha_autorizacion ? data.fecha_autorizacion : null,
        numero_acta: data.numero_acta ? data.numero_acta.trim().toUpperCase() : null,
        propietario: data.propietarios && data.propietarios.length > 0
          ? data.propietarios.map((p) => p.nombre).join(', ')
          : '',
        cotizaciones: updatedCotizaciones,
        valor_cotizacion: finalValorCotizacion,
        valor_negociado: finalNegociado,
        valor_deducible: finalDeducible,
        valor_a_pagar: finalAPagar,
        // porcentaje_deducible se guarda como el de la primera cotización activa
        porcentaje_deducible: firstActiveCot?.porcentaje_deducible || null,
        porcentaje_recobro_vehiculo: pctVehiculo,
        porcentaje_recobro_abogado: pctAbogado,
        porcentaje_recobro_empresa: pctEmpresa,
      };

      let createdId = id;
      let numeroExp = (defaultValues as any)?.numero_expediente || '';
      if (id) {
        await dbService.updateExpediente(id, finalData as any);
        toast.success('Expediente actualizado exitosamente');
      } else {
        const created = await dbService.createExpediente(finalData as any);
        createdId = created.id;
        numeroExp = created.numero_expediente;
        toast.success(`Expediente creado exitosamente: ${created.numero_expediente}`);
      }

      // Subir los archivos adjuntos vinculados al expediente
      if (createdId) {
        // 1. Subir archivos generales de paso 1
        for (const item of archivosPaso1) {
          try {
            await dbService.uploadDocumento(createdId, item.file, item.tipo, numeroExp);
          } catch (uploadError) {
            console.error('Error al subir documento adjunto paso 1:', uploadError);
            toast.error(`No se pudo cargar el archivo ${item.file.name}: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
          }
        }

        // 2. Subir archivos de cotización individual del paso 2 y actualizar sus paths
        const updatedCotizacionesFinal = [];
        let modifiedQuotes = false;
        for (let i = 0; i < updatedCotizaciones.length; i++) {
          const cot = updatedCotizaciones[i];
          const file = cotizacionFiles[cot.id];
          if (file) {
            try {
              const uploadedDoc = await dbService.uploadDocumento(createdId, file, 'Cotización', numeroExp);
              updatedCotizacionesFinal.push({
                ...cot,
                nombre_archivo: file.name,
                storage_path: uploadedDoc.storage_path,
              });
              modifiedQuotes = true;
            } catch (uploadError) {
              console.error('Error al subir documento de cotización:', uploadError);
              toast.error(`No se pudo cargar la cotización de ${cot.proveedor}: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
              updatedCotizacionesFinal.push(cot);
            }
          } else {
            updatedCotizacionesFinal.push(cot);
          }
        }

        // Si se subieron archivos de cotización, actualizamos la lista en el expediente
        if (modifiedQuotes) {
          await dbService.updateExpediente(createdId, {
            cotizaciones: updatedCotizacionesFinal
          } as any);
        }

        // 3. Subir archivo de memorando de pago de paso 4 (si se seleccionó uno nuevo)
        if (memorandoPagoFile) {
          try {
            const uploadedDoc = await dbService.uploadDocumento(createdId, memorandoPagoFile, 'Memorando', numeroExp);
            await dbService.updateExpediente(createdId, {
              memorando_pago_archivo_nombre: memorandoPagoFile.name,
              memorando_pago_storage_path: uploadedDoc.storage_path,
            } as any);
          } catch (uploadError) {
            console.error('Error al subir documento de memorando de pago:', uploadError);
            toast.error(`No se pudo cargar el archivo del memorando de pago: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
          }
        }
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/expedientes');
      }
    } catch (error: any) {
      console.error("Error al guardar el expediente:", error?.message || error?.details || error);
      toast.error(error?.message || 'Error al guardar el expediente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'bg-background border-border focus:ring-primary';

  if (id && defaultValues?.estado && defaultValues.estado !== 'Pendiente') {
    return (
      <Card className="max-w-4xl mx-auto border-destructive bg-destructive/5 p-6 text-center">
        <CardHeader>
          <CardTitle className="text-destructive font-bold text-xl">Acceso Denegado</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Este expediente se encuentra en estado <strong className="text-foreground">{defaultValues.estado}</strong> y no puede ser modificado.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4">
          <Button onClick={() => {
            if (onSuccess) onSuccess();
            else router.push(`/expedientes/${id}`);
          }} variant="outline">
            Volver al Detalle
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
          e.preventDefault();
        }
      }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {formConfig.pasos.map((s, i) => (
          <React.Fragment key={s.id}>
            <button
              type="button"
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                step === s.id
                  ? 'gradient-brand text-white'
                  : step > s.id
                  ? 'bg-green-500/15 text-green-400'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs">
                {s.id}
              </span>
              <span className="hidden sm:block">{s.label}</span>
            </button>
            {i < formConfig.pasos.length - 1 && (
              <div className="flex-1 h-px bg-border" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{formConfig.pasos[step - 1]?.label || ''}</CardTitle>
            <CardDescription>{formConfig.pasos[step - 1]?.description || ''}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: General Info */}
            {step === 1 && (
              <>
                <FieldGroup>
                  {formConfig.campoConfig.fecha_incidente?.visible && (
                    <FormField label={formConfig.campoConfig.fecha_incidente.label} required={formConfig.campoConfig.fecha_incidente.requerido}>
                      <Input type="date" {...register('fecha_incidente')} className={inputClass} />
                      {errors.fecha_incidente && <p className="text-red-400 text-xs">{errors.fecha_incidente.message}</p>}
                    </FormField>
                  )}
                  {formConfig.campoConfig.tipo_reclamacion?.visible && (
                    <div className="space-y-1.5">
                      <FormField label={formConfig.campoConfig.tipo_reclamacion.label} required={formConfig.campoConfig.tipo_reclamacion.requerido}>
                        <select
                          {...register('tipo_reclamacion')}
                          className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Seleccionar tipo...</option>
                          {activeTiposReclamacion.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                          <option value="Otro">Otro (Especificar)</option>
                        </select>
                      </FormField>
                      {watch('tipo_reclamacion') === 'Otro' && (
                        <div className="pt-1.5">
                          <Label className="text-xs text-muted-foreground font-semibold">Especifique Tipo de Reclamación *</Label>
                          <Input placeholder="¿Cuál?" {...register('tipo_reclamacion_otro')} className={inputClass} />
                          {errors.tipo_reclamacion_otro && <p className="text-red-400 text-xs mt-1">{errors.tipo_reclamacion_otro.message}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </FieldGroup>
                <FieldGroup>
                  {formConfig.campoConfig.placa?.visible && (
                    <FormField label={formConfig.campoConfig.placa.label} required={formConfig.campoConfig.placa.requerido}>
                      <Input placeholder={formConfig.campoConfig.placa.placeholder} {...register('placa')} className={`${inputClass} font-mono uppercase`} />
                      {errors.placa && <p className="text-red-400 text-xs">{errors.placa.message}</p>}
                    </FormField>
                  )}
                  {formConfig.campoConfig.numero_interno?.visible && (
                    <FormField label={formConfig.campoConfig.numero_interno.label} required={formConfig.campoConfig.numero_interno.requerido}>
                      <Input placeholder={formConfig.campoConfig.numero_interno.placeholder} {...register('numero_interno')} className={inputClass} />
                      {errors.numero_interno && <p className="text-red-400 text-xs">{errors.numero_interno.message}</p>}
                    </FormField>
                  )}
                </FieldGroup>

                <FieldGroup>
                  {formConfig.campoConfig.tipo_servicio?.visible && (
                    <FormField label={formConfig.campoConfig.tipo_servicio.label} required={formConfig.campoConfig.tipo_servicio.requerido}>
                      <select
                        {...register('tipo_servicio')}
                        className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {activeTiposServicio.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                        <option value="Otro">Otro</option>
                      </select>
                      {errors.tipo_servicio && <p className="text-red-400 text-xs">{errors.tipo_servicio.message}</p>}
                    </FormField>
                  )}

                  {formConfig.campoConfig.clase_vehiculo?.visible && (
                    <FormField label={formConfig.campoConfig.clase_vehiculo.label} required={formConfig.campoConfig.clase_vehiculo.requerido}>
                      <select
                        {...register('clase_vehiculo')}
                        className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Seleccione clase...</option>
                        {activeClasesVehiculo.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      {errors.clase_vehiculo && <p className="text-red-400 text-xs">{errors.clase_vehiculo.message}</p>}
                    </FormField>
                  )}
                </FieldGroup>

                {(watch('tipo_servicio') === 'Otro' || watch('clase_vehiculo') === 'Otro (Cúal...)') && (
                  <FieldGroup>
                    {watch('tipo_servicio') === 'Otro' ? (
                      <FormField label="Especifique Tipo de Servicio" required>
                        <Input placeholder="¿Cuál?" {...register('tipo_servicio_otro')} className={inputClass} />
                        {errors.tipo_servicio_otro && <p className="text-red-400 text-xs">{errors.tipo_servicio_otro.message}</p>}
                      </FormField>
                    ) : (
                      <div />
                    )}

                    {watch('clase_vehiculo') === 'Otro (Cúal...)' ? (
                      <FormField label="Especifique Clase de Vehículo" required>
                        <Input placeholder="¿Cuál?" {...register('clase_vehiculo_otro')} className={inputClass} />
                        {errors.clase_vehiculo_otro && <p className="text-red-400 text-xs">{errors.clase_vehiculo_otro.message}</p>}
                      </FormField>
                    ) : (
                      <div />
                    )}
                  </FieldGroup>
                )}

                {formConfig.campoConfig.propietarios?.visible && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-foreground">
                        {formConfig.campoConfig.propietarios.label} {formConfig.campoConfig.propietarios.requerido && '*'}
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendPropietario({ nombre: '', tipo_documento: 'CC', numero_documento: '' })}
                      >
                        + Añadir Propietario
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {propietariosFields.map((fieldItem, idx) => (
                        <div key={fieldItem.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-4 rounded-xl border border-border bg-card shadow-sm relative">
                          <div className="sm:col-span-5 space-y-1.5">
                            <Label className="text-xs text-muted-foreground font-semibold">Nombre y Apellido / Razón Social (Solo primer nombre y primer apellido) *</Label>
                            <Input
                              placeholder="Ej: JUAN PEREZ (solo primer nombre y primer apellido)"
                              {...register(`propietarios.${idx}.nombre` as const)}
                              className={inputClass}
                            />
                            {errors.propietarios?.[idx]?.nombre && (
                              <p className="text-red-400 text-xs mt-1">Requerido</p>
                            )}
                          </div>

                          <div className="sm:col-span-3 space-y-1.5">
                            <Label className="text-xs text-muted-foreground font-semibold">Tipo de Documento *</Label>
                            <select
                              {...register(`propietarios.${idx}.tipo_documento` as const)}
                              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="CC">CC - Cédula de Ciudadanía</option>
                              <option value="CE">CE - Cédula de Extranjería</option>
                              <option value="TI">TI - Tarjeta de Identidad</option>
                              <option value="NIT">NIT - NIT</option>
                              <option value="PP">PP - Pasaporte</option>
                            </select>
                          </div>

                          <div className="sm:col-span-3 space-y-1.5">
                            <Label className="text-xs text-muted-foreground font-semibold">Número de Documento *</Label>
                            <Input
                              placeholder="Número de doc"
                              {...register(`propietarios.${idx}.numero_documento` as const)}
                              className={inputClass}
                            />
                            {errors.propietarios?.[idx]?.numero_documento && (
                              <p className="text-red-400 text-xs mt-1">Requerido</p>
                            )}
                          </div>

                          <div className="sm:col-span-1 flex justify-center pb-0.5">
                            {propietariosFields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-red-400 hover:text-red-500 hover:bg-red-500/10 h-9 w-9 rounded-lg"
                                onClick={() => removePropietario(idx)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {errors.propietarios?.root && (
                        <p className="text-red-400 text-xs">{errors.propietarios.root.message}</p>
                      )}
                    </div>
                  </div>
                )}

                <FieldGroup>
                  {formConfig.campoConfig.ciudad_origen?.visible && (
                    <FormField label={formConfig.campoConfig.ciudad_origen.label} required={formConfig.campoConfig.ciudad_origen.requerido}>
                      <Input placeholder={formConfig.campoConfig.ciudad_origen.placeholder} {...register('ciudad_origen')} className={inputClass} />
                    </FormField>
                  )}
                  {formConfig.campoConfig.ciudad_destino?.visible && (
                    <FormField label={formConfig.campoConfig.ciudad_destino.label} required={formConfig.campoConfig.ciudad_destino.requerido}>
                      <Input placeholder={formConfig.campoConfig.ciudad_destino.placeholder} {...register('ciudad_destino')} className={inputClass} />
                    </FormField>
                  )}
                </FieldGroup>

                {formConfig.campoConfig.concepto?.visible && (
                  <FormField label={formConfig.campoConfig.concepto.label} required={formConfig.campoConfig.concepto.requerido}>
                    <textarea
                      {...register('concepto')}
                      rows={3}
                      placeholder={formConfig.campoConfig.concepto.placeholder}
                      className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </FormField>
                )}

                <div className="space-y-3 pt-4 border-t border-border/60">
                  <Label className="text-sm font-bold text-foreground">Documentos Adjuntos (PDF, máx. 5MB)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-secondary/10 p-4 rounded-xl border border-border">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Tipo de Documento</Label>
                      <select
                        id="step1_doc_type"
                        className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {formConfig.tiposDocPaso1.filter(d => d.activo).map((d) => (
                          <option key={d.label} value={d.label}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Seleccionar PDF</Label>
                      <Input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium text-foreground cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const selectEl = document.getElementById('step1_doc_type') as HTMLSelectElement;
                            handleAddArchivoPaso1(file, selectEl?.value || 'Solicitud');
                            e.target.value = ''; // Limpiar el input
                          }
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground pb-2.5">
                      Soporta únicamente archivos PDF de hasta 5MB.
                    </div>
                  </div>

                  {archivosPaso1.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-muted-foreground">Archivos seleccionados:</span>
                      <div className="border border-border rounded-xl divide-y divide-border/60 bg-card overflow-hidden">
                        {archivosPaso1.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 hover:bg-secondary/10 transition-colors">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium text-foreground truncate max-w-[250px] sm:max-w-md">
                                {item.file.name}
                              </span>
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                                {item.tipo}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-red-400 hover:text-red-500 hover:bg-red-500/10 h-7 w-7 rounded-lg"
                              onClick={() => setArchivosPaso1(prev => prev.filter(f => f.id !== item.id))}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Step 2: Financial */}
            {step === 2 && (() => {
              const activeConceptos = formConfig.conceptosCotizacion
                .filter(c => c.activo)
                .sort((a, b) => a.orden - b.orden)
                .map(c => c.label);

              return (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-foreground">Cotizaciones Presentadas (1 o más)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ 
                          id: Math.random().toString(36).substring(2, 9), 
                          proveedor: '', 
                          tipo_documento: 'NIT',
                          numero_documento: '',
                          concepto: '', 
                          concepto_otro: '', 
                          valor_cotizacion: 0, 
                          valor_negociado: 0, 
                          porcentaje_deducible: 10, 
                          valor_deducible: 0, 
                          valor_a_pagar: 0,
                          nombre_archivo: null,
                          storage_path: null
                        })}
                      >
                        + Añadir Cotización
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {fields.map((fieldItem, idx) => {
                        const watchConcepto = watch(`cotizaciones.${idx}.concepto`);
                        const vNeg = watch(`cotizaciones.${idx}.valor_negociado`) || 0;
                        const pct = watch(`cotizaciones.${idx}.porcentaje_deducible`) || 0;
                        const vDed = Math.round((vNeg * pct) / 100);
                        const vPag = Math.max(0, vNeg - vDed);

                        const isSelected = !!watch(`cotizaciones.${idx}.seleccionada`);
                        return (
                          <div key={fieldItem.id} className={`relative p-5 rounded-2xl border bg-card shadow-sm space-y-4 transition-all ${isSelected ? 'border-green-500/80 shadow-green-500/5' : 'border-border'}`}>
                            {/* Header / Delete button */}
                            <div className="flex items-center justify-between pb-2 border-b border-border/60">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-primary uppercase tracking-wider font-mono">
                                  Cotización #{idx + 1}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    id={`cotizaciones-sel-${idx}`}
                                    checked={isSelected}
                                    onChange={() => {
                                      setValue(`cotizaciones.${idx}.seleccionada`, !isSelected);
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500 bg-background cursor-pointer"
                                  />
                                  <label
                                    htmlFor={`cotizaciones-sel-${idx}`}
                                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer font-medium select-none"
                                  >
                                    {isSelected ? (
                                      <span className="text-green-400 font-semibold">✓ Aprobada para Desembolso</span>
                                    ) : (
                                      <span>Seleccionar para Desembolso</span>
                                    )}
                                  </label>
                                </div>
                              </div>
                              {fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-400 hover:text-red-500 hover:bg-red-500/10 h-7 w-7 rounded-lg"
                                  onClick={() => remove(idx)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            {/* Row 1: Provider Identity */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                              {formConfig.campoConfig.cotizaciones_proveedor?.visible && (
                                <div className="md:col-span-5">
                                  <FormField 
                                    label={formConfig.campoConfig.cotizaciones_proveedor.label} 
                                    required={formConfig.campoConfig.cotizaciones_proveedor.requerido}
                                  >
                                    <Input
                                      placeholder={formConfig.campoConfig.cotizaciones_proveedor.placeholder}
                                      {...register(`cotizaciones.${idx}.proveedor` as const)}
                                      className={inputClass}
                                    />
                                    {errors.cotizaciones?.[idx]?.proveedor && (
                                      <p className="text-red-400 text-xs mt-1">Requerido</p>
                                    )}
                                  </FormField>
                                </div>
                              )}

                              {formConfig.campoConfig.cotizaciones_tipo_documento?.visible && (
                                <div className="md:col-span-3">
                                  <FormField 
                                    label={formConfig.campoConfig.cotizaciones_tipo_documento.label} 
                                    required={formConfig.campoConfig.cotizaciones_tipo_documento.requerido}
                                  >
                                    <select
                                      {...register(`cotizaciones.${idx}.tipo_documento` as const)}
                                      className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                      <option value="NIT">NIT - NIT</option>
                                      <option value="CC">CC - Cédula de Ciudadanía</option>
                                      <option value="CE">CE - Cédula de Extranjería</option>
                                      <option value="TI">TI - Tarjeta de Identidad</option>
                                      <option value="PP">PP - Pasaporte</option>
                                    </select>
                                    {errors.cotizaciones?.[idx]?.tipo_documento && (
                                      <p className="text-red-400 text-xs mt-1">Requerido</p>
                                    )}
                                  </FormField>
                                </div>
                              )}

                              {formConfig.campoConfig.cotizaciones_numero_documento?.visible && (
                                <div className="md:col-span-4">
                                  <FormField 
                                    label={formConfig.campoConfig.cotizaciones_numero_documento.label} 
                                    required={formConfig.campoConfig.cotizaciones_numero_documento.requerido}
                                  >
                                    <Input
                                      placeholder={formConfig.campoConfig.cotizaciones_numero_documento.placeholder}
                                      {...register(`cotizaciones.${idx}.numero_documento` as const)}
                                      className={`${inputClass} number-font`}
                                    />
                                    {errors.cotizaciones?.[idx]?.numero_documento && (
                                      <p className="text-red-400 text-xs mt-1">Requerido</p>
                                    )}
                                  </FormField>
                                </div>
                              )}
                            </div>

                            {/* Row 1.5: Concept */}
                            <div className="grid grid-cols-1 gap-4">
                              <FormField label="Concepto de la Cotización" required>
                                <select
                                  {...register(`cotizaciones.${idx}.concepto` as const)}
                                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                  <option value="">Seleccione una opción...</option>
                                  {activeConceptos.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                                {errors.cotizaciones?.[idx]?.concepto && (
                                  <p className="text-red-400 text-xs mt-1">
                                    {errors.cotizaciones[idx]?.concepto?.message || 'Requerido'}
                                  </p>
                                )}
                              </FormField>

                              {watchConcepto === 'OTROS' && (
                                <FormField label="Especificar Concepto" required>
                                  <Input
                                    placeholder="Especifica el concepto alternativo..."
                                    {...register(`cotizaciones.${idx}.concepto_otro` as const)}
                                    className={inputClass}
                                  />
                                  {errors.cotizaciones?.[idx]?.concepto_otro && (
                                    <p className="text-red-400 text-xs mt-1">
                                      {errors.cotizaciones[idx]?.concepto_otro?.message || 'Requerido'}
                                    </p>
                                  )}
                                </FormField>
                              )}
                            </div>

                            {/* Row 2: Financial amounts */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                              {formConfig.campoConfig.valor_cotizacion?.visible && (
                                <FormField label={formConfig.campoConfig.valor_cotizacion.label} required={formConfig.campoConfig.valor_cotizacion.requerido}>
                                  <CurrencyInputField
                                    control={control}
                                    name={`cotizaciones.${idx}.valor_cotizacion`}
                                    placeholder={formConfig.campoConfig.valor_cotizacion.placeholder}
                                    className={`${inputClass} number-font`}
                                  />
                                </FormField>
                              )}

                              {formConfig.campoConfig.valor_negociado?.visible && (
                                <FormField label={formConfig.campoConfig.valor_negociado.label} required={formConfig.campoConfig.valor_negociado.requerido}>
                                  <CurrencyInputField
                                    control={control}
                                    name={`cotizaciones.${idx}.valor_negociado`}
                                    placeholder={formConfig.campoConfig.valor_negociado.placeholder}
                                    className={`${inputClass} number-font`}
                                  />
                                </FormField>
                              )}

                              <FormField label="Deducible (%)">
                                <select
                                  {...register(`cotizaciones.${idx}.porcentaje_deducible` as const, { valueAsNumber: true })}
                                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                  <option value={0}>Sin deducible (0%)</option>
                                  {formConfig.opcionesDeducible.filter(d => d.activo).map((d) => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                  ))}
                                </select>
                              </FormField>

                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{formConfig.campoConfig.valor_deducible?.label || 'Valor Deducible'}</Label>
                                <Input
                                  readOnly
                                  value={formatCOPInput(vDed)}
                                  className={`${inputClass} number-font bg-secondary/50 text-yellow-500 cursor-not-allowed`}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground font-bold">{formConfig.campoConfig.valor_a_pagar?.label || 'Valor a Pagar'}</Label>
                                <Input
                                  readOnly
                                  value={formatCOPInput(vPag)}
                                  className={`${inputClass} number-font bg-secondary/50 font-bold text-green-400 cursor-not-allowed`}
                                />
                              </div>
                            </div>

                            {/* Row 3: Attached PDF Document for this Quote */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/40">
                              <FormField label="Documento PDF de la Cotización">
                                <div className="relative flex items-center justify-between border border-border bg-background rounded-lg px-3 h-10 overflow-hidden text-sm">
                                  <span className="truncate pr-4 text-muted-foreground">
                                    {cotizacionFiles[cotizaciones[idx]?.id || '']
                                      ? cotizacionFiles[cotizaciones[idx]?.id || ''].name
                                      : (watch(`cotizaciones.${idx}.nombre_archivo`) || 'Ningún archivo seleccionado')}
                                  </span>
                                  {(cotizacionFiles[cotizaciones[idx]?.id || ''] || watch(`cotizaciones.${idx}.nombre_archivo`)) ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCotizacionFiles((prev) => {
                                          const copy = { ...prev };
                                          delete copy[cotizaciones[idx]?.id || ''];
                                          return copy;
                                        });
                                        setValue(`cotizaciones.${idx}.nombre_archivo`, null);
                                        setValue(`cotizaciones.${idx}.storage_path`, null);
                                      }}
                                      className="text-red-400 hover:text-red-500"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <label className="cursor-pointer font-semibold text-primary hover:underline">
                                      Examinar...
                                      <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleCotizacionFileChange(cotizaciones[idx]?.id || '', idx, file);
                                            e.target.value = ''; // Limpiar input
                                          }
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              </FormField>
                              <div className="text-xs text-muted-foreground flex items-center">
                                Suba la cotización correspondiente en formato PDF (máx. 5MB).
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary of totals */}
                  <div className="rounded-xl border border-border p-5 bg-secondary/20 space-y-3">
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                      Consolidado Financiero (Cotización Seleccionada)
                    </h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {cotizaciones.length > 1 ? 'Valor Cotizado (Seleccionada):' : 'Valor Cotizado:'}
                      </span>
                      <span className="number-font text-foreground font-semibold">{formatCOPInput(selectedValorCotizacion)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor Negociado (Aprobado):</span>
                      <span className="number-font text-foreground font-semibold">{formatCOPInput(totalNegociado)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{formConfig.campoConfig.valor_deducible?.label || 'Deducible Aplicado (Aprobado)'}:</span>
                      <span className="number-font text-yellow-400 font-semibold">- {formatCOPInput(totalDeducible)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-base font-bold">
                      <span>{formConfig.campoConfig.valor_a_pagar?.label || 'Neto a Pagar (Desembolso)'}:</span>
                      <span className="number-font text-green-400">{formatCOPInput(totalAPagar)}</span>
                    </div>
                  </div>

                  <FieldGroup>
                    {formConfig.campoConfig.valor_salvamento?.visible && (
                      <FormField label={formConfig.campoConfig.valor_salvamento.label} required={formConfig.campoConfig.valor_salvamento.requerido}>
                        <CurrencyInputField
                          control={control}
                          name="valor_salvamento"
                          placeholder={formConfig.campoConfig.valor_salvamento.placeholder}
                          className={`${inputClass} number-font`}
                        />
                      </FormField>
                    )}
                    {formConfig.campoConfig.valor_final_aprobado?.visible && (
                      <FormField 
                        label={formConfig.campoConfig.valor_final_aprobado.label} 
                        required={formConfig.campoConfig.valor_final_aprobado.requerido}
                        extra={
                          isFinalAprobadoManual ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
                              ✍️ Manual
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                              ⚙️ Autocalculado
                            </span>
                          )
                        }
                      >
                        <CurrencyInputField
                          control={control}
                          name="valor_final_aprobado"
                          placeholder={formConfig.campoConfig.valor_final_aprobado.placeholder}
                          className="bg-emerald-500/5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20 font-bold text-base number-font shadow-[0_0_12px_rgba(16,185,129,0.06)] transition-all hover:border-emerald-500/50 h-10"
                          onChangeCustom={(val) => {
                            if (val === null || val === undefined) {
                              setIsFinalAprobadoManual(false);
                            } else {
                              setIsFinalAprobadoManual(true);
                            }
                          }}
                        />
                      </FormField>
                    )}
                  </FieldGroup>
                </>
              );
            })()}

            {/* Step 3: Conductor & Recobros */}
            {step === 3 && (
              <>
                <p className="text-sm font-semibold text-foreground">Información del Conductor</p>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  {formConfig.campoConfig.nombre_conductor?.visible && (
                    <div className="md:col-span-5">
                      <FormField label={`${formConfig.campoConfig.nombre_conductor.label} (Solo primer nombre y primer apellido)`} required={formConfig.campoConfig.nombre_conductor.requerido}>
                        <Input placeholder="Ej: JUAN PEREZ (solo primer nombre y primer apellido)" {...register('nombre_conductor')} className={inputClass} />
                        {errors.nombre_conductor && <p className="text-red-400 text-xs">{errors.nombre_conductor.message}</p>}
                      </FormField>
                    </div>
                  )}
                  {formConfig.campoConfig.id_conductor?.visible && (
                    <>
                      <div className="md:col-span-3">
                        <FormField label="Tipo de Documento">
                          <select
                            {...register('tipo_documento_conductor')}
                            className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="CC">CC - Cédula de Ciudadanía</option>
                            <option value="CE">CE - Cédula de Extranjería</option>
                            <option value="TI">TI - Tarjeta de Identidad</option>
                            <option value="NIT">NIT - NIT</option>
                            <option value="PP">PP - Pasaporte</option>
                          </select>
                        </FormField>
                      </div>
                      <div className="md:col-span-4">
                        <FormField label={formConfig.campoConfig.id_conductor.label} required={formConfig.campoConfig.id_conductor.requerido}>
                          <Input placeholder={formConfig.campoConfig.id_conductor.placeholder} {...register('id_conductor')} className={`${inputClass} number-font`} />
                          {errors.id_conductor && <p className="text-red-400 text-xs">{errors.id_conductor.message}</p>}
                        </FormField>
                      </div>
                    </>
                  )}
                </div>

                <FieldGroup>
                  {formConfig.campoConfig.celular_conductor?.visible && (
                    <FormField label={formConfig.campoConfig.celular_conductor.label} required={formConfig.campoConfig.celular_conductor.requerido}>
                      <Input placeholder={formConfig.campoConfig.celular_conductor.placeholder} {...register('celular_conductor')} className={`${inputClass} number-font`} />
                      {errors.celular_conductor && <p className="text-red-400 text-xs">{errors.celular_conductor.message}</p>}
                    </FormField>
                  )}
                  {formConfig.campoConfig.culpabilidad?.visible && (
                    <FormField label={formConfig.campoConfig.culpabilidad.label} required={formConfig.campoConfig.culpabilidad.requerido}>
                      <select
                        {...register('culpabilidad')}
                        className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Seleccione una opción...</option>
                        {activeCulpabilidades.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      {errors.culpabilidad && <p className="text-red-400 text-xs">{errors.culpabilidad.message}</p>}
                    </FormField>
                  )}
                </FieldGroup>

                <FieldGroup>
                  {formConfig.campoConfig.valor_descuento_conductor?.visible && (
                    <FormField label={formConfig.campoConfig.valor_descuento_conductor.label} required={formConfig.campoConfig.valor_descuento_conductor.requerido}>
                      <CurrencyInputField
                        control={control}
                        name="valor_descuento_conductor"
                        placeholder={formConfig.campoConfig.valor_descuento_conductor.placeholder}
                        className={`${inputClass} number-font`}
                      />
                      {errors.valor_descuento_conductor && <p className="text-red-400 text-xs">{errors.valor_descuento_conductor.message}</p>}
                    </FormField>
                  )}
                  {formConfig.campoConfig.memorando_descuento?.visible && (
                    <FormField label={formConfig.campoConfig.memorando_descuento.label} required={formConfig.campoConfig.memorando_descuento.requerido}>
                      <Input placeholder={formConfig.campoConfig.memorando_descuento.placeholder} {...register('memorando_descuento')} className={inputClass} />
                      {errors.memorando_descuento && <p className="text-red-400 text-xs">{errors.memorando_descuento.message}</p>}
                    </FormField>
                  )}
                </FieldGroup>

                {/* Recobros Section - only render if any recobro field is visible */}
                {(formConfig.campoConfig.valor_recobro_vehiculo?.visible || 
                  formConfig.campoConfig.valor_recobro_abogado?.visible || 
                  formConfig.campoConfig.valor_recobro_empresa?.visible) && (
                  <>
                    <Separator />
                    <p className="text-sm font-semibold text-foreground">Recobros</p>

                    {[
                      { label: formConfig.campoConfig.valor_recobro_vehiculo?.label || 'Recobro Vehículo', field: 'valor_recobro_vehiculo' as const, pct: pctVehiculo, key: 'valor_recobro_vehiculo' },
                      { label: formConfig.campoConfig.valor_recobro_abogado?.label || 'Recobro Abogado', field: 'valor_recobro_abogado' as const, pct: pctAbogado, key: 'valor_recobro_abogado' },
                      { label: formConfig.campoConfig.valor_recobro_empresa?.label || 'Recobro Empresa', field: 'valor_recobro_empresa' as const, pct: pctEmpresa, key: 'valor_recobro_empresa' },
                    ].map(({ label, field, pct, key }) => {
                      const fieldConfig = formConfig.campoConfig[key];
                      if (!fieldConfig?.visible) return null;
                      return (
                        <div key={field} className="flex items-end gap-3 mt-4">
                          <div className="flex-1">
                            <FormField label={label} required={fieldConfig.requerido}>
                              <CurrencyInputField
                                control={control}
                                name={field}
                                placeholder={fieldConfig.placeholder}
                                className={`${inputClass} number-font`}
                              />
                            </FormField>
                          </div>
                          <div className="w-24 pb-0.5">
                            <div className="h-10 flex items-center justify-center rounded-lg bg-secondary border border-border text-sm number-font font-semibold text-brand-400">
                              {pct.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}

            {/* Step 4: Committee & Authorization */}
            {step === 4 && (
              <>
                <p className="text-sm font-semibold text-foreground font-semibold">Comité de Seguridad Vial</p>
                <FieldGroup>
                  {formConfig.campoConfig.fecha_comite?.visible && (
                    <FormField label={formConfig.campoConfig.fecha_comite.label} required={formConfig.campoConfig.fecha_comite.requerido}>
                      <Input type="date" {...register('fecha_comite')} className={inputClass} />
                      {errors.fecha_comite && <p className="text-red-400 text-xs">{errors.fecha_comite.message}</p>}
                    </FormField>
                  )}
                  {formConfig.campoConfig.numero_acta?.visible && (
                    <FormField label={formConfig.campoConfig.numero_acta.label} required={formConfig.campoConfig.numero_acta.requerido}>
                      <div className="space-y-1">
                        <Input 
                          placeholder={formConfig.campoConfig.numero_acta.placeholder || "Buscar o registrar acta (ej: ACTA 0001)..."} 
                          {...register('numero_acta')} 
                          className={`${inputClass} font-mono`}
                          list="form-actas-list"
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val) {
                              const numOnly = val.replace(/\D/g, '');
                              if (numOnly) {
                                setValue('numero_acta', `ACTA ${numOnly.padStart(4, '0')}`);
                              } else {
                                const match = val.match(/acta\s*(\d+)/i);
                                if (match && match[1]) {
                                  setValue('numero_acta', `ACTA ${match[1].padStart(4, '0')}`);
                                }
                              }
                            }
                          }}
                        />
                        <datalist id="form-actas-list">
                          {existingActas.map((acta) => (
                            <option key={acta} value={acta} />
                          ))}
                        </datalist>
                      </div>
                      {errors.numero_acta && (
                        <p className="text-red-400 text-xs mt-1">{errors.numero_acta.message}</p>
                      )}
                    </FormField>
                  )}
                </FieldGroup>

                {formConfig.campoConfig.causa_raiz?.visible && (
                  <div className="mt-4">
                    <FormField label={formConfig.campoConfig.causa_raiz.label} required={formConfig.campoConfig.causa_raiz.requerido}>
                      <select
                        {...register('causa_raiz')}
                        className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-2"
                      >
                        <option value="">Seleccionar causa...</option>
                        {formConfig.causasRaiz?.filter(c => c && c.trim().toLowerCase() !== 'otro').map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="Otro">Otro (Especificar)</option>
                      </select>
                      <Input
                        placeholder="Escriba la causa raíz del incidente"
                        {...register('causa_raiz_otra')}
                        className={`${inputClass} ${watchCausaRaiz === 'Otro' ? '' : 'hidden'}`}
                      />
                    </FormField>
                  </div>
                )}

                {formConfig.campoConfig.observaciones_comite?.visible && (
                  <FormField label={formConfig.campoConfig.observaciones_comite.label} required={formConfig.campoConfig.observaciones_comite.requerido}>
                    <textarea
                      {...register('observaciones_comite')}
                      rows={3}
                      placeholder={formConfig.campoConfig.observaciones_comite.placeholder}
                      className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                    {errors.observaciones_comite && <p className="text-red-400 text-xs">{errors.observaciones_comite.message}</p>}
                  </FormField>
                )}

                <Separator />
                <p className="text-sm font-semibold text-foreground">Autorización</p>

                <FieldGroup>
                  {formConfig.campoConfig.autorizado_por?.visible && (
                    <FormField label={formConfig.campoConfig.autorizado_por.label} required={formConfig.campoConfig.autorizado_por.requerido}>
                      <select
                        value={selAutorizadoPor}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelAutorizadoPor(val);
                          if (val === 'Otro') {
                            setValue('autorizado_por', '');
                          } else {
                            setValue('autorizado_por', val);
                          }
                        }}
                        className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-2"
                      >
                        <option value="">Seleccionar autorizador...</option>
                        {activeAutorizadosPor.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                        <option value="Otro">Otro (Especificar)</option>
                      </select>
                      <Input
                        placeholder="Escriba el nombre del autorizador"
                        {...register('autorizado_por')}
                        className={`${inputClass} ${selAutorizadoPor === 'Otro' ? '' : 'hidden'}`}
                      />
                      {errors.autorizado_por && <p className="text-red-400 text-xs">{errors.autorizado_por.message}</p>}
                    </FormField>
                  )}

                  {formConfig.campoConfig.cargo_autorizador?.visible && (
                    <FormField label={formConfig.campoConfig.cargo_autorizador.label} required={formConfig.campoConfig.cargo_autorizador.requerido}>
                      <select
                        value={selCargo}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelCargo(val);
                          if (val === 'Otro') {
                            setValue('cargo_autorizador', '');
                          } else {
                            setValue('cargo_autorizador', val);
                          }
                        }}
                        className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-2"
                      >
                        <option value="">Seleccionar cargo...</option>
                        {activeCargos.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="Otro">Otro (Especificar)</option>
                      </select>
                      <Input
                        placeholder="Escriba el cargo del autorizador"
                        {...register('cargo_autorizador')}
                        className={`${inputClass} ${selCargo === 'Otro' ? '' : 'hidden'}`}
                      />
                      {errors.cargo_autorizador && <p className="text-red-400 text-xs">{errors.cargo_autorizador.message}</p>}
                    </FormField>
                  )}
                </FieldGroup>

                {formConfig.campoConfig.fecha_autorizacion?.visible && (
                  <FormField label={formConfig.campoConfig.fecha_autorizacion.label} required={formConfig.campoConfig.fecha_autorizacion.requerido}>
                    <Input type="date" {...register('fecha_autorizacion')} className={`${inputClass} max-w-xs`} />
                    {errors.fecha_autorizacion && <p className="text-red-400 text-xs">{errors.fecha_autorizacion.message}</p>}
                  </FormField>
                )}

                <Separator />
                <p className="text-sm font-semibold text-foreground font-semibold">Soporte del Memorando de Pago</p>
                <FieldGroup>
                  {formConfig.campoConfig.memorando_pago_nombre?.visible && (
                    <FormField label={formConfig.campoConfig.memorando_pago_nombre.label} required={formConfig.campoConfig.memorando_pago_nombre.requerido}>
                      <Input
                        placeholder={formConfig.campoConfig.memorando_pago_nombre.placeholder}
                        {...register('memorando_pago_nombre')}
                        className={inputClass}
                      />
                      {errors.memorando_pago_nombre && <p className="text-red-400 text-xs">{errors.memorando_pago_nombre.message}</p>}
                    </FormField>
                  )}
                  {formConfig.campoConfig.memorando_pago_archivo?.visible && (
                    <FormField label={formConfig.campoConfig.memorando_pago_archivo.label || 'Adjuntar PDF'} required={formConfig.campoConfig.memorando_pago_archivo.requerido}>
                      <div className="relative flex items-center justify-between border border-border bg-background rounded-lg px-3 h-10 overflow-hidden text-sm">
                        <span className="truncate pr-4 text-muted-foreground">
                          {memorandoPagoFile
                            ? memorandoPagoFile.name
                            : (watch('memorando_pago_archivo_nombre') || 'Ningún archivo seleccionado')}
                        </span>
                        {(memorandoPagoFile || watch('memorando_pago_archivo_nombre')) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setMemorandoPagoFile(null);
                              setValue('memorando_pago_archivo_nombre', null);
                              setValue('memorando_pago_storage_path', null);
                            }}
                            className="text-red-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        ) : (
                          <label className="cursor-pointer font-semibold text-primary hover:underline">
                            Examinar...
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleMemorandoPagoFileChange(file);
                                  e.target.value = ''; // Limpiar el input
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </FormField>
                  )}
                </FieldGroup>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          id="expediente-form-prev"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        <div className="flex items-center gap-2">
          {step < formConfig.pasos.length && (
            <Button
              type="button"
              onClick={() => setStep(Math.min(formConfig.pasos.length, step + 1))}
              id="expediente-form-next"
              variant={step < 3 ? 'default' : 'outline'}
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}

          {(step === 3 || step === 4) && (
            <Button type="submit" disabled={isSubmitting} id="expediente-form-submit">
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Guardar Expediente'}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
