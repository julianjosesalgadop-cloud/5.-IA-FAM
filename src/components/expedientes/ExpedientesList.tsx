'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Download, FileText, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { formatCOP, formatDate, getEstadoBadgeColor, getTipoReclamacionColor } from '@/lib/utils';
import type { Expediente } from '@/types/database';
import { ESTADOS_EXPEDIENTE, TIPOS_RECLAMACION } from '@/lib/constants';
import { dbService } from '@/lib/services/dbService';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLUMNS = [
  { label: 'Expediente', key: 'numero_expediente' },
  { label: 'Acta', key: 'numero_acta' },
  { label: 'Fecha', key: 'fecha_incidente' },
  { label: 'Interno/Placa', key: 'numero_interno' },
  { label: 'Tipo', key: 'tipo_reclamacion' },
  { label: 'Valor Aprobado', key: 'valor_final_aprobado' },
  { label: 'Estado', key: 'estado' },
  { label: 'Propietario', key: 'propietario' },
  { label: 'Conductor', key: 'nombre_conductor' },
  { label: 'Culpabilidad', key: 'culpabilidad' },
] as const;

export function ExpedientesList() {
  const router = useRouter();
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loading) {
      toast.loading('Cargando expedientes...', { id: 'loading-expedientes-list' });
    } else {
      toast.dismiss('loading-expedientes-list');
    }
    return () => {
      toast.dismiss('loading-expedientes-list');
    };
  }, [loading]);

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const [sortField, setSortField] = useState<string>('numero_expediente');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [presetRange, setPresetRange] = useState('todo');

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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const fetchExpedientes = async () => {
    setLoading(true);
    try {
      const data = await dbService.getExpedientes();
      setExpedientes(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar los expedientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpedientes();
  }, []);

  const handleExportExcel = () => {
    if (sorted.length === 0) {
      toast.warning('No hay expedientes para exportar');
      return;
    }

    try {
      const wsData = sorted.map((e) => ({
        'No. Expediente': e.numero_expediente,
        'Acta': e.numero_acta ? e.numero_acta.replace(/[^0-9]/g, '') : '',
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
        'Celular Conductor': e.celular_conductor || '',
        'Culpabilidad': e.culpabilidad || 'Sin definir',
        'Descuento Conductor': e.valor_descuento_conductor || 0,
        'Memo Descuento': e.memorando_descuento || '',
        'Recobro Vehículo': e.valor_recobro_vehiculo || 0,
        'Recobro Abogado': e.valor_recobro_abogado || 0,
        'Recobro Empresa': e.valor_recobro_empresa || 0,
        'Causa Raíz': e.causa_raiz || '',
        'Fecha Comité': e.fecha_comite || '',
        'Estado': e.estado,
        'Creado el': formatDate(e.created_at),
      }));

      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Expedientes SIGFAM');
      XLSX.writeFile(wb, `SIGFAM_Expedientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Reporte Excel generado correctamente');
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
    if (sorted.length === 0) {
      toast.warning('No hay expedientes para exportar');
      return;
    }

    toast.info('Generando reporte PDF...');
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
      const logoB64 = await loadLogoBase64();

      // Metricas title (will be on page 1)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(27, 54, 93);
      doc.text('RESUMEN DE EXPEDIENTES', 12, 42);

      const totalAprobado = sorted.reduce((s, e) => s + (e.valor_final_aprobado || 0), 0);
      const totalCasos = sorted.length;

      autoTable(doc, {
        startY: 46,
        theme: 'plain',
        body: [
          ['Total Expedientes:', `${totalCasos} casos`, 'Valor Aprobado Total:', formatCOP(totalAprobado)],
          ['Filtro Estado:', estadoFilter || 'Todos', 'Filtro Tipo:', tipoFilter || 'Todos'],
          ['Rango de fechas:', `${fechaInicio || 'Inicio'} a ${fechaFin || 'Fin'}`, '', ''],
        ],
        styles: { fontSize: 9 },
        margin: { top: 38 },
      });

      // Detalle de expedientes title (will be on page 1)
      doc.setFont('Helvetica', 'bold');
      doc.text('DETALLE DE EXPEDIENTES REGISTRADOS', 12, (doc as any).lastAutoTable.finalY + 8);

      const tableData = sorted.map((e) => [
        e.numero_expediente,
        e.numero_acta ? e.numero_acta.replace(/[^0-9]/g, '') : '—',
        formatDate(e.fecha_incidente),
        e.numero_interno ? `${e.numero_interno} (${e.placa})` : e.placa,
        e.tipo_reclamacion,
        formatCOP(e.valor_final_aprobado),
        e.estado,
        e.propietario || '—',
        e.nombre_conductor || '—',
        e.culpabilidad || '—',
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 12,
        head: [['Expediente', 'Acta', 'Fecha', 'Interno/Placa', 'Tipo', 'V. Aprobado', 'Estado', 'Propietario', 'Conductor', 'Culpabilidad']],
        body: tableData,
        headStyles: { fillColor: [27, 54, 93], fontSize: 8.5 },
        bodyStyles: { fontSize: 7.5 },
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
        doc.text(`Reporte de Expedientes — Generado el ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 36, 26);

        // Orange line separator
        doc.setDrawColor(217, 91, 42);
        doc.setLineWidth(0.8);
        doc.line(12, 33, 285, 33);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Página ${i} de ${pageCount} — Reportes SIGFAM — Flota Sugamuxi S.A.`, 12, 200);
      }

      doc.save(`SIGFAM_Reporte_Expedientes_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('Reporte PDF descargado correctamente');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar el reporte PDF');
    }
  };

  const filtered = expedientes.filter((exp) => {
    const matchSearch =
      !search ||
      exp.numero_expediente?.toLowerCase().includes(search.toLowerCase()) ||
      exp.placa?.toLowerCase().includes(search.toLowerCase()) ||
      exp.numero_interno?.toLowerCase().includes(search.toLowerCase()) ||
      exp.propietario?.toLowerCase().includes(search.toLowerCase()) ||
      exp.nombre_conductor?.toLowerCase().includes(search.toLowerCase()) ||
      exp.numero_acta?.toLowerCase().includes(search.toLowerCase());
    const matchEstado = !estadoFilter || exp.estado === estadoFilter;
    const matchTipo = !tipoFilter || exp.tipo_reclamacion === tipoFilter;

    if (fechaInicio && (!exp.fecha_incidente || exp.fecha_incidente < fechaInicio)) {
      return false;
    }
    if (fechaFin && (!exp.fecha_incidente || exp.fecha_incidente > fechaFin)) {
      return false;
    }

    return matchSearch && matchEstado && matchTipo;
  });

  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA: any = a[sortField as keyof Expediente];
      let valB: any = b[sortField as keyof Expediente];

      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      if (sortField === 'valor_final_aprobado') {
        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }

      if (sortField === 'numero_interno') {
        const numA = parseInt(valA, 10);
        const numB = parseInt(valB, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortOrder === 'asc' ? numA - numB : numB - numA;
        }
        return sortOrder === 'asc'
          ? String(valA).localeCompare(String(valB), 'es', { sensitivity: 'base' })
          : String(valB).localeCompare(String(valA), 'es', { sensitivity: 'base' });
      }

      const strA = String(valA);
      const strB = String(valB);

      return sortOrder === 'asc'
        ? strA.localeCompare(strB, 'es', { sensitivity: 'base' })
        : strB.localeCompare(strA, 'es', { sensitivity: 'base' });
    });
  }, [filtered, sortField, sortOrder]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, número interno, expediente, propietario..."
            className="pl-9 bg-background border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="expedientes-search"
            autoComplete="off"
          />
        </div>

        <select
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={presetRange}
          onChange={(e) => setPresetRange(e.target.value)}
          id="expedientes-date-preset"
        >
          <option value="todo">Todas las fechas</option>
          <option value="este-mes">Este Mes</option>
          <option value="ultimos-30">Últimos 30 días</option>
          <option value="este-anio">Este Año</option>
          <option value="personalizado">Rango Personalizado</option>
        </select>

        {presetRange === 'personalizado' && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="h-10 bg-background border-border text-xs w-[135px]"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              placeholder="Inicio"
            />
            <span className="text-xs text-muted-foreground">a</span>
            <Input
              type="date"
              className="h-10 bg-background border-border text-xs w-[135px]"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              placeholder="Fin"
            />
          </div>
        )}

        <select
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          id="expedientes-estado-filter"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_EXPEDIENTE.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>

        <select
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
          id="expedientes-tipo-filter"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_RECLAMACION.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {(search || estadoFilter || tipoFilter || presetRange !== 'todo' || fechaInicio || fechaFin) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setEstadoFilter('');
              setTipoFilter('');
              setPresetRange('todo');
              setFechaInicio('');
              setFechaFin('');
            }}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Limpiar filtros
          </Button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={fetchExpedientes} title="Refrescar">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} id="expedientes-export-btn">
            <Download className="w-4 h-4 mr-1.5 text-green-500" />
            Exportar Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} id="expedientes-export-pdf-btn">
            <FileText className="w-4 h-4 mr-1.5 text-red-500" />
            Exportar PDF
          </Button>
          <Button size="sm" onClick={() => router.push('/expedientes/nuevo')} id="expedientes-nuevo-btn">
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Expediente
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Mostrando <span className="font-semibold text-foreground">{sorted.length}</span> expedientes
      </p>

      {/* Table */}
      <Card className="border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                {COLUMNS.map((col) => {
                  const isSortedByThis = sortField === col.key;
                  return (
                    <th
                      key={col.label}
                      onClick={() => handleSort(col.key)}
                      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-secondary/40 select-none transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
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
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      Cargando expedientes...
                    </td>
                  </tr>
                ) : sorted.map((exp, i) => (
                  <motion.tr
                    key={exp.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2), duration: 0.2 }}
                    className="hover:bg-secondary/40 cursor-pointer transition-colors group"
                    onClick={() => router.push(`/expedientes/${exp.id}`)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-primary group-hover:underline">
                        {exp.numero_expediente}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-mono text-xs">
                      {exp.numero_acta ? exp.numero_acta.replace(/[^0-9]/g, '') : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground number-font text-xs">
                      {formatDate(exp.fecha_incidente)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono font-semibold text-foreground">
                        {exp.numero_interno ? (
                          <>
                            {exp.numero_interno}
                            <span className="text-[11px] font-normal text-muted-foreground ml-1.5">
                              ({exp.placa})
                            </span>
                          </>
                        ) : (
                          exp.placa
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getTipoReclamacionColor(exp.tipo_reclamacion || '')}`}>
                        {exp.tipo_reclamacion}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap number-font font-semibold text-foreground">
                      {formatCOP(exp.valor_final_aprobado)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getEstadoBadgeColor(exp.estado || '')}`}>
                        {exp.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[180px] truncate text-foreground">
                      {exp.propietario}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {exp.nombre_conductor || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                      {exp.culpabilidad || '—'}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {!loading && sorted.length === 0 && (
            <div className="py-16 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No se encontraron expedientes</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
