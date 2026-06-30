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
  GitCompare, 
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Maximize2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
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
  LabelList
} from 'recharts';
import { formatCOP, cn } from '@/lib/utils';

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
  const [selectedMonths, setSelectedMonths] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const [expandedChart, setExpandedChart] = useState<{ id: string; title: string; description: string } | null>(null);

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

  // Month select helpers
  const handleSelectAllMonths = () => {
    setSelectedMonths([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  };

  const handleSelectNoMonths = () => {
    setSelectedMonths([]);
  };

  const handleToggleMonth = (index: number) => {
    if (selectedMonths.includes(index)) {
      setSelectedMonths(selectedMonths.filter(m => m !== index));
    } else {
      setSelectedMonths([...selectedMonths, index].sort((a, b) => a - b));
    }
  };

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
          
          if (selectedMonths.includes(mo)) {
            t.cases2025 += 1;
            t.amount2025 += approved;
            t.cotizado2025 += cotizado;
            if (mo <= currentMonthIndex) {
              t.ytdCases2025 += 1;
              t.ytdAmount2025 += approved;
            }
          }
        } else if (yr === 2026) {
          months[mo].cases2026 += 1;
          months[mo].amount2026 += approved;

          if (selectedMonths.includes(mo)) {
            t.cases2026 += 1;
            t.amount2026 += approved;
            t.cotizado2026 += cotizado;
            if (mo <= currentMonthIndex) {
              t.ytdCases2026 += 1;
              t.ytdAmount2026 += approved;
            }
          }
        }
      }

      // Group by Claim Type, Culpability, Series (only if the claim month is selected!)
      if ((yr === 2025 || yr === 2026) && mo !== null && selectedMonths.includes(mo)) {
        // Group by Claim Type
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

    // 4. Calculate cumulative monthly spend only for selected months (chronologically)
    const filteredMonths = months.filter(m => selectedMonths.includes(m.monthIndex));
    let runCases2025 = 0;
    let runCases2026 = 0;
    let runAmount2025 = 0;
    let runAmount2026 = 0;

    for (let i = 0; i < filteredMonths.length; i++) {
      const mo = filteredMonths[i].monthIndex;
      runCases2025 += filteredMonths[i].cases2025;
      runAmount2025 += filteredMonths[i].amount2025;
      filteredMonths[i].cumCases2025 = runCases2025;
      filteredMonths[i].cumAmount2025 = runAmount2025;

      if (mo <= currentMonthIndex) {
        runCases2026 += filteredMonths[i].cases2026;
        runAmount2026 += filteredMonths[i].amount2026;
        filteredMonths[i].cumCases2026 = runCases2026;
        filteredMonths[i].cumAmount2026 = runAmount2026;
      } else {
        filteredMonths[i].cumCases2026 = null as any;
        filteredMonths[i].cumAmount2026 = null as any;
      }
    }

    return {
      monthlyData: filteredMonths,
      totals: t,
      claimsTypeData: Object.values(claimsMap).sort((a, b) => b.amount2026 - a.amount2026),
      culpabilidadData: Object.values(culpabilidadMap).sort((a, b) => b.cases2026 - a.cases2026),
      seriesData: Object.values(seriesMap).sort((a, b) => b.amount2026 - a.amount2026),
    };
  }, [activeExpedientes, selectedMonths]);

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

  // Formatting helpers for labels
  const formatLabelAmount = (value: number) => {
    if (!value) return '';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const getVariationLabel = (val2026: number, val2025: number) => {
    if (val2025 === 0 && val2026 === 0) return '0.0%';
    if (val2025 === 0) return '+100.0%';
    const diff = ((val2026 - val2025) / val2025) * 100;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}%`;
  };

  // Custom tooltips
  const CustomAmountTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val2025 = payload.find((p: any) => p.dataKey === 'amount2025' || p.dataKey === 'cumAmount2025' || p.name.includes('2025'))?.value || 0;
      const val2026 = payload.find((p: any) => p.dataKey === 'amount2026' || p.dataKey === 'cumAmount2026' || p.name.includes('2026'))?.value || 0;
      const variation = getVariationLabel(val2026, val2025);
      const isIncrease = val2026 > val2025;

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
          <div className="border-t border-white/5 pt-1.5 mt-1.5 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Variación (26 vs 25):</span>
            <span className={cn("font-mono font-bold", isIncrease ? "text-rose-400" : "text-emerald-400")}>
              {variation}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomCountTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val2025 = payload.find((p: any) => p.dataKey === 'cases2025' || p.name.includes('2025'))?.value || 0;
      const val2026 = payload.find((p: any) => p.dataKey === 'cases2026' || p.name.includes('2026'))?.value || 0;
      const variation = getVariationLabel(val2026, val2025);
      const isIncrease = val2026 > val2025;

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
          <div className="border-t border-white/5 pt-1.5 mt-1.5 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Variación (26 vs 25):</span>
            <span className={cn("font-mono font-bold", isIncrease ? "text-rose-400" : "text-emerald-400")}>
              {variation}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // --- Chart Renderers for normal grid & maximized modal ---
  const renderCasesMonthlyChart = (isMaximized = false) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={monthlyData} margin={{ top: 20, right: 10, left: -20, bottom: isMaximized ? 20 : 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="name" stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={11} tickLine={false} />
          <YAxis stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={11} tickLine={false} />
          <Tooltip content={<CustomCountTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: 'var(--foreground)' }} 
          />
          <Bar name="Año 2025" dataKey="cases2025" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={32}>
            <LabelList dataKey="cases2025" position="top" fill="currentColor" style={{ fontSize: 9, opacity: 0.8 }} formatter={(v: number) => v === 0 ? '' : v} />
          </Bar>
          <Bar name="Año 2026" dataKey="cases2026" fill="hsl(203, 100%, 50%)" radius={[4, 4, 0, 0]} maxBarSize={32}>
            <LabelList dataKey="cases2026" position="top" fill="currentColor" style={{ fontSize: 9, opacity: 0.8 }} formatter={(v: number) => v === 0 ? '' : v} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderAmountMonthlyChart = (isMaximized = false) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={monthlyData} margin={{ top: 20, right: 10, left: -10, bottom: isMaximized ? 20 : 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="name" stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={11} tickLine={false} />
          <YAxis 
            stroke="currentColor" 
            tick={{ fill: 'currentColor', opacity: 0.7 }} 
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
          <Bar name="Año 2025" dataKey="amount2025" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={32}>
            <LabelList dataKey="amount2025" position="top" formatter={formatLabelAmount} fill="currentColor" style={{ fontSize: 9, opacity: 0.8 }} />
          </Bar>
          <Bar name="Año 2026" dataKey="amount2026" fill="hsl(203, 100%, 50%)" radius={[4, 4, 0, 0]} maxBarSize={32}>
            <LabelList dataKey="amount2026" position="top" formatter={formatLabelAmount} fill="currentColor" style={{ fontSize: 9, opacity: 0.8 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderCumSpendChart = (isMaximized = false) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={monthlyData} margin={{ top: 20, right: 15, left: -5, bottom: isMaximized ? 20 : 0 }}>
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
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="fullName" stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={11} tickLine={false} />
          <YAxis 
            stroke="currentColor" 
            tick={{ fill: 'currentColor', opacity: 0.7 }} 
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
          >
            <LabelList dataKey="cumAmount2025" position="top" formatter={formatLabelAmount} fill="currentColor" style={{ fontSize: 8, opacity: 0.7 }} />
          </Area>
          <Area 
            name="Acumulado 2026 (YTD)" 
            type="monotone" 
            dataKey="cumAmount2026" 
            stroke="hsl(203, 100%, 50%)" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#color2026)" 
            connectNulls={false}
          >
            <LabelList dataKey="cumAmount2026" position="top" formatter={formatLabelAmount} fill="currentColor" style={{ fontSize: 8, opacity: 0.7 }} />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const renderClaimsTypeChart = (isMaximized = false) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={claimsTypeData.slice(0, 5)} layout="vertical" margin={{ top: 15, right: 30, left: 10, bottom: isMaximized ? 20 : 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} horizontal={false} />
          <XAxis type="number" stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} tickLine={false} />
          <YAxis dataKey="name" type="category" stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} width={80} tickLine={false} />
          <Tooltip content={<CustomCountTooltip />} />
          <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
          <Bar name="2025" dataKey="cases2025" fill="#94a3b8" radius={[0, 3, 3, 0]}>
            <LabelList dataKey="cases2025" position="right" fill="currentColor" style={{ fontSize: 9, opacity: 0.8 }} formatter={(v: number) => v === 0 ? '' : v} />
          </Bar>
          <Bar name="2026" dataKey="cases2026" fill="hsl(203, 100%, 50%)" radius={[0, 3, 3, 0]}>
            <LabelList dataKey="cases2026" position="right" fill="currentColor" style={{ fontSize: 9, opacity: 0.8 }} formatter={(v: number) => v === 0 ? '' : v} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderCulpabilidadChart = (isMaximized = false) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={culpabilidadData} margin={{ top: 20, right: 10, left: -20, bottom: isMaximized ? 20 : 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="name" stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} tickLine={false} />
          <YAxis stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} tickLine={false} />
          <Tooltip content={<CustomCountTooltip />} />
          <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
          <Bar name="2025" dataKey="cases2025" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={24}>
            <LabelList dataKey="cases2025" position="top" fill="currentColor" style={{ fontSize: 9, opacity: 0.8 }} formatter={(v: number) => v === 0 ? '' : v} />
          </Bar>
          <Bar name="2026" dataKey="cases2026" fill="hsl(203, 100%, 50%)" radius={[3, 3, 0, 0]} maxBarSize={24}>
            <LabelList dataKey="cases2026" position="top" fill="currentColor" style={{ fontSize: 9, opacity: 0.8 }} formatter={(v: number) => v === 0 ? '' : v} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderSeriesChart = (isMaximized = false) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={seriesData.slice(0, 5)} layout="vertical" margin={{ top: 15, right: 40, left: 10, bottom: isMaximized ? 20 : 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} horizontal={false} />
          <XAxis type="number" stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} tickLine={false} tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`} />
          <YAxis dataKey="name" type="category" stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} width={65} tickLine={false} />
          <Tooltip content={<CustomAmountTooltip />} />
          <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
          <Bar name="2025" dataKey="amount2025" fill="#94a3b8" radius={[0, 3, 3, 0]}>
            <LabelList dataKey="amount2025" position="right" formatter={formatLabelAmount} fill="currentColor" style={{ fontSize: 8, opacity: 0.8 }} />
          </Bar>
          <Bar name="2026" dataKey="amount2026" fill="hsl(203, 100%, 50%)" radius={[0, 3, 3, 0]}>
            <LabelList dataKey="amount2026" position="right" formatter={formatLabelAmount} fill="currentColor" style={{ fontSize: 8, opacity: 0.8 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        title="Comparativo de Gestión" 
        subtitle="SIGFAM — Análisis comparativo de siniestralidad, costos y gestión 2025 vs 2026" 
      />

      <div className="flex-1 p-6 overflow-auto space-y-6">
        {/* Toolbar & Month Filters */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-foreground">
                Selección de Meses para Comparativa y Acumulado YTD:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAllMonths} 
                className="text-[11px] h-7 px-3 bg-secondary/20 hover:bg-secondary/40 text-foreground"
              >
                Seleccionar Todos
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectNoMonths} 
                className="text-[11px] h-7 px-3 bg-secondary/20 hover:bg-secondary/40 text-foreground"
              >
                Limpiar Selección
              </Button>
              <Button variant="outline" size="sm" onClick={loadData} className="gap-2 h-7 px-3 text-[11px]">
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1.5">
            {MONTHS_NAMES.map((name, index) => {
              const isSelected = selectedMonths.includes(index);
              const hasData = index <= currentMonthIndex;
              return (
                <button
                  key={name}
                  onClick={() => handleToggleMonth(index)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 relative",
                    isSelected
                      ? "bg-primary text-white border-transparent shadow-glow-brand"
                      : "bg-secondary/10 border-border text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
                  )}
                >
                  {MONTHS_SHORT[index]}
                  {index > currentMonthIndex && (
                    <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-yellow-500 rounded-full" title="Mes sin datos para 2026 todavía" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedMonths.length === 0 ? (
          <div className="py-24 text-center glass border border-border rounded-xl">
            <Info className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-semibold">Selecciona al menos un mes en el filtro de arriba para visualizar las gráficas y KPIs.</p>
          </div>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
              {/* Card 1: Total Cases YTD */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex"
              >
                <Card className="relative overflow-hidden bg-card border-border shadow-sm flex flex-col justify-between h-full w-full min-h-[120px]">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Expedientes YTD</span>
                      <GitCompare className="w-4 h-4 text-slate-400" />
                    </CardDescription>
                    <CardTitle className="text-xl sm:text-2xl font-bold font-mono tracking-tight mt-1 flex items-baseline justify-between">
                      <span>{totals.ytdCases2026}</span>
                      <span className="text-[11px] text-muted-foreground font-normal">vs {totals.ytdCases2025} en 25</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 pt-0">
                    <div className="flex items-center gap-1.5">
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
                      <span className="text-[11px] text-muted-foreground">de variación</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Card 2: Approved Spend YTD */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="flex"
              >
                <Card className="relative overflow-hidden bg-card border-border shadow-sm flex flex-col justify-between h-full w-full min-h-[120px]">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Monto Aprobado YTD</span>
                      <DollarSign className="w-4 h-4 text-slate-400" />
                    </CardDescription>
                    <CardTitle className="text-xl sm:text-2xl font-bold font-mono tracking-tight mt-1 flex items-baseline justify-between">
                      <span>{formatCOP(totals.ytdAmount2026)}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 pt-0">
                    <div className="flex items-center gap-1.5">
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
                  </CardContent>
                </Card>
              </motion.div>

              {/* Card 3: Average Cost per Case */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex"
              >
                <Card className="relative overflow-hidden bg-card border-border shadow-sm flex flex-col justify-between h-full w-full min-h-[120px]">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Costo Medio / Caso</span>
                      <FileText className="w-4 h-4 text-slate-400" />
                    </CardDescription>
                    <CardTitle className="text-xl sm:text-2xl font-bold font-mono tracking-tight mt-1 flex items-baseline justify-between">
                      <span>{formatCOP(avgCost2026)}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 pt-0">
                    <div className="flex items-center gap-1.5">
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
                      <span className="text-[11px] text-muted-foreground">vs {formatCOP(avgCost2025)}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Card 4: Savings rate */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="flex"
              >
                <Card className="relative overflow-hidden bg-card border-border shadow-sm flex flex-col justify-between h-full w-full min-h-[120px]">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Eficiencia (Ahorro)</span>
                      <TrendingUp className="w-4 h-4 text-slate-400" />
                    </CardDescription>
                    <CardTitle className="text-xl sm:text-2xl font-bold font-mono tracking-tight mt-1 flex items-baseline justify-between">
                      <span>{saving2026.toFixed(1)}%</span>
                      <span className="text-[11px] text-muted-foreground font-normal">vs {saving2025.toFixed(1)}% en 25</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 pt-0">
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                        saving2026 > saving2025 ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                      )}>
                        {saving2026 > saving2025 ? 'Mejoró' : 'Estable'}
                      </div>
                      <span className="text-[11px] text-muted-foreground">Tasa global de ahorro</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Charts Section 1: Monthly comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Monthly cases count */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Cantidad de Expedientes por Mes (2025 vs 2026)</CardTitle>
                    <CardDescription>Comparativa mensual de frecuencia de incidentes</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                    onClick={() => setExpandedChart({
                      id: 'cases-monthly',
                      title: 'Cantidad de Expedientes por Mes (2025 vs 2026)',
                      description: 'Comparativa mensual de frecuencia de incidentes'
                    })}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="h-[320px]">
                  {renderCasesMonthlyChart(false)}
                </CardContent>
              </Card>

              {/* Chart 2: Monthly approved spend */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Monto Aprobado por Mes (2025 vs 2026)</CardTitle>
                    <CardDescription>Comparativa mensual de costo de auxilio aprobado</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                    onClick={() => setExpandedChart({
                      id: 'amount-monthly',
                      title: 'Monto Aprobado por Mes (2025 vs 2026)',
                      description: 'Comparativa mensual de costo de auxilio aprobado'
                    })}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="h-[320px]">
                  {renderAmountMonthlyChart(false)}
                </CardContent>
              </Card>
            </div>

            {/* Charts Section 2: YTD Cumulative Spend Progress */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">Gasto Acumulado Mensual — Curva YTD (2025 vs 2026)</CardTitle>
                  <CardDescription>Visualiza la velocidad de ejecución y acumulación del costo de auxilio aprobado</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                  onClick={() => setExpandedChart({
                    id: 'cum-spend',
                    title: 'Gasto Acumulado Mensual — Curva YTD (2025 vs 2026)',
                    description: 'Visualiza la velocidad de ejecución y acumulación del costo de auxilio aprobado'
                  })}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="h-[340px]">
                {renderCumSpendChart(false)}
              </CardContent>
            </Card>

            {/* Charts Section 3: Distribution Segmentations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Distribution by Claim Type */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Siniestros por Tipo de Reclamación</CardTitle>
                    <CardDescription>Comparativa de cantidad de casos</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                    onClick={() => setExpandedChart({
                      id: 'reclamaciones',
                      title: 'Siniestros por Tipo de Reclamación (2025 vs 2026)',
                      description: 'Comparativa de cantidad de casos por categoría de reclamo'
                    })}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="h-[280px]">
                  {renderClaimsTypeChart(false)}
                </CardContent>
              </Card>

              {/* Distribution by Culpability */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Siniestros por Culpabilidad</CardTitle>
                    <CardDescription>Comparativa del nivel de responsabilidad</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                    onClick={() => setExpandedChart({
                      id: 'culpabilidad',
                      title: 'Siniestros por Culpabilidad (2025 vs 2026)',
                      description: 'Comparativa de culpabilidad e imputación de siniestros'
                    })}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="h-[280px]">
                  {renderCulpabilidadChart(false)}
                </CardContent>
              </Card>

              {/* Distribution by Vehicle Series */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Costo Aprobado por Serie de Vehículo</CardTitle>
                    <CardDescription>Comparativa financiera de afectación por series</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                    onClick={() => setExpandedChart({
                      id: 'series',
                      title: 'Costo Aprobado por Serie de Vehículo (2025 vs 2026)',
                      description: 'Comparativa financiera de afectación según la serie del vehículo'
                    })}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="h-[280px]">
                  {renderSeriesChart(false)}
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
                  • <strong>Progreso del Gasto (YTD)</strong>: En el conjunto de meses seleccionados, el costo total aprobado del Fondo de Auxilio Mutuo para 2026 es de <strong>{formatCOP(totals.ytdAmount2026)}</strong>, comparado con <strong>{formatCOP(totals.ytdAmount2025)}</strong> en el mismo periodo del año anterior. Esto representa una variación en costo del <strong className={amountVariationYTD > 0 ? 'text-rose-400' : 'text-emerald-400'}>{amountVariationYTD > 0 ? '+' : ''}{amountVariationYTD.toFixed(1)}%</strong>.
                </p>
                <p>
                  • <strong>Frecuencia de Incidentes</strong>: En cuanto a la cantidad de casos presentados YTD para el rango activo de meses, en 2026 se han registrado <strong>{totals.ytdCases2026}</strong> incidentes frente a <strong>{totals.ytdCases2025}</strong> en 2025, variando en un <strong className={casesVariationYTD > 0 ? 'text-rose-400' : 'text-emerald-400'}>{casesVariationYTD > 0 ? '+' : ''}{casesVariationYTD.toFixed(1)}%</strong>.
                </p>
                <p>
                  • <strong>Costo Medio por Caso</strong>: El costo medio por incidente aprobado para este conjunto de meses ha cambiado de <strong>{formatCOP(avgCost2025)}</strong> en 2025 a <strong>{formatCOP(avgCost2026)}</strong> en 2026 (<strong className={avgCostVariation > 0 ? 'text-rose-400' : 'text-emerald-400'}>{avgCostVariation > 0 ? '+' : ''}{avgCostVariation.toFixed(1)}%</strong>). Un costo medio más bajo indica una mejor contención y negociación de los talleres y cotizaciones individuales.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Expanded Chart Modal */}
      <AnimatePresence>
        {expandedChart && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-[95vw] lg:max-w-7xl h-[85vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-border bg-secondary/10">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{expandedChart.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{expandedChart.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full hover:bg-secondary/80 text-foreground"
                  onClick={() => setExpandedChart(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {/* Modal Body / Chart Container */}
              <div className="flex-1 p-6 overflow-hidden flex items-center justify-center bg-background/50">
                <div className="w-full h-full">
                  {expandedChart.id === 'cases-monthly' && renderCasesMonthlyChart(true)}
                  {expandedChart.id === 'amount-monthly' && renderAmountMonthlyChart(true)}
                  {expandedChart.id === 'cum-spend' && renderCumSpendChart(true)}
                  {expandedChart.id === 'reclamaciones' && renderClaimsTypeChart(true)}
                  {expandedChart.id === 'culpabilidad' && renderCulpabilidadChart(true)}
                  {expandedChart.id === 'series' && renderSeriesChart(true)}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
