'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, FileText, Calendar, Filter, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { formatCOP, formatDate } from '@/lib/utils';
import { TIPOS_RECLAMACION, ESTADOS_EXPEDIENTE } from '@/lib/constants';
import { dbService } from '@/lib/services/dbService';
import type { Expediente } from '@/types/database';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [searchPreview, setSearchPreview] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [fechaDesde, fechaHasta, tipoFiltro, estadoFiltro, searchPreview]);

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

  const filtered = expedientes.filter((e) => {
    const dIncidente = e.fecha_incidente ? new Date(e.fecha_incidente + 'T00:00:00') : null;
    const dDesde = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null;
    const dHasta = fechaHasta ? new Date(fechaHasta + 'T00:00:00') : null;

    if (dDesde && dIncidente && dIncidente < dDesde) return false;
    if (dHasta && dIncidente && dIncidente > dHasta) return false;
    if (tipoFiltro && e.tipo_reclamacion !== tipoFiltro) return false;
    if (estadoFiltro && e.estado !== estadoFiltro) return false;
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
        e.estado?.toLowerCase().includes(s)
      );
    });
  }, [filtered, searchPreview]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(previewFiltered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = React.useMemo(() => {
    return previewFiltered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [previewFiltered, startIndex]);

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
        'Placa': e.placa,
        'No. Interno': e.numero_interno || '',
        'Propietario': e.propietario,
        'Tipo Reclamación': e.tipo_reclamacion,
        'Ciudad Origen': e.ciudad_origen || '',
        'Ciudad Destino': e.ciudad_destino || '',
        'Concepto': e.concepto || '',
        'Valor Cotización': e.valor_cotizacion || 0,
        'Valor Negociado': e.valor_negociado || 0,
        'Deducible %': e.porcentaje_deducible ? `${e.porcentaje_deducible}%` : '0%',
        'Valor Deducible': e.valor_deducible || 0,
        'Valor a Pagar': e.valor_a_pagar || 0,
        'Valor Salvamento': e.valor_salvamento || 0,
        'Valor Aprobado': e.valor_final_aprobado || 0,
        'Conductor': e.nombre_conductor || '',
        'Cédula Conductor': e.id_conductor || '',
        'Culpabilidad': e.culpabilidad || 'Sin definir',
        'Causa Raíz': e.causa_raiz || '',
        'Estado': e.estado,
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
        margin: { top: 38 },
      });

      // Detalle de expedientes title
      doc.setFont('Helvetica', 'bold');
      doc.text('LISTADO DE EXPEDIENTES', 12, (doc as any).lastAutoTable.finalY + 10);

      const tableData = filtered.map((e) => [
        e.numero_expediente,
        formatDate(e.fecha_incidente),
        e.placa,
        e.propietario,
        e.tipo_reclamacion,
        formatCOP(e.valor_final_aprobado),
        e.estado,
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 14,
        head: [['Expediente', 'Fecha', 'Placa', 'Propietario', 'Tipo', 'V. Aprobado', 'Estado']],
        body: tableData,
        headStyles: { fillColor: [27, 54, 93], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { top: 38 },
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
        doc.text('SIGFAM — Sistema Integrado de Gestión del Fondo de Auxilio Mutuo — Nit. 891.800.201-1', 36, 21);
        doc.text(`Reporte Consolidado — Generado el ${new Date().toLocaleDateString()}`, 36, 26);

        // Orange line separator
        doc.setDrawColor(217, 91, 42);
        doc.setLineWidth(0.8);
        doc.line(12, 33, 198, 33);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Página ${i} de ${pageCount} — Reportes SIGFAM — Flota Sugamuxi S.A.`, 12, 285);
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium">Fecha Desde</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input type="date" className="pl-8 bg-background border-border" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} id="reporte-fecha-desde" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium">Fecha Hasta</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input type="date" className="pl-8 bg-background border-border" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} id="reporte-fecha-hasta" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium">Tipo de Reclamación</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                id="reporte-tipo-filter"
              >
                <option value="">Todos</option>
                {TIPOS_RECLAMACION.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium">Estado</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                id="reporte-estado-filter"
              >
                <option value="">Todos</option>
                {ESTADOS_EXPEDIENTE.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
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
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Results info */}
      <p className="text-sm text-muted-foreground">
        Registros que coinciden con los filtros: <span className="font-semibold text-foreground">{filtered.length}</span>
      </p>

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
              <table className="w-full min-w-[800px] text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/5 font-semibold text-muted-foreground uppercase tracking-wider text-left">
                    <th className="px-4 py-3">Expediente</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Interno (Placa)</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3 text-right">V. Aprobado</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Propietario</th>
                    <th className="px-4 py-3">Conductor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No se encontraron registros que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((e, idx) => (
                      <tr key={e.id || idx} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-2.5 font-mono font-semibold text-primary">{e.numero_expediente}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{formatDate(e.fecha_incidente)}</td>
                        <td className="px-4 py-2.5 font-semibold text-foreground">
                          {e.numero_interno ? `${e.numero_interno} (${e.placa})` : e.placa}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
                            {e.tipo_reclamacion}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-foreground">{formatCOP(e.valor_final_aprobado)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            e.estado === 'Aprobado'
                              ? 'bg-green-500/15 text-green-400 border-green-500/30'
                              : e.estado === 'Rechazado'
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                          }`}>
                            {e.estado}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 truncate max-w-[120px] text-muted-foreground">{e.propietario}</td>
                        <td className="px-4 py-2.5 truncate max-w-[120px] text-muted-foreground">{e.nombre_conductor || '—'}</td>
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
