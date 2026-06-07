'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Save, ChevronLeft, ChevronRight } from 'lucide-react';
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
      ...defaultValues,
    },
  });

  const { register, watch, setValue, formState: { errors } } = form;

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
                <FieldGroup>
                  <FormField label="Valor Cotización (COP)">
                    <Input
                      type="number"
                      placeholder="0"
                      {...register('valor_cotizacion', { valueAsNumber: true })}
                      className={`${inputClass} number-font`}
                    />
                  </FormField>
                  <FormField label="Valor Negociado (COP)">
                    <Input
                      type="number"
                      placeholder="0"
                      {...register('valor_negociado', { valueAsNumber: true })}
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
                      value={deducibleCalc.toLocaleString('es-CO')}
                      className={`${inputClass} number-font bg-secondary/50 cursor-not-allowed`}
                    />
                  </FormField>
                </FieldGroup>

                <div className="rounded-lg bg-secondary/50 border border-border p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor Negociado:</span>
                    <span className="number-font font-semibold">{valorNegociado.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deducible ({porcentajeDeducible}%):</span>
                    <span className="number-font font-semibold text-yellow-400">- {deducibleCalc.toLocaleString('es-CO')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Valor a Pagar:</span>
                    <span className="number-font text-green-400">{aPagarCalc.toLocaleString('es-CO')}</span>
                  </div>
                </div>

                <FieldGroup>
                  <FormField label="Valor Salvamento (COP)">
                    <Input
                      type="number"
                      placeholder="0"
                      {...register('valor_salvamento', { valueAsNumber: true })}
                      className={`${inputClass} number-font`}
                    />
                  </FormField>
                  <FormField label="Valor Final Aprobado (COP)">
                    <Input
                      type="number"
                      placeholder="0"
                      {...register('valor_final_aprobado', { valueAsNumber: true })}
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
                    <Input
                      type="number"
                      placeholder="0"
                      {...register('valor_descuento_conductor', { valueAsNumber: true })}
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
                        <Input
                          type="number"
                          placeholder="0"
                          {...register(field, { valueAsNumber: true })}
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
