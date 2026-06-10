'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Download, FileText, RefreshCw } from 'lucide-react';
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

export function ExpedientesList() {
  const router = useRouter();
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [tipoFilter, setTipoFilter] = useState<string>('');

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
    if (filtered.length === 0) {
      toast.warning('No hay expedientes para exportar');
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
      XLSX.utils.book_append_sheet(wb, ws, 'Expedientes FAM');
      XLSX.writeFile(wb, `FAM_Control_Expedientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Reporte Excel generado correctamente');
    } catch (err) {
      console.error(err);
      toast.error('Error al exportar a Excel');
    }
  };

  const filtered = expedientes.filter((exp) => {
    const matchSearch =
      !search ||
      exp.numero_expediente?.toLowerCase().includes(search.toLowerCase()) ||
      exp.placa?.toLowerCase().includes(search.toLowerCase()) ||
      exp.numero_interno?.toLowerCase().includes(search.toLowerCase()) ||
      exp.propietario?.toLowerCase().includes(search.toLowerCase()) ||
      exp.nombre_conductor?.toLowerCase().includes(search.toLowerCase());
    const matchEstado = !estadoFilter || exp.estado === estadoFilter;
    const matchTipo = !tipoFilter || exp.tipo_reclamacion === tipoFilter;
    return matchSearch && matchEstado && matchTipo;
  });

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

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={fetchExpedientes} title="Refrescar">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} id="expedientes-export-btn">
            <Download className="w-4 h-4" />
            Exportar Excel
          </Button>
          <Button size="sm" onClick={() => router.push('/expedientes/nuevo')} id="expedientes-nuevo-btn">
            <Plus className="w-4 h-4" />
            Nuevo Expediente
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Mostrando <span className="font-semibold text-foreground">{filtered.length}</span> expedientes
      </p>

      {/* Table */}
      <Card className="border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                {['Expediente', 'Fecha', 'Interno/Placa', 'Propietario', 'Tipo', 'Conductor', 'Culpabilidad', 'Valor Aprobado', 'Estado'].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      Cargando expedientes...
                    </td>
                  </tr>
                ) : filtered.map((exp, i) => (
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
                    <td className="px-4 py-3 max-w-[180px] truncate text-foreground">
                      {exp.propietario}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getTipoReclamacionColor(exp.tipo_reclamacion || '')}`}>
                        {exp.tipo_reclamacion}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {exp.nombre_conductor || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                      {exp.culpabilidad || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap number-font font-semibold text-foreground">
                      {formatCOP(exp.valor_final_aprobado)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getEstadoBadgeColor(exp.estado || '')}`}>
                        {exp.estado}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {!loading && filtered.length === 0 && (
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
