'use client';
import React from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  Car,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCOP } from '@/lib/utils';
import type { Expediente } from '@/types/database';

interface DashboardKPIsProps {
  expedientes: Expediente[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
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
      changeType: 'neutral' as const,
      icon: FolderOpen,
      color: 'text-brand-500',
      bg: 'bg-brand-500/10',
    },
    {
      label: 'Valor Total Aprobado',
      value: formatCOP(totalApprovedVal),
      change: 'Desembolsado SIGFAM',
      changeType: 'positive' as const,
      icon: DollarSign,
      color: 'text-gold-500',
      bg: 'bg-gold-500/10',
    },
    {
      label: 'Pendientes',
      value: pendingCount,
      change: `${pctPending}% del total`,
      changeType: 'neutral' as const,
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Aprobados',
      value: approvedCount,
      change: `${pctApproved}% del total`,
      changeType: 'positive' as const,
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Rechazados',
      value: rejectedCount,
      change: `${pctRejected}% del total`,
      changeType: 'negative' as const,
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Afectación Promedio',
      value: formatCOP(avgApproved),
      change: 'Costo medio por caso',
      changeType: 'neutral' as const,
      icon: DollarSign,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Recobros Totales',
      value: formatCOP(totalRecobros),
      change: 'Recuperado / Recobrado',
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Vehículos Afectados',
      value: uniquePlacas,
      change: 'Placas únicas',
      changeType: 'neutral' as const,
      icon: Car,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
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
        return (
          <motion.div key={kpi.label} variants={itemVariants}>
            <Card className="card-hover border-border bg-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium truncate">{kpi.label}</p>
                    <p 
                      className="text-[15px] sm:text-base xl:text-lg font-bold mt-1 number-font text-foreground truncate"
                      title={String(kpi.value)}
                    >
                      {kpi.value}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        kpi.changeType === 'positive'
                          ? 'text-green-400'
                          : kpi.changeType === 'negative'
                          ? 'text-red-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {kpi.change}
                    </p>
                  </div>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${kpi.bg} ml-2`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
