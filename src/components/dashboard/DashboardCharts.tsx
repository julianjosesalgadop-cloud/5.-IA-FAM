'use client';
import React from 'react';
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
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCOP } from '@/lib/utils';
import type { Expediente } from '@/types/database';

interface DashboardChartsProps {
  expedientes: Expediente[];
}

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(222, 39%, 12%)',
  border: '1px solid hsl(222, 26%, 22%)',
  borderRadius: '8px',
  color: 'hsl(210, 40%, 95%)',
};

function CustomTooltipBar({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div style={CUSTOM_TOOLTIP_STYLE} className="p-3 text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name === 'valor' ? `Valor Aprobado: ${formatCOP(p.value)}` : `${p.value} expedientes`}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function CustomTooltipFinanzas({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div style={CUSTOM_TOOLTIP_STYLE} className="p-3 text-xs space-y-1">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="flex justify-between gap-4" style={{ color: p.color }}>
            <span className="capitalize">{p.name}:</span>
            <span className="font-semibold">{formatCOP(p.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function DashboardCharts({ expedientes }: DashboardChartsProps) {
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
          <CardHeader>
            <CardTitle>Expedientes por Mes</CardTitle>
            <CardDescription>Incidencia de reclamaciones en el transcurso del año</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorExpedientes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217,91%,55%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(217,91%,55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="mes" tick={{ fill: 'hsl(215,20%,55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(215,20%,55%)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
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
                      style={{ fill: 'hsl(210, 40%, 95%)', fontSize: 10, fontWeight: 600 }}
                    />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
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
          <CardHeader>
            <CardTitle>Tipo de Reclamación</CardTitle>
            <CardDescription>Distribución por categoría de reclamo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              {tipoData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No hay datos</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tipoData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ value }) => value}
                      labelLine={{ stroke: 'rgba(255, 255, 255, 0.3)', strokeWidth: 1 }}
                    >
                      {tipoData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={CUSTOM_TOOLTIP_STYLE}
                      formatter={(val: number) => [`${val} expedientes`, '']}
                    />
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
          <CardHeader>
            <CardTitle>Monto Aprobado Mensual</CardTitle>
            <CardDescription>Valores totales liquidados por mes (COP)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barSize={20} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: 'hsl(215,20%,55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: 'hsl(215,20%,55%)', fontSize: 11 }}
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
                      style={{ fill: 'hsl(210, 40%, 95%)', fontSize: 10, fontWeight: 600 }}
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
          <CardHeader>
            <CardTitle>Estado de Expedientes</CardTitle>
            <CardDescription>Trazabilidad y avance actual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
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
          <CardHeader>
            <CardTitle>Gestión y Eficiencia de Costos</CardTitle>
            <CardDescription>Comparativa entre cotizaciones iniciales, valores negociados y aprobados (COP)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barGap={4} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: 'hsl(215,20%,55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: 'hsl(215,20%,55%)', fontSize: 11 }}
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
                      style={{ fill: 'hsl(210, 40%, 95%)', fontSize: 8, fontWeight: 500 }}
                    />
                  </Bar>
                  <Bar dataKey="negociado" name="negociado" fill="hsl(43, 96%, 52%)" radius={[2, 2, 0, 0]}>
                    <LabelList
                      dataKey="negociado"
                      position="top"
                      formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(0)}M` : ''}
                      style={{ fill: 'hsl(210, 40%, 95%)', fontSize: 8, fontWeight: 500 }}
                    />
                  </Bar>
                  <Bar dataKey="aprobado" name="aprobado" fill="hsl(142, 71%, 45%)" radius={[2, 2, 0, 0]}>
                    <LabelList
                      dataKey="aprobado"
                      position="top"
                      formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(0)}M` : ''}
                      style={{ fill: 'hsl(210, 40%, 95%)', fontSize: 8, fontWeight: 500 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
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
          <CardHeader>
            <CardTitle>Culpabilidad de Incidentes</CardTitle>
            <CardDescription>Distribución de responsabilidad en siniestros</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              {culpabilidadData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No hay datos</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={culpabilidadData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ value }) => value}
                      labelLine={{ stroke: 'rgba(255, 255, 255, 0.3)', strokeWidth: 1 }}
                    >
                      {culpabilidadData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={CUSTOM_TOOLTIP_STYLE}
                      formatter={(val: number) => [`${val} incidentes`, '']}
                    />
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
          <CardHeader>
            <CardTitle>Causas Raíz Más Frecuentes</CardTitle>
            <CardDescription>Principales detonantes de incidentes en la flota (Top 5)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full">
              {causaData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No hay datos</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={causaData}
                    margin={{ left: 50, right: 20, top: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'hsl(215,20%,55%)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(210,40%,95%)', fontSize: 11 }} axisLine={false} tickLine={false} width={160} />
                    <Tooltip
                      contentStyle={CUSTOM_TOOLTIP_STYLE}
                      formatter={(val: number) => [`${val} incidentes`, 'Cantidad']}
                    />
                    <Bar dataKey="value" fill="hsl(43, 96%, 52%)" radius={[0, 3, 3, 0]} barSize={15}>
                      <LabelList
                        dataKey="value"
                        position="right"
                        style={{ fill: 'hsl(210, 40%, 95%)', fontSize: 10, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
