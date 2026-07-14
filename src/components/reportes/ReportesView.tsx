'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, FileText, Calendar, Filter, RefreshCw, Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { formatCOP, formatDate, cn } from '@/lib/utils';
import { TIPOS_RECLAMACION, ESTADOS_EXPEDIENTE, CULPABILIDADES, CAUSAS_RAIZ_DEFAULT } from '@/lib/constants';
import { dbService } from '@/lib/services/dbService';
import type { Expediente } from '@/types/database';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const REPORT_COLUMNS = [
  { label: 'Expediente', key: 'numero_expediente', isNumeric: false },
  { label: 'Fecha Incidente', key: 'fecha_incidente', isNumeric: false },
  { label: 'No. Interno', key: 'numero_interno', isNumeric: false },
  { label: 'Placa', key: 'placa', isNumeric: false },
  { label: 'Tipo Servicio', key: 'tipo_servicio', isNumeric: false },
  { label: 'Propietario', key: 'propietario', isNumeric: false },
  { label: 'Tipo Reclamación', key: 'tipo_reclamacion', isNumeric: false },
  { label: 'Ciudad Origen', key: 'ciudad_origen', isNumeric: false },
  { label: 'Ciudad Destino', key: 'ciudad_destino', isNumeric: false },
  { label: 'Concepto', key: 'concepto', isNumeric: false },
  { label: 'V. Cotización', key: 'valor_cotizacion', isNumeric: true },
  { label: 'V. Negociado', key: 'valor_negociado', isNumeric: true },
  { label: 'Deducible %', key: 'porcentaje_deducible', isNumeric: true },
  { label: 'V. Deducible', key: 'valor_deducible', isNumeric: true },
  { label: 'V. a Pagar', key: 'valor_a_pagar', isNumeric: true },
  { label: 'V. Salvamento', key: 'valor_salvamento', isNumeric: true },
  { label: 'V. Aprobado', key: 'valor_final_aprobado', isNumeric: true },
  { label: 'Conductor', key: 'nombre_conductor', isNumeric: false },
  { label: 'Cédula Conductor', key: 'id_conductor', isNumeric: false },
  { label: 'Celular Conductor', key: 'celular_conductor', isNumeric: false },
  { label: 'Culpabilidad', key: 'culpabilidad', isNumeric: false },
  { label: 'Dto. Conductor', key: 'valor_descuento_conductor', isNumeric: true },
  { label: 'Mem. Descuento', key: 'memorando_descuento', isNumeric: false },
  { label: 'Recobro Vehículo', key: 'valor_recobro_vehiculo', isNumeric: true },
  { label: 'Recobro Vehículo %', key: 'porcentaje_recobro_vehiculo', isNumeric: true },
  { label: 'Recobro Abogado', key: 'valor_recobro_abogado', isNumeric: true },
  { label: 'Recobro Abogado %', key: 'porcentaje_recobro_abogado', isNumeric: true },
  { label: 'Recobro Empresa', key: 'valor_recobro_empresa', isNumeric: true },
  { label: 'Recobro Empresa %', key: 'porcentaje_recobro_empresa', isNumeric: true },
  { label: 'Fecha Comité', key: 'fecha_comite', isNumeric: false },
  { label: 'Acta', key: 'numero_acta', isNumeric: false },
  { label: 'Causa Raíz', key: 'causa_raiz', isNumeric: false },
  { label: 'Obs. Comité', key: 'observaciones_comite', isNumeric: false },
  { label: 'Autorizado Por', key: 'autorizado_por', isNumeric: false },
  { label: 'Cargo', key: 'cargo_autorizador', isNumeric: false },
  { label: 'Fecha Aut.', key: 'fecha_autorizacion', isNumeric: false },
  { label: 'Mem. Pago', key: 'memorando_pago_nombre', isNumeric: false },
  { label: 'Estado', key: 'estado', isNumeric: false },
  { label: 'Obs. Rechazo', key: 'observacion_rechazo', isNumeric: false },
] as const;

