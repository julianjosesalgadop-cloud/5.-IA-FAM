'use client';
import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
  LabelList,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCOP } from '@/lib/utils';
import type { Expediente } from '@/types/database';

interface DashboardChartsProps {
  expedientes: Expediente[];
  unfilteredExpedientes: Expediente[];
  expedientesForVehicles?: Expediente[];
  expedientesForDrivers?: Expediente[];
  expedientesForPropietarios?: Expediente[];
  onSelectPlaca?: (placa: string) => void;
  onSelectConductor?: (conductor: string) => void;
  selectedPlaca?: string;
  selectedConductor?: string;
  onSelectProprietario?: (proprietario: string) => void;
  selectedProprietario?: string;
  onSelectTipoReclamacion?: (tipo: string) => void;
  selectedTipoReclamacion?: string;
  onSelectMonth?: (month: number | null) => void;
  selectedMonth?: number | null;
  onSelectStatus?: (status: string) => void;
  selectedStatus?: string;
  onSelectCulpabilidad?: (culpabilidad: string) => void;
  selectedCulpabilidad?: string;
  onSelectCausaRaiz?: (causa: string) => void;
  selectedCausaRaiz?: string;
}

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--foreground))',
};

function CustomTooltipBar({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isFiltered = data.totalFilteredCases < data.totalGeneralCases;
    
    return (
      <div style={CUSTOM_TOOLTIP_STYLE} className="p-3 text-xs space-y-1.5 shadow-lg">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => {
          const val = p.value || 0;
          let pct = 0;

          if (p.name === 'valor' || p.name === 'aprobado') {
            const denom = isFiltered ? data.totalFilteredApprovedSum : data.totalGeneralApprovedSum;
            pct = denom > 0 ? (val / denom) * 100 : 0;
          } else {
            const denom = isFiltered ? data.totalFilteredCases : data.totalGeneralCases;
            pct = denom > 0 ? (val / denom) * 100 : 0;
          }

          return (
            <div key={p.name} className="flex flex-col gap-0.5 text-foreground">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="font-medium">
                  {p.name === 'valor' || p.name === 'aprobado' ? 'Valor Aprobado:' : 'Casos:'} {p.name === 'valor' || p.name === 'aprobado' ? formatCOP(val) : `${val} expedientes`}
                </span>
              </div>
              <div className="pl-4 text-[10px] text-muted-foreground">
                <span>{isFiltered ? 'Porcentaje (Filtrado)' : 'Porcentaje'}: {pct.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}

function CustomTooltipFinanzas({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isFiltered = data.totalFilteredCases < data.totalGeneralCases;
    
    return (
      <div style={CUSTOM_TOOLTIP_STYLE} className="p-3 text-xs space-y-1.5 shadow-lg">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => {
          const val = p.value || 0;
          let pct = 0;

          if (p.name === 'cotizado') {
            const denom = isFiltered ? data.totalFilteredCotizadoSum : data.totalGeneralCotizadoSum;
            pct = denom > 0 ? (val / denom) * 100 : 0;
          } else if (p.name === 'negociado') {
            const denom = isFiltered ? data.totalFilteredNegociadoSum : data.totalGeneralNegociadoSum;
            pct = denom > 0 ? (val / denom) * 100 : 0;
          } else if (p.name === 'aprobado') {
            const denom = isFiltered ? data.totalFilteredApprovedSum : data.totalGeneralApprovedSum;
            pct = denom > 0 ? (val / denom) * 100 : 0;
          }

          return (
            <div key={p.dataKey || p.name} className="flex flex-col gap-0.5 text-foreground">
              <div className="flex justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="capitalize font-medium">{p.name}:</span>
                </div>
                <span className="font-semibold number-font">{formatCOP(val)}</span>
              </div>
              <div className="pl-3.5 text-[10px] text-muted-foreground">
                <span>{isFiltered ? 'Porcentaje (Filtrado)' : 'Porcentaje'}: {pct.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}

function CustomTooltipPercentages({ active, payload, label, isValueCOP = false }: any) {
  if (active && payload && payload.length) {
    const p = payload[0];
    const data = p.payload;
    const val = p.value || 0;
    
    const isFiltered = data.totalFilteredCases < data.totalGeneralCases;
    
    let total = 0;
    if (isValueCOP) {
      total = isFiltered ? data.totalFilteredApprovedSum : data.totalGeneralApprovedSum;
    } else {
      total = isFiltered ? data.totalFilteredCases : data.totalGeneralCases;
    }

    const pct = total > 0 ? (val / total) * 100 : 0;

    // Resolve a meaningful title (prefer data.name or label over generic 'value')
    const displayName = (data?.name && data.name !== 'value') 
      ? data.name 
      : ((label && label !== 'value') ? label : (p.name !== 'value' ? p.name : 'Detalle'));

    return (
      <div style={CUSTOM_TOOLTIP_STYLE} className="p-3 text-xs space-y-1 shadow-lg">
        <p className="font-semibold text-foreground mb-1">{displayName}</p>
        <div className="flex items-center gap-2 text-foreground">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
          <span className="font-semibold">
            {isValueCOP ? `Afectación: ${formatCOP(val)}` : `Reclamaciones: ${val} ${val === 1 ? 'expediente' : 'expedientes'}`}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50 mt-1">
          <span>{isFiltered ? 'Porcentaje (Filtrado)' : 'Porcentaje'}: {pct.toFixed(1)}%</span>
        </div>
      </div>
    );
  }
  return null;
}

export function DashboardCharts({
  expedientes,
  unfilteredExpedientes,
  expedientesForVehicles,
  expedientesForDrivers,
  expedientesForPropietarios,
  onSelectPlaca,
  onSelectConductor,
  selectedPlaca,
  selectedConductor,
  onSelectProprietario,
  selectedProprietario,
  onSelectTipoReclamacion,
  selectedTipoReclamacion,
  onSelectMonth,
  selectedMonth,
  onSelectStatus,
  selectedStatus,
  onSelectCulpabilidad,
  selectedCulpabilidad,
  onSelectCausaRaiz,
  selectedCausaRaiz,
}: DashboardChartsProps) {
  // Use specialized arrays if passed, otherwise fallback to default filtered array
  const ev = expedientesForVehicles || expedientes;
  const ed = expedientesForDrivers || expedientes;
  const ep = expedientesForPropietarios || expedientes;
  const [expandedChart, setExpandedChart] = useState<{
    id: string;
    title: string;
    description: string;
    render: (height: number) => React.ReactNode;
  } | null>(null);

  const [showAllCausa, setShowAllCausa] = useState(false);
  const [showAllPropietario, setShowAllPropietario] = useState(false);
  const [showAllConductor, setShowAllConductor] = useState(false);
  const [showAllVehiculoAfectacion, setShowAllVehiculoAfectacion] = useState(false);
  const [showAllTopPlacas, setShowAllTopPlacas] = useState(false);
  const [showAllTopConductores, setShowAllTopConductores] = useState(false);
  const [serviceMetric, setServiceMetric] = useState<'cantidad' | 'monto'>('cantidad');

  // 1. Monthly trend calculations
  const totalFilteredCount = expedientes.length;
  const totalGeneralCount = unfilteredExpedientes.length;
  const totalFilteredApproved = expedientes.reduce((acc, e) => acc + (e.valor_final_aprobado || 0), 0);
  const totalGeneralApproved = unfilteredExpedientes.reduce((acc, e) => acc + (e.valor_final_aprobado || 0), 0);
  const totalFilteredCotizado = expedientes.reduce((acc, e) => acc + (e.valor_cotizacion || 0), 0);
  const totalGeneralCotizado = unfilteredExpedientes.reduce((acc, e) => acc + (e.valor_cotizacion || 0), 0);
  const totalFilteredNegociado = expedientes.reduce((acc, e) => acc + (e.valor_negociado || 0), 0);
  const totalGeneralNegociado = unfilteredExpedientes.reduce((acc, e) => acc + (e.valor_negociado || 0), 0);

  const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthlyData = MONTH_NAMES.map((name, index) => {
    const cases = expedientes.filter((e) => {
      // Handle date comparison safely
      if (!e.fecha_incidente) return false;
      const d = new Date(e.fecha_incidente + 'T00:00:00');
      return !isNaN(d.getTime()) && d.getMonth() === index;
    });
    const sumAprobado = cases.reduce((acc, c) => acc + (c.valor_final_aprobado || 0), 0);
    const sumCotizado = cases.reduce((acc, c) => acc + (c.valor_cotizacion || 0), 0);
    const sumNegociado = cases.reduce((acc, c) => acc + (c.valor_negociado || 0), 0);
    return {
      mes: name,
      monthIndex: index,
      expedientes: cases.length,
      valor: sumAprobado,
      cotizado: sumCotizado,
      negociado: sumNegociado,
      aprobado: sumAprobado,
      totalFilteredCases: totalFilteredCount,
      totalGeneralCases: totalGeneralCount,
      totalFilteredApprovedSum: totalFilteredApproved,
      totalGeneralApprovedSum: totalGeneralApproved,
      totalFilteredCotizadoSum: totalFilteredCotizado,
      totalGeneralCotizadoSum: totalGeneralCotizado,
      totalFilteredNegociadoSum: totalFilteredNegociado,
      totalGeneralNegociadoSum: totalGeneralNegociado,
    };
  });

  // 2. Claim Type Distribution
  const CLAIM_TYPES = ['Siniestro', 'Vidrios', 'Carrocería', 'Repuestos', 'Pérdida parcial', 'Afectación por orden público', 'Otro'] as const;
  const TIPO_COLORS = {
    'Siniestro': 'hsl(0, 72%, 55%)', // Red
    'Carrocería': 'hsl(43, 96%, 52%)', // Gold
    'Vidrios': 'hsl(217, 91%, 60%)', // Blue
    'Repuestos': 'hsl(200, 95%, 60%)', // Light blue/cyan
    'Pérdida parcial': 'hsl(0, 72%, 65%)', // Light red
    'Afectación por orden público': 'hsl(142, 71%, 45%)', // Green
    'Otro': 'hsl(215, 20%, 55%)', // Muted Grey
  };
  const tipoData = CLAIM_TYPES.map((type) => {
    const count = expedientes.filter((e) => e.tipo_reclamacion === type).length;
    return { 
      name: type, 
      value: count, 
      fill: TIPO_COLORS[type as keyof typeof TIPO_COLORS],
      totalFilteredCases: totalFilteredCount,
      totalGeneralCases: totalGeneralCount,
    };
  }).filter((t) => t.value > 0);

  // 3. Status Distribution
  const ESTADO_COLORS = {
    'Aprobado': 'hsl(142, 71%, 45%)',
    'Pendiente': 'hsl(43, 96%, 52%)',
    'Rechazado': 'hsl(0, 72%, 55%)',
    'Revisado': 'hsl(217, 91%, 55%)',
  };
  const estadoData = ['Aprobado', 'Pendiente', 'Rechazado', 'Revisado'].map((status) => {
    const count = expedientes.filter((e) => e.estado === status).length;
    return { name: status, value: count, fill: ESTADO_COLORS[status as keyof typeof ESTADO_COLORS] };
  });

  // 4. Culpabilidad Distribution
  const CULPABILIDAD_TYPES = ['Conductor', 'Tercero', 'Compartida', 'Sin definir'] as const;
  const CULPABILIDAD_COLORS = {
    'Conductor': 'hsl(0, 72%, 55%)',
    'Tercero': 'hsl(142, 71%, 45%)',
    'Compartida': 'hsl(43, 96%, 52%)',
    'Sin definir': 'hsl(215, 20%, 55%)',
  };
  const culpabilidadData = CULPABILIDAD_TYPES.map((type) => {
    const count = expedientes.filter((e) => (e.culpabilidad || 'Sin definir') === type).length;
    return { 
      name: type, 
      value: count, 
      fill: CULPABILIDAD_COLORS[type],
      totalFilteredCases: totalFilteredCount,
      totalGeneralCases: totalGeneralCount,
    };
  }).filter((t) => t.value > 0);

  // 5. Causa Raíz Distribution
  const causaGroups: Record<string, number> = {};
  expedientes.forEach((e) => {
    const causa = e.causa_raiz || 'Sin definir';
    causaGroups[causa] = (causaGroups[causa] || 0) + 1;
  });
  const allCausaData = Object.entries(causaGroups)
    .map(([name, value]) => ({ 
      name, 
      value,
      totalFilteredCases: totalFilteredCount,
      totalGeneralCases: totalGeneralCount,
    }))
    .sort((a, b) => b.value - a.value);
  const causaData = allCausaData.slice(0, 5);

  // 6. Afectación FAM por Propietario (Top 5 / Todos)
  const propietarioGroups: Record<string, number> = {};
  ep.forEach((e) => {
    const prop = e.propietario ? e.propietario.trim() : 'Sin definir';
    propietarioGroups[prop] = (propietarioGroups[prop] || 0) + (e.valor_final_aprobado || 0);
  });
  const allPropietarioData = Object.entries(propietarioGroups)
    .map(([name, value]) => ({ 
      name, 
      value,
      totalFilteredApprovedSum: totalFilteredApproved,
      totalGeneralApprovedSum: totalGeneralApproved,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const propietarioData = allPropietarioData.slice(0, 5);

  // 7. Afectación FAM por Conductor (Top 5 / Todos)
  const conductorGroups: Record<string, number> = {};
  expedientes.forEach((e) => {
    const cond = e.nombre_conductor ? e.nombre_conductor.trim() : 'Sin definir';
    conductorGroups[cond] = (conductorGroups[cond] || 0) + (e.valor_final_aprobado || 0);
  });
  const allConductorData = Object.entries(conductorGroups)
    .map(([name, value]) => ({ 
      name, 
      value,
      totalFilteredApprovedSum: totalFilteredApproved,
      totalGeneralApprovedSum: totalGeneralApproved,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const conductorData = allConductorData.slice(0, 5);

  // 7b. Afectación FAM por Vehículo (Top 5 / Todos)
  const vehiculoAfectacionGroups: Record<string, { totalVal: number; placa: string; interno: string | null }> = {};
  ev.forEach((e) => {
    if (!e.placa) return;
    const p = e.placa.trim().toUpperCase();
    const int = e.numero_interno ? e.numero_interno.trim() : null;
    const key = int ? `${int} (${p})` : p;
    if (!vehiculoAfectacionGroups[key]) {
      vehiculoAfectacionGroups[key] = { totalVal: 0, placa: p, interno: int };
    }
    vehiculoAfectacionGroups[key].totalVal += e.valor_final_aprobado || 0;
  });
  const allVehiculoAfectacionData = Object.entries(vehiculoAfectacionGroups)
    .map(([name, data]) => ({
      name,
      placa: data.placa,
      value: data.totalVal,
      totalFilteredApprovedSum: totalFilteredApproved,
      totalGeneralApprovedSum: totalGeneralApproved,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const vehiculoAfectacionData = allVehiculoAfectacionData.slice(0, 5);

  // 8. Top 5 Vehículos por Reclamaciones
  const placaGroups: Record<string, { total: number; valor: number }> = {};
  ev.forEach((e) => {
    if (!e.placa) return;
    const p = e.placa.trim().toUpperCase();
    if (!placaGroups[p]) placaGroups[p] = { total: 0, valor: 0 };
    placaGroups[p].total += 1;
    placaGroups[p].valor += e.valor_final_aprobado || 0;
  });
  const allTopPlacasData = Object.entries(placaGroups)
    .map(([placa, data]) => ({ 
      name: placa, 
      placa,
      value: data.total, 
      valor: data.valor,
      totalFilteredCases: ev.length,
      totalGeneralCases: totalGeneralCount,
    }))
    .sort((a, b) => b.value - a.value || b.valor - a.valor);
  const topPlacasData = allTopPlacasData.slice(0, 5);

  // 9. Top 5 Conductores por Reclamaciones
  const condGroups: Record<string, { total: number; valor: number }> = {};
  ed.forEach((e) => {
    if (!e.nombre_conductor) return;
    const name = e.nombre_conductor.trim();
    if (!condGroups[name]) condGroups[name] = { total: 0, valor: 0 };
    condGroups[name].total += 1;
    condGroups[name].valor += e.valor_final_aprobado || 0;
  });
  const allTopConductoresData = Object.entries(condGroups)
    .map(([nombre, data]) => ({ 
      name: nombre, 
      nombre,
      value: data.total, 
      valor: data.valor,
      totalFilteredCases: ed.length,
      totalGeneralCases: totalGeneralCount,
    }))
    .sort((a, b) => b.value - a.value || b.valor - a.valor);
  const topConductoresData = allTopConductoresData.slice(0, 5);

  // 10. Tipo de Servicio data
  const serviceTypeMap: Record<string, { name: string; cantidad: number; monto: number }> = {};
  expedientes.forEach((e) => {
    const type = e.tipo_servicio || 'No especificado';
    if (!serviceTypeMap[type]) {
      serviceTypeMap[type] = { name: type, cantidad: 0, monto: 0 };
    }
    serviceTypeMap[type].cantidad += 1;
    serviceTypeMap[type].monto += (e.valor_final_aprobado || 0);
  });
  const _serviceValues = Object.values(serviceTypeMap);
  const totalServiceCantidad = _serviceValues.reduce((acc, d) => acc + d.cantidad, 0);
  const totalServiceMonto = _serviceValues.reduce((acc, d) => acc + d.monto, 0);
  const serviceTypeData = _serviceValues
    .sort((a, b) => b.cantidad - a.cantidad)
    .map((d) => ({ ...d, totalCantidad: totalServiceCantidad, totalMonto: totalServiceMonto }));

  // 11. Costos Ahorrados monthly data
  const monthlySavingsData = MONTH_NAMES.map((name, index) => {
    const cases = expedientes.filter((e) => {
      if (!e.fecha_incidente) return false;
      const d = new Date(e.fecha_incidente + 'T00:00:00');
      return !isNaN(d.getTime()) && d.getMonth() === index;
    });
    
    const totalCotizado = cases.reduce((acc, c) => acc + (c.valor_cotizacion || 0), 0);
    const totalNegociado = cases.reduce((acc, c) => acc + (c.valor_negociado || 0), 0);
    const totalAprobado = cases.reduce((acc, c) => acc + (c.valor_final_aprobado || 0), 0);
    
    const ahorroNegociacion = Math.max(0, totalCotizado - totalNegociado);
    const ahorroAprobado = Math.max(0, totalCotizado - totalAprobado);
    
    const pctAhorroNegociacion = totalCotizado > 0 ? (ahorroNegociacion / totalCotizado) * 100 : 0;
    const pctAhorroAprobado = totalCotizado > 0 ? (ahorroAprobado / totalCotizado) * 100 : 0;
    
    return {
      mes: name,
      monthIndex: index,
      ahorroNegociacion,
      ahorroAprobado,
      pctAhorroNegociacion,
      pctAhorroAprobado,
      totalFilteredCases: totalFilteredCount,
      totalGeneralCases: totalGeneralCount,
    };
  });

  // 12. Internal Number prefixes categorization
  const getInternalNumberCategory = (numStr: string | null | undefined): string => {
    if (!numStr) return 'Otros';
    const cleanNum = numStr.trim();
    const prefixes = ['71', '80', '40', '60', '70', '10', '50', '90'];
    for (const prefix of prefixes) {
      if (cleanNum.startsWith(prefix)) {
        return `Serie ${prefix}`;
      }
    }
    return 'Otros';
  };

  const internalCategoriesMap: Record<string, { name: string; cantidad: number; monto: number }> = {
    'Serie 71': { name: 'Serie 71', cantidad: 0, monto: 0 },
    'Serie 80': { name: 'Serie 80', cantidad: 0, monto: 0 },
    'Serie 40': { name: 'Serie 40', cantidad: 0, monto: 0 },
    'Serie 60': { name: 'Serie 60', cantidad: 0, monto: 0 },
    'Serie 70': { name: 'Serie 70', cantidad: 0, monto: 0 },
    'Serie 10': { name: 'Serie 10', cantidad: 0, monto: 0 },
    'Serie 50': { name: 'Serie 50', cantidad: 0, monto: 0 },
    'Serie 90': { name: 'Serie 90', cantidad: 0, monto: 0 },
    'Otros': { name: 'Otros', cantidad: 0, monto: 0 },
  };

  expedientes.forEach((e) => {
    const cat = getInternalNumberCategory(e.numero_interno);
    internalCategoriesMap[cat].cantidad += 1;
    internalCategoriesMap[cat].monto += (e.valor_final_aprobado || 0);
  });

  const internalCategoriesData = Object.values(internalCategoriesMap);

  const hasData = expedientes.length > 0;

  if (!hasData) {
    return (
      <Card className="border-border bg-card p-12 text-center text-muted-foreground">
        <p>No hay datos suficientes para graficar. Agregue expedientes primero.</p>
      </Card>
    );
  }

  const renderTipoServicioCantidad = (height: number) => {
    return (
      <div style={{ height }} className="w-full">
        {serviceTypeData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No hay datos de servicio</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={serviceTypeData}
              margin={{ left: -10, right: 10, top: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                content={(props: any) => {
                  if (!props.active || !props.payload?.length) return null;
                  const p = props.payload[0];
                  const d = p.payload;
                  const pct = d.totalCantidad > 0 ? ((d.cantidad / d.totalCantidad) * 100).toFixed(1) : '0.0';
                  return (
                    <div style={CUSTOM_TOOLTIP_STYLE} className="p-3 text-xs space-y-1.5 shadow-lg">
                      <p className="font-semibold text-foreground mb-1">{d.name}</p>
                      <div className="flex items-center gap-2 text-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill || p.color }} />
                        <span className="font-semibold">{d.cantidad} {d.cantidad === 1 ? 'expediente' : 'expedientes'}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                        <span>Porcentaje del total: <strong>{pct}%</strong></span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="cantidad" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="cantidad" position="top" style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 600 }}
                  formatter={(v: number) => v > 0 ? `${v}` : ''}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  };

  const renderTipoServicioMonto = (height: number) => {
    return (
      <div style={{ height }} className="w-full">
        {serviceTypeData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No hay datos de servicio</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={serviceTypeData}
              margin={{ left: -10, right: 10, top: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
              />
              <Tooltip
                content={(props: any) => {
                  if (!props.active || !props.payload?.length) return null;
                  const p = props.payload[0];
                  const d = p.payload;
                  const pct = d.totalMonto > 0 ? ((d.monto / d.totalMonto) * 100).toFixed(1) : '0.0';
                  return (
                    <div style={CUSTOM_TOOLTIP_STYLE} className="p-3 text-xs space-y-1.5 shadow-lg">
                      <p className="font-semibold text-foreground mb-1">{d.name}</p>
                      <div className="flex items-center gap-2 text-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill || p.color }} />
                        <span className="font-semibold">{formatCOP(d.monto)}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                        <span>Porcentaje del total: <strong>{pct}%</strong></span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="monto" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="monto"
                  position="top"
                  formatter={(v: number) => v > 0 ? `$${(v / 1000000).toFixed(1)}M` : ''}
                  style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  };

  const renderCostosAhorrados = (height: number) => (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={monthlySavingsData} 
          margin={{ left: -10, right: 10, top: 24, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorAhorroNegociacion" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(43, 96%, 52%)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(43, 96%, 52%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorAhorroAprobado" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis 
            dataKey="mes" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
          />
          <Tooltip 
            content={(props: any) => {
              if (!props.active || !props.payload?.length) return null;
              const label = props.label;
              return (
                <div style={CUSTOM_TOOLTIP_STYLE} className="p-3 text-xs space-y-1.5 shadow-lg">
                  <p className="font-semibold text-foreground mb-1">{label}</p>
                  {props.payload.map((p: any) => {
                    const d = p.payload;
                    const isAprobado = p.dataKey === 'ahorroAprobado';
                    const pct = isAprobado ? d.pctAhorroAprobado : d.pctAhorroNegociacion;
                    return (
                      <div key={p.dataKey} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 text-foreground">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="font-medium">{isAprobado ? 'Ahorro vs Aprobado' : 'Ahorro por Negociación'}:</span>
                          <span className="font-semibold">{formatCOP(p.value)}</span>
                        </div>
                        <div className="pl-4 text-[10px] text-muted-foreground">
                          Ahorro: <strong>{pct != null ? pct.toFixed(1) : '0.0'}%</strong> sobre cotizado
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
          <Legend
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-muted-foreground font-medium capitalize font-mono">
                {value === 'ahorroAprobado' ? 'Ahorro vs Aprobado' : 'Ahorro por Negociación'}
              </span>
            )}
          />
          <Area 
            type="monotone" 
            dataKey="ahorroNegociacion" 
            stroke="hsl(43, 96%, 52%)" 
            fillOpacity={1} 
            fill="url(#colorAhorroNegociacion)" 
          />
          <Area 
            type="monotone" 
            dataKey="ahorroAprobado" 
            stroke="hsl(142, 71%, 45%)" 
            fillOpacity={1} 
            fill="url(#colorAhorroAprobado)" 
          >
            <LabelList
              dataKey="ahorroAprobado"
              position="top"
              content={(props: any) => {
                const { x, y, value, index } = props;
                if (!value || value === 0) return null;
                const data = monthlySavingsData[index];
                const pct = data?.pctAhorroAprobado ?? 0;
                return (
                  <text
                    x={x}
                    y={(y ?? 0) - 4}
                    textAnchor="middle"
                    fill="hsl(var(--foreground))"
                    fontSize={8}
                    fontWeight={600}
                  >
                    {`$${(value / 1000000).toFixed(1)}M (${pct.toFixed(0)}%)`}
                  </text>
                );
              }}
            />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const renderVehiculosInterno = (height: number) => (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={internalCategoriesData}
          margin={{ left: -10, right: 10, top: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
          <YAxis
            yAxisId="left"
            orientation="left"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
          />
          <Tooltip
            formatter={(value: any, name: string) => [
              name === 'monto' ? formatCOP(value) : `${value} expedientes`,
              name === 'monto' ? 'Monto Aprobado' : 'Cantidad de Expedientes'
            ]}
            labelClassName="font-bold text-foreground"
            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          />
          <Legend
            iconSize={8}
            formatter={(value) => (
              <span className="text-[10px] text-muted-foreground font-medium uppercase">
                {value === 'monto' ? 'Monto Aprobado ($)' : 'Cantidad de Expedientes'}
              </span>
            )}
          />
          <Bar yAxisId="left" dataKey="cantidad" name="cantidad" fill="hsl(217, 91%, 60%)" radius={[2, 2, 0, 0]}>
            <LabelList dataKey="cantidad" position="top" style={{ fill: 'hsl(var(--foreground))', fontSize: 8, fontWeight: 600 }} />
          </Bar>
          <Bar yAxisId="right" dataKey="monto" name="monto" fill="hsl(142, 71%, 45%)" radius={[2, 2, 0, 0]}>
            <LabelList
              dataKey="monto"
              position="top"
              formatter={(v: number) => v > 0 ? `$${(v / 1000000).toFixed(1)}M` : ''}
              style={{ fill: 'hsl(var(--foreground))', fontSize: 8, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  // --- Chart Renderers (reused in normal cards and inside maximized modal) ---

  const renderExpedientesPorMes = (height: number) => (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={monthlyData} 
          margin={{ left: -20, right: 10, top: 20, bottom: 0 }}
          onClick={(data) => {
            const activeTooltipIndex = data?.activeTooltipIndex;
            if (activeTooltipIndex !== undefined && onSelectMonth) {
              onSelectMonth(activeTooltipIndex);
            }
          }}
          className="cursor-pointer"
        >
          <defs>
            <linearGradient id="colorExpedientes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="mes" 
            tick={(props: any) => {
              const { x, y, payload } = props;
              const value = payload?.value || '';
              const idx = MONTH_NAMES.indexOf(value);
              const isSelected = selectedMonth === idx;
              return (
                <g 
                  style={{ pointerEvents: 'auto' }} 
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectMonth && idx !== -1) {
                      onSelectMonth(idx);
                    }
                  }}
                >
                  <text
                    x={x}
                    y={y}
                    dy={12}
                    textAnchor="middle"
                    fill={isSelected ? 'hsl(142, 71%, 45%)' : 'hsl(var(--muted-foreground))'}
                    className="hover:fill-primary font-semibold text-[11px] transition-colors"
                  >
                    {value}
                  </text>
                </g>
              );
            }}
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltipBar />} />
          <Area
            type="monotone"
            dataKey="expedientes"
            stroke="hsl(217, 91%, 60%)"
            strokeWidth={2}
            fill="url(#colorExpedientes)"
            dot={{ fill: 'hsl(217, 91%, 60%)', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: selectedMonth !== null ? 'hsl(142, 71%, 45%)' : 'hsl(43, 96%, 52%)' }}
          >
            <LabelList
              dataKey="expedientes"
              position="top"
              formatter={(v: number) => v > 0 ? v : ''}
              style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 600 }}
            />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const renderTipoReclamacion = (height: number) => (
    <div style={{ height }} className="w-full">
      {tipoData.length === 0 ? (
        <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No hay datos</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={tipoData}
              cx="50%"
              cy="45%"
              innerRadius={height > 300 ? 80 : 55}
              outerRadius={height > 300 ? 120 : 80}
              paddingAngle={3}
              dataKey="value"
              label={({ value }) => value}
              labelLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
              onClick={(data) => {
                const val = data?.name || data?.payload?.name;
                if (val && onSelectTipoReclamacion) {
                  onSelectTipoReclamacion(val);
                }
              }}
              className="cursor-pointer"
            >
              {tipoData.map((entry, index) => {
                const isSelected = selectedTipoReclamacion === entry.name;
                return (
                  <Cell 
                    key={index} 
                    fill={entry.fill}
                    stroke={isSelected ? 'hsl(var(--foreground))' : 'none'}
                    strokeWidth={isSelected ? 2 : 0}
                    opacity={selectedTipoReclamacion && !isSelected ? 0.45 : 1}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltipPercentages />} />
            <Legend
              iconSize={8}
              onClick={(data) => {
                const val = data?.value;
                if (val && onSelectTipoReclamacion) {
                  onSelectTipoReclamacion(val);
                }
              }}
              className="cursor-pointer"
              formatter={(value) => {
                const isSelected = selectedTipoReclamacion === value;
                return (
                  <span className={`text-xs font-semibold cursor-pointer transition-colors hover:text-primary ${isSelected ? 'text-[hsl(142,71%,45%)] font-bold' : 'text-muted-foreground'}`}>
                    {value}
                  </span>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  const renderMontoAprobado = (height: number) => (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={monthlyData} 
          barSize={height > 300 ? 35 : 20} 
          margin={{ left: -10, right: 10, top: 20, bottom: 0 }}
          onClick={(data) => {
            const activeTooltipIndex = data?.activeTooltipIndex;
            if (activeTooltipIndex !== undefined && onSelectMonth) {
              onSelectMonth(activeTooltipIndex);
            }
          }}
          className="cursor-pointer"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis 
            dataKey="mes" 
            tick={(props: any) => {
              const { x, y, payload } = props;
              const value = payload?.value || '';
              const idx = MONTH_NAMES.indexOf(value);
              const isSelected = selectedMonth === idx;
              return (
                <g 
                  style={{ pointerEvents: 'auto' }} 
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectMonth && idx !== -1) {
                      onSelectMonth(idx);
                    }
                  }}
                >
                  <text
                    x={x}
                    y={y}
                    dy={12}
                    textAnchor="middle"
                    fill={isSelected ? 'hsl(43, 96%, 52%)' : 'hsl(var(--muted-foreground))'}
                    className="hover:fill-primary font-semibold text-[11px] transition-colors"
                  >
                    {value}
                  </text>
                </g>
              );
            }}
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
          />
          <Tooltip content={<CustomTooltipBar />} />
          <Bar 
            dataKey="valor" 
            name="valor" 
            fill="hsl(142, 71%, 45%)" 
            radius={[3, 3, 0, 0]}
            onClick={(data) => {
              const monthIdx = data?.monthIndex !== undefined ? data.monthIndex : (data?.payload?.monthIndex);
              if (monthIdx !== undefined && onSelectMonth) {
                onSelectMonth(monthIdx);
              }
            }}
            className="cursor-pointer"
          >
            <LabelList
              dataKey="valor"
              position="top"
              formatter={(v: number) => v > 0 ? `$${(v / 1000000).toFixed(1)}M` : ''}
              style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 600 }}
            />
            {monthlyData.map((entry, i) => {
              const isSelected = selectedMonth === entry.monthIndex;
              return (
                <Cell
                  key={i}
                  fill={isSelected ? 'hsl(43, 96%, 52%)' : (entry.valor > 0 ? (selectedMonth !== null ? 'rgba(34, 197, 94, 0.15)' : 'hsl(142, 71%, 45%)') : 'rgba(255,255,255,0.1)')}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const renderEstadoExpedientes = (isLarge = false) => (
    <div className={`space-y-4 pt-2 ${isLarge ? 'max-w-xl mx-auto py-8' : ''}`}>
      {estadoData.map((item) => {
        const total = estadoData.reduce((sum, d) => sum + d.value, 0);
        const pct = total ? Math.round((item.value / total) * 100) : 0;
        const isSelected = selectedStatus === item.name;
        return (
          <div 
            key={item.name} 
            className={`space-y-1 cursor-pointer p-1.5 rounded-lg transition-colors border ${
              isSelected 
                ? 'border-green-500/50 bg-green-500/5' 
                : 'border-transparent hover:bg-secondary/20'
            }`}
            onClick={() => onSelectStatus && onSelectStatus(item.name)}
          >
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground font-medium">{item.name}</span>
              <span className="font-semibold number-font" style={{ color: item.fill }}>
                {item.value} <span className="text-muted-foreground font-normal text-xs">({pct}%)</span>
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: item.fill }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderGestionCostos = (height: number) => (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={monthlyData} 
          barGap={height > 300 ? 6 : 4} 
          barSize={height > 300 ? 16 : undefined} 
          margin={{ left: -10, right: 10, top: 10, bottom: 0 }}
          onClick={(data) => {
            const activeTooltipIndex = data?.activeTooltipIndex;
            if (activeTooltipIndex !== undefined && onSelectMonth) {
              onSelectMonth(activeTooltipIndex);
            }
          }}
          className="cursor-pointer"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis 
            dataKey="mes" 
            tick={(props: any) => {
              const { x, y, payload } = props;
              const value = payload?.value || '';
              const idx = MONTH_NAMES.indexOf(value);
              const isSelected = selectedMonth === idx;
              return (
                <g 
                  style={{ pointerEvents: 'auto' }} 
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectMonth && idx !== -1) {
                      onSelectMonth(idx);
                    }
                  }}
                >
                  <text
                    x={x}
                    y={y}
                    dy={12}
                    textAnchor="middle"
                    fill={isSelected ? 'hsl(142, 71%, 45%)' : 'hsl(var(--muted-foreground))'}
                    className="hover:fill-primary font-semibold text-[11px] transition-colors"
                  >
                    {value}
                  </text>
                </g>
              );
            }}
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
          />
          <Tooltip content={<CustomTooltipFinanzas />} />
          <Legend
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-muted-foreground font-medium capitalize">{value}</span>
            )}
          />
          <Bar 
            dataKey="cotizado" 
            name="cotizado" 
            fill="hsl(0, 72%, 55%)" 
            radius={[2, 2, 0, 0]}
            onClick={(data) => {
              const monthIdx = data?.monthIndex !== undefined ? data.monthIndex : (data?.payload?.monthIndex);
              if (monthIdx !== undefined && onSelectMonth) {
                onSelectMonth(monthIdx);
              }
            }}
            className="cursor-pointer"
          >
            <LabelList
              dataKey="cotizado"
              position="top"
              formatter={(v: number) => v > 0 ? `$${(v / 1000000).toFixed(0)}M` : ''}
              style={{ fill: 'hsl(var(--foreground))', fontSize: 8, fontWeight: 600 }}
            />
            {monthlyData.map((entry, i) => {
              const isSelected = selectedMonth === entry.monthIndex;
              return (
                <Cell 
                  key={i} 
                  fill={entry.cotizado > 0 ? (selectedMonth !== null && !isSelected ? 'rgba(239, 68, 68, 0.15)' : 'hsl(0, 72%, 55%)') : 'rgba(255,255,255,0.05)'}
                />
              );
            })}
          </Bar>
          <Bar 
            dataKey="negociado" 
            name="negociado" 
            fill="hsl(43, 96%, 52%)" 
            radius={[2, 2, 0, 0]}
            onClick={(data) => {
              const monthIdx = data?.monthIndex !== undefined ? data.monthIndex : (data?.payload?.monthIndex);
              if (monthIdx !== undefined && onSelectMonth) {
                onSelectMonth(monthIdx);
              }
            }}
            className="cursor-pointer"
          >
            <LabelList
              dataKey="negociado"
              position="top"
              formatter={(v: number) => v > 0 ? `$${(v / 1000000).toFixed(0)}M` : ''}
              style={{ fill: 'hsl(var(--foreground))', fontSize: 8, fontWeight: 600 }}
            />
            {monthlyData.map((entry, i) => {
              const isSelected = selectedMonth === entry.monthIndex;
              return (
                <Cell 
                  key={i} 
                  fill={entry.negociado > 0 ? (selectedMonth !== null && !isSelected ? 'rgba(245, 158, 11, 0.15)' : 'hsl(43, 96%, 52%)') : 'rgba(255,255,255,0.05)'}
                />
              );
            })}
          </Bar>
          <Bar 
            dataKey="aprobado" 
            name="aprobado" 
            fill="hsl(142, 71%, 45%)" 
            radius={[2, 2, 0, 0]}
            onClick={(data) => {
              const monthIdx = data?.monthIndex !== undefined ? data.monthIndex : (data?.payload?.monthIndex);
              if (monthIdx !== undefined && onSelectMonth) {
                onSelectMonth(monthIdx);
              }
            }}
            className="cursor-pointer"
          >
            <LabelList
              dataKey="aprobado"
              position="top"
              formatter={(v: number) => v > 0 ? `$${(v / 1000000).toFixed(0)}M` : ''}
              style={{ fill: 'hsl(var(--foreground))', fontSize: 8, fontWeight: 600 }}
            />
            {monthlyData.map((entry, i) => {
              const isSelected = selectedMonth === entry.monthIndex;
              return (
                <Cell 
                  key={i} 
                  fill={entry.aprobado > 0 ? (selectedMonth !== null && !isSelected ? 'rgba(34, 197, 94, 0.15)' : 'hsl(142, 71%, 45%)') : 'rgba(255,255,255,0.05)'}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const renderCulpabilidad = (height: number) => (
    <div style={{ height }} className="w-full">
      {culpabilidadData.length === 0 ? (
        <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No hay datos</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={culpabilidadData}
              cx="50%"
              cy="45%"
              innerRadius={height > 300 ? 80 : 55}
              outerRadius={height > 300 ? 120 : 80}
              paddingAngle={3}
              dataKey="value"
              label={({ value }) => value}
              labelLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
              onClick={(data) => {
                const val = data?.name || data?.payload?.name;
                if (val && onSelectCulpabilidad) {
                  onSelectCulpabilidad(val);
                }
              }}
              className="cursor-pointer"
            >
              {culpabilidadData.map((entry, index) => {
                const isSelected = selectedCulpabilidad === entry.name;
                return (
                  <Cell 
                    key={index} 
                    fill={entry.fill}
                    stroke={isSelected ? 'hsl(var(--foreground))' : 'none'}
                    strokeWidth={isSelected ? 2 : 0}
                    opacity={selectedCulpabilidad && !isSelected ? 0.45 : 1}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltipPercentages />} />
            <Legend
              iconSize={8}
              onClick={(data) => {
                const val = data?.value;
                if (val && onSelectCulpabilidad) {
                  onSelectCulpabilidad(val);
                }
              }}
              className="cursor-pointer"
              formatter={(value) => {
                const isSelected = selectedCulpabilidad === value;
                return (
                  <span className={`text-xs font-semibold cursor-pointer transition-colors hover:text-primary ${isSelected ? 'text-[hsl(142,71%,45%)] font-bold' : 'text-muted-foreground'}`}>
                    {value}
                  </span>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  const renderCausasRaiz = (height: number) => {
    const dataToUse = showAllCausa ? allCausaData : causaData;
    const isModal = height > 350;
    const finalHeight = showAllCausa && !isModal ? Math.max(height, dataToUse.length * 36) : height;
    return (
      <div style={{ height: showAllCausa && !isModal ? `${height}px` : 'auto', overflowY: showAllCausa && !isModal ? 'auto' : 'visible' }} className="w-full pr-1">
        <div style={{ height: `${finalHeight}px` }} className="w-full">
          {dataToUse.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No hay datos</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={dataToUse}
                margin={{ left: 50, right: 20, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const value = payload?.value || '';
                    const isSelected = selectedCausaRaiz === value;
                    return (
                      <g 
                        style={{ pointerEvents: 'auto' }} 
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectCausaRaiz) {
                            onSelectCausaRaiz(value);
                          }
                        }}
                      >
                        <text
                          x={x}
                          y={y}
                          dx={-6}
                          dy={4}
                          textAnchor="end"
                          fill={isSelected ? 'hsl(142, 71%, 45%)' : 'hsl(var(--muted-foreground))'}
                          className="hover:fill-primary font-semibold text-[11px] transition-colors"
                          style={{ pointerEvents: 'auto' }}
                        >
                          {value.length > 22 ? `${value.slice(0, 20)}...` : value}
                        </text>
                      </g>
                    );
                  }}
                  axisLine={false} 
                  tickLine={false} 
                  width={160} 
                />
                <Tooltip content={<CustomTooltipPercentages />} />
                <Bar 
                  dataKey="value" 
                  fill="hsl(217, 91%, 60%)" 
                  radius={[0, 3, 3, 0]} 
                  barSize={15}
                  onClick={(data) => {
                    const val = data?.name || data?.payload?.name;
                    if (val && onSelectCausaRaiz) {
                      onSelectCausaRaiz(val);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {dataToUse.map((d, index) => (
                    <Cell 
                      key={index} 
                      fill={selectedCausaRaiz === d.name ? 'hsl(43, 96%, 52%)' : 'hsl(217, 91%, 60%)'}
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  const renderAfectacionPropietario = (height: number) => {
    const dataToUse = showAllPropietario ? allPropietarioData : propietarioData;
    const isModal = height > 350;
    const finalHeight = showAllPropietario && !isModal ? Math.max(height, dataToUse.length * 45) : height;
    return (
      <div style={{ height: showAllPropietario && !isModal ? `${height}px` : 'auto', overflowY: showAllPropietario && !isModal ? 'auto' : 'visible' }} className="w-full pr-1">
        <div style={{ height: `${finalHeight}px` }} className="w-full">
          {dataToUse.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No hay afectación registrada</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={dataToUse}
                margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const value = payload?.value || '';
                    const isSelected = selectedProprietario === value;
                    return (
                      <g 
                        style={{ pointerEvents: 'auto' }} 
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectProprietario) {
                            onSelectProprietario(value);
                          }
                        }}
                      >
                        <text
                          x={x}
                          y={y}
                          dx={-6}
                          dy={4}
                          textAnchor="end"
                          fill={isSelected ? 'hsl(142, 71%, 45%)' : 'hsl(var(--muted-foreground))'}
                          className="hover:fill-primary font-semibold text-[11px] transition-colors"
                          style={{ pointerEvents: 'auto' }}
                        >
                          {value.length > 18 ? `${value.slice(0, 16)}...` : value}
                        </text>
                      </g>
                    );
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                />
                <Tooltip content={<CustomTooltipPercentages isValueCOP={true} />} />
                <Bar 
                  dataKey="value" 
                  fill="hsl(142, 71%, 45%)" 
                  radius={[0, 3, 3, 0]} 
                  barSize={15}
                  onClick={(data) => {
                    const val = data?.name || data?.payload?.name;
                    if (val && onSelectProprietario) {
                      onSelectProprietario(val);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {dataToUse.map((d, index) => (
                    <Cell 
                      key={index} 
                      fill={selectedProprietario === d.name ? 'hsl(43, 96%, 52%)' : 'hsl(142, 71%, 45%)'}
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v: number) => v > 0 ? `$${(v / 1000000).toFixed(1)}M` : ''}
                    style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  const renderAfectacionConductor = (height: number) => {
    const dataToUse = showAllConductor ? allConductorData : conductorData;
    const isModal = height > 350;
    const finalHeight = showAllConductor && !isModal ? Math.max(height, dataToUse.length * 45) : height;
    return (
      <div style={{ height: showAllConductor && !isModal ? `${height}px` : 'auto', overflowY: showAllConductor && !isModal ? 'auto' : 'visible' }} className="w-full pr-1">
        <div style={{ height: `${finalHeight}px` }} className="w-full">
          {dataToUse.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No hay afectación registrada</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={dataToUse}
                margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const value = payload?.value || '';
                    const isSelected = selectedConductor === value;
                    return (
                      <g 
                        style={{ pointerEvents: 'auto' }} 
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectConductor) {
                            onSelectConductor(value);
                          }
                        }}
                      >
                        <text
                          x={x}
                          y={y}
                          dx={-6}
                          dy={4}
                          textAnchor="end"
                          fill={isSelected ? 'hsl(142, 71%, 45%)' : 'hsl(var(--muted-foreground))'}
                          className="hover:fill-primary font-semibold text-[11px] transition-colors"
                          style={{ pointerEvents: 'auto' }}
                        >
                          {value.length > 18 ? `${value.slice(0, 16)}...` : value}
                        </text>
                      </g>
                    );
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                />
                <Tooltip content={<CustomTooltipPercentages isValueCOP={true} />} />
                <Bar 
                  dataKey="value" 
                  fill="hsl(142, 71%, 45%)" 
                  radius={[0, 3, 3, 0]} 
                  barSize={15}
                  onClick={(data) => {
                    const val = data?.name || data?.payload?.name;
                    if (val && onSelectConductor) {
                      onSelectConductor(val);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {dataToUse.map((d, index) => (
                    <Cell 
                      key={index} 
                      fill={selectedConductor === d.name ? 'hsl(43, 96%, 52%)' : 'hsl(142, 71%, 45%)'}
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v: number) => v > 0 ? `$${(v / 1000000).toFixed(1)}M` : ''}
                    style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  const renderAfectacionVehiculo = (height: number) => {
    const dataToUse = showAllVehiculoAfectacion ? allVehiculoAfectacionData : vehiculoAfectacionData;
    const isModal = height > 350;
    const finalHeight = showAllVehiculoAfectacion && !isModal ? Math.max(height, dataToUse.length * 45) : height;
    return (
      <div style={{ height: showAllVehiculoAfectacion && !isModal ? `${height}px` : 'auto', overflowY: showAllVehiculoAfectacion && !isModal ? 'auto' : 'visible' }} className="w-full pr-1">
        <div style={{ height: `${finalHeight}px` }} className="w-full">
          {dataToUse.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No hay afectación registrada</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={dataToUse}
                margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const value = payload?.value || '';
                    const item = dataToUse.find(d => d.name === value);
                    const itemPlaca = item ? item.placa : '';
                    const isSelected = selectedPlaca === itemPlaca;
                    return (
                      <g 
                        style={{ pointerEvents: 'auto' }} 
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectPlaca && itemPlaca) {
                            onSelectPlaca(itemPlaca);
                          }
                        }}
                      >
                        <text
                          x={x}
                          y={y}
                          dx={-6}
                          dy={4}
                          textAnchor="end"
                          fill={isSelected ? 'hsl(142, 71%, 45%)' : 'hsl(var(--muted-foreground))'}
                          className="hover:fill-primary font-semibold text-[11px] transition-colors"
                          style={{ pointerEvents: 'auto' }}
                        >
                          {value}
                        </text>
                      </g>
                    );
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                />
                <Tooltip content={<CustomTooltipPercentages isValueCOP={true} />} />
                <Bar 
                  dataKey="value" 
                  fill="hsl(142, 71%, 45%)" 
                  radius={[0, 3, 3, 0]} 
                  barSize={15}
                  onClick={(data) => {
                    const val = data?.placa || data?.payload?.placa || data?.name || data?.payload?.name;
                    const item = dataToUse.find(d => d.name === val || d.placa === val);
                    const itemPlaca = item ? item.placa : val;
                    if (itemPlaca && onSelectPlaca) {
                      onSelectPlaca(itemPlaca);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {dataToUse.map((d, index) => (
                    <Cell 
                      key={index} 
                      fill={selectedPlaca === d.placa ? 'hsl(43, 96%, 52%)' : 'hsl(142, 71%, 45%)'}
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v: number) => v > 0 ? `$${(v / 1000000).toFixed(1)}M` : ''}
                    style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  const renderTopPlacas = (height: number) => {
    const dataToUse = showAllTopPlacas ? allTopPlacasData : topPlacasData;
    const isModal = height > 350;
    const finalHeight = showAllTopPlacas && !isModal ? Math.max(height, dataToUse.length * 45) : height;
    return (
      <div style={{ height: showAllTopPlacas && !isModal ? `${height}px` : 'auto', overflowY: showAllTopPlacas && !isModal ? 'auto' : 'visible' }} className="w-full pr-1">
        <div style={{ height: `${finalHeight}px` }} className="w-full">
          {dataToUse.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No hay datos de vehículos</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={dataToUse}
                margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const value = payload?.value || '';
                    const isSelected = selectedPlaca === value;
                    return (
                      <g 
                        style={{ pointerEvents: 'auto' }} 
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectPlaca) {
                            onSelectPlaca(value);
                          }
                        }}
                      >
                        <text
                          x={x}
                          y={y}
                          dx={-6}
                          dy={4}
                          textAnchor="end"
                          fill={isSelected ? 'hsl(142, 71%, 45%)' : 'hsl(var(--muted-foreground))'}
                          className="hover:fill-primary font-mono text-[11px] font-semibold transition-colors"
                          style={{ pointerEvents: 'auto' }}
                        >
                          {value}
                        </text>
                      </g>
                    );
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip content={<CustomTooltipPercentages isValueCOP={false} />} />
                <Bar 
                  dataKey="value" 
                  fill="hsl(217, 91%, 60%)"
                  radius={[0, 3, 3, 0]} 
                  barSize={15}
                  onClick={(data) => {
                    const val = data?.placa || data?.payload?.placa || data?.name || data?.payload?.name;
                    if (val && onSelectPlaca) {
                      onSelectPlaca(val);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {dataToUse.map((d, index) => (
                    <Cell 
                      key={index} 
                      fill={selectedPlaca === d.placa ? 'hsl(43, 96%, 52%)' : 'hsl(217, 91%, 60%)'}
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  const renderTopConductores = (height: number) => {
    const dataToUse = showAllTopConductores ? allTopConductoresData : topConductoresData;
    const isModal = height > 350;
    const finalHeight = showAllTopConductores && !isModal ? Math.max(height, dataToUse.length * 45) : height;
    return (
      <div style={{ height: showAllTopConductores && !isModal ? `${height}px` : 'auto', overflowY: showAllTopConductores && !isModal ? 'auto' : 'visible' }} className="w-full pr-1">
        <div style={{ height: `${finalHeight}px` }} className="w-full">
          {dataToUse.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No hay datos de conductores</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={dataToUse}
                margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const value = payload?.value || '';
                    const isSelected = selectedConductor === value;
                    return (
                      <g 
                        style={{ pointerEvents: 'auto' }} 
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectConductor) {
                            onSelectConductor(value);
                          }
                        }}
                      >
                        <text
                          x={x}
                          y={y}
                          dx={-6}
                          dy={4}
                          textAnchor="end"
                          fill={isSelected ? 'hsl(142, 71%, 45%)' : 'hsl(var(--muted-foreground))'}
                          className="hover:fill-primary font-semibold text-[11px] transition-colors"
                          style={{ pointerEvents: 'auto' }}
                        >
                          {value.length > 18 ? `${value.slice(0, 16)}...` : value}
                        </text>
                      </g>
                    );
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                />
                <Tooltip content={<CustomTooltipPercentages isValueCOP={false} />} />
                <Bar 
                  dataKey="value" 
                  fill="hsl(217, 91%, 60%)"
                  radius={[0, 3, 3, 0]} 
                  barSize={15}
                  onClick={(data) => {
                    const val = data?.nombre || data?.payload?.nombre || data?.name || data?.payload?.name;
                    if (val && onSelectConductor) {
                      onSelectConductor(val);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {dataToUse.map((d, index) => (
                    <Cell 
                      key={index} 
                      fill={selectedConductor === d.nombre ? 'hsl(43, 96%, 52%)' : 'hsl(217, 91%, 60%)'}
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Monthly trend */}
      <motion.div
        className="lg:col-span-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Expedientes por Mes</CardTitle>
              <CardDescription>Incidencia de reclamaciones en el transcurso del año</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
              title="Expandir gráfico"
              onClick={() => setExpandedChart({
                id: 'expedientes-mes',
                title: 'Expedientes por Mes',
                description: 'Incidencia de reclamaciones en el transcurso del año',
                render: renderExpedientesPorMes
              })}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {renderExpedientesPorMes(260)}
          </CardContent>
        </Card>
      </motion.div>

      {/* By type */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Tipo de Reclamación</CardTitle>
              <CardDescription>Distribución por categoría de reclamo</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
              title="Expandir gráfico"
              onClick={() => setExpandedChart({
                id: 'tipo-reclamacion',
                title: 'Tipo de Reclamación',
                description: 'Distribución por categoría de reclamo',
                render: renderTipoReclamacion
              })}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {renderTipoReclamacion(260)}
          </CardContent>
        </Card>
      </motion.div>

      {/* Financial by month */}
      <motion.div
        className="lg:col-span-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Monto Aprobado Mensual</CardTitle>
              <CardDescription>Valores totales liquidados por mes (COP)</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
              title="Expandir gráfico"
              onClick={() => setExpandedChart({
                id: 'monto-aprobado',
                title: 'Monto Aprobado Mensual',
                description: 'Valores totales liquidados por mes (COP)',
                render: renderMontoAprobado
              })}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {renderMontoAprobado(220)}
          </CardContent>
        </Card>
      </motion.div>

      {/* By status */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Estado de Expedientes</CardTitle>
              <CardDescription>Trazabilidad y avance actual</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
              title="Expandir gráfico"
              onClick={() => setExpandedChart({
                id: 'estado-expedientes',
                title: 'Estado de Expedientes',
                description: 'Trazabilidad y avance actual',
                render: () => renderEstadoExpedientes(true)
              })}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {renderEstadoExpedientes(false)}
          </CardContent>
        </Card>
      </motion.div>

      {/* Financial Cost Comparison (Quoted vs Negotiated vs Approved) */}
      <motion.div
        className="lg:col-span-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Gestión y Eficiencia de Costos</CardTitle>
              <CardDescription>Comparativa entre cotizaciones iniciales, valores negociados y aprobados (COP)</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
              title="Expandir gráfico"
              onClick={() => setExpandedChart({
                id: 'gestion-costos',
                title: 'Gestión y Eficiencia de Costos',
                description: 'Comparativa entre cotizaciones iniciales, valores negociados y aprobados (COP)',
                render: renderGestionCostos
              })}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {renderGestionCostos(260)}
          </CardContent>
        </Card>
      </motion.div>

      {/* Culpabilidad (Accident Responsibility) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Culpabilidad de Incidentes</CardTitle>
              <CardDescription>Distribución de responsabilidad en siniestros</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
              title="Expandir gráfico"
              onClick={() => setExpandedChart({
                id: 'culpabilidad',
                title: 'Culpabilidad de Incidentes',
                description: 'Distribución de responsabilidad en siniestros',
                render: renderCulpabilidad
              })}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {renderCulpabilidad(260)}
          </CardContent>
        </Card>
      </motion.div>

      {/* Costos Ahorrados */}
      <motion.div
        className="lg:col-span-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4 }}
      >
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Costos Ahorrados</CardTitle>
              <CardDescription>Costos ahorrados: Cotizado vs Negociado y Cotizado vs Aprobado</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
              title="Expandir gráfico"
              onClick={() => setExpandedChart({
                id: 'costos-ahorrados',
                title: 'Costos Ahorrados',
                description: 'Costos ahorrados: Cotizado vs Negociado y Cotizado vs Aprobado',
                render: renderCostosAhorrados
              })}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {renderCostosAhorrados(260)}
          </CardContent>
        </Card>
      </motion.div>

      {/* Tipo de Servicio — Cantidad y Monto en la misma fila */}
      <motion.div
        className="lg:col-span-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Cantidad */}
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Tipo de Servicio (Cantidad)</CardTitle>
                <CardDescription>Expedientes por tipo de servicio</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
                title="Expandir gráfico"
                onClick={() => setExpandedChart({
                  id: 'tipo-servicio-cantidad',
                  title: 'Tipo de Servicio (Cantidad)',
                  description: 'Expedientes por tipo de servicio',
                  render: renderTipoServicioCantidad
                })}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {renderTipoServicioCantidad(260)}
            </CardContent>
          </Card>

          {/* Monto */}
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Tipo de Servicio (Monto $)</CardTitle>
                <CardDescription>Monto aprobado por tipo de servicio</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
                title="Expandir gráfico"
                onClick={() => setExpandedChart({
                  id: 'tipo-servicio-monto',
                  title: 'Tipo de Servicio (Monto $)',
                  description: 'Monto aprobado por tipo de servicio',
                  render: renderTipoServicioMonto
                })}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {renderTipoServicioMonto(260)}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Top Root Causes */}
      <motion.div
        className="lg:col-span-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Causas Raíz Más Frecuentes</CardTitle>
              <CardDescription>{showAllCausa ? 'Detalle completo de todas las causas de incidentes' : 'Principales detonantes de incidentes en la flota (Top 5)'}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-7 px-2 hover:bg-secondary/40 text-foreground"
                onClick={(e) => { e.stopPropagation(); setShowAllCausa(!showAllCausa); }}
              >
                {showAllCausa ? 'Ver Top 5' : 'Ver Todos'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
                title="Expandir gráfico"
                onClick={() => setExpandedChart({
                  id: 'causas-raiz',
                  title: 'Causas Raíz Más Frecuentes',
                  description: 'Principales detonantes de incidentes en la flota',
                  render: renderCausasRaiz
                })}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderCausasRaiz(240)}
          </CardContent>
        </Card>
      </motion.div>


      {/* Siniestralidad por Serie de Vehículo */}
      <motion.div
        className="lg:col-span-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.4 }}
      >
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Siniestralidad por Serie de Vehículo</CardTitle>
              <CardDescription>Cantidad de reclamaciones y monto $ por prefijo de número interno</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
              title="Expandir gráfico"
              onClick={() => setExpandedChart({
                id: 'serie-vehiculos',
                title: 'Siniestralidad por Serie de Vehículo',
                description: 'Cantidad de reclamaciones y monto $ por prefijo de número interno',
                render: renderVehiculosInterno
              })}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {renderVehiculosInterno(240)}
          </CardContent>
        </Card>
      </motion.div>

      {/* Afectación FAM por Propietario */}
      <motion.div
        className="lg:col-span-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Afectación FAM por Propietario</CardTitle>
              <CardDescription>{showAllPropietario ? 'Afectación acumulada de todos los propietarios' : 'Costo total acumulado de afectación al Fondo por propietario (Top 5)'}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-7 px-2 hover:bg-secondary/40 text-foreground"
                onClick={(e) => { e.stopPropagation(); setShowAllPropietario(!showAllPropietario); }}
              >
                {showAllPropietario ? 'Ver Top 5' : 'Ver Todos'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
                title="Expandir gráfico"
                onClick={() => setExpandedChart({
                  id: 'afectacion-propietario',
                  title: 'Afectación FAM por Propietario',
                  description: 'Costo total acumulado de afectación al Fondo por propietario',
                  render: renderAfectacionPropietario
                })}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderAfectacionPropietario(240)}
          </CardContent>
        </Card>
      </motion.div>

      {/* Afectación FAM por Conductor */}
      <motion.div
        className="lg:col-span-1"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Afectación FAM por Conductor</CardTitle>
              <CardDescription>{showAllConductor ? 'Afectación acumulada de todos los conductores' : 'Costo total acumulado por conductor (Top 5)'}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-7 px-2 hover:bg-secondary/40 text-foreground"
                onClick={(e) => { e.stopPropagation(); setShowAllConductor(!showAllConductor); }}
              >
                {showAllConductor ? 'Ver Top 5' : 'Ver Todos'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
                title="Expandir gráfico"
                onClick={() => setExpandedChart({
                  id: 'afectacion-conductor',
                  title: 'Afectación FAM por Conductor',
                  description: 'Costo total acumulado por conductor',
                  render: renderAfectacionConductor
                })}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderAfectacionConductor(240)}
          </CardContent>
        </Card>
      </motion.div>

      {/* Afectación FAM por Vehículo */}
      <motion.div
        className="lg:col-span-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4 }}
      >
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Afectación FAM por Vehículo</CardTitle>
              <CardDescription>{showAllVehiculoAfectacion ? 'Afectación acumulada de todos los vehículos' : 'Costo total acumulado de afectación al Fondo por vehículo (Top 5)'}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-7 px-2 hover:bg-secondary/40 text-foreground"
                onClick={(e) => { e.stopPropagation(); setShowAllVehiculoAfectacion(!showAllVehiculoAfectacion); }}
              >
                {showAllVehiculoAfectacion ? 'Ver Top 5' : 'Ver Todos'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
                title="Expandir gráfico"
                onClick={() => setExpandedChart({
                  id: 'afectacion-vehiculo',
                  title: 'Afectación FAM por Vehículo',
                  description: 'Costo total acumulado de afectación al Fondo por vehículo',
                  render: renderAfectacionVehiculo
                })}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderAfectacionVehiculo(240)}
          </CardContent>
        </Card>
      </motion.div>

      {/* Top 5 Vehículos por Reclamaciones */}
      <motion.div
        className="lg:col-span-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.4 }}
      >
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Top Vehículos por Reclamaciones</CardTitle>
              <CardDescription>{showAllTopPlacas ? 'Frecuencia de incidentes en todos los vehículos' : 'Vehículos con mayor frecuencia de incidentes (Top 5)'}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-7 px-2 hover:bg-secondary/40 text-foreground"
                onClick={(e) => { e.stopPropagation(); setShowAllTopPlacas(!showAllTopPlacas); }}
              >
                {showAllTopPlacas ? 'Ver Top 5' : 'Ver Todos'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
                title="Expandir gráfico"
                onClick={() => setExpandedChart({
                  id: 'top-vehiculos',
                  title: 'Top Vehículos por Reclamaciones',
                  description: 'Vehículos con mayor frecuencia de incidentes',
                  render: renderTopPlacas
                })}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderTopPlacas(240)}
          </CardContent>
        </Card>
      </motion.div>

      {/* Top 5 Conductores por Reclamaciones */}
      <motion.div
        className="lg:col-span-1"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.4 }}
      >
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Top Conductores</CardTitle>
              <CardDescription>{showAllTopConductores ? 'Recurrencia de reportes de todos los conductores' : 'Conductores con mayor recurrencia de reportes (Top 5)'}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-7 px-2 hover:bg-secondary/40 text-foreground"
                onClick={(e) => { e.stopPropagation(); setShowAllTopConductores(!showAllTopConductores); }}
              >
                {showAllTopConductores ? 'Ver Top 5' : 'Ver Todos'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
                title="Expandir gráfico"
                onClick={() => setExpandedChart({
                  id: 'top-conductores',
                  title: 'Top Conductores',
                  description: 'Conductores con mayor recurrencia de reportes',
                  render: renderTopConductores
                })}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderTopConductores(240)}
          </CardContent>
        </Card>
      </motion.div>

      {/* Expanded Chart Modal */}
      <AnimatePresence>
        {expandedChart && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
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

              {/* Modal Content */}
              <div className="p-6 flex-1 flex items-center justify-center bg-card">
                {expandedChart.id === 'estado-expedientes' ? (
                  <div className="w-full max-w-2xl">
                    {renderEstadoExpedientes(true)}
                  </div>
                ) : (
                  expandedChart.render(400)
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
