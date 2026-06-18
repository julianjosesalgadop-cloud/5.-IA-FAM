'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, FileText, Calendar, Filter, RefreshCw } from 'lucide-react';
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
          <div className="flex items-center gap-3">
            <Button onClick={loadData} variant="outline" disabled={loading} size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar Datos
            </Button>
            <Button onClick={handleExportExcel} variant="outline" id="reporte-export-excel" size="sm">
              <FileSpreadsheet className="w-4 h-4 text-green-400 mr-2" />
              Exportar Excel
            </Button>
            <Button onClick={handleExportPDF} variant="outline" id="reporte-export-pdf" size="sm">
              <FileText className="w-4 h-4 text-red-400 mr-2" />
              Exportar PDF Consolidado
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
        <Card className="border-border bg-card p-8 text-center text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-3 text-primary/60" />
          <p className="font-semibold text-foreground text-sm">Filtros aplicados correctamente</p>
          <p className="text-xs mt-1">
            Los datos consolidados han sido filtrados. Use los botones superiores para exportar el reporte consolidado en formato Excel (.xlsx) o PDF (.pdf).
          </p>
        </Card>
      )}
    </div>
  );
}
