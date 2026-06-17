'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Shield,
  User,
  Clock,
  RefreshCw,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Hash,
  Calendar,
  Activity,
  Columns,
  Download,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import type { AuditoriaEntry, Expediente } from '@/types/database';
import { dbService, getMockUser } from '@/lib/services/dbService';
import { toast } from 'sonner';

const ACCION_COLORS: Record<string, string> = {
  CREAR: 'success',
  EDITAR: 'default',
  ELIMINAR: 'destructive',
  ESTADO: 'warning',
  FINANCIERO: 'secondary',
  DOCUMENTO: 'outline',
};

const ACCION_LABELS: Record<string, string> = {
  CREAR: 'Creado',
  EDITAR: 'Editado',
  ELIMINAR: 'Eliminado',
  ESTADO: 'Estado',
  FINANCIERO: 'Financiero',
  DOCUMENTO: 'Documento',
};

const ACCION_OPTIONS = ['CREAR', 'EDITAR', 'ELIMINAR', 'ESTADO', 'FINANCIERO', 'DOCUMENTO'];

// Items per page for pagination
const PAGE_SIZE = 25;

export function AuditoriaView() {
  const [currentUser] = useState(() => getMockUser());
  const [logs, setLogs] = useState<AuditoriaEntry[]>([]);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loading) {
      toast.loading('Cargando registros de auditoría...', { id: 'loading-auditoria' });
    } else {
      toast.dismiss('loading-auditoria');
    }
    return () => {
      toast.dismiss('loading-auditoria');
    };
  }, [loading]);

  // --- Filtros ---
  const [search, setSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterExpediente, setFilterExpediente] = useState('');
  const [filterActa, setFilterActa] = useState('');
  const [filterUsuario, setFilterUsuario] = useState('');
  const [filterAccion, setFilterAccion] = useState('');
  const [filterCampo, setFilterCampo] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  if (currentUser.rol !== 'admin') {
    return (
      <Card className="border-destructive bg-destructive/5 p-6 text-center max-w-4xl">
        <CardContent className="pt-6">
          <h3 className="text-destructive font-bold text-lg font-semibold">Acceso Denegado</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Solo los administradores tienen acceso a los registros de auditoría del sistema.
          </p>
        </CardContent>
      </Card>
    );
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      const [auditData, expData] = await Promise.all([
        dbService.getAuditoria(),
        dbService.getExpedientes(),
      ]);
      setLogs(auditData);
      setExpedientes(expData);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos de auditoría');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Build lookup maps
  const expedienteMap = useMemo(() => {
    const map = new Map<string, Expediente>();
    expedientes.forEach((exp) => map.set(exp.id, exp));
    return map;
  }, [expedientes]);

  // Extract unique values for dropdown filters
  const uniqueUsuarios = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => { if (l.usuario_email) set.add(l.usuario_email); });
    return Array.from(set).sort();
  }, [logs]);

  const uniqueCampos = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => { if (l.campo_modificado) set.add(l.campo_modificado); });
    return Array.from(set).sort();
  }, [logs]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterExpediente) count++;
    if (filterActa) count++;
    if (filterUsuario) count++;
    if (filterAccion) count++;
    if (filterCampo) count++;
    if (filterFechaDesde) count++;
    if (filterFechaHasta) count++;
    return count;
  }, [filterExpediente, filterActa, filterUsuario, filterAccion, filterCampo, filterFechaDesde, filterFechaHasta]);

  // Filtering logic
  const filtered = useMemo(() => {
    return logs.filter((entry) => {
      const term = search.toLowerCase();

      // General search
      if (term) {
        const matchesGeneral =
          entry.usuario_email?.toLowerCase().includes(term) ||
          entry.accion?.toLowerCase().includes(term) ||
          entry.campo_modificado?.toLowerCase().includes(term) ||
          entry.valor_nuevo?.toLowerCase().includes(term) ||
          entry.valor_anterior?.toLowerCase().includes(term) ||
          entry.expediente_id?.toLowerCase().includes(term);
        
        // Also search in the linked expediente's numero_expediente and numero_acta
        const exp = entry.expediente_id ? expedienteMap.get(entry.expediente_id) : null;
        const matchesExpFields =
          exp?.numero_expediente?.toLowerCase().includes(term) ||
          exp?.numero_acta?.toLowerCase().includes(term) ||
          exp?.placa?.toLowerCase().includes(term) ||
          exp?.nombre_conductor?.toLowerCase().includes(term);

        if (!matchesGeneral && !matchesExpFields) return false;
      }

      // Filter: Número de Expediente
      if (filterExpediente) {
        const exp = entry.expediente_id ? expedienteMap.get(entry.expediente_id) : null;
        const numExp = exp?.numero_expediente || '';
        if (!numExp.toLowerCase().includes(filterExpediente.toLowerCase()) &&
            !entry.expediente_id?.toLowerCase().includes(filterExpediente.toLowerCase())) {
          return false;
        }
      }

      // Filter: Número de Acta
      if (filterActa) {
        const exp = entry.expediente_id ? expedienteMap.get(entry.expediente_id) : null;
        const numActa = exp?.numero_acta || '';
        if (!numActa.toLowerCase().includes(filterActa.toLowerCase())) {
          return false;
        }
      }

      // Filter: Usuario
      if (filterUsuario && entry.usuario_email !== filterUsuario) {
        return false;
      }

      // Filter: Tipo de Acción
      if (filterAccion && entry.accion !== filterAccion) {
        return false;
      }

      // Filter: Campo Modificado
      if (filterCampo && entry.campo_modificado !== filterCampo) {
        return false;
      }

      // Filter: Fecha Desde
      if (filterFechaDesde) {
        const entryDate = new Date(entry.created_at);
        const fromDate = new Date(filterFechaDesde);
        if (entryDate < fromDate) return false;
      }

      // Filter: Fecha Hasta
      if (filterFechaHasta) {
        const entryDate = new Date(entry.created_at);
        const toDate = new Date(filterFechaHasta + 'T23:59:59');
        if (entryDate > toDate) return false;
      }

      return true;
    });
  }, [logs, search, filterExpediente, filterActa, filterUsuario, filterAccion, filterCampo, filterFechaDesde, filterFechaHasta, expedienteMap]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterExpediente, filterActa, filterUsuario, filterAccion, filterCampo, filterFechaDesde, filterFechaHasta]);

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setFilterExpediente('');
    setFilterActa('');
    setFilterUsuario('');
    setFilterAccion('');
    setFilterCampo('');
    setFilterFechaDesde('');
    setFilterFechaHasta('');
  }, []);

  const selectStyles = "h-9 rounded-lg bg-background border border-border text-sm text-foreground px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all appearance-none cursor-pointer";
  const inputFilterStyles = "h-9 rounded-lg bg-background border border-border text-sm text-foreground px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all";

  return (
    <div className="space-y-5 max-w-5xl">
      {/* === SEARCH & CONTROLS === */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuario, acción, expediente, placa, valor..."
            className="pl-9 bg-background border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="auditoria-search"
            autoComplete="off"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showAdvancedFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="relative"
            id="auditoria-toggle-filters"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros avanzados
            {activeFilterCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
            {showAdvancedFilters ? (
              <ChevronUp className="w-3.5 h-3.5 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} id="auditoria-refresh">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
        </div>
      </div>

      {/* === ADVANCED FILTERS PANEL === */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <Card className="border-primary/20 bg-gradient-to-br from-card to-secondary/5">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Filtros de Investigación</span>
                  </div>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3 mr-1" />
                      Limpiar filtros ({activeFilterCount})
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* Nº Expediente */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <FileText className="w-3 h-3" />
                      Nº Expediente
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: EXP-001"
                      className={inputFilterStyles}
                      value={filterExpediente}
                      onChange={(e) => setFilterExpediente(e.target.value)}
                      id="auditoria-filter-expediente"
                      autoComplete="off"
                    />
                  </div>

                  {/* Nº Acta */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Hash className="w-3 h-3" />
                      Nº Acta de Comité
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: ACT-2025-01"
                      className={inputFilterStyles}
                      value={filterActa}
                      onChange={(e) => setFilterActa(e.target.value)}
                      id="auditoria-filter-acta"
                      autoComplete="off"
                    />
                  </div>

                  {/* Usuario */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <User className="w-3 h-3" />
                      Usuario
                    </label>
                    <select
                      className={selectStyles}
                      value={filterUsuario}
                      onChange={(e) => setFilterUsuario(e.target.value)}
                      id="auditoria-filter-usuario"
                    >
                      <option value="">Todos los usuarios</option>
                      {uniqueUsuarios.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tipo de Acción */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Activity className="w-3 h-3" />
                      Tipo de Acción
                    </label>
                    <select
                      className={selectStyles}
                      value={filterAccion}
                      onChange={(e) => setFilterAccion(e.target.value)}
                      id="auditoria-filter-accion"
                    >
                      <option value="">Todas las acciones</option>
                      {ACCION_OPTIONS.map((a) => (
                        <option key={a} value={a}>{ACCION_LABELS[a] || a}</option>
                      ))}
                    </select>
                  </div>

                  {/* Campo Modificado */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Columns className="w-3 h-3" />
                      Campo Modificado
                    </label>
                    <select
                      className={selectStyles}
                      value={filterCampo}
                      onChange={(e) => setFilterCampo(e.target.value)}
                      id="auditoria-filter-campo"
                    >
                      <option value="">Todos los campos</option>
                      {uniqueCampos.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fecha Desde */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Desde
                    </label>
                    <input
                      type="date"
                      className={inputFilterStyles}
                      value={filterFechaDesde}
                      onChange={(e) => setFilterFechaDesde(e.target.value)}
                      id="auditoria-filter-desde"
                    />
                  </div>

                  {/* Fecha Hasta */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Hasta
                    </label>
                    <input
                      type="date"
                      className={inputFilterStyles}
                      value={filterFechaHasta}
                      onChange={(e) => setFilterFechaHasta(e.target.value)}
                      id="auditoria-filter-hasta"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === RESULTS SUMMARY === */}
      {!loading && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Mostrando <span className="font-semibold text-foreground">{paginatedItems.length}</span> de{' '}
            <span className="font-semibold text-foreground">{filtered.length}</span> registros
            {filtered.length !== logs.length && (
              <span className="ml-1 text-primary">(filtrados de {logs.length} totales)</span>
            )}
          </span>
          {activeFilterCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/30 text-primary">
              {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} activo{activeFilterCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}

      {/* === TIMELINE === */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
          Cargando log de auditoría...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border bg-card p-12 text-center text-muted-foreground">
          <div className="space-y-2">
            <Shield className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="font-medium">No hay registros que coincidan con los filtros aplicados.</p>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs mt-2">
                <X className="w-3 h-3 mr-1" />
                Limpiar todos los filtros
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          <div className="relative space-y-0">
            <div className="absolute left-6 top-8 bottom-8 w-px bg-border" />
            <AnimatePresence>
              {paginatedItems.map((entry, i) => {
                const exp = entry.expediente_id ? expedienteMap.get(entry.expediente_id) : null;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                    className="relative flex gap-4 pb-4"
                  >
                    <div className="relative flex-shrink-0 w-12 flex items-start justify-center pt-3">
                      <div className="w-3 h-3 rounded-full bg-primary border-2 border-background" />
                    </div>
                    <Card className="flex-1 border-border bg-card hover:bg-secondary/10 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={ACCION_COLORS[entry.accion || ''] as any}>
                                {ACCION_LABELS[entry.accion || ''] || entry.accion}
                              </Badge>
                              {exp && (
                                <span className="text-xs font-mono text-primary font-bold">
                                  {exp.numero_expediente}
                                </span>
                              )}
                              {exp?.numero_acta && (
                                <span className="text-[10px] font-mono text-muted-foreground bg-secondary/30 px-1.5 py-0.5 rounded border border-border/40">
                                  Acta: {exp.numero_acta}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span>{entry.usuario_email || 'Sistema'}</span>
                            </div>
                            {/* Extra expediente context */}
                            {exp && (exp.placa || exp.nombre_conductor) && (
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 mt-0.5">
                                {exp.placa && (
                                  <span className="bg-secondary/20 px-1.5 py-0.5 rounded">
                                    Placa: {exp.placa}
                                  </span>
                                )}
                                {exp.nombre_conductor && (
                                  <span className="bg-secondary/20 px-1.5 py-0.5 rounded">
                                    Conductor: {exp.nombre_conductor}
                                  </span>
                                )}
                              </div>
                            )}
                            {entry.campo_modificado && (
                              <div className="text-xs text-muted-foreground pt-1">
                                Campo modificado: <span className="font-mono text-foreground font-semibold bg-secondary/50 px-1 py-0.5 rounded">{entry.campo_modificado}</span>
                                {entry.valor_anterior && (
                                  <span className="ml-2">
                                    <span className="text-red-400 bg-red-400/5 px-1 py-0.5 rounded line-through border border-red-500/10">{entry.valor_anterior}</span>
                                    <span className="mx-1.5 font-bold">→</span>
                                    <span className="text-green-400 bg-green-400/5 px-1 py-0.5 rounded border border-green-500/10">{entry.valor_nuevo}</span>
                                  </span>
                                )}
                                {!entry.valor_anterior && entry.valor_nuevo && (
                                  <span className="ml-2 text-green-400 bg-green-400/5 px-1 py-0.5 rounded border border-green-500/10">{entry.valor_nuevo}</span>
                                )}
                              </div>
                            )}
                            {!entry.campo_modificado && entry.valor_nuevo && (
                              <p className="text-xs text-foreground bg-secondary/20 p-2 rounded border border-border/40 mt-1 max-w-xl">
                                {entry.valor_nuevo}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap ml-auto">
                            <Clock className="w-3 h-3" />
                            <span className="font-mono">{formatDateTime(entry.created_at)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* === PAGINATION === */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="text-xs"
              >
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, idx) => {
                  let page: number;
                  if (totalPages <= 7) {
                    page = idx + 1;
                  } else if (currentPage <= 4) {
                    page = idx + 1;
                  } else if (currentPage >= totalPages - 3) {
                    page = totalPages - 6 + idx;
                  } else {
                    page = currentPage - 3 + idx;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                        currentPage === page
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="text-xs"
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
