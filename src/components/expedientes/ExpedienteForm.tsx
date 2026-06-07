'use client';
import React, { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Save, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  TIPOS_RECLAMACION,
  CULPABILIDADES,
  PORCENTAJES_DEDUCIBLE,
  CAUSAS_RAIZ_DEFAULT,
} from '@/lib/constants';
import { calcDeducible, calcValorAPagar, calcPorcentajeRecobro } from '@/lib/utils';
import { dbService } from '@/lib/services/dbService';

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
  disabled
}: { 
  control: any; 
  name: string; 
  placeholder?: string; 
  className?: string;
  disabled?: boolean;
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
            onChange(e.target.value === '' ? null : rawValue);
          }}
        />
      )}
    />
  );
}


const expedienteSchema = z.object({
  fecha_incidente: z.string().min(1, 'Requerido'),
  placa: z.string().min(1, 'Requerido').toUpperCase(),
  numero_interno: z.string().optional(),
  propietario: z.string().min(1, 'Requerido'),
  tipo_reclamacion: z.enum(['Siniestro', 'Vidrios', 'Carrocería', 'Repuestos', 'Pérdida parcial', 'Otro']),
  ciudad_origen: z.string().optional(),
  ciudad_destino: z.string().optional(),
  concepto: z.string().optional(),
  // Financiero
  valor_cotizacion: z.number().min(0).optional().nullable(),
  cotizaciones: z.array(z.object({
    id: z.string(),
    proveedor: z.string().min(1, 'Requerido'),
    valor: z.number().min(0),
    seleccionada: z.boolean(),
  })).optional().nullable(),
  valor_negociado: z.number().min(0).optional().nullable(),
  porcentaje_deducible: z.number().optional().nullable(),
  valor_salvamento: z.number().min(0).optional().nullable(),
  valor_final_aprobado: z.number().min(0).optional().nullable(),
  // Conductor
  nombre_conductor: z.string().optional(),
  id_conductor: z.string().optional(),
  celular_conductor: z.string().optional(),
  culpabilidad: z.enum(['Conductor', 'Tercero', 'Compartida', 'Sin definir']).optional().nullable(),
  valor_descuento_conductor: z.number().min(0).optional().nullable(),
  memorando_descuento: z.string().optional(),
  // Recobros
  valor_recobro_vehiculo: z.number().min(0).optional().nullable(),
  valor_recobro_abogado: z.number().min(0).optional().nullable(),
  valor_recobro_empresa: z.number().min(0).optional().nullable(),
  // Comité
  fecha_comite: z.string().optional(),
  causa_raiz: z.string().optional(),
  observaciones_comite: z.string().optional(),
  // Autorización
  autorizado_por: z.string().optional(),
  cargo_autorizador: z.string().optional(),
  fecha_autorizacion: z.string().optional(),
});

type ExpedienteFormData = z.infer<typeof expedienteSchema>;