export function ReportesView() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loading) {
      toast.loading('Cargando reportes...', { id: 'loading-reportes' });
    } else {
      toast.dismiss('loading-reportes');
    }
    return () => {
      toast.dismiss('loading-reportes');
    };
  }, [loading]);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [tipoReclamacionOtroFilter, setTipoReclamacionOtroFilter] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [searchPreview, setSearchPreview] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // New filters
  const [culpabilidadFilter, setCulpabilidadFilter] = useState('');
  const [causaRaizFilter, setCausaRaizFilter] = useState('');
  const [tipoServicioFilter, setTipoServicioFilter] = useState('');
  const [placaFilter, setPlacaFilter] = useState('');
  const [internoFilter, setInternoFilter] = useState('');
  const [propietarioFilter, setPropietarioFilter] = useState('');
  const [conductorFilter, setConductorFilter] = useState('');
  const [valorMinFilter, setValorMinFilter] = useState('');
  const [valorMaxFilter, setValorMaxFilter] = useState('');
  const [actaFilter, setActaFilter] = useState('');

  const existingActas = React.useMemo(() => {
    const actasSet = new Set<string>();
    expedientes.forEach((e) => {
      if (e.numero_acta && e.numero_acta.trim()) {
        actasSet.add(e.numero_acta.trim().toUpperCase());
      }
    });
    return Array.from(actasSet).sort();
  }, [expedientes]);

  // Sorting states
  const [sortField, setSortField] = useState<string>('numero_expediente');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setCurrentPage(1);
  }, [
    fechaDesde, fechaHasta, tipoFiltro, tipoReclamacionOtroFilter, estadoFiltro, searchPreview,
    culpabilidadFilter, causaRaizFilter, tipoServicioFilter,
    placaFilter, internoFilter, propietarioFilter, conductorFilter,
    valorMinFilter, valorMaxFilter, actaFilter
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await dbService.getExpedientes();
      setExpedientes(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos para reportes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleClearFilters = () => {
    setFechaDesde('');
    setFechaHasta('');
    setTipoFiltro('');
    setTipoReclamacionOtroFilter('');
    setEstadoFiltro('');
    setCulpabilidadFilter('');
    setCausaRaizFilter('');
    setTipoServicioFilter('');
    setPlacaFilter('');
    setInternoFilter('');
    setPropietarioFilter('');
    setConductorFilter('');
    setValorMinFilter('');
    setValorMaxFilter('');
    setActaFilter('');
    setSearchPreview('');
    toast.success('Filtros restablecidos');
  };

  const filtered = expedientes.filter((e) => {
    const dIncidente = e.fecha_incidente ? new Date(e.fecha_incidente + 'T00:00:00') : null;
    const dDesde = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null;
    const dHasta = fechaHasta ? new Date(fechaHasta + 'T00:00:00') : null;

    if (dDesde && dIncidente && dIncidente < dDesde) return false;
    if (dHasta && dIncidente && dIncidente > dHasta) return false;
    
    if (tipoFiltro) {
      if (tipoFiltro === 'Otro') {
        const standardTypes = ['Siniestro', 'Vidrios', 'Carrocería', 'Repuestos', 'Pérdida parcial', 'Afectación por orden público'];
        const isCustom = !standardTypes.includes(e.tipo_reclamacion || '');
        if (!isCustom) return false;
        if (tipoReclamacionOtroFilter && !e.tipo_reclamacion?.toLowerCase().includes(tipoReclamacionOtroFilter.toLowerCase())) {
          return false;
        }
      } else {
        if (e.tipo_reclamacion !== tipoFiltro) return false;
      }
    }
    
    if (estadoFiltro && e.estado !== estadoFiltro) return false;

    // Apply new filters
    if (culpabilidadFilter && e.culpabilidad !== culpabilidadFilter) return false;
    if (causaRaizFilter && e.causa_raiz !== causaRaizFilter) return false;
    if (tipoServicioFilter && e.tipo_servicio !== tipoServicioFilter) return false;
    if (placaFilter && !e.placa?.toLowerCase().includes(placaFilter.toLowerCase())) return false;
    if (internoFilter && !e.numero_interno?.toLowerCase().includes(internoFilter.toLowerCase())) return false;
    if (propietarioFilter && !e.propietario?.toLowerCase().includes(propietarioFilter.toLowerCase())) return false;
    if (conductorFilter && !e.nombre_conductor?.toLowerCase().includes(conductorFilter.toLowerCase())) return false;
    if (actaFilter && !e.numero_acta?.toLowerCase().includes(actaFilter.toLowerCase())) return false;
    
    if (valorMinFilter && (e.valor_final_aprobado === null || e.valor_final_aprobado === undefined || e.valor_final_aprobado < Number(valorMinFilter))) return false;
    if (valorMaxFilter && (e.valor_final_aprobado === null || e.valor_final_aprobado === undefined || e.valor_final_aprobado > Number(valorMaxFilter))) return false;

    return true;
  });

  const previewFiltered = React.useMemo(() => {
    return filtered.filter((e) => {
      if (!searchPreview) return true;
      const s = searchPreview.toLowerCase();
      return (
        e.numero_expediente?.toLowerCase().includes(s) ||
        e.placa?.toLowerCase().includes(s) ||
        e.numero_interno?.toLowerCase().includes(s) ||
        e.propietario?.toLowerCase().includes(s) ||
        e.nombre_conductor?.toLowerCase().includes(s) ||
        e.tipo_reclamacion?.toLowerCase().includes(s) ||
        e.numero_acta?.toLowerCase().includes(s) ||
        e.estado?.toLowerCase().includes(s)
      );
    });
  }, [filtered, searchPreview]);

  const sortedData = React.useMemo(() => {
    return [...previewFiltered].sort((a, b) => {
      let valA = a[sortField as keyof Expediente];
      let valB = b[sortField as keyof Expediente];

      if (valA === null || valA === undefined) return sortOrder === 'asc' ? 1 : -1;
      if (valB === null || valB === undefined) return sortOrder === 'asc' ? -1 : 1;

      // number sorting
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      // string sorting
      const strA = String(valA);
      const strB = String(valB);

      return sortOrder === 'asc'
        ? strA.localeCompare(strB, 'es', { sensitivity: 'base' })
        : strB.localeCompare(strA, 'es', { sensitivity: 'base' });
    });
  }, [previewFiltered, sortField, sortOrder]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(previewFiltered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = React.useMemo(() => {
    return sortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedData, startIndex]);

  // Calculate top plates from filtered list
  const placaGroups: Record<string, { total: number; valor: number }> = {};
  filtered.forEach((e) => {
    if (!e.placa) return;
    if (!placaGroups[e.placa]) placaGroups[e.placa] = { total: 0, valor: 0 };
    placaGroups[e.placa].total += 1;
    placaGroups[e.placa].valor += e.valor_final_aprobado || 0;
  });

  const topPlacas = Object.entries(placaGroups)
    .map(([placa, data]) => ({ placa, ...data }))
    .sort((a, b) => b.total - a.total || b.valor - a.valor)
    .slice(0, 5);

  // Calculate top drivers from filtered list
  const condGroups: Record<string, { total: number; valor: number }> = {};
  filtered.forEach((e) => {
    if (!e.nombre_conductor) return;
    const name = e.nombre_conductor.trim();
    if (!condGroups[name]) condGroups[name] = { total: 0, valor: 0 };
    condGroups[name].total += 1;
    condGroups[name].valor += e.valor_final_aprobado || 0;
  });

  const topConductores = Object.entries(condGroups)
    .map(([nombre, data]) => ({ nombre, ...data }))
    .sort((a, b) => b.total - a.total || b.valor - a.valor)
    .slice(0, 5);

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      toast.warning('No hay datos filtrados para exportar');
      return;
    }

    try {
      const wsData = filtered.map((e) => ({
        'No. Expediente': e.numero_expediente,
        'Fecha Incidente': e.fecha_incidente,
        'No. Interno': e.numero_interno || '',
        'Placa': e.placa,
        'Tipo de Servicio': e.tipo_servicio || '',
        'Propietario': e.propietario,
        'Tipo Reclamación': e.tipo_reclamacion,
        'Ciudad Origen': e.ciudad_origen || '',
        'Ciudad Destino': e.ciudad_destino || '',
        'Concepto': (() => {
          if (e.cotizaciones && e.cotizaciones.length > 0) {
            const selectedCots = e.cotizaciones.filter((c) => c.seleccionada);
            const activeCots = selectedCots.length > 0 ? selectedCots : [e.cotizaciones[0]];
            const concepts = activeCots
              .map((c) => {
                if (!c) return '';
                let name = (c.concepto || '').trim();
                if (name.toUpperCase() === 'OTROS' && c.concepto_otro) {
                  name = c.concepto_otro.trim();
                }
                return name;
              })
              .filter(Boolean);
            if (concepts.length > 0) {
              return concepts.join(', ');
            }
          }
          return e.concepto || '';
        })(),
        'Valor Cotización': e.valor_cotizacion || 0,
        'Valor Negociado': e.valor_negociado || 0,
        'Deducible %': e.porcentaje_deducible ? `${e.porcentaje_deducible}%` : '0%',
        'Valor Deducible': e.valor_deducible || 0,
        'Valor a Pagar': e.valor_a_pagar || 0,
        'Valor Salvamento': e.valor_salvamento || 0,
        'Valor Aprobado': e.valor_final_aprobado || 0,
        'Conductor': e.nombre_conductor || '',
        'Cédula Conductor': e.id_conductor || '',
        'Celular Conductor': e.celular_conductor || '',
        'Culpabilidad': e.culpabilidad || 'Sin definir',
        'Descuento Conductor': e.valor_descuento_conductor || 0,
        'Memorando Descuento': e.memorando_descuento || '',
        'Recobro Vehículo': e.valor_recobro_vehiculo || 0,
        'Recobro Vehículo %': e.porcentaje_recobro_vehiculo ? `${e.porcentaje_recobro_vehiculo}%` : '0%',
        'Recobro Abogado': e.valor_recobro_abogado || 0,
        'Recobro Abogado %': e.porcentaje_recobro_abogado ? `${e.porcentaje_recobro_abogado}%` : '0%',
        'Recobro Empresa': e.valor_recobro_empresa || 0,
        'Recobro Empresa %': e.porcentaje_recobro_empresa ? `${e.porcentaje_recobro_empresa}%` : '0%',
        'Fecha Comité': e.fecha_comite || '',
        'Número Acta': e.numero_acta || '',
        'Causa Raíz': e.causa_raiz || '',
        'Observaciones Comité': e.observaciones_comite || '',
        'Autorizado Por': e.autorizado_por || '',
        'Cargo': e.cargo_autorizador || '',
        'Fecha Autorización': e.fecha_autorizacion || '',
        'Memorando Pago': e.memorando_pago_nombre || '',
        'Estado': e.estado,
        'Observación de Rechazo': e.observacion_rechazo || '',
      }));

      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte Filtrado');
      XLSX.writeFile(wb, `SIGFAM_Reporte_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Reporte Excel exportado');
    } catch (err) {
      console.error(err);
      toast.error('Error al exportar a Excel');
    }
  };

  const loadLogoBase64 = (): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = '/logo.png';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
    });
  };

  const handleExportPDF = async () => {
    if (filtered.length === 0) {
      toast.warning('No hay datos filtrados para exportar');
      return;
    }

    toast.info('Generando reporte consolidado...');
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        compress: true,
      });
      const logoB64 = await loadLogoBase64();

      // Metricas title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(27, 54, 93);
      doc.text('RESUMEN DE MÉTRICAS FILTRADAS', 12, 42);

      const totalAprobado = filtered.reduce((s, e) => s + (e.valor_final_aprobado || 0), 0);
      const totalCasos = filtered.length;

      autoTable(doc, {
        startY: 46,
        theme: 'plain',
        body: [
          ['Total Expedientes:', `${totalCasos} casos`, 'Valor Aprobado Total:', formatCOP(totalAprobado)],
          ['Filtro Categoria:', tipoFiltro || 'Todas', 'Filtro Estado:', estadoFiltro || 'Todos'],
          ['Rango de fechas:', `${fechaDesde || 'Inicio'} a ${fechaHasta || 'Fin'}`, '', ''],
        ],
        styles: { fontSize: 9 },
        margin: { top: 38, bottom: 22 },
      });

      // Detalle de expedientes title
      doc.setFont('Helvetica', 'bold');
      doc.text('LISTADO DE EXPEDIENTES', 12, (doc as any).lastAutoTable.finalY + 10);

      const tableData = filtered.map((e) => [
        e.numero_expediente,
        formatDate(e.fecha_incidente),
        e.numero_interno || '—',
        e.placa,
        e.propietario,
        e.tipo_reclamacion,
        e.nombre_conductor || '—',
        e.numero_acta || '—',
        formatCOP(e.valor_final_aprobado),
        e.estado === 'Rechazado' && e.observacion_rechazo ? `Rechazado (${e.observacion_rechazo})` : e.estado,
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 14,
        head: [['Expediente', 'Fecha', 'Interno', 'Placa', 'Propietario', 'Tipo', 'Conductor', 'Acta', 'V. Aprobado', 'Estado']],
        body: tableData,
        headStyles: { fillColor: [27, 54, 93], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        margin: { top: 38, bottom: 22 },
      });

      // Pagination/Footer text + Header repetition on all pages
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Header logo
        if (logoB64) {
          doc.addImage(logoB64, 'JPEG', 12, 10, 20, 20);
        }

        // Header titles
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(27, 54, 93);
        doc.text('FLOTA SUGAMUXI S.A.', 36, 16);
        doc.setFontSize(10);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('SIGFAM — Sistema Integrado de Gestión del Fondo de Auxilio Mutuo — Nit. 891.800.075-8', 36, 21);
        doc.text(`Reporte Consolidado — Generado el ${new Date().toLocaleDateString()}`, 36, 26);

        // Orange line separator
        doc.setDrawColor(217, 91, 42);
        doc.setLineWidth(0.8);
        doc.line(12, 33, 285, 33);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Página ${i} de ${pageCount} — Reportes SIGFAM — Flota Sugamuxi S.A.`, 12, 198);
      }

      doc.save(`SIGFAM_Consolidado_Reporte.pdf`);
      toast.success('Reporte consolidado PDF descargado');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar el reporte PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Filter className="w-4 h-4 text-primary" />
            Filtros del Reporte
          </CardTitle>
          <CardDescription>Define el rango y criterios para el análisis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-5">
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium text-xs">Fecha Desde</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input type="date" className="pl-8 bg-background border-border text-xs" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} id="reporte-fecha-desde" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium text-xs">Fecha Hasta</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input type="date" className="pl-8 bg-background border-border text-xs" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} id="reporte-fecha-hasta" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium text-xs">Tipo de Reclamación</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={tipoFiltro}
                onChange={(e) => {
                  setTipoFiltro(e.target.value);
                  if (e.target.value !== 'Otro') {
                    setTipoReclamacionOtroFilter('');
                  }
                }}
                id="reporte-tipo-filter"
              >
                <option value="">Todos</option>
                {TIPOS_RECLAMACION.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {tipoFiltro === 'Otro' && (
              <div className="space-y-1.5">
                <Label className="text-foreground font-medium text-xs">¿Cuál tipo de reclamación?</Label>
                <Input
                  placeholder="Especificar tipo..."
                  className="bg-background border-border text-xs h-10"
                  value={tipoReclamacionOtroFilter}
                  onChange={(e) => setTipoReclamacionOtroFilter(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium text-xs">Estado</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                id="reporte-estado-filter"
              >
                <option value="">Todos</option>
                {ESTADOS_EXPEDIENTE.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            {/* New responsive filters */}
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium text-xs">Placa</Label>
              <Input placeholder="Buscar placa..." className="bg-background border-border text-xs h-10" value={placaFilter} onChange={(e) => setPlacaFilter(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium text-xs">No. Interno</Label>
              <Input placeholder="Buscar interno..." className="bg-background border-border text-xs h-10" value={internoFilter} onChange={(e) => setInternoFilter(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium text-xs">Tipo de Servicio</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={tipoServicioFilter}
                onChange={(e) => setTipoServicioFilter(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="Intermunicipal">Intermunicipal</option>
                <option value="Especial">Especial</option>
                <option value="Urbano">Urbano</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium text-xs">Conductor</Label>
              <Input placeholder="Nombre conductor..." className="bg-background border-border text-xs h-10" value={conductorFilter} onChange={(e) => setConductorFilter(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium text-xs">Propietario</Label>
              <Input placeholder="Nombre propietario..." className="bg-background border-border text-xs h-10" value={propietarioFilter} onChange={(e) => setPropietarioFilter(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium text-xs">Culpabilidad</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={culpabilidadFilter}
                onChange={(e) => setCulpabilidadFilter(e.target.value)}
              >
                <option value="">Todos</option>
                {CULPABILIDADES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium text-xs">Causa Raíz</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={causaRaizFilter}
                onChange={(e) => setCausaRaizFilter(e.target.value)}
              >
                <option value="">Todas</option>
                {CAUSAS_RAIZ_DEFAULT.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium text-xs">No. de Acta</Label>
              <Input
                placeholder="Buscar o seleccionar acta..."
                className="bg-background border-border text-xs h-10"
                value={actaFilter}
                onChange={(e) => setActaFilter(e.target.value)}
                list="reportes-actas-list"
              />
              <datalist id="reportes-actas-list">
                {existingActas.map((acta) => (
                  <option key={acta} value={acta} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-foreground font-medium text-[11px] truncate block">Val. Aprobado Mín</Label>
                <Input type="number" placeholder="Mín" className="bg-background border-border text-xs h-10" value={valorMinFilter} onChange={(e) => setValorMinFilter(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground font-medium text-[11px] truncate block">Val. Aprobado Máx</Label>
                <Input type="number" placeholder="Máx" className="bg-background border-border text-xs h-10" value={valorMaxFilter} onChange={(e) => setValorMaxFilter(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={loadData} variant="outline" disabled={loading} size="sm" className="h-9 text-xs">
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar Datos</span>
              <span className="sm:hidden">Actualizar</span>
            </Button>
            <Button onClick={handleExportExcel} variant="outline" id="reporte-export-excel" size="sm" className="h-9 text-xs">
              <FileSpreadsheet className="w-4 h-4 text-green-400 mr-1.5" />
              <span className="hidden sm:inline">Exportar Excel</span>
              <span className="sm:hidden">Excel</span>
            </Button>
            <Button onClick={handleExportPDF} variant="outline" id="reporte-export-pdf" size="sm" className="h-9 text-xs">
              <FileText className="w-4 h-4 text-red-400 mr-1.5" />
              <span className="hidden sm:inline">Exportar PDF Consolidado</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button onClick={handleClearFilters} variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground hover:text-foreground">
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
          Procesando datos y agrupaciones...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border bg-card p-12 text-center text-muted-foreground">
          No hay expedientes registrados para los filtros seleccionados.
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 gap-4 flex-wrap sm:flex-nowrap border-b border-border bg-secondary/10">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Previsualización del Reporte</CardTitle>
              <CardDescription className="text-xs">
                Se generarán <span className="font-semibold text-foreground">{filtered.length}</span> registros en el reporte final.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en la previsualización..."
                className="pl-9 h-8 bg-background border-border text-xs"
                value={searchPreview}
                onChange={(e) => setSearchPreview(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[4200px] text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/5 font-semibold text-muted-foreground uppercase tracking-wider text-left">
                    {REPORT_COLUMNS.map((col) => {
                      const isSortedByThis = sortField === col.key;
                      return (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className={cn(
                            "px-4 py-3 cursor-pointer select-none hover:bg-secondary/40 transition-colors",
                            col.isNumeric ? "text-right" : "text-left"
                          )}
                        >
                          <div className={cn(
                            "flex items-center gap-1.5",
                            col.isNumeric ? "justify-end" : "justify-start"
                          )}>
                            <span>{col.label}</span>
                            {isSortedByThis ? (
                              sortOrder === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-primary" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-primary" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 opacity-30 hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={REPORT_COLUMNS.length} className="py-8 text-center text-muted-foreground">
                        No se encontraron registros que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((e, idx) => (
                      <tr key={e.id || idx} className="hover:bg-secondary/20 transition-colors">
                        {REPORT_COLUMNS.map((col) => {
                          const val = e[col.key as keyof Expediente];
                          let content: React.ReactNode = String(val ?? '—');
                          
                          if (col.key === 'numero_expediente') {
                            content = <span className="font-mono font-semibold text-primary">{String(val)}</span>;
                          } else if (col.key === 'fecha_incidente' || col.key === 'fecha_comite' || col.key === 'fecha_autorizacion') {
                            content = formatDate(val as string);
                          } else if (col.isNumeric) {
                            content = formatCOP(val as number);
                          } else if (col.key === 'concepto') {
                            const selectedCots = e.cotizaciones?.filter((c) => c.seleccionada) || [];
                            const activeCots = selectedCots.length > 0 ? selectedCots : (e.cotizaciones?.[0] ? [e.cotizaciones[0]] : []);
                            const concepts = activeCots
                              .map((c) => {
                                if (!c) return '';
                                let name = (c.concepto || '').trim();
                                if (name.toUpperCase() === 'OTROS' && c.concepto_otro) {
                                  name = c.concepto_otro.trim();
                                }
                                return name;
                              })
                              .filter(Boolean);
                            const resolvedConcept = concepts.length > 0 ? concepts.join(', ') : (e.concepto || '—');
                            content = <span className="truncate max-w-[150px] inline-block" title={resolvedConcept}>{resolvedConcept}</span>;
                          } else if (col.key === 'tipo_reclamacion') {
                            content = (
                              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
                                {String(val)}
                              </span>
                            );
                          } else if (col.key === 'estado') {
                            content = (
                              <div className="flex flex-col">
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium w-fit ${
                                  val === 'Aprobado'
                                    ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                    : val === 'Rechazado'
                                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                    : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                                }`}>
                                  {String(val)}
                                </span>
                                {val === 'Rechazado' && e.observacion_rechazo && (
                                  <span className="text-[9px] text-red-500 mt-0.5 max-w-[120px] truncate" title={e.observacion_rechazo}>
                                    {e.observacion_rechazo}
                                  </span>
                                )}
                              </div>
                            );
                          } else if (col.key === 'observacion_rechazo') {
                            content = val ? <span className="truncate max-w-[150px] inline-block text-red-500 font-medium animate-pulse-slow" title={String(val)}>{String(val)}</span> : '—';
                          } else if (col.key === 'culpabilidad') {
                            content = val ? (
                              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-500/10 text-slate-400">
                                {String(val)}
                              </span>
                            ) : '—';
                          } else if (col.key === 'numero_interno') {
                            content = <span className="font-semibold text-foreground">{String(val || '—')}</span>;
                          } else if (col.key === 'placa') {
                            content = <span className="font-mono text-muted-foreground">{String(val || '—')}</span>;
                          } else if (col.key === 'propietario' || col.key === 'nombre_conductor') {
                            content = <span className="truncate max-w-[120px] inline-block" title={String(val || '')}>{String(val || '—')}</span>;
                          } else if (col.key === 'observaciones_comite') {
                            content = <span className="truncate max-w-[150px] inline-block" title={String(val || '')}>{String(val || '—')}</span>;
                          }

                          return (
                            <td 
                              key={col.key} 
                              className={cn(
                                "px-4 py-2.5 text-muted-foreground",
                                col.isNumeric ? "text-right" : "text-left"
                              )}
                            >
                              {content}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/5">
                <p className="text-xs text-muted-foreground">
                  Mostrando <span className="font-semibold text-foreground">{startIndex + 1}</span> a{' '}
                  <span className="font-semibold text-foreground">
                    {Math.min(startIndex + ITEMS_PER_PAGE, previewFiltered.length)}
                  </span>{' '}
                  de <span className="font-semibold text-foreground">{previewFiltered.length}</span> registros
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-2">
                    Pág. {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
