'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { Footer } from '@/components/layout/Footer';
import { dbService } from '@/lib/services/dbService';
import type { Expediente } from '@/types/database';
import { RefreshCw, X, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MultiSelect } from '@/components/ui/MultiSelect';

export default function DashboardPage() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (loading) {
      toast.loading('Cargando datos del dashboard...', { id: 'loading-dashboard' });
    } else {
      toast.dismiss('loading-dashboard');
    }
    return () => {
      toast.dismiss('loading-dashboard');
    };
  }, [loading]);

  // Filters State
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [presetRange, setPresetRange] = useState('este-anio');
  const [estadoFilter, setEstadoFilter] = useState<string[]>(['Pendiente', 'Aprobado']);
  const [tipoReclamacion, setTipoReclamacion] = useState('todos');
  const [customTipoFilter, setCustomTipoFilter] = useState('');
  const [placaSearch, setPlacaSearch] = useState('');
  const [selectedChartPlaca, setSelectedChartPlaca] = useState('');
  const [selectedChartConductor, setSelectedChartConductor] = useState('');
  const [selectedChartProprietario, setSelectedChartProprietario] = useState('');
  const [selectedChartMonth, setSelectedChartMonth] = useState<number | null>(null);
  const [selectedChartStatus, setSelectedChartStatus] = useState('');
  const [selectedChartCulpabilidad, setSelectedChartCulpabilidad] = useState('');
  const [selectedChartCausaRaiz, setSelectedChartCausaRaiz] = useState('');
  const [selectedChartSerie, setSelectedChartSerie] = useState('');
  const [selectedChartRoute, setSelectedChartRoute] = useState('');
  const [selectedChartProveedor, setSelectedChartProveedor] = useState('');
  const [selectedChartTipoServicio, setSelectedChartTipoServicio] = useState('');
  const [selectedChartConcepto, setSelectedChartConcepto] = useState('');
  const [selectedChartActa, setSelectedChartActa] = useState('');

  const getExpedienteProveedor = (e: any): string => {
    if (e.cotizaciones && e.cotizaciones.length > 0) {
      const selectedCots = e.cotizaciones.filter((c: any) => c.seleccionada);
      const activeCots = selectedCots.length > 0 ? selectedCots : [e.cotizaciones[0]];
      if (activeCots[0] && activeCots[0].proveedor) {
        return activeCots[0].proveedor.trim().toUpperCase();
      }
    }
    return 'SIN ESPECIFICAR';
  };

  const getRouteKey = (e: any): string => {
    const origin = (e.ciudad_origen || '').trim().toUpperCase();
    const dest = (e.ciudad_destino || '').trim().toUpperCase();
    if (!origin && !dest) return 'SIN ESPECIFICAR';
    return `${origin || '?' } - ${dest || '?'}`;
  };

  const getInternalNumberCategory = (numStr: string | null | undefined): string => {
    if (!numStr) return 'Otros';
    const cleanNum = numStr.trim();
    const map: Record<string, string> = {
      '10': 'Vehículos 1000',
      '32': 'Vehículos 32',
      '4': 'Vehículos 400',
      '6': 'Vehículos 600',
      '7': 'Vehículos 700',
      '71': 'Vehículos 71',
      '80': 'Vehículos 8000',
      '90': 'Vehículos 9000',
    };
    const prefixes = ['71', '80', '10', '90', '4', '32', '6', '7'];
    for (const prefix of prefixes) {
      if (cleanNum.startsWith(prefix)) {
        return map[prefix] || `Vehículos ${prefix}`;
      }
    }
    return 'Otros';
  };

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

  useEffect(() => {
    if (tipoReclamacion !== 'Otro') {
      setCustomTipoFilter('');
    }
  }, [tipoReclamacion]);

  // 1. Base Filtered Array (General Filters: Dates, Claim Type, Search Query, and new chart filters)
  const baseFilteredExpedientes = expedientes.filter((e) => {
    // Date Filter
    if (fechaInicio && (!e.fecha_incidente || e.fecha_incidente < fechaInicio)) return false;
    if (fechaFin && (!e.fecha_incidente || e.fecha_incidente > fechaFin)) return false;
    
    // Claim Type Filter
    if (tipoReclamacion !== 'todos') {
      const standardTipos = ['Siniestro', 'Vidrios', 'Carrocería', 'Repuestos', 'Pérdida parcial'];
      const isCustomType = !standardTipos.includes(e.tipo_reclamacion || '');
      if (tipoReclamacion === 'Otro') {
        if (!isCustomType) return false;
        if (customTipoFilter && !e.tipo_reclamacion?.toLowerCase().includes(customTipoFilter.toLowerCase())) {
          return false;
        }
      } else {
        if (e.tipo_reclamacion !== tipoReclamacion) return false;
      }
    }
    
    // Plate / Internal Number Filter
    if (placaSearch) {
      const matchPlaca = e.placa?.toLowerCase().includes(placaSearch.toLowerCase());
      const matchInterno = e.numero_interno?.toLowerCase().includes(placaSearch.toLowerCase());
      if (!matchPlaca && !matchInterno) return false;
    }

    // Status Filter (multi-select)
    if (estadoFilter.length > 0) {
      if (!estadoFilter.includes(e.estado)) return false;
    }

    // Chart-based interactive filters
    if (selectedChartStatus && e.estado !== selectedChartStatus) return false;
    if (selectedChartCulpabilidad && e.culpabilidad !== selectedChartCulpabilidad) return false;
    if (selectedChartCausaRaiz && e.causa_raiz !== selectedChartCausaRaiz) return false;
    if (selectedChartProveedor && getExpedienteProveedor(e) !== selectedChartProveedor) return false;
    if (selectedChartTipoServicio && e.tipo_servicio !== selectedChartTipoServicio) return false;
    
    if (selectedChartConcepto) {
      if (!e.cotizaciones || e.cotizaciones.length === 0) return false;
      const selectedCots = e.cotizaciones.filter((c: any) => c.seleccionada);
      const activeCots = selectedCots.length > 0 ? selectedCots : [e.cotizaciones[0]];
      const hasConcepto = activeCots.some((c: any) => {
        let name = (c.concepto || 'SIN ESPECIFICAR').trim().toUpperCase();
        if (name === 'OTROS' && c.concepto_otro) {
          name = c.concepto_otro.trim().toUpperCase();
        }
        if (name === 'ACCIDENTE' || name === 'ACSIDENTE') {
          name = 'SINIESTRO';
        }
        return name === selectedChartConcepto;
      });
      if (!hasConcepto) return false;
    }
    


    return true;
  });

  const hasMonthFilter = (e: Expediente) => {
    if (selectedChartMonth !== null) {
      if (!e.fecha_incidente) return false;
      const d = new Date(e.fecha_incidente + 'T00:00:00');
      if (isNaN(d.getTime()) || d.getMonth() !== selectedChartMonth) return false;
    }
    return true;
  };

  // 2. Array for Vehicles Chart: baseFiltered + driver & proprietor & series & route & acta filters (excludes vehicle filter to prevent self-collapsing)
  const expedientesForVehicles = baseFilteredExpedientes.filter((e) => {
    if (!hasMonthFilter(e)) return false;
    if (selectedChartConductor && e.nombre_conductor?.toLowerCase() !== selectedChartConductor.toLowerCase()) return false;
    if (selectedChartProprietario && e.propietario?.toLowerCase() !== selectedChartProprietario.toLowerCase()) return false;
    if (selectedChartSerie) {
      const cat = getInternalNumberCategory(e.numero_interno);
      if (cat !== selectedChartSerie) return false;
    }
    if (selectedChartRoute && getRouteKey(e) !== selectedChartRoute) return false;
    if (selectedChartActa && e.numero_acta?.toUpperCase() !== selectedChartActa.toUpperCase()) return false;
    return true;
  });

  // 3. Array for Drivers Chart: baseFiltered + vehicle & proprietor & series & route & acta filters (excludes driver filter to prevent self-collapsing)
  const expedientesForDrivers = baseFilteredExpedientes.filter((e) => {
    if (!hasMonthFilter(e)) return false;
    if (selectedChartPlaca && e.placa?.toLowerCase() !== selectedChartPlaca.toLowerCase()) return false;
    if (selectedChartProprietario && e.propietario?.toLowerCase() !== selectedChartProprietario.toLowerCase()) return false;
    if (selectedChartSerie) {
      const cat = getInternalNumberCategory(e.numero_interno);
      if (cat !== selectedChartSerie) return false;
    }
    if (selectedChartRoute && getRouteKey(e) !== selectedChartRoute) return false;
    if (selectedChartActa && e.numero_acta?.toUpperCase() !== selectedChartActa.toUpperCase()) return false;
    return true;
  });

  // 3b. Array for Proprietors Chart: baseFiltered + vehicle & driver & series & route & acta filters (excludes proprietor filter to prevent self-collapsing)
  const expedientesForPropietarios = baseFilteredExpedientes.filter((e) => {
    if (!hasMonthFilter(e)) return false;
    if (selectedChartPlaca && e.placa?.toLowerCase() !== selectedChartPlaca.toLowerCase()) return false;
    if (selectedChartConductor && e.nombre_conductor?.toLowerCase() !== selectedChartConductor.toLowerCase()) return false;
    if (selectedChartSerie) {
      const cat = getInternalNumberCategory(e.numero_interno);
      if (cat !== selectedChartSerie) return false;
    }
    if (selectedChartRoute && getRouteKey(e) !== selectedChartRoute) return false;
    if (selectedChartActa && e.numero_acta?.toUpperCase() !== selectedChartActa.toUpperCase()) return false;
    return true;
  });

  // 3c. Array for Series Chart: baseFiltered + vehicle & driver & proprietor & route & acta filters (excludes series filter to prevent self-collapsing)
  const expedientesForSeries = baseFilteredExpedientes.filter((e) => {
    if (!hasMonthFilter(e)) return false;
    if (selectedChartPlaca && e.placa?.toLowerCase() !== selectedChartPlaca.toLowerCase()) return false;
    if (selectedChartConductor && e.nombre_conductor?.toLowerCase() !== selectedChartConductor.toLowerCase()) return false;
    if (selectedChartProprietario && e.propietario?.toLowerCase() !== selectedChartProprietario.toLowerCase()) return false;
    if (selectedChartRoute && getRouteKey(e) !== selectedChartRoute) return false;
    if (selectedChartActa && e.numero_acta?.toUpperCase() !== selectedChartActa.toUpperCase()) return false;
    return true;
  });

  // 3d. Array for Routes Chart: baseFiltered + vehicle & driver & proprietor & series & acta filters (excludes route filter to prevent self-collapsing)
  const expedientesForRoutes = baseFilteredExpedientes.filter((e) => {
    if (!hasMonthFilter(e)) return false;
    if (selectedChartPlaca && e.placa?.toLowerCase() !== selectedChartPlaca.toLowerCase()) return false;
    if (selectedChartConductor && e.nombre_conductor?.toLowerCase() !== selectedChartConductor.toLowerCase()) return false;
    if (selectedChartProprietario && e.propietario?.toLowerCase() !== selectedChartProprietario.toLowerCase()) return false;
    if (selectedChartSerie) {
      const cat = getInternalNumberCategory(e.numero_interno);
      if (cat !== selectedChartSerie) return false;
    }
    if (selectedChartActa && e.numero_acta?.toUpperCase() !== selectedChartActa.toUpperCase()) return false;
    return true;
  });

  // 3e. Array for Actas Chart: baseFiltered + vehicle & driver & proprietor & series & route filters (excludes acta filter to prevent self-collapsing)
  const expedientesForActas = baseFilteredExpedientes.filter((e) => {
    if (!hasMonthFilter(e)) return false;
    if (selectedChartPlaca && e.placa?.toLowerCase() !== selectedChartPlaca.toLowerCase()) return false;
    if (selectedChartConductor && e.nombre_conductor?.toLowerCase() !== selectedChartConductor.toLowerCase()) return false;
    if (selectedChartProprietario && e.propietario?.toLowerCase() !== selectedChartProprietario.toLowerCase()) return false;
    if (selectedChartSerie) {
      const cat = getInternalNumberCategory(e.numero_interno);
      if (cat !== selectedChartSerie) return false;
    }
    if (selectedChartRoute && getRouteKey(e) !== selectedChartRoute) return false;
    return true;
  });

  // 3f. Array for Months Chart: baseFiltered + vehicle & driver & proprietor & series & route & acta filters (excludes month filter to prevent self-collapsing)
  const expedientesForMonths = baseFilteredExpedientes.filter((e) => {
    if (selectedChartPlaca && e.placa?.toLowerCase() !== selectedChartPlaca.toLowerCase()) return false;
    if (selectedChartConductor && e.nombre_conductor?.toLowerCase() !== selectedChartConductor.toLowerCase()) return false;
    if (selectedChartProprietario && e.propietario?.toLowerCase() !== selectedChartProprietario.toLowerCase()) return false;
    if (selectedChartSerie) {
      const cat = getInternalNumberCategory(e.numero_interno);
      if (cat !== selectedChartSerie) return false;
    }
    if (selectedChartRoute && getRouteKey(e) !== selectedChartRoute) return false;
    if (selectedChartActa && e.numero_acta?.toUpperCase() !== selectedChartActa.toUpperCase()) return false;
    return true;
  });

  // 4. Final Filtered Array for KPIs and general charts (includes all selected charts filters)
  const filteredExpedientes = expedientesForMonths.filter((e) => {
    if (!hasMonthFilter(e)) return false;
    return true;
  });

  const isDefaultEstado = estadoFilter.length === 2 && estadoFilter.includes('Pendiente') && estadoFilter.includes('Aprobado');

  return (
    <>
      <Header 
        title="Dashboard Ejecutivo" 
        subtitle="SIGFAM — Sistema Integrado de Gestión del Fondo de Auxilio Mutuo" 
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
      <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-auto">
        {/* Filters Toolbar */}
        <div className="bg-card border border-border p-3 sm:p-3.5 rounded-xl flex flex-wrap items-end gap-2.5 sm:gap-3 shadow-sm">
          <div className="flex-1 min-w-[120px] max-w-[160px] space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Rango Rápido</span>
            <select
              value={presetRange}
              onChange={(e) => setPresetRange(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="todo">Histórico Completo</option>
              <option value="este-mes">Este Mes</option>
              <option value="ultimos-30">Últimos 30 Días</option>
              <option value="este-anio">Este Año</option>
              <option value="custom" disabled>Personalizado</option>
            </select>
          </div>

          <div className="w-[120px] sm:w-[130px] space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Desde</span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => {
                setFechaInicio(e.target.value);
                setPresetRange('custom');
              }}
              className="flex h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>

          <div className="w-[120px] sm:w-[130px] space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Hasta</span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => {
                setFechaFin(e.target.value);
                setPresetRange('custom');
              }}
              className="flex h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>

          <div className="flex-1 min-w-[130px] max-w-[170px] space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Tipo Reclamación</span>
            <select
              value={tipoReclamacion}
              onChange={(e) => setTipoReclamacion(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
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

          {tipoReclamacion === 'Otro' && (
            <div className="w-[140px] space-y-1 animate-fade-in">
              <span className="text-[11px] font-semibold text-muted-foreground">Especificar Tipo</span>
              <input
                type="text"
                placeholder="Especificar..."
                className="flex h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                value={customTipoFilter}
                onChange={(e) => setCustomTipoFilter(e.target.value)}
              />
            </div>
          )}

          <div className="flex-1 min-w-[130px] max-w-[180px]">
            <MultiSelect
              label="Estado"
              options={[
                { label: 'Pendiente', value: 'Pendiente' },
                { label: 'Revisado', value: 'Revisado' },
                { label: 'Aprobado', value: 'Aprobado' },
                { label: 'Rechazado', value: 'Rechazado' }
              ]}
              selectedValues={estadoFilter}
              onChange={setEstadoFilter}
              placeholder="Todos los estados"
            />
          </div>

          <div className="flex-1 min-w-[130px] max-w-[180px] space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Buscar Placa / Interno</span>
            <input
              type="text"
              placeholder="Ej: ABC-123 o 0042"
              value={placaSearch}
              onChange={(e) => setPlacaSearch(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-mono uppercase"
              autoComplete="off"
            />
          </div>

          {(fechaInicio || fechaFin || tipoReclamacion !== 'todos' || customTipoFilter || placaSearch || !isDefaultEstado || selectedChartPlaca || selectedChartConductor || selectedChartProprietario || selectedChartMonth !== null || selectedChartStatus || selectedChartCulpabilidad || selectedChartCausaRaiz || selectedChartSerie || selectedChartRoute || selectedChartProveedor || selectedChartTipoServicio) && (
            <Button
              variant="outline"
              size="sm"
              title="Limpiar todos los filtros"
              onClick={() => {
                setFechaInicio('');
                setFechaFin('');
                setPresetRange('todo');
                setTipoReclamacion('todos');
                setCustomTipoFilter('');
                setPlacaSearch('');
                setEstadoFilter(['Pendiente', 'Aprobado']);
                setSelectedChartPlaca('');
                setSelectedChartConductor('');
                setSelectedChartProprietario('');
                setSelectedChartMonth(null);
                setSelectedChartStatus('');
                setSelectedChartCulpabilidad('');
                setSelectedChartCausaRaiz('');
                setSelectedChartSerie('');
                setSelectedChartRoute('');
                setSelectedChartProveedor('');
                setSelectedChartTipoServicio('');
                setSelectedChartConcepto('');
                setSelectedChartActa('');
              }}
              className="h-9 px-2.5 text-xs text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20 border-red-500/20 shrink-0 flex items-center gap-1.5 rounded-lg font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Limpiar</span>
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
              expedientesForPropietarios={expedientesForPropietarios}
              expedientesForSeries={expedientesForSeries}
              expedientesForRoutes={expedientesForRoutes}
              expedientesForActas={expedientesForActas}
              expedientesForMonths={expedientesForMonths}
              onSelectPlaca={(placa) => setSelectedChartPlaca(current => current === placa ? '' : placa)}
              onSelectConductor={(conductor) => setSelectedChartConductor(current => current === conductor ? '' : conductor)}
              onSelectProprietario={(prop) => setSelectedChartProprietario(current => current === prop ? '' : prop)}
              onSelectTipoReclamacion={(tipo) => setTipoReclamacion(current => current === tipo ? 'todos' : tipo)}
              onSelectMonth={(month) => setSelectedChartMonth(current => current === month ? null : month)}
              onSelectStatus={(status) => setSelectedChartStatus(current => current === status ? '' : status)}
              onSelectCulpabilidad={(culp) => setSelectedChartCulpabilidad(current => current === culp ? '' : culp)}
              onSelectCausaRaiz={(causa) => setSelectedChartCausaRaiz(current => current === causa ? '' : causa)}
              onSelectSerie={(serie) => setSelectedChartSerie(current => current === serie ? '' : serie)}
              onSelectRoute={(route) => setSelectedChartRoute(current => current === route ? '' : route)}
              onSelectProveedor={(prov) => setSelectedChartProveedor(current => current === prov ? '' : prov)}
              onSelectTipoServicio={(tipo) => setSelectedChartTipoServicio(current => current === tipo ? '' : tipo)}
              onSelectConcepto={(concepto) => setSelectedChartConcepto(current => current === concepto ? '' : concepto)}
              onSelectActa={(acta: string) => setSelectedChartActa(current => current === acta ? '' : acta)}
              selectedPlaca={selectedChartPlaca}
              selectedConductor={selectedChartConductor}
              selectedProprietario={selectedChartProprietario}
              selectedTipoReclamacion={tipoReclamacion === 'todos' ? '' : tipoReclamacion}
              selectedMonth={selectedChartMonth}
              selectedStatus={selectedChartStatus}
              selectedCulpabilidad={selectedChartCulpabilidad}
              selectedCausaRaiz={selectedChartCausaRaiz}
              selectedSerie={selectedChartSerie}
              selectedRoute={selectedChartRoute}
              selectedProveedor={selectedChartProveedor}
              selectedTipoServicio={selectedChartTipoServicio}
              selectedConcepto={selectedChartConcepto}
              selectedActa={selectedChartActa}
              presetRange={presetRange}
            />
            <Footer />
          </>
        )}
      </div>

      {/* Active Chart Filters Notification */}
      <AnimatePresence>
        {(selectedChartPlaca || selectedChartConductor || selectedChartProprietario || selectedChartMonth !== null || selectedChartStatus || selectedChartCulpabilidad || selectedChartCausaRaiz || selectedChartSerie || selectedChartRoute || tipoReclamacion !== 'todos' || customTipoFilter || selectedChartProveedor || selectedChartTipoServicio || selectedChartConcepto || selectedChartActa) && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 right-6 z-50 w-80 bg-card/95 border border-border shadow-2xl rounded-xl p-4 overflow-hidden backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filtros Activos</h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedChartPlaca('');
                  setSelectedChartConductor('');
                  setSelectedChartProprietario('');
                  setSelectedChartMonth(null);
                  setSelectedChartStatus('');
                  setSelectedChartCulpabilidad('');
                  setSelectedChartCausaRaiz('');
                  setSelectedChartSerie('');
                  setSelectedChartRoute('');
                  setSelectedChartProveedor('');
                  setSelectedChartTipoServicio('');
                  setSelectedChartConcepto('');
                  setSelectedChartActa('');
                  setTipoReclamacion('todos');
                  setCustomTipoFilter('');
                }}
                className="text-[10px] text-red-400 hover:text-red-500 font-semibold p-0 h-auto"
              >
                Quitar Todos
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
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
              {selectedChartProprietario && (
                <div className="flex items-center justify-between bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/40">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Propietario</p>
                    <p className="text-xs font-semibold text-foreground truncate">{selectedChartProprietario}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedChartProprietario('')}
                    className="h-5 w-5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {selectedChartSerie && (
                <div className="flex items-center justify-between bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/40">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Serie Vehículo</p>
                    <p className="text-xs font-semibold text-foreground truncate">{selectedChartSerie}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedChartSerie('')}
                    className="h-5 w-5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {selectedChartRoute && (
                <div className="flex items-center justify-between bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/40">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Ruta</p>
                    <p className="text-xs font-semibold text-foreground truncate">{selectedChartRoute}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedChartRoute('')}
                    className="h-5 w-5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {tipoReclamacion !== 'todos' && (
                <div className="flex items-center justify-between bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/40">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Tipo Reclamo</p>
                    <p className="text-xs font-semibold text-foreground truncate">
                      {tipoReclamacion === 'Otro' && customTipoFilter ? `Otro: ${customTipoFilter}` : tipoReclamacion}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setTipoReclamacion('todos');
                      setCustomTipoFilter('');
                    }}
                    className="h-5 w-5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {selectedChartMonth !== null && (
                <div className="flex items-center justify-between bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/40">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Mes</p>
                    <p className="text-xs font-semibold text-foreground truncate">
                      {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][selectedChartMonth]}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedChartMonth(null)}
                    className="h-5 w-5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {selectedChartStatus && (
                <div className="flex items-center justify-between bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/40">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Estado</p>
                    <p className="text-xs font-semibold text-foreground truncate">{selectedChartStatus}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedChartStatus('')}
                    className="h-5 w-5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {selectedChartCulpabilidad && (
                <div className="flex items-center justify-between bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/40">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Culpabilidad</p>
                    <p className="text-xs font-semibold text-foreground truncate">{selectedChartCulpabilidad}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedChartCulpabilidad('')}
                    className="h-5 w-5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {selectedChartCausaRaiz && (
                <div className="flex items-center justify-between bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/40">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Causa Raíz</p>
                    <p className="text-xs font-semibold text-foreground truncate">{selectedChartCausaRaiz}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedChartCausaRaiz('')}
                    className="h-5 w-5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {selectedChartProveedor && (
                <div className="flex items-center justify-between bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/40">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Taller / Proveedor</p>
                    <p className="text-xs font-semibold text-foreground truncate">{selectedChartProveedor}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedChartProveedor('')}
                    className="h-5 w-5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {selectedChartTipoServicio && (
                <div className="flex items-center justify-between bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/40">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Tipo de Servicio</p>
                    <p className="text-xs font-semibold text-foreground truncate">{selectedChartTipoServicio}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedChartTipoServicio('')}
                    className="h-5 w-5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {selectedChartConcepto && (
                <div className="flex items-center justify-between bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/40">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Concepto Cotización</p>
                    <p className="text-xs font-semibold text-foreground truncate">{selectedChartConcepto}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedChartConcepto('')}
                    className="h-5 w-5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {selectedChartActa && (
                <div className="flex items-center justify-between bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/40">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Acta de Comité</p>
                    <p className="text-xs font-semibold text-foreground truncate">{selectedChartActa}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedChartActa('')}
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
