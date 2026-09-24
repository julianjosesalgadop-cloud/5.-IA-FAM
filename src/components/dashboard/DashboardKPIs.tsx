'use client';
import React from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  Car,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCOP } from '@/lib/utils';
import type { Expediente } from '@/types/database';

interface DashboardKPIsProps {
  expedientes: Expediente[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export function DashboardKPIs({ expedientes }: DashboardKPIsProps) {
  // Calculations
  const totalCases = expedientes.length;
  const totalApprovedVal = expedientes.reduce((sum, e) => sum + (e.valor_final_aprobado || 0), 0);
  
  const pendingCount = expedientes.filter((e) => e.estado === 'Pendiente').length;
  const approvedCount = expedientes.filter((e) => e.estado === 'Aprobado').length;
  const rejectedCount = expedientes.filter((e) => e.estado === 'Rechazado').length;

  const totalRecobros = expedientes.reduce(
    (sum, e) =>
      sum +
      (e.valor_recobro_vehiculo || 0) +
      (e.valor_recobro_abogado || 0) +
      (e.valor_recobro_empresa || 0) +
      (e.valor_descuento_conductor || 0),
    0
  );

  const totalDeducibles = expedientes.reduce(
    (sum, e) => {
      if (e.valor_deducible !== null && e.valor_deducible !== undefined && e.valor_deducible > 0) {
        return sum + e.valor_deducible;
      }
      if (e.cotizaciones && e.cotizaciones.length > 0) {
        return sum + e.cotizaciones.reduce((acc, c) => acc + (c.valor_deducible || 0), 0);
      }
      return sum;
    },
    0
  );

  const uniquePlacas = new Set(expedientes.map((e) => e.placa).filter(Boolean)).size;

  // Percentage Calculations
  const pctPending = totalCases ? Math.round((pendingCount / totalCases) * 100) : 0;
  const pctApproved = totalCases ? Math.round((approvedCount / totalCases) * 100) : 0;
  const pctRejected = totalCases ? Math.round((rejectedCount / totalCases) * 100) : 0;

  const avgApproved = totalCases ? Math.round(totalApprovedVal / totalCases) : 0;

  const kpis = [
    {
      label: 'Total Expedientes',
      value: totalCases,
      change: 'Casos registrados',
      badge: null,
      icon: FolderOpen,
    },
    {
      label: 'Valor Total Aprobado',
      value: formatCOP(totalApprovedVal),
      change: 'Desembolsado SIGFAM',
      badge: null,
      icon: DollarSign,
    },
    {
      label: 'Pendientes',
      value: pendingCount,
      change: 'En revisión de comité',
      badge: { text: `${pctPending}% del total`, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
      icon: Clock,
    },
    {
      label: 'Aprobados',
      value: approvedCount,
      change: 'Liquidados y procesados',
      badge: { text: `${pctApproved}% del total`, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
      icon: CheckCircle2,
    },
    {
      label: 'Rechazados',
      value: rejectedCount,
      change: 'No procedentes',
      badge: { text: `${pctRejected}% del total`, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
      icon: XCircle,
    },
    {
      label: 'Afectación Promedio',
      value: formatCOP(avgApproved),
      change: 'Costo medio por caso',
      badge: null,
      icon: FileText,
    },
    {
      label: 'Recobros Totales',
      value: formatCOP(totalRecobros),
      change: 'Recuperado / Recobrado',
      badge: null,
      icon: TrendingUp,
      isRecobros: true,
      recobrosVal: formatCOP(totalRecobros),
      deduciblesVal: formatCOP(totalDeducibles),
    },
    {
      label: 'Vehículos Afectados',
      value: uniquePlacas,
      change: 'Placas únicas en periodo',
      badge: null,
      icon: Car,
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        if (kpi.isRecobros) {
          return (
            <motion.div key={kpi.label} variants={itemVariants} className="flex">
              <Card className="relative overflow-hidden bg-card border-border shadow-sm flex flex-col justify-between h-full w-full min-h-[105px] transition-all duration-200 hover:shadow-md">
                <CardHeader className="p-3 px-3.5 pb-1">
                  <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>{kpi.label}</span>
                    <Icon className="w-4 h-4 text-slate-400" />
                  </CardDescription>
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">Recobros:</span>
                      <span className="text-sm sm:text-base font-bold font-mono tracking-tight text-primary truncate" title={kpi.recobrosVal}>
                        {kpi.recobrosVal}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">Deducibles:</span>
                      <span className="text-sm sm:text-base font-bold font-mono tracking-tight text-primary truncate" title={kpi.deduciblesVal}>
                        {kpi.deduciblesVal}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-3.5 pb-2.5 pt-0">
                  <div className="flex items-center justify-between text-[11px] xl:text-xs border-t border-border/40 pt-1.5 mt-0.5 gap-1">
                    <span className="text-muted-foreground whitespace-nowrap text-[10px] xl:text-[11px]">{kpi.change}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        }

        return (
          <motion.div key={kpi.label} variants={itemVariants} className="flex">
            <Card className="relative overflow-hidden bg-card border-border shadow-sm flex flex-col justify-between h-full w-full min-h-[105px] transition-all duration-200 hover:shadow-md">
              <CardHeader className="p-3 px-3.5 pb-1">
                <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>{kpi.label}</span>
                  <Icon className="w-4 h-4 text-slate-400" />
                </CardDescription>
                <CardTitle 
                  className="text-lg sm:text-xl xl:text-2xl font-bold font-mono tracking-tight text-primary mt-0.5 truncate"
                  title={String(kpi.value)}
                >
                  {kpi.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3.5 pb-2.5 pt-0">
                <div className="flex items-center justify-between text-[11px] xl:text-xs border-t border-border/40 pt-1.5 mt-0.5 gap-1">
                  <span className="text-muted-foreground whitespace-nowrap text-[10px] xl:text-[11px]">{kpi.change}</span>
                  {kpi.badge && (
                    <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold shrink-0 ${kpi.badge.color}`}>
                      {kpi.badge.text}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
