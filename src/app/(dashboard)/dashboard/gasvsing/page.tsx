'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { dbService } from '@/lib/services/dbService';
import type { Expediente } from '@/types/database';
import { 
  TrendingUp, 
  RefreshCw, 
  Calendar, 
  DollarSign, 
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Maximize2,
  Minimize2,
  X,
  Coins,
  Percent,
  TrendingDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MultiSelect } from '@/components/ui/MultiSelect';
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

// Fallback incomes in case API fails
const FALLBACK_INGRESOS = {
  "2025": [
    211667972, 203140363, 204418961, 205323061, 200077286, 200227722,
    197096022, 197736597, 192642742, 190050340, 190625812, 205896275
  ],
  "2026": [
    203926938, 201609101, 203342553, 199665656, 203079923, 0, 0, 0, 0, 0, 0, 0
  ]
};

export default function GasVsIngPage() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [ingresos, setIngresos] = useState<Record<string, number[]>>(FALLBACK_INGRESOS);
  const [loading, setLoading] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([0, 1, 2, 3, 4]); // Default Ene-May matching active 2026 data
  const [expandedChart, setExpandedChart] = useState<{ id: string; title: string; description: string } | null>(null);
  const [filterEstado, setFilterEstado] = useState<string[]>(['Pendiente', 'Revisado', 'Aprobado']);
  const [filterTipoReclamacion, setFilterTipoReclamacion] = useState<string[]>([]);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    const nextVal = !sidebarCollapsed;
    setSidebarCollapsed(nextVal);
    window.dispatchEvent(new CustomEvent('set-sidebar-collapsed', { detail: nextVal }));
  };

  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('set-sidebar-collapsed', { detail: false }));
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    toast.loading('Cargando análisis de Gastos vs Ingresos...', { id: 'loading-gasvsing' });
    try {
      const [expData, ingResponse] = await Promise.all([
        dbService.getExpedientes(),
        fetch('/api/ingresos').then(res => res.json()).catch(() => FALLBACK_INGRESOS)
      ]);
      setExpedientes(expData);
      if (ingResponse && (ingResponse['2025'] || ingResponse['2026'])) {
        setIngresos(ingResponse);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos financieros');
    } finally {
      setLoading(false);
      toast.dismiss('loading-gasvsing');
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      toast.dismiss('loading-gasvsing');
    };
  }, []);

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

  // Date Parsing Helpers
  const getYear = (e: Expediente) => {
    if (!e.fecha_incidente) return null;
    return parseInt(e.fecha_incidente.split('-')[0], 10);
  };

  const getMonth = (e: Expediente) => {
    if (!e.fecha_incidente) return null;
    return parseInt(e.fecha_incidente.split('-')[1], 10) - 1; // 0-11
  };

  // Financial Calculations & Memoization
  const financialData = useMemo(() => {
    // 1. Initialize arrays for month data
    const monthlyExpenses2025 = Array(12).fill(0);
    const monthlyExpenses2026 = Array(12).fill(0);

    // Filter active (non-deleted, approved/closed or pending approved) expedientes
    const activeExp = expedientes.filter(e => {
      if (e.deleted_at !== null) return false;
      if (filterEstado.length > 0 && !filterEstado.includes(e.estado)) return false;
      if (filterTipoReclamacion.length > 0 && !filterTipoReclamacion.includes(e.tipo_reclamacion)) return false;
      if (filterMonth !== null && getMonth(e) !== filterMonth) return false;
      return true;
    });

    activeExp.forEach(e => {
      const yr = getYear(e);
      const mo = getMonth(e);
      const approved = e.valor_final_aprobado || 0;

      if (mo !== null && mo >= 0 && mo < 12) {
        if (yr === 2025) {
          monthlyExpenses2025[mo] += approved;
        } else if (yr === 2026) {
          monthlyExpenses2026[mo] += approved;
        }
      }
    });
    // 2. Fetch incomes
    const rawInc2025 = ingresos["2025"] || FALLBACK_INGRESOS["2025"];
    const rawInc2026 = ingresos["2026"] || FALLBACK_INGRESOS["2026"];

    // Si filterMonth está activo, hacemos cero los ingresos de los otros meses
    const inc2025 = rawInc2025.map((val, idx) => (filterMonth !== null && idx !== filterMonth) ? 0 : val);
    const inc2026 = rawInc2026.map((val, idx) => (filterMonth !== null && idx !== filterMonth) ? 0 : val);

    // Find the last month of 2026 with income > 0
    const lastIncomeMonthIndex2026 = inc2026.reduce((acc, val, idx) => val > 0 ? idx : acc, 0);

    // 3. Construct chronological financial objects
    const allMonths: any[] = [];
    let cumInc2025 = 0;
    let cumExp2025 = 0;
    let cumInc2026 = 0;
    let cumExp2026 = 0;

    for (let i = 0; i < 12; i++) {
      const incVal25 = inc2025[i] || 0;
      const expVal25 = monthlyExpenses2025[i] || 0;
      const incVal26 = inc2026[i] || 0;
      const expVal26 = monthlyExpenses2026[i] || 0;

      cumInc2025 += incVal25;
      cumExp2025 += expVal25;

      // Handle 2026 values up to the active range
      const is2026Active = i <= lastIncomeMonthIndex2026;
      if (is2026Active) {
        cumInc2026 += incVal26;
        cumExp2026 += expVal26;
      }

      const ratio25 = incVal25 > 0 ? (expVal25 / incVal25) * 100 : 0;
      const ratio26 = incVal26 > 0 ? (expVal26 / incVal26) * 100 : 0;

      allMonths.push({
        monthIndex: i,
        name: MONTHS_NAMES[i],
        shortName: MONTHS_SHORT[i],
        income2025: incVal25,
        expense2025: expVal25,
        ratio2025: ratio25,
        cumIncome2025: cumInc2025,
        cumExpense2025: cumExp2025,
        cumRatio2025: cumInc2025 > 0 ? (cumExp2025 / cumInc2025) * 100 : 0,

        // 2026
        income2026: is2026Active ? incVal26 : null,
        expense2026: is2026Active ? expVal26 : null,
        ratio2026: is2026Active ? ratio26 : null,
        cumIncome2026: is2026Active ? cumInc2026 : null,
        cumExpense2026: is2026Active ? cumExp2026 : null,
        cumRatio2026: is2026Active && cumInc2026 > 0 ? (cumExp2026 / cumInc2026) * 100 : null,
      });
    }

    // 4. Calculate Selected Period Totals
    const totals = {
      income2025: 0,
      expense2025: 0,
      net2025: 0,
      ratio2025: 0,

      income2026: 0,
      expense2026: 0,
      net2026: 0,
      ratio2026: 0,
    };

    selectedMonths.forEach(m => {
      totals.income2025 += inc2025[m] || 0;
      totals.expense2025 += monthlyExpenses2025[m] || 0;

      if (m <= lastIncomeMonthIndex2026) {
        totals.income2026 += inc2026[m] || 0;
        totals.expense2026 += monthlyExpenses2026[m] || 0;
      }
    });

    totals.net2025 = totals.income2025 - totals.expense2025;
    totals.ratio2025 = totals.income2025 > 0 ? (totals.expense2025 / totals.income2025) * 100 : 0;

    totals.net2026 = totals.income2026 - totals.expense2026;
    totals.ratio2026 = totals.income2026 > 0 ? (totals.expense2026 / totals.income2026) * 100 : 0;

    return {
      monthlyData: allMonths.filter(m => selectedMonths.includes(m.monthIndex)),
      fullMonthlyData: allMonths,
      totals,
      lastActiveMonthIndex2026: lastIncomeMonthIndex2026
    };
  }, [expedientes, ingresos, selectedMonths, filterEstado, filterMonth, filterTipoReclamacion]);

  const { monthlyData, fullMonthlyData, totals, lastActiveMonthIndex2026 } = financialData;
  // Variations Calculation
  const incomeVariation = totals.income2025 > 0 
    ? ((totals.income2026 - totals.income2025) / totals.income2025) * 100 
    : 0;

  const expenseVariation = totals.expense2025 > 0 
    ? ((totals.expense2026 - totals.expense2025) / totals.expense2025) * 100 
    : 0;

  const netVariation = totals.net2025 !== 0 
    ? ((totals.net2026 - totals.net2025) / Math.abs(totals.net2025)) * 100 
    : 0;

  const ratioVariation = totals.ratio2026 - totals.ratio2025; // Percentage points difference

  // Custom tooltips
  const CustomCOPTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataObj = payload[0].payload;
      const is2026 = payload.some((p: any) => p.dataKey.includes('2026'));
      const ratio = is2026 ? dataObj.ratio2026 : dataObj.ratio2025;

      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-lg text-xs space-y-1.5 text-slate-800 dark:text-slate-100">
          <p className="font-bold text-slate-900 dark:text-white mb-1">{label}</p>
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex items-center gap-4 justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill || p.stroke }} />
                <span className="text-muted-foreground">{p.name}:</span>
              </span>
              <span className="font-bold font-mono">{formatCOP(p.value)}</span>
            </div>
          ))}
          {ratio !== undefined && ratio !== null && (
            <div className="border-t border-border/60 pt-1.5 mt-1.5 flex items-center justify-between">
              <span className="font-semibold text-primary">Afectación del Mes:</span>
              <span className="font-bold font-mono text-primary">{ratio.toFixed(1)}%</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomRatioTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-lg text-xs space-y-1.5 text-slate-800 dark:text-slate-100">
          <p className="font-bold text-slate-900 dark:text-white mb-1">{label}</p>
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex items-center gap-4 justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill || p.stroke }} />
                <span className="text-muted-foreground">{p.name}:</span>
              </span>
              <span className="font-bold font-mono">{p.value !== null ? `${Number(p.value).toFixed(1)}%` : '—'}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatLabelAmount = (val: number) => {
    if (val === 0 || val === null) return '';
    return `$${(val / 1000000).toFixed(1)}M`;
  };

  // Render Charts functions
  const renderMonthlyChart2025 = (isMaximized = false) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={monthlyData} 
          margin={{ top: 15, right: 10, left: -20, bottom: isMaximized ? 20 : 5 }}
          className="cursor-pointer"
          onClick={(state) => {
            if (state && state.activeTooltipIndex !== undefined) {
              const item = monthlyData[state.activeTooltipIndex];
              if (item) {
                setFilterMonth(current => current === item.monthIndex ? null : item.monthIndex);
              }
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="shortName" stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} tickLine={false} />
          <YAxis stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} tickLine={false} tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`} />
          <Tooltip content={<CustomCOPTooltip />} />
          <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
          <Bar name="Ingresos 2025" dataKey="income2025" fill="#cbd5e1" radius={[3, 3, 0, 0]} maxBarSize={20}>
            <LabelList dataKey="income2025" position="top" formatter={formatLabelAmount} fill="currentColor" style={{ fontSize: 8, opacity: 0.8 }} />
          </Bar>
          <Bar name="Gastos 2025" dataKey="expense2025" fill="#1e293b" stroke="#475569" strokeWidth={1} radius={[3, 3, 0, 0]} maxBarSize={20}>
            <LabelList dataKey="expense2025" position="top" formatter={formatLabelAmount} fill="currentColor" style={{ fontSize: 8, opacity: 0.8 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderMonthlyChart2026 = (isMaximized = false) => {
    // Filter months that are within the active range of 2026 for readability
    const activeData2026 = monthlyData.filter(m => m.monthIndex <= lastActiveMonthIndex2026);

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={activeData2026} 
          margin={{ top: 15, right: 10, left: -20, bottom: isMaximized ? 20 : 5 }}
          className="cursor-pointer"
          onClick={(state) => {
            if (state && state.activeTooltipIndex !== undefined) {
              const item = activeData2026[state.activeTooltipIndex];
              if (item) {
                setFilterMonth(current => current === item.monthIndex ? null : item.monthIndex);
              }
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="shortName" stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} tickLine={false} />
          <YAxis stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} tickLine={false} tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`} />
          <Tooltip content={<CustomCOPTooltip />} />
          <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
          <Bar name="Ingresos 2026" dataKey="income2026" fill="hsl(203, 100%, 50%)" radius={[3, 3, 0, 0]} maxBarSize={20}>
            <LabelList dataKey="income2026" position="top" formatter={formatLabelAmount} fill="currentColor" style={{ fontSize: 8, opacity: 0.8 }} />
          </Bar>
          <Bar name="Gastos 2026" dataKey="expense2026" fill="hsl(217, 91%, 42%)" radius={[3, 3, 0, 0]} maxBarSize={20}>
            <LabelList dataKey="expense2026" position="top" formatter={formatLabelAmount} fill="currentColor" style={{ fontSize: 8, opacity: 0.8 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderRatioChart = (isMaximized = false) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={monthlyData} 
          margin={{ top: 15, right: 20, left: -20, bottom: isMaximized ? 20 : 5 }}
          className="cursor-pointer"
          onClick={(state) => {
            if (state && state.activeTooltipIndex !== undefined) {
              const item = monthlyData[state.activeTooltipIndex];
              if (item) {
                setFilterMonth(current => current === item.monthIndex ? null : item.monthIndex);
              }
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="shortName" stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} tickLine={false} />
          <YAxis stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} tickLine={false} tickFormatter={(val) => `${val}%`} />
          <Tooltip content={<CustomRatioTooltip />} />
          <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
          <Line name="Afectación 2025" type="monotone" dataKey="ratio2025" stroke="#94a3b8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}>
            <LabelList dataKey="ratio2025" position="top" formatter={(v: number) => `${v.toFixed(0)}%`} fill="currentColor" style={{ fontSize: 8, opacity: 0.8 }} />
          </Line>
          <Line name="Afectación 2026" type="monotone" dataKey="ratio2026" stroke="hsl(203, 100%, 50%)" strokeWidth={2} connectNulls dot={{ r: 4 }} activeDot={{ r: 6 }}>
            <LabelList dataKey="ratio2026" position="top" formatter={(v: number) => v !== null ? `${v.toFixed(0)}%` : ''} fill="currentColor" style={{ fontSize: 8, opacity: 0.8 }} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderCumulativeChart2025 = (isMaximized = false) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={monthlyData} 
          margin={{ top: 15, right: 20, left: -20, bottom: isMaximized ? 20 : 5 }}
          className="cursor-pointer"
          onClick={(state) => {
            if (state && state.activeTooltipIndex !== undefined) {
              const item = monthlyData[state.activeTooltipIndex];
              if (item) {
                setFilterMonth(current => current === item.monthIndex ? null : item.monthIndex);
              }
            }
          }}
        >
          <defs>
            <linearGradient id="colorInc25" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#cbd5e1" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#cbd5e1" stopOpacity={0.01}/>
            </linearGradient>
            <linearGradient id="colorExp25" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1e293b" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#1e293b" stopOpacity={0.01}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
          <XAxis dataKey="shortName" stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} tickLine={false} />
          <YAxis stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} tickLine={false} tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`} />
          <Tooltip content={<CustomCOPTooltip />} />
          <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
          <Area name="Ingresos Acum. 2025" type="monotone" dataKey="cumIncome2025" stroke="#cbd5e1" fillOpacity={1} fill="url(#colorInc25)" strokeWidth={2}>
            <LabelList dataKey="cumIncome2025" position="top" formatter={formatLabelAmount} fill="currentColor" style={{ fontSize: 8, opacity: 0.75 }} />
          </Area>
          <Area name="Gastos Acum. 2025" type="monotone" dataKey="cumExpense2025" stroke="#1e293b" fillOpacity={1} fill="url(#colorExp25)" strokeWidth={2}>
            <LabelList dataKey="cumExpense2025" position="top" formatter={formatLabelAmount} fill="currentColor" style={{ fontSize: 8, opacity: 0.75 }} />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const renderCumulativeChart2026 = (isMaximized = false) => {
    const activeData2026 = monthlyData.filter(m => m.monthIndex <= lastActiveMonthIndex2026);

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={activeData2026} 
          margin={{ top: 15, right: 20, left: -20, bottom: isMaximized ? 20 : 5 }}
          className="cursor-pointer"
          onClick={(state) => {
            if (state && state.activeTooltipIndex !== undefined) {
              const item = activeData2026[state.activeTooltipIndex];
              if (item) {
                setFilterMonth(current => current === item.monthIndex ? null : item.monthIndex);
              }
            }
          }}
        >
          <defs>
            <linearGradient id="colorInc26" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(203, 100%, 50%)" stopOpacity={0.25}/>
              <stop offset="95%" stopColor="hsl(203, 100%, 50%)" stopOpacity={0.01}/>
            </linearGradient>
            <linearGradient id="colorExp26" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217, 91%, 42%)" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="hsl(217, 91%, 42%)" stopOpacity={0.01}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
          <XAxis dataKey="shortName" stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} tickLine={false} />
          <YAxis stroke="currentColor" tick={{ fill: 'currentColor', opacity: 0.7 }} fontSize={10} tickLine={false} tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`} />
          <Tooltip content={<CustomCOPTooltip />} />
          <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
          <Area name="Ingresos Acum. 2026" type="monotone" dataKey="cumIncome2026" stroke="hsl(203, 100%, 50%)" fillOpacity={1} fill="url(#colorInc26)" strokeWidth={2}>
            <LabelList dataKey="cumIncome2026" position="top" formatter={formatLabelAmount} fill="currentColor" style={{ fontSize: 8, opacity: 0.75 }} />
          </Area>
          <Area name="Gastos Acum. 2026" type="monotone" dataKey="cumExpense2026" stroke="hsl(217, 91%, 42%)" fillOpacity={1} fill="url(#colorExp26)" strokeWidth={2}>
            <LabelList dataKey="cumExpense2026" position="top" formatter={formatLabelAmount} fill="currentColor" style={{ fontSize: 8, opacity: 0.75 }} />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        title="Gastos vs Ingresos (GasVsIng)" 
        subtitle="SIGFAM — Análisis del balance financiero mensual, afectación y acumulados 2025 vs 2026" 
        action={
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData} 
              disabled={loading} 
              className="h-9 px-2.5 sm:px-3 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-slate-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSidebar}
              className="hidden md:flex text-xs h-9 py-1 px-3 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-slate-200 transition-colors"
            >
              {sidebarCollapsed ? (
                <>
                  <Minimize2 className="w-4 h-4 mr-2" />
                  Salir Pantalla Completa
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Pantalla Completa
                </>
              )}
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center space-y-2">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Procesando información financiera...</p>
            </div>
          </div>
        ) : (
          <>
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
                  <Button variant="outline" size="sm" onClick={loadData} className="h-7 px-2.5 sm:px-3 text-[11px] flex items-center gap-1.5">
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Actualizar</span>
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                {MONTHS_NAMES.map((name, index) => {
                  const isSelected = selectedMonths.includes(index);
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
                      {index > lastActiveMonthIndex2026 && (
                        <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-yellow-500 rounded-full" title="Mes sin datos para 2026 todavía" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Filters Toolbar */}
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col md:flex-row flex-wrap items-stretch md:items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <MultiSelect
                  label="Tipo de Reclamación"
                  options={[
                    { label: 'Siniestro', value: 'Siniestro' },
                    { label: 'Vidrios', value: 'Vidrios' },
                    { label: 'Carrocería', value: 'Carrocería' },
                    { label: 'Repuestos', value: 'Repuestos' },
                    { label: 'Pérdida parcial', value: 'Pérdida parcial' },
                    { label: 'Otro', value: 'Otro' }
                  ]}
                  selectedValues={filterTipoReclamacion}
                  onChange={setFilterTipoReclamacion}
                  placeholder="Todos los tipos"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <MultiSelect
                  label="Estado de Expediente"
                  options={[
                    { label: 'Pendiente', value: 'Pendiente' },
                    { label: 'Revisado', value: 'Revisado' },
                    { label: 'Aprobado', value: 'Aprobado' },
                    { label: 'Rechazado', value: 'Rechazado' }
                  ]}
                  selectedValues={filterEstado}
                  onChange={setFilterEstado}
                  placeholder="Todos los estados"
                />
              </div>
              {(filterTipoReclamacion.length > 0 || filterEstado.length > 0 || filterMonth !== null) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterTipoReclamacion([]);
                    setFilterEstado([]);
                    setFilterMonth(null);
                  }}
                  className="text-xs text-red-400 hover:text-red-500 h-10 px-3 shrink-0"
                >
                  Limpiar Filtros
                </Button>
              )}
            </div>

            {selectedMonths.length === 0 ? (
              <div className="py-24 text-center glass border border-border rounded-xl">
                <Info className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-semibold">Selecciona al menos un mes en el filtro de arriba para visualizar las gráficas y KPIs.</p>
              </div>
            ) : (
              <>
                {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Ingresos Totales */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ingresos FAM</CardTitle>
                  <Coins className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground font-semibold">2026:</span>
                    <span className="text-lg font-bold font-mono text-foreground">{formatCOP(totals.income2026)}</span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-border/40 pt-1.5">
                    <span className="text-xs text-muted-foreground font-semibold">2025:</span>
                    <span className="text-sm font-semibold font-mono text-muted-foreground">{formatCOP(totals.income2025)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] mt-2 pt-1 border-t border-border/20 justify-end">
                    <span className="text-muted-foreground font-medium">Variación:</span>
                    <span className={cn(
                      "flex items-center font-bold",
                      incomeVariation > 0 ? "text-emerald-500" : incomeVariation < 0 ? "text-rose-500" : "text-muted-foreground"
                    )}>
                      {incomeVariation > 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : incomeVariation < 0 ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : null}
                      {incomeVariation > 0 ? '+' : ''}{incomeVariation.toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Gastos Totales */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gastos Aprobados</CardTitle>
                  <TrendingDown className="h-4 w-4 text-rose-500" />
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground font-semibold">2026:</span>
                    <span className="text-lg font-bold font-mono text-foreground">{formatCOP(totals.expense2026)}</span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-border/40 pt-1.5">
                    <span className="text-xs text-muted-foreground font-semibold">2025:</span>
                    <span className="text-sm font-semibold font-mono text-muted-foreground">{formatCOP(totals.expense2025)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] mt-2 pt-1 border-t border-border/20 justify-end">
                    <span className="text-muted-foreground font-medium">Variación:</span>
                    <span className={cn(
                      "flex items-center font-bold",
                      expenseVariation > 0 ? "text-rose-500" : expenseVariation < 0 ? "text-emerald-500" : "text-muted-foreground"
                    )}>
                      {expenseVariation > 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : expenseVariation < 0 ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : null}
                      {expenseVariation > 0 ? '+' : ''}{expenseVariation.toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Resultado Neto */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resultado Neto (FAM)</CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground font-semibold">2026:</span>
                    <span className={cn("text-lg font-bold font-mono", totals.net2026 >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {formatCOP(totals.net2026)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-border/40 pt-1.5">
                    <span className="text-xs text-muted-foreground font-semibold">2025:</span>
                    <span className={cn("text-sm font-semibold font-mono", totals.net2025 >= 0 ? "text-emerald-500/80" : "text-rose-500/80")}>
                      {formatCOP(totals.net2025)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] mt-2 pt-1 border-t border-border/20 justify-end">
                    <span className="text-muted-foreground font-medium">Variación:</span>
                    <span className={cn(
                      "flex items-center font-bold",
                      netVariation > 0 ? "text-emerald-500" : netVariation < 0 ? "text-rose-500" : "text-muted-foreground"
                    )}>
                      {netVariation > 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : netVariation < 0 ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : null}
                      {netVariation > 0 ? '+' : ''}{netVariation.toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Relación Gasto/Ingreso */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Relación Afectación</CardTitle>
                  <Percent className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground font-semibold">2026:</span>
                    <span className="text-lg font-bold font-mono text-foreground">
                      {totals.ratio2026.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-border/40 pt-1.5">
                    <span className="text-xs text-muted-foreground font-semibold">2025:</span>
                    <span className="text-sm font-semibold font-mono text-muted-foreground">
                      {totals.ratio2025.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] mt-2 pt-1 border-t border-border/20 justify-end">
                    <span className="text-muted-foreground font-medium">Diferencia:</span>
                    <span className={cn(
                      "flex items-center font-bold",
                      ratioVariation > 0 ? "text-rose-500 font-bold" : ratioVariation < 0 ? "text-emerald-500 font-bold" : "text-muted-foreground"
                    )}>
                      {ratioVariation > 0 ? `+${ratioVariation.toFixed(1)} p.p.` : `${ratioVariation.toFixed(1)} p.p.`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Row 1: Gastos vs Ingresos (2025 vs 2026) Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 2025 Chart */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <Card className="bg-card border-border shadow-sm h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        Gastos vs Ingresos 2025
                        {filterMonth !== null && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            Filtro: {MONTHS_NAMES[filterMonth]}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>Comparativa mensual de ingresos vs egresos aprobados</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                      onClick={() => setExpandedChart({
                        id: 'monthly-2025',
                        title: 'Gastos vs Ingresos Año 2025',
                        description: 'Comparación detallada mensual de ingresos recibidos contra egresos aprobados en el 2025'
                      })}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {renderMonthlyChart2025(false)}
                  </CardContent>
                </Card>
              </motion.div>

              {/* 2026 Chart */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
                <Card className="bg-card border-border shadow-sm h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        Gastos vs Ingresos 2026
                        {filterMonth !== null && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            Filtro: {MONTHS_NAMES[filterMonth]}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>Comparativa mensual de ingresos vs egresos aprobados (rango activo)</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                      onClick={() => setExpandedChart({
                        id: 'monthly-2026',
                        title: 'Gastos vs Ingresos Año 2026',
                        description: 'Comparación detallada mensual de ingresos recibidos contra egresos aprobados en el 2026'
                      })}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {renderMonthlyChart2026(false)}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Row 2: Afectación Mensual (Line) */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
              <Card className="bg-card border-border shadow-sm w-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      Tasa de Afectación Mensual (%)
                      {filterMonth !== null && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          Filtro: {MONTHS_NAMES[filterMonth]}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>Porcentaje mensual de ingresos consumidos por gastos (2025 vs 2026)</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                    onClick={() => setExpandedChart({
                      id: 'ratio-monthly',
                      title: 'Tasa de Afectación Mensual de Siniestralidad (2025 vs 2026)',
                      description: 'Proporción de ingresos del FAM consumida por egresos de siniestros mes a mes'
                    })}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="h-[280px]">
                  {renderRatioChart(false)}
                </CardContent>
              </Card>
            </motion.div>

            {/* Row 3: Acumulados (Area) Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cumulative 2025 */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
                <Card className="bg-card border-border shadow-sm h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        Acumulado Gastos vs Ingresos 2025
                        {filterMonth !== null && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            Filtro: {MONTHS_NAMES[filterMonth]}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>Tendencia acumulada del balance financiero (Ene-Dic 2025)</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                      onClick={() => setExpandedChart({
                        id: 'cum-2025',
                        title: 'Balance Financiero Acumulado — Año 2025',
                        description: 'Crecimiento acumulado cronológico de los ingresos vs egresos para el año 2025'
                      })}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {renderCumulativeChart2025(false)}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Cumulative 2026 */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.4 }}>
                <Card className="bg-card border-border shadow-sm h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        Acumulado Gastos vs Ingresos 2026
                        {filterMonth !== null && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            Filtro: {MONTHS_NAMES[filterMonth]}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>Tendencia acumulada del balance financiero (Ene-May 2026)</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                      onClick={() => setExpandedChart({
                        id: 'cum-2026',
                        title: 'Balance Financiero Acumulado — Año 2026',
                        description: 'Crecimiento acumulado cronológico de los ingresos vs egresos para el año 2026'
                      })}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {renderCumulativeChart2026(false)}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Manager Insights Card */}
            <Card className="bg-white dark:bg-white border-2 border-primary/20 shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Observaciones de Cruzamiento Financiero (Gerencia)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-700 dark:text-slate-700 space-y-2">
                <p>
                  • <strong className="text-slate-900 dark:text-slate-900">Salud del Fondo (2026 YTD)</strong>: Los ingresos acumulados para el periodo seleccionado en 2026 son de <strong className="text-slate-900 dark:text-slate-900">{formatCOP(totals.income2026)}</strong> frente a unos gastos de <strong className="text-slate-900 dark:text-slate-900">{formatCOP(totals.expense2026)}</strong>. Esto arroja un superávit neto de <strong className={totals.net2026 >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{formatCOP(totals.net2026)}</strong>, con una tasa de afectación de <strong className="text-slate-900 dark:text-slate-900">{totals.ratio2026.toFixed(1)}%</strong>.
                </p>
                <p>
                  • <strong className="text-slate-900 dark:text-slate-900">Comparativa con Periodo Anterior (2025)</strong>: En el mismo conjunto de meses del 2025, el Fondo registró ingresos por <strong className="text-slate-900 dark:text-slate-900">{formatCOP(totals.income2025)}</strong> y gastos por <strong className="text-slate-900 dark:text-slate-900">{formatCOP(totals.expense2025)}</strong>, arrojando un superávit de <strong className="text-slate-900 dark:text-slate-900">{formatCOP(totals.net2025)}</strong> (tasa de afectación: <strong className="text-slate-900 dark:text-slate-900">{totals.ratio2025.toFixed(1)}%</strong>). La tasa de afectación varió en <strong className={ratioVariation > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>{ratioVariation > 0 ? '+' : ''}{ratioVariation.toFixed(1)} puntos porcentuales</strong>.
                </p>
                <p>
                  • <strong className="text-slate-900 dark:text-slate-900">Análisis de Estabilidad Financiera</strong>: Mantener la tasa de afectación por debajo del <strong className="text-slate-900 dark:text-slate-900">100%</strong> asegura que el Fondo de Auxilio Mutuo siga siendo autosostenible sin requerir inyecciones extraordinarias de capital por parte de Flota Sugamuxi S.A.
                </p>
              </CardContent>
            </Card>

              </>
            )}
            <Footer />
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
              {/* Modal Body */}
              <div className="flex-1 p-6 overflow-hidden flex items-center justify-center bg-background/50">
                <div className="w-full h-full">
                  {expandedChart.id === 'monthly-2025' && renderMonthlyChart2025(true)}
                  {expandedChart.id === 'monthly-2026' && renderMonthlyChart2026(true)}
                  {expandedChart.id === 'ratio-monthly' && renderRatioChart(true)}
                  {expandedChart.id === 'cum-2025' && renderCumulativeChart2025(true)}
                  {expandedChart.id === 'cum-2026' && renderCumulativeChart2026(true)}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