const STEPS = [
  { id: 1, label: 'Información General', description: 'Datos del incidente y vehículo' },
  { id: 2, label: 'Datos Financieros', description: 'Valores y deducibles' },
  { id: 3, label: 'Conductor & Recobros', description: 'Responsabilidad y recuperación' },
  { id: 4, label: 'Comité & Autorización', description: 'Seguridad vial y aprobación' },
];

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </Label>
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
  defaultValues?: Partial<ExpedienteFormData>; 
  onSuccess?: () => void; 
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExpedienteFormData>({
    resolver: zodResolver(expedienteSchema),
    defaultValues: {
      tipo_reclamacion: 'Siniestro',
      culpabilidad: 'Sin definir',
      cotizaciones: defaultValues?.cotizaciones || [{ id: '1', proveedor: '', valor: 0, seleccionada: true }],
      ...defaultValues,
    },
  });

  const { register, watch, setValue, formState: { errors }, control } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'cotizaciones',
  });

  const cotizaciones = watch('cotizaciones') || [];

  // Actualiza automáticamente el valor_cotizacion principal basado en la cotización seleccionada
  useEffect(() => {
    const selected = cotizaciones.find((c) => c.seleccionada);
    if (selected) {
      setValue('valor_cotizacion', selected.valor || 0);
    } else if (cotizaciones.length > 0) {
      setValue('valor_cotizacion', cotizaciones[0].valor || 0);
    } else {
      setValue('valor_cotizacion', 0);
    }
  }, [cotizaciones, setValue]);

  const valorNegociado = watch('valor_negociado') || 0;
  const porcentajeDeducible = watch('porcentaje_deducible') || 0;
  const deducibleCalc = calcDeducible(valorNegociado, porcentajeDeducible);
  const aPagarCalc = calcValorAPagar(valorNegociado, deducibleCalc);

  const valorRecVehiculo = watch('valor_recobro_vehiculo') || 0;
  const valorRecAbogado = watch('valor_recobro_abogado') || 0;
  const valorRecEmpresa = watch('valor_recobro_empresa') || 0;
  const pctVehiculo = calcPorcentajeRecobro(valorRecVehiculo, valorNegociado);
  const pctAbogado = calcPorcentajeRecobro(valorRecAbogado, valorNegociado);
  const pctEmpresa = calcPorcentajeRecobro(valorRecEmpresa, valorNegociado);

  const onSubmit = async (data: ExpedienteFormData) => {
    setIsSubmitting(true);
    try {
      const finalData = {
        ...data,
        valor_deducible: deducibleCalc,
        valor_a_pagar: aPagarCalc,
        porcentaje_recobro_vehiculo: pctVehiculo,
        porcentaje_recobro_abogado: pctAbogado,
        porcentaje_recobro_empresa: pctEmpresa,
      };

      if (id) {
        await dbService.updateExpediente(id, finalData as any);
        toast.success('Expediente actualizado exitosamente');
      } else {
        const created = await dbService.createExpediente(finalData as any);
        toast.success(`Expediente creado exitosamente: ${created.numero_expediente}`);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/expedientes');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar el expediente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'bg-background border-border focus:ring-primary';

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
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
            {i < STEPS.length - 1 && (
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
            <CardTitle>{STEPS[step - 1].label}</CardTitle>
            <CardDescription>{STEPS[step - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: General Info */}
            {step === 1 && (
              <>
                <FieldGroup>
                  <FormField label="Fecha del Incidente" required>
                    <Input type="date" {...register('fecha_incidente')} className={inputClass} />
                    {errors.fecha_incidente && <p className="text-red-400 text-xs">{errors.fecha_incidente.message}</p>}
                  </FormField>
                  <FormField label="Tipo de Reclamación" required>
                    <select
                      {...register('tipo_reclamacion')}
                      className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {TIPOS_RECLAMACION.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </FormField>
                </FieldGroup>
                <FieldGroup>
                  <FormField label="Placa" required>
                    <Input placeholder="ABC-123" {...register('placa')} className={`${inputClass} font-mono uppercase`} />
                    {errors.placa && <p className="text-red-400 text-xs">{errors.placa.message}</p>}
                  </FormField>
                  <FormField label="Número Interno">
                    <Input placeholder="Ej: 0042" {...register('numero_interno')} className={inputClass} />
                  </FormField>
                </FieldGroup>
                <FormField label="Propietario" required>
                  <Input placeholder="Nombre del propietario o empresa" {...register('propietario')} className={inputClass} />
                  {errors.propietario && <p className="text-red-400 text-xs">{errors.propietario.message}</p>}
                </FormField>
                <FieldGroup>
                  <FormField label="Ciudad Origen">
                    <Input placeholder="Ej: Sogamoso" {...register('ciudad_origen')} className={inputClass} />
                  </FormField>
                  <FormField label="Ciudad Destino">
                    <Input placeholder="Ej: Bogotá" {...register('ciudad_destino')} className={inputClass} />
                  </FormField>
                </FieldGroup>
                <FormField label="Concepto / Descripción">
                  <textarea
                    {...register('concepto')}
                    rows={3}
                    placeholder="Descripción del incidente..."
                    className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </FormField>
              </>
            )}

            {/* Step 2: Financial */}
            {step === 2 && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold text-foreground">Cotizaciones Presentadas (1 o más)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ id: Math.random().toString(36).substring(2, 9), proveedor: '', valor: 0, seleccionada: false })}
                    >
                      + Añadir Cotización
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {fields.map((fieldItem, idx) => (
                      <div key={fieldItem.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/10">
                        {/* Radio button to select */}
                        <div className="flex items-center justify-center" title="Marcar como cotización activa para deducible">
                          <input
                            type="radio"
                            name="selected_cotizacion"
                            checked={watch(`cotizaciones.${idx}.seleccionada`) || false}
                            onChange={() => {
                              // Set all others to false, this one to true
                              fields.forEach((_, fIdx) => {
                                setValue(`cotizaciones.${fIdx}.seleccionada`, fIdx === idx);
                              });
                            }}
                            className="w-4 h-4 text-primary focus:ring-primary border-border bg-background"
                          />
                        </div>

                        {/* Provider */}
                        <div className="flex-[2] min-w-[150px]">
                          <Input
                            placeholder="Taller / Proveedor / Concepto"
                            {...register(`cotizaciones.${idx}.proveedor` as const)}
                            className={inputClass}
                          />
                          {errors.cotizaciones?.[idx]?.proveedor && (
                            <p className="text-red-400 text-xs mt-1">Requerido</p>
                          )}
                        </div>

                        {/* Value */}
                        <div className="flex-[1.5] min-w-[120px]">
                          <CurrencyInputField
                            control={control}
                            name={`cotizaciones.${idx}.valor`}
                            placeholder="$ 0"
                            className={`${inputClass} number-font`}
                          />
                        </div>

                        {/* Delete button */}
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-500 hover:bg-red-500/10 flex-shrink-0"
                            onClick={() => {
                              const wasSelected = watch(`cotizaciones.${idx}.seleccionada`);
                              remove(idx);
                              if (wasSelected && fields.length > 1) {
                                // Select the first remaining
                                const nextIndex = idx === 0 ? 0 : idx - 1;
                                setTimeout(() => {
                                  setValue(`cotizaciones.${nextIndex}.seleccionada`, true);
                                }, 50);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Summary of active quote */}
                  <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/10 rounded-lg p-3 flex justify-between items-center">
                    <span>Valor Cotización Activo (para deducible):</span>
                    <span className="font-bold text-sm text-foreground number-font">
                      {formatCOPInput(watch('valor_cotizacion'))}
                    </span>
                  </div>
                </div>

                <FieldGroup>
                  <FormField label="Valor Negociado (COP)">
                    <CurrencyInputField
                      control={control}
                      name="valor_negociado"
                      placeholder="$ 0"
                      className={`${inputClass} number-font`}
                    />
                  </FormField>
                </FieldGroup>

                <Separator />
                <p className="text-sm font-semibold text-foreground">Deducible</p>

                <FieldGroup>
                  <FormField label="Porcentaje Deducible">
                    <select
                      {...register('porcentaje_deducible', { valueAsNumber: true })}
                      className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Sin deducible</option>
                      {PORCENTAJES_DEDUCIBLE.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Valor Deducible (calculado)">
                    <Input
                      readOnly
                      value={formatCOPInput(deducibleCalc)}
                      className={`${inputClass} number-font bg-secondary/50 cursor-not-allowed`}
                    />
                  </FormField>
                </FieldGroup>

                <div className="rounded-lg bg-secondary/50 border border-border p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor Negociado:</span>
                    <span className="number-font font-semibold">{formatCOPInput(valorNegociado)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deducible ({porcentajeDeducible}%):</span>
                    <span className="number-font font-semibold text-yellow-400">- {formatCOPInput(deducibleCalc)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Valor a Pagar:</span>
                    <span className="number-font text-green-400">{formatCOPInput(aPagarCalc)}</span>
                  </div>
                </div>

                <FieldGroup>
                  <FormField label="Valor Salvamento (COP)">
                    <CurrencyInputField
                      control={control}
                      name="valor_salvamento"
                      placeholder="$ 0"
                      className={`${inputClass} number-font`}
                    />
                  </FormField>
                  <FormField label="Valor Final Aprobado (COP)">
                    <CurrencyInputField
                      control={control}
                      name="valor_final_aprobado"
                      placeholder="$ 0"
                      className={`${inputClass} number-font`}
                    />
                  </FormField>
                </FieldGroup>
              </>
            )}

            {/* Step 3: Conductor & Recobros */}
            {step === 3 && (
              <>
                <p className="text-sm font-semibold text-foreground">Información del Conductor</p>
                <FieldGroup>
                  <FormField label="Nombre del Conductor">
                    <Input placeholder="Nombre completo" {...register('nombre_conductor')} className={inputClass} />
                  </FormField>
                  <FormField label="Identificación">
                    <Input placeholder="CC o CE" {...register('id_conductor')} className={`${inputClass} number-font`} />
                  </FormField>
                </FieldGroup>
                <FieldGroup>
                  <FormField label="Celular">
                    <Input placeholder="3XX XXX XXXX" {...register('celular_conductor')} className={`${inputClass} number-font`} />
                  </FormField>
                  <FormField label="Culpabilidad">
                    <select
                      {...register('culpabilidad')}
                      className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {CULPABILIDADES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </FormField>
                </FieldGroup>
                <FieldGroup>
                  <FormField label="Descuento al Conductor (COP)">
                    <CurrencyInputField
                      control={control}
                      name="valor_descuento_conductor"
                      placeholder="$ 0"
                      className={`${inputClass} number-font`}
                    />
                  </FormField>
                  <FormField label="N° Memorando de Descuento">
                    <Input placeholder="Ej: MEMO-2025-001" {...register('memorando_descuento')} className={inputClass} />
                  </FormField>
                </FieldGroup>

                <Separator />
                <p className="text-sm font-semibold text-foreground">Recobros</p>

                {[
                  { label: 'Recobro Vehículo (COP)', field: 'valor_recobro_vehiculo' as const, pct: pctVehiculo },
                  { label: 'Recobro Abogado (COP)', field: 'valor_recobro_abogado' as const, pct: pctAbogado },
                  { label: 'Recobro Empresa (COP)', field: 'valor_recobro_empresa' as const, pct: pctEmpresa },
                ].map(({ label, field, pct }) => (
                  <div key={field} className="flex items-end gap-3">
                    <div className="flex-1">
                      <FormField label={label}>
                        <CurrencyInputField
                          control={control}
                          name={field}
                          placeholder="$ 0"
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
                ))}
              </>
            )}

            {/* Step 4: Committee & Authorization */}
            {step === 4 && (
              <>
                <p className="text-sm font-semibold text-foreground">Comité de Seguridad Vial</p>
                <FieldGroup>
                  <FormField label="Fecha del Comité">
                    <Input type="date" {...register('fecha_comite')} className={inputClass} />
                  </FormField>
                  <FormField label="Causa Raíz">
                    <select
                      {...register('causa_raiz')}
                      className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Seleccionar causa...</option>
                      {CAUSAS_RAIZ_DEFAULT.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </FormField>
                </FieldGroup>
                <FormField label="Observaciones del Comité">
                  <textarea
                    {...register('observaciones_comite')}
                    rows={3}
                    placeholder="Observaciones y decisiones del comité..."
                    className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </FormField>

                <Separator />
                <p className="text-sm font-semibold text-foreground">Autorización</p>

                <FieldGroup>
                  <FormField label="Autorizado Por">
                    <Input placeholder="Nombre del autorizador" {...register('autorizado_por')} className={inputClass} />
                  </FormField>
                  <FormField label="Cargo">
                    <Input placeholder="Cargo del autorizador" {...register('cargo_autorizador')} className={inputClass} />
                  </FormField>
                </FieldGroup>
                <FormField label="Fecha de Autorización">
                  <Input type="date" {...register('fecha_autorizacion')} className={`${inputClass} max-w-xs`} />
                </FormField>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
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

        {step < STEPS.length ? (
          <Button
            type="button"
            onClick={() => setStep(Math.min(STEPS.length, step + 1))}
            id="expediente-form-next"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={isSubmitting} id="expediente-form-submit">
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Guardando...' : 'Guardar Expediente'}
          </Button>
        )}
      </div>
    </form>
  );
}
