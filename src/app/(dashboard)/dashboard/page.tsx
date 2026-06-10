'use client';
import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { dbService } from '@/lib/services/dbService';
import type { Expediente } from '@/types/database';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [presetRange, setPresetRange] = useState('todo');
  const [tipoReclamacion, setTipoReclamacion] = useState('todos');
  const [placaSearch, setPlacaSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await dbService.getExpedientes();
      setExpedientes(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar métricas del dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Preset Date Ranges
  useEffect(() => {
    const today = new Date();
    if (presetRange === 'este-mes') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setFechaInicio(start.toISOString().split('T')[0]);
      setFechaFin(today.toISOString().split('T')[0]);
    } else if (presetRange === 'ultimos-30') {
      const start = new Date();
      start.setDate(today.getDate() - 30);
      setFechaInicio(start.toISOString().split('T')[0]);
      setFechaFin(today.toISOString().split('T')[0]);
    } else if (presetRange === 'este-anio') {
      const start = new Date(today.getFullYear(), 0, 1);
      setFechaInicio(start.toISOString().split('T')[0]);
      setFechaFin(today.toISOString().split('T')[0]);
    } else if (presetRange === 'todo') {
      setFechaInicio('');
      setFechaFin('');
    }
  }, [presetRange]);

  const filteredExpedientes = expedientes.filter((e) => {
    // 1. Date Filter
    if (fechaInicio) {
      if (!e.fecha_incidente || e.fecha_incidente < fechaInicio) return false;
    }
    if (fechaFin) {
      if (!e.fecha_incidente || e.fecha_incidente > fechaFin) return false;
    }
    // 2. Claim Type Filter
    if (tipoReclamacion !== 'todos') {
      if (e.tipo_reclamacion !== tipoReclamacion) return false;
    }
    // 3. Plate / Internal Number Filter
    if (placaSearch) {
      const matchPlaca = e.placa?.toLowerCase().includes(placaSearch.toLowerCase());
      const matchInterno = e.numero_interno?.toLowerCase().includes(placaSearch.toLowerCase());
      if (!matchPlaca && !matchInterno) return false;
    }
    return true;
  });

  return (
    <>
      <Header 
        title="Dashboard Ejecutivo" 
        subtitle="SIGFAM — Sistema Integrado de Gestión del Fondo de Auxilio Mutuo" 
        action={
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        }
      />
      <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-auto">
        {/* Filters Toolbar */}
        <div className="bg-card border border-border p-4 rounded-xl flex flex-wrap items-end gap-3 sm:gap-4 shadow-sm">
          <div className="flex-1 min-w-[150px] space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Rango Rápido</span>
            <select
              value={presetRange}
              onChange={(e) => setPresetRange(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="todo">Histórico Completo</option>
              <option value="este-mes">Este Mes</option>
              <option value="ultimos-30">Últimos 30 Días</option>
              <option value="este-anio">Este Año</option>
              <option value="custom" disabled>Personalizado</option>
            </select>
          </div>

          <div className="w-[140px] space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Desde</span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => {
                setFechaInicio(e.target.value);
                setPresetRange('custom');
              }}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>

          <div className="w-[140px] space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Hasta</span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => {
                setFechaFin(e.target.value);
                setPresetRange('custom');
              }}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>

          <div className="flex-1 min-w-[160px] space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Tipo Reclamación</span>
            <select
              value={tipoReclamacion}
              onChange={(e) => setTipoReclamacion(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="todos">Todos los tipos</option>
              <option value="Siniestro">Siniestro</option>
              <option value="Vidrios">Vidrios</option>
              <option value="Carrocería">Carrocería</option>
              <option value="Repuestos">Repuestos</option>
              <option value="Pérdida parcial">Pérdida parcial</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="flex-1 min-w-[140px] space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Buscar por Placa / Interno</span>
            <input
              type="text"
              placeholder="Ej: ABC-123 o 0042"
              value={placaSearch}
              onChange={(e) => setPlacaSearch(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-mono uppercase"
              autoComplete="off"
            />
          </div>

          {(fechaInicio || fechaFin || tipoReclamacion !== 'todos' || placaSearch) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFechaInicio('');
                setFechaFin('');
                setPresetRange('todo');
                setTipoReclamacion('todos');
                setPlacaSearch('');
              }}
              className="text-xs text-red-400 hover:text-red-500 h-10 px-3"
            >
              Limpiar
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
            <p>Calculando estadísticas en tiempo real...</p>
          </div>
        ) : (
          <>
            <DashboardKPIs expedientes={filteredExpedientes} />
            <DashboardCharts expedientes={filteredExpedientes} />
          </>
        )}
      </div>
    </>
  );
}
