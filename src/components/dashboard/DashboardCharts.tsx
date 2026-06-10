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
}

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--foreground))',
};

function CustomTooltipBar({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div style={CUSTOM_TOOLTIP_STYLE} className="p-3 text-xs space-y-1.5 shadow-lg">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 text-foreground">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="font-medium">
              {p.name === 'valor' ? 'Valor Aprobado:' : ''} {p.name === 'valor' ? formatCOP(p.value) : `${p.value} expedientes`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function CustomTooltipFinanzas({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div style={CUSTOM_TOOLTIP_STYLE} className="p-3 text-xs space-y-1.5 shadow-lg">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-4 text-foreground">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="capitalize font-medium">{p.name}:</span>
            </div>
            <span className="font-semibold number-font">{formatCOP(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function DashboardCharts({ expedientes }: DashboardChartsProps) {
  const [expandedChart, setExpandedChart] = useState<{
    id: string;
    title: string;
    description: string;
    render: (height: number) => React.ReactNode;
  } | null>(null);

  // 1. Monthly trend calculations
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
      expedientes: cases.length,
      valor: sumAprobado,
      cotizado: sumCotizado,
      negociado: sumNegociado,
      aprobado: sumAprobado,
    };
  });

  // 2. Claim Type Distribution
  const CLAIM_TYPES = ['Siniestro', 'Vidrios', 'Carrocería', 'Repuestos', 'Pérdida parcial', 'Otro'] as const;
  const TIPO_COLORS = {
    'Siniestro': 'hsl(0, 72%, 55%)',
    'Carrocería': 'hsl(25, 92%, 50%)',
    'Vidrios': 'hsl(197, 71%, 52%)',
    'Repuestos': 'hsl(270, 60%, 60%)',
    'Pérdida parcial': 'hsl(340, 75%, 55%)',
    'Otro': 'hsl(215, 20%, 55%)',
  };
  const tipoData = CLAIM_TYPES.map((type) => {
    const count = expedientes.filter((e) => e.tipo_reclamacion === type).length;
    return { name: type, value: count, fill: TIPO_COLORS[type] };
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
    return { name: type, value: count, fill: CULPABILIDAD_COLORS[type] };
  }).filter((t) => t.value > 0);

  // 5. Causa Raíz Distribution
  const causaGroups: Record<string, number> = {};
  expedientes.forEach((e) => {
    const causa = e.causa_raiz || 'Sin definir';
    causaGroups[causa] = (causaGroups[causa] || 0) + 1;
  });
  const causaData = Object.entries(causaGroups)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const hasData = expedientes.length > 0;

  if (!hasData) {
    return (
      <Card className="border-border bg-card p-12 text-center text-muted-foreground">
        <p>No hay datos suficientes para graficar. Agregue expedientes primero.</p>
      </Card>
    );
  }

  // --- Chart Renderers (reused in normal cards and inside maximized modal) ---

  const renderExpedientesPorMes = (height: number) => (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={monthlyData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorExpedientes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217,91%,55%)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(217,91%,55%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltipBar />} />
          <Area
            type="monotone"
            dataKey="expedientes"
            stroke="hsl(217,91%,55%)"
            strokeWidth={2}
            fill="url(#colorExpedientes)"
            dot={{ fill: 'hsl(217,91%,55%)', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: 'hsl(43,96%,52%)' }}
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
            >
              {tipoData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
            <Legend
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground font-medium">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  const renderMontoAprobado = (height: number) => (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={monthlyData} barSize={height > 300 ? 35 : 20} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
          />
          <Tooltip content={<CustomTooltipBar />} />
          <Bar dataKey="valor" name="valor" fill="hsl(217,91%,55%)" radius={[3, 3, 0, 0]}>
            <LabelList
              dataKey="valor"
              position="top"
              formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(1)}M` : ''}
              style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 600 }}
            />
            {monthlyData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.valor > 0 ? 'hsl(217, 91%, 55%)' : 'rgba(255,255,255,0.1)'}
              />
            ))}
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
        return (
          <div key={item.name} className="space-y-1">
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
        <BarChart data={monthlyData} barGap={height > 300 ? 6 : 4} barSize={height > 300 ? 16 : undefined} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
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
          <Bar dataKey="cotizado" name="cotizado" fill="hsl(0, 72%, 55%)" radius={[2, 2, 0, 0]}>
            <LabelList
              dataKey="cotizado"
              position="top"
              formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(0)}M` : ''}
              style={{ fill: 'hsl(var(--foreground))', fontSize: 8, fontWeight: 600 }}
            />
          </Bar>
          <Bar dataKey="negociado" name="negociado" fill="hsl(43, 96%, 52%)" radius={[2, 2, 0, 0]}>
            <LabelList
              dataKey="negociado"
              position="top"
              formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(0)}M` : ''}
              style={{ fill: 'hsl(var(--foreground))', fontSize: 8, fontWeight: 600 }}
            />
          </Bar>
          <Bar dataKey="aprobado" name="aprobado" fill="hsl(142, 71%, 45%)" radius={[2, 2, 0, 0]}>
            <LabelList
              dataKey="aprobado"
              position="top"
              formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(0)}M` : ''}
              style={{ fill: 'hsl(var(--foreground))', fontSize: 8, fontWeight: 600 }}
            />
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
            >
              {culpabilidadData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
            <Legend
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground font-medium">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  const renderCausasRaiz = (height: number) => (
    <div style={{ height }} className="w-full">
      {causaData.length === 0 ? (
        <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No hay datos</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={causaData}
            margin={{ left: 50, right: 20, top: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={160} />
            <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
            <Bar dataKey="value" fill="hsl(43, 96%, 52%)" radius={[0, 3, 3, 0]} barSize={15}>
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
  );

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
              <CardDescription>Principales detonantes de incidentes en la flota (Top 5)</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
              title="Expandir gráfico"
              onClick={() => setExpandedChart({
                id: 'causas-raiz',
                title: 'Causas Raíz Más Frecuentes',
                description: 'Principales detonantes de incidentes en la flota (Top 5)',
                render: renderCausasRaiz
              })}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {renderCausasRaiz(240)}
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
