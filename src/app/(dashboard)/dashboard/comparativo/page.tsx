'use client';
import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { dbService } from '@/lib/services/dbService';
import type { Expediente } from '@/types/database';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Calendar, 
  DollarSign, 
  FileText, 
  Car, 
  GitCompare, 
  Info,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCOP } from '@/lib/utils';

// Consts
const MONTHS_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export default function ComparativoPage() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    toast.loading('Cargando análisis comparativo...', { id: 'loading-comparative' });
    try {
      const data = await dbService.getExpedientes();
      setExpedientes(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos comparativos');
    } finally {
      setLoading(false);
      toast.dismiss('loading-comparative');
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      toast.dismiss('loading-comparative');
    };
  }, []);

  // Helpers
  const getYear = (e: Expediente) => {
    if (!e.fecha_incidente) return null;
    return parseInt(e.fecha_incidente.split('-')[0], 10);
  };

  const getMonth = (e: Expediente) => {
    if (!e.fecha_incidente) return null;
    return parseInt(e.fecha_incidente.split('-')[1], 10) - 1; // 0-11
  };

  const getInternalNumberCategory = (numStr: string | null | undefined): string => {
    if (!numStr) return 'Otros';
    const cleanNum = numStr.trim();
    const prefixes = ['71', '80', '10', '90', '4', '32', '6', '7'];
    for (const prefix of prefixes) {
      if (cleanNum.startsWith(prefix)) {
        return `Serie ${prefix}`;
      }
    }
    return 'Otros';
  };

  // Filter Active Cases
  const activeExpedientes = React.useMemo(() => {
    return expedientes.filter((e) => e.deleted_at === null);
  }, [expedientes]);

  // Current year & month for YTD limits (assume 2026-06-30 as per current timestamp)
  const currentYear = 2026;
  const currentMonthIndex = 5; // Junio

  // Process data for monthly charts
  const { 
    monthlyData, 
    totals,
    claimsTypeData,
    culpabilidadData,
    seriesData
  } = React.useMemo(() => {
    // 1. Monthly data structure
    const months = Array.from({ length: 12 }).map((_, i) => ({
      monthIndex: i,
      name: MONTHS_SHORT[i],
      fullName: MONTHS_NAMES[i],
      cases2025: 0,
      cases2026: 0,
      amount2025: 0,
      amount2026: 0,
      cumCases2025: 0,
      cumCases2026: 0,
      cumAmount2025: 0,
      cumAmount2026: 0,
    }));

    // 2. Metrics for Year Totals and YTD Totals
    const t = {
      cases2025: 0,
      cases2026: 0,
      amount2025: 0,
      amount2026: 0,
      cotizado2025: 0,
      cotizado2026: 0,
      
      // YTD metrics (up to June)
      ytdCases2025: 0,
      ytdCases2026: 0,
      ytdAmount2025: 0,
      ytdAmount2026: 0,
    };

    // 3. Claims mapping
    const claimsMap: Record<string, { name: string; cases2025: number; cases2026: number; amount2025: number; amount2026: number }> = {};
    const culpabilidadMap: Record<string, { name: string; cases2025: number; cases2026: number }> = {};
    const seriesMap: Record<string, { name: string; cases2025: number; cases2026: number; amount2025: number; amount2026: number }> = {};

    activeExpedientes.forEach((e) => {
      const yr = getYear(e);
      const mo = getMonth(e);
      const approved = e.valor_final_aprobado || 0;
      const cotizado = e.valor_cotizacion || 0;
      const tipo = e.tipo_reclamacion || 'Otro';
      const culp = e.culpabilidad || 'Sin definir';
      const serie = getInternalNumberCategory(e.numero_interno);

      // Monthly aggregation
      if (mo !== null && mo >= 0 && mo < 12) {
        if (yr === 2025) {
          months[mo].cases2025 += 1;
          months[mo].amount2025 += approved;
          
          t.cases2025 += 1;
          t.amount2025 += approved;
          t.cotizado2025 += cotizado;
          if (mo <= currentMonthIndex) {
            t.ytdCases2025 += 1;
            t.ytdAmount2025 += approved;
          }
        } else if (yr === 2026) {
          months[mo].cases2026 += 1;
          months[mo].amount2026 += approved;

          t.cases2026 += 1;
          t.amount2026 += approved;
          t.cotizado2026 += cotizado;
          if (mo <= currentMonthIndex) {
            t.ytdCases2026 += 1;
            t.ytdAmount2026 += approved;
          }
        }
      }

      // Group by Claim Type
      if (yr === 2025 || yr === 2026) {
        if (!claimsMap[tipo]) {
          claimsMap[tipo] = { name: tipo, cases2025: 0, cases2026: 0, amount2025: 0, amount2026: 0 };
        }
        if (yr === 2025) {
          claimsMap[tipo].cases2025 += 1;
          claimsMap[tipo].amount2025 += approved;
        } else {
          claimsMap[tipo].cases2026 += 1;
          claimsMap[tipo].amount2026 += approved;
        }

        // Group by Culpability
        if (!culpabilidadMap[culp]) {
          culpabilidadMap[culp] = { name: culp, cases2025: 0, cases2026: 0 };
        }
        if (yr === 2025) {
          culpabilidadMap[culp].cases2025 += 1;
        } else {
          culpabilidadMap[culp].cases2026 += 1;
        }

        // Group by Vehicle Series
        if (!seriesMap[serie]) {
          seriesMap[serie] = { name: serie, cases2025: 0, cases2026: 0, amount2025: 0, amount2026: 0 };
        }
        if (yr === 2025) {
          seriesMap[serie].cases2025 += 1;
          seriesMap[serie].amount2025 += approved;
        } else {
          seriesMap[serie].cases2026 += 1;
          seriesMap[serie].amount2026 += approved;
        }
      }
    });

    // 4. Calculate cumulative monthly spend
    let runCases2025 = 0;
    let runCases2026 = 0;
    let runAmount2025 = 0;
    let runAmount2026 = 0;

    for (let i = 0; i < 12; i++) {
      runCases2025 += months[i].cases2025;
      runAmount2025 += months[i].amount2025;
      months[i].cumCases2025 = runCases2025;
      months[i].cumAmount2025 = runAmount2025;

      // For 2026, we only accumulate up to the current month to show progress YTD
      if (i <= currentMonthIndex) {
        runCases2026 += months[i].cases2026;
        runAmount2026 += months[i].amount2026;
        months[i].cumCases2026 = runCases2026;
        months[i].cumAmount2026 = runAmount2026;
      } else {
        // Leave undefined or null so Recharts line stops at June
        months[i].cumCases2026 = null as any;
        months[i].cumAmount2026 = null as any;
      }
    }

    return {
      monthlyData: months,
      totals: t,
      claimsTypeData: Object.values(claimsMap).sort((a, b) => b.amount2026 - a.amount2026),
      culpabilidadData: Object.values(culpabilidadMap).sort((a, b) => b.cases2026 - a.cases2026),
      seriesData: Object.values(seriesMap).sort((a, b) => b.amount2026 - a.amount2026),
    };
  }, [activeExpedientes]);

  // Variations
  const casesVariationYTD = totals.ytdCases2025 > 0 
    ? ((totals.ytdCases2026 - totals.ytdCases2025) / totals.ytdCases2025) * 100 
    : 0;

  const amountVariationYTD = totals.ytdAmount2025 > 0 
    ? ((totals.ytdAmount2026 - totals.ytdAmount2025) / totals.ytdAmount2025) * 100 
    : 0;

  const avgCost2025 = totals.cases2025 > 0 ? totals.amount2025 / totals.cases2025 : 0;
  const avgCost2026 = totals.cases2026 > 0 ? totals.amount2026 / totals.cases2026 : 0;
  const avgCostVariation = avgCost2025 > 0 ? ((avgCost2026 - avgCost2025) / avgCost2025) * 100 : 0;

  const saving2025 = totals.cotizado2025 > 0 ? ((totals.cotizado2025 - totals.amount2025) / totals.cotizado2025) * 100 : 0;
  const saving2026 = totals.cotizado2026 > 0 ? ((totals.cotizado2026 - totals.amount2026) / totals.cotizado2026) * 100 : 0;

  // Custom tooltips for Recharts
  const CustomAmountTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass border border-white/10 p-3 rounded-xl shadow-card-dark text-xs space-y-1.5 text-slate-200">
          <p className="font-bold text-foreground mb-1">{label}</p>
          {payload.map((p: any) => {
            const is2026 = p.name.includes('2026') || p.dataKey.includes('2026');
            const colorClass = is2026 ? 'text-primary' : 'text-slate-400';
            return (
              <p key={p.name} className="flex items-center justify-between gap-6">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}:
                </span>
                <span className={`font-mono font-bold ${colorClass}`}>
                  {formatCOP(p.value)}
                </span>
              </p>
            );
          })}
          {payload.length === 2 && (
            <div className="border-t border-white/5 pt-1.5 mt-1.5 text-[10px] text-muted-foreground flex items-center justify-between">
              <span>Diferencia:</span>
              <span className={payload[1].value > payload[0].value ? 'text-red-400 font-mono' : 'text-emerald-400 font-mono'}>
                {formatCOP(payload[1].value - payload[0].value)}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomCountTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass border border-white/10 p-3 rounded-xl shadow-card-dark text-xs space-y-1.5 text-slate-200">
          <p className="font-bold text-foreground mb-1">{label}</p>
          {payload.map((p: any) => {
            const is2026 = p.name.includes('2026') || p.dataKey.includes('2026');
            const colorClass = is2026 ? 'text-primary' : 'text-slate-400';
            return (
              <p key={p.name} className="flex items-center justify-between gap-6">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}:
                </span>
                <span className={`font-mono font-bold ${colorClass}`}>
                  {p.value} {p.value === 1 ? 'caso' : 'casos'}
                </span>
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        title="Comparativo de Gestión" 
        subtitle="SIGFAM — Análisis comparativo de siniestralidad, costos y gestión 2025 vs 2026" 
      />

      <div className="flex-1 p-6 overflow-auto space-y-6">
        {/* Actions bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-muted-foreground">
              Periodo Comparado YTD: Ene-Jun 2025 vs Ene-Jun 2026
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="gap-2 h-9">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar Datos
          </Button>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Cases YTD */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="relative overflow-hidden bg-card border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Expedientes YTD</span>
                  <GitCompare className="w-4 h-4 text-slate-400" />
                </CardDescription>
                <CardTitle className="text-2xl font-bold flex items-baseline justify-between mt-1">
                  <span>{totals.ytdCases2026}</span>
                  <span className="text-xs text-muted-foreground font-normal">vs {totals.ytdCases2025} en 2025</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center gap-1">
                  {casesVariationYTD > 0 ? (
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500">
                      <ArrowUpRight className="w-3 h-3 mr-0.5" />
                      +{casesVariationYTD.toFixed(1)}%
                    </div>
                  ) : (
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500">
                      <ArrowDownRight className="w-3 h-3 mr-0.5" />
                      {casesVariationYTD.toFixed(1)}%
                    </div>
                  )}
                  <span className="text-[11px] text-muted-foreground">de variación acumulada</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 2: Approved Spend YTD */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <Card className="relative overflow-hidden bg-card border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Monto Aprobado YTD</span>
                  <DollarSign className="w-4 h-4 text-slate-400" />
                </CardDescription>
                <CardTitle className="text-xl font-mono font-bold flex items-baseline justify-between mt-1.5">
                  <span className="text-foreground">{formatCOP(totals.ytdAmount2026)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1">
                    {amountVariationYTD > 0 ? (
                      <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500">
                        <ArrowUpRight className="w-3 h-3 mr-0.5" />
                        +{amountVariationYTD.toFixed(1)}%
                      </div>
                    ) : (
                      <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500">
                        <ArrowDownRight className="w-3 h-3 mr-0.5" />
                        {amountVariationYTD.toFixed(1)}%
                      </div>
                    )}
                    <span className="text-[11px] text-muted-foreground">vs {formatCOP(totals.ytdAmount2025)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 3: Average Cost per Case */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="relative overflow-hidden bg-card border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Costo Medio / Caso</span>
                  <FileText className="w-4 h-4 text-slate-400" />
                </CardDescription>
                <CardTitle className="text-xl font-mono font-bold mt-1.5">
                  {formatCOP(avgCost2026)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center gap-1">
                  {avgCostVariation > 0 ? (
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500">
                      <ArrowUpRight className="w-3 h-3 mr-0.5" />
                      +{avgCostVariation.toFixed(1)}%
                    </div>
                  ) : (
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500">
                      <ArrowDownRight className="w-3 h-3 mr-0.5" />
                      {avgCostVariation.toFixed(1)}%
                    </div>
                  )}
                  <span className="text-[11px] text-muted-foreground">vs {formatCOP(avgCost2025)} en 2025</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 4: Savings rate */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Card className="relative overflow-hidden bg-card border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Eficiencia (Ahorro)</span>
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                </CardDescription>
                <CardTitle className="text-2xl font-bold flex items-baseline justify-between mt-1">
                  <span>{saving2026.toFixed(1)}%</span>
                  <span className="text-xs text-muted-foreground font-normal">en 2026</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center gap-1">
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    {saving2025.toFixed(1)}% en 2025
                  </div>
                  <span className="text-[11px] text-muted-foreground">Tasa global de negociación</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Section 1: Monthly comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Monthly cases count */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-foreground">Cantidad de Expedientes por Mes (2025 vs 2026)</CardTitle>
              <CardDescription>Comparativa mensual de frecuencia de incidentes</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomCountTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, color: 'var(--foreground)' }} 
                  />
                  <Bar name="Año 2025" dataKey="cases2025" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar name="Año 2026" dataKey="cases2026" fill="hsl(203, 100%, 50%)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Chart 2: Monthly approved spend */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-foreground">Monto Aprobado por Mes (2025 vs 2026)</CardTitle>
              <CardDescription>Comparativa mensual de costo de auxilio aprobado</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                  <YAxis 
                    stroke="var(--muted-foreground)" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip content={<CustomAmountTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, color: 'var(--foreground)' }} 
                  />
                  <Bar name="Año 2025" dataKey="amount2025" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar name="Año 2026" dataKey="amount2026" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section 2: YTD Cumulative Spend Progress */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-foreground">Gasto Acumulado Mensual — Curva YTD (2025 vs 2026)</CardTitle>
            <CardDescription>Visualiza la velocidad de ejecución y acumulación del costo de auxilio aprobado</CardDescription>
          </CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 15, right: 15, left: -5, bottom: 0 }}>
                <defs>
                  <linearGradient id="color2025" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="color2026" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(203, 100%, 50%)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="hsl(203, 100%, 50%)" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="fullName" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="var(--muted-foreground)" 
                  fontSize={11} 
                  tickLine={false} 
                  tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`}
                />
                <Tooltip content={<CustomAmountTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="plainline"
                  iconSize={14}
                  wrapperStyle={{ fontSize: 11, color: 'var(--foreground)' }} 
                />
                <Area 
                  name="Acumulado 2025" 
                  type="monotone" 
                  dataKey="cumAmount2025" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#color2025)" 
                />
                <Area 
                  name="Acumulado 2026 (YTD)" 
                  type="monotone" 
                  dataKey="cumAmount2026" 
                  stroke="hsl(203, 100%, 50%)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#color2026)" 
                  connectNulls={false} // Stops drawing line after June
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Charts Section 3: Distribution Segmentations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Distribution by Claim Type */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground">Siniestros por Tipo de Reclamación</CardTitle>
              <CardDescription>Comparativa de cantidad de casos</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={claimsTypeData.slice(0, 5)} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={10} width={80} tickLine={false} />
                  <Tooltip content={<CustomCountTooltip />} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                  <Bar name="2025" dataKey="cases2025" fill="#94a3b8" radius={[0, 3, 3, 0]} />
                  <Bar name="2026" dataKey="cases2026" fill="hsl(203, 100%, 50%)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribution by Culpability */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground">Siniestros por Culpabilidad</CardTitle>
              <CardDescription>Comparativa del nivel de responsabilidad</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={culpabilidadData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomCountTooltip />} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                  <Bar name="2025" dataKey="cases2025" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={20} />
                  <Bar name="2026" dataKey="cases2026" fill="hsl(203, 100%, 50%)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribution by Vehicle Series */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground">Costo Aprobado por Serie de Vehículo</CardTitle>
              <CardDescription>Comparativa financiera de afectación por series</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seriesData.slice(0, 5)} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`} />
                  <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={10} width={65} tickLine={false} />
                  <Tooltip content={<CustomAmountTooltip />} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                  <Bar name="2025" dataKey="amount2025" fill="#94a3b8" radius={[0, 3, 3, 0]} />
                  <Bar name="2026" dataKey="amount2026" fill="hsl(142, 71%, 45%)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Manager Insights Card */}
        <Card className="bg-slate-950/20 border border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Observaciones de Gestión para Jefatura
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>
              • <strong>Progreso del Gasto (YTD)</strong>: A fecha de {MONTHS_NAMES[currentMonthIndex]}, el costo total aprobado del Fondo de Auxilio Mutuo para 2026 es de <strong>{formatCOP(totals.ytdAmount2026)}</strong>, comparado con <strong>{formatCOP(totals.ytdAmount2025)}</strong> en el mismo periodo del año anterior. Esto representa una variación en costo del <strong className={amountVariationYTD > 0 ? 'text-rose-400' : 'text-emerald-400'}>{amountVariationYTD > 0 ? '+' : ''}{amountVariationYTD.toFixed(1)}%</strong>.
            </p>
            <p>
              • <strong>Frecuencia de Incidentes</strong>: En cuanto a la cantidad de casos presentados YTD, en 2026 se han registrado <strong>{totals.ytdCases2026}</strong> incidentes frente a <strong>{totals.ytdCases2025}</strong> en 2025, variando en un <strong className={casesVariationYTD > 0 ? 'text-rose-400' : 'text-emerald-400'}>{casesVariationYTD > 0 ? '+' : ''}{casesVariationYTD.toFixed(1)}%</strong>.
            </p>
            <p>
              • <strong>Costo Medio por Caso</strong>: El costo medio por incidente aprobado ha cambiado de <strong>{formatCOP(avgCost2025)}</strong> en 2025 a <strong>{formatCOP(avgCost2026)}</strong> en 2026 (<strong className={avgCostVariation > 0 ? 'text-rose-400' : 'text-emerald-400'}>{avgCostVariation > 0 ? '+' : ''}{avgCostVariation.toFixed(1)}%</strong>). Un costo medio más bajo indica una mejor contención y negociación de los talleres y cotizaciones individuales.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
