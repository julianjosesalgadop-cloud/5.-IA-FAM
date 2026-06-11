'use client';
import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { dbService } from '@/lib/services/dbService';
import type { Expediente } from '@/types/database';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardPage() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [presetRange, setPresetRange] = useState('todo');
  const [tipoReclamacion, setTipoReclamacion] = useState('todos');
  const [placaSearch, setPlacaSearch] = useState('');
  const [selectedChartPlaca, setSelectedChartPlaca] = useState('');
  const [selectedChartConductor, setSelectedChartConductor] = useState('');

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

  // 1. Base Filtered Array (General Filters: Dates, Claim Type, Search Query)
  const baseFilteredExpedientes = expedientes.filter((e) => {
    // Date Filter
    if (fechaInicio && (!e.fecha_incidente || e.fecha_incidente < fechaInicio)) return false;
    if (fechaFin && (!e.fecha_incidente || e.fecha_incidente > fechaFin)) return false;
    
    // Claim Type Filter
    if (tipoReclamacion !== 'todos' && e.tipo_reclamacion !== tipoReclamacion) return false;
    
    // Plate / Internal Number Filter
    if (placaSearch) {
      const matchPlaca = e.placa?.toLowerCase().includes(placaSearch.toLowerCase());
      const matchInterno = e.numero_interno?.toLowerCase().includes(placaSearch.toLowerCase());
      if (!matchPlaca && !matchInterno) return false;
    }
    return true;
  });

  // 2. Array for Vehicles Chart: baseFiltered + driver filter (excludes vehicle filter to prevent self-collapsing)
  const expedientesForVehicles = baseFilteredExpedientes.filter((e) => {
    if (selectedChartConductor && e.nombre_conductor?.toLowerCase() !== selectedChartConductor.toLowerCase()) return false;
    return true;
  });

  // 3. Array for Drivers Chart: baseFiltered + vehicle filter (excludes driver filter to prevent self-collapsing)
  const expedientesForDrivers = baseFilteredExpedientes.filter((e) => {
    if (selectedChartPlaca && e.placa?.toLowerCase() !== selectedChartPlaca.toLowerCase()) return false;
    return true;
  });

  // 4. Final Filtered Array for KPIs and general charts (includes both selected charts filters)
  const filteredExpedientes = baseFilteredExpedientes.filter((e) => {
    if (selectedChartPlaca && e.placa?.toLowerCase() !== selectedChartPlaca.toLowerCase()) return false;
    if (selectedChartConductor && e.nombre_conductor?.toLowerCase() !== selectedChartConductor.toLowerCase()) return false;
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

          {(fechaInicio || fechaFin || tipoReclamacion !== 'todos' || placaSearch || selectedChartPlaca || selectedChartConductor) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFechaInicio('');
                setFechaFin('');
                setPresetRange('todo');
                setTipoReclamacion('todos');
                setPlacaSearch('');
                setSelectedChartPlaca('');
                setSelectedChartConductor('');
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
            <DashboardCharts 
              expedientes={filteredExpedientes} 
              unfilteredExpedientes={expedientes}
              expedientesForVehicles={expedientesForVehicles}
              expedientesForDrivers={expedientesForDrivers}
              onSelectPlaca={(placa) => setSelectedChartPlaca(current => current === placa ? '' : placa)}
              onSelectConductor={(conductor) => setSelectedChartConductor(current => current === conductor ? '' : conductor)}
              selectedPlaca={selectedChartPlaca}
              selectedConductor={selectedChartConductor}
            />
          </>
        )}
      </div>

      {/* Active Chart Filters Notification */}
      <AnimatePresence>
        {(selectedChartPlaca || selectedChartConductor) && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 right-6 z-50 w-80 bg-card border border-border shadow-2xl rounded-xl p-4 overflow-hidden backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filtros Activos (Gráfico)</h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedChartPlaca('');
                  setSelectedChartConductor('');
                }}
                className="text-[10px] text-red-400 hover:text-red-500 font-semibold p-0 h-auto"
              >
                Quitar Todos
              </Button>
            </div>
            <div className="space-y-2">
              {selectedChartPlaca && (
                <div className="flex items-center justify-between bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/40">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Vehículo</p>
                    <p className="text-xs font-mono font-bold text-foreground truncate">{selectedChartPlaca}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedChartPlaca('')}
                    className="h-5 w-5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {selectedChartConductor && (
                <div className="flex items-center justify-between bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/40">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Conductor</p>
                    <p className="text-xs font-semibold text-foreground truncate">{selectedChartConductor}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedChartConductor('')}
                    className="h-5 w-5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
