'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  User,
  CreditCard,
  FileText,
  Trash2,
  Edit,
  Eye,
  CheckCircle,
  FileDown,
  UploadCloud,
  File,
  X,
  History,
  TrendingUp,
  MapPin,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { dbService, getMockUser } from '@/lib/services/dbService';
import { ExpedienteForm } from '@/components/expedientes/ExpedienteForm';
import { formatCOP, formatDate, formatDateTime, getEstadoBadgeColor, getTipoReclamacionColor } from '@/lib/utils';
import type { Expediente, Documento, AuditoriaEntry } from '@/types/database';
import { TIPOS_DOCUMENTO } from '@/lib/constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type TabType = 'resumen' | 'financiero' | 'conductor' | 'comite' | 'documentos' | 'auditoria';

export default function ExpedienteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [auditorias, setAuditorias] = useState<AuditoriaEntry[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('resumen');
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Document Upload State
  const [uploading, setUploading] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState<string>('Factura');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const currentUser = getMockUser();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const exp = await dbService.getExpedienteById(id);
      if (!exp) {
        toast.error('Expediente no encontrado');
        router.push('/expedientes');
        return;
      }
      setExpediente(exp);
      const docs = await dbService.getDocumentos(id);
      setDocumentos(docs);
      const audits = await dbService.getAuditoria(id);
      setAuditorias(audits);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos del expediente');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (newEstado: any) => {
    if (!expediente) return;
    try {
      const updated = await dbService.updateExpediente(expediente.id, { estado: newEstado });
      setExpediente(updated);
      toast.success(`Estado actualizado a ${newEstado}`);
      // Refresh audits
      const audits = await dbService.getAuditoria(id);
      setAuditorias(audits);
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar de estado');
    }
  };

  const handleDelete = async () => {
    if (!expediente) return;
    const confirmed = window.confirm('¿Está seguro de que desea eliminar este expediente de manera lógica?');
    if (!confirmed) return;

    try {
      await dbService.deleteExpedienteLogical(expediente.id);
      toast.success('Expediente eliminado correctamente');
      router.push('/expedientes');
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar el expediente');
    }
  };

  // Upload File handler
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !expediente) return;
    setUploading(true);
    try {
      const newDoc = await dbService.uploadDocumento(expediente.id, selectedFile, tipoDocumento);
      setDocumentos((prev) => [newDoc, ...prev]);
      setSelectedFile(null);
      toast.success('Documento subido correctamente');
      // Refresh audits
      const audits = await dbService.getAuditoria(id);
      setAuditorias(audits);
    } catch (err) {
      console.error(err);
      toast.error('Error al subir documento');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: string, storagePath: string) => {
    if (!expediente) return;
    const confirmDelete = window.confirm('¿Seguro que desea eliminar este documento?');
    if (!confirmDelete) return;

    try {
      await dbService.deleteDocumento(docId, storagePath, expediente.id);
      setDocumentos((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Documento eliminado');
      // Refresh audits
      const audits = await dbService.getAuditoria(id);
      setAuditorias(audits);
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar documento');
    }
  };

  const handleDownloadDoc = async (storagePath: string, fileName: string) => {
    try {
      const url = await dbService.getDownloadUrl(storagePath);
      // Create element to trigger download or open tab
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = fileName;
      a.click();
    } catch (err) {
      console.error(err);
      toast.error('Error al descargar documento');
    }
  };

  // Load logo async for jsPDF
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
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve('');
        }
      };
      img.onerror = () => {
        resolve('');
      };
    });
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (!expediente) return;
    toast.info('Generando reporte PDF...');

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      // Try loading logo
      const logoB64 = await loadLogoBase64();

      // Membrete / Letterhead
      if (logoB64) {
        doc.addImage(logoB64, 'PNG', 12, 10, 20, 20);
      }

      // Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(27, 54, 93); // Primary Corporate Blue
      doc.text('FLOTA SUGAMUXI S.A.', 36, 16);
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Fondo de Auxilio Mutuo (FAM) — Nit. 891.800.201-1', 36, 21);
      doc.text('Reporte Oficial de Expediente de Reclamación', 36, 26);

      // Line separator
      doc.setDrawColor(217, 91, 42); // Accent Amber/Gold
      doc.setLineWidth(0.8);
      doc.line(12, 33, 198, 33);

      // Info General Block
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(27, 54, 93);
      doc.text('INFORMACIÓN GENERAL DEL CASO', 12, 42);

      const generalData = [
        ['No. Expediente:', expediente.numero_expediente, 'Estado:', expediente.estado],
        ['Fecha Incidente:', formatDate(expediente.fecha_incidente), 'Tipo Reclamación:', expediente.tipo_reclamacion],
        ['Vehículo Placa:', expediente.placa, 'Número Interno:', expediente.numero_interno || '—'],
        ['Propietario:', expediente.propietario, 'Ruta:', `${expediente.ciudad_origen || '—'} a ${expediente.ciudad_destino || '—'}`],
        ['Concepto:', expediente.concepto || '—', '', ''],
      ];

      autoTable(doc, {
        startY: 45,
        theme: 'plain',
        body: generalData,
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35 },
          1: { cellWidth: 60 },
          2: { fontStyle: 'bold', cellWidth: 35 },
          3: { cellWidth: 60 },
        },
      });

      // Financial Block
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(27, 54, 93);
      doc.text('DESGLOSE FINANCIERO', 12, (doc as any).lastAutoTable.finalY + 10);

      const finData = [
        ['Valor Cotización:', formatCOP(expediente.valor_cotizacion), 'Deducible Aplicado:', `${expediente.porcentaje_deducible || 0}%`],
        ['Valor Negociado:', formatCOP(expediente.valor_negociado), 'Valor Deducible:', formatCOP(expediente.valor_deducible)],
        ['Valor Salvamento:', formatCOP(expediente.valor_salvamento), 'Valor Neto a Pagar:', formatCOP(expediente.valor_a_pagar)],
        ['Valor Aprobado Comité:', formatCOP(expediente.valor_final_aprobado), '', ''],
      ];

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 13,
        theme: 'striped',
        headStyles: { fillColor: [27, 54, 93] },
        body: finData,
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 45 },
          1: { cellWidth: 50 },
          2: { fontStyle: 'bold', cellWidth: 45 },
          3: { cellWidth: 50 },
        },
      });

      // Conductor & Recobros
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(27, 54, 93);
      doc.text('RESPONSABILIDAD Y RECUPERACIÓN (RECOBROS)', 12, (doc as any).lastAutoTable.finalY + 10);

      const condData = [
        ['Conductor:', expediente.nombre_conductor || '—', 'Cédula / ID:', expediente.id_conductor || '—'],
        ['Celular:', expediente.celular_conductor || '—', 'Culpabilidad:', expediente.culpabilidad || 'Sin definir'],
        ['Descuento Conductor:', formatCOP(expediente.valor_descuento_conductor), 'Memo Descuento:', expediente.memorando_descuento || '—'],
        ['Recobro Vehículo:', `${formatCOP(expediente.valor_recobro_vehiculo)} (${expediente.porcentaje_recobro_vehiculo || 0}%)`, 'Recobro Empresa:', `${formatCOP(expediente.valor_recobro_empresa)} (${expediente.porcentaje_recobro_empresa || 0}%)`],
        ['Recobro Abogado:', `${formatCOP(expediente.valor_recobro_abogado)} (${expediente.porcentaje_recobro_abogado || 0}%)`, '', ''],
      ];

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 13,
        theme: 'plain',
        body: condData,
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 45 },
          1: { cellWidth: 50 },
          2: { fontStyle: 'bold', cellWidth: 45 },
          3: { cellWidth: 50 },
        },
      });

      // Committee
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(27, 54, 93);
      doc.text('COMITÉ DE SEGURIDAD VIAL & AUTORIZACIÓN', 12, (doc as any).lastAutoTable.finalY + 10);

      const comData = [
        ['Fecha de Comité:', formatDate(expediente.fecha_comite), 'Causa Raíz:', expediente.causa_raiz || '—'],
        ['Observaciones Comité:', expediente.observaciones_comite || '—', '', ''],
        ['Autorizado Por:', expediente.autorizado_por || '—', 'Cargo Autorizador:', expediente.cargo_autorizador || '—'],
        ['Fecha Autorización:', formatDate(expediente.fecha_autorizacion), '', ''],
      ];

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 13,
        theme: 'striped',
        body: comData,
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 45 },
          1: { cellWidth: 140 },
        },
      });

      // Footer signature
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('Generado automáticamente por el Sistema FAM Control de Flota Sugamuxi S.A.', 12, 280);
      doc.text(`Fecha y hora de generación: ${new Date().toLocaleString()}`, 12, 284);

      doc.save(`${expediente.numero_expediente}_FAM_Reporte.pdf`);
      toast.success('Reporte PDF descargado');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
        <p>Cargando detalles del expediente...</p>
      </div>
    );
  }

  if (!expediente) return null;

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (isEditMode) setIsEditMode(false);
              else router.push('/expedientes');
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {isEditMode ? 'Editar Expediente' : expediente.numero_expediente}
              </h1>
              {!isEditMode && (
                <Badge variant={expediente.estado === 'Aprobado' ? 'success' : expediente.estado === 'Rechazado' ? 'destructive' : 'warning'}>
                  {expediente.estado}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              Placa: {expediente.placa} | Propietario: {expediente.propietario}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isEditMode ? (
            <>
              {currentUser.rol !== 'consultor' && (
                <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Caso
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileDown className="w-4 h-4 mr-2 text-red-400" />
                Descargar PDF
              </Button>

              {currentUser.rol !== 'consultor' && (
                <div className="flex items-center gap-1.5 ml-2 border border-border rounded-lg p-1 bg-secondary/20">
                  <span className="text-xs text-muted-foreground px-2">Estado:</span>
                  {['Pendiente', 'Revisado', 'Aprobado', 'Rechazado'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                        expediente.estado === status
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}

              {currentUser.rol === 'admin' && (
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Lógico
                </Button>
              )}
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditMode(false)}>
              Ver Detalles
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Main Area */}
      {isEditMode ? (
        <ExpedienteForm
          id={expediente.id}
          defaultValues={expediente as any}
          onSuccess={() => {
            setIsEditMode(false);
            loadData();
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Navigation vertical tabs for premium dashboard feel */}
          <div className="lg:col-span-1 space-y-2">
            {[
              { id: 'resumen', label: 'Resumen General', icon: FileText },
              { id: 'financiero', label: 'Desglose Financiero', icon: TrendingUp },
              { id: 'conductor', label: 'Conductor & Recobros', icon: User },
              { id: 'comite', label: 'Comité & Autorización', icon: Calendar },
              { id: 'documentos', label: 'Documentos Adjuntos', icon: File },
              { id: 'auditoria', label: 'Historial / Auditoría', icon: History },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'gradient-brand text-white shadow-glow-brand'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}

            {/* Quick summary card */}
            <Card className="hidden lg:block border-border bg-card/50">
              <CardHeader className="pb-2">
                <CardDescription>Valor Aprobado</CardDescription>
                <CardTitle className="text-xl font-bold text-green-400 number-font">
                  {formatCOP(expediente.valor_final_aprobado)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>Creado: {formatDateTime(expediente.created_at)}</p>
                <p>Modificado: {formatDateTime(expediente.updated_at)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tab content area */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* RESUMEN GENERAL */}
              {activeTab === 'resumen' && (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle>Resumen del Incidente</CardTitle>
                    <CardDescription>Datos del vehículo, incidente y ruta general</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block">Fecha del Incidente</span>
                        <span className="text-sm font-semibold flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          {formatDate(expediente.fecha_incidente)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block">Tipo de Reclamación</span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getTipoReclamacionColor(expediente.tipo_reclamacion)}`}>
                          {expediente.tipo_reclamacion}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block">Placa del Vehículo</span>
                        <span className="text-sm font-mono font-bold text-foreground">
                          {expediente.placa}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block">Número Interno</span>
                        <span className="text-sm font-mono text-foreground">
                          {expediente.numero_interno || '—'}
                        </span>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block">Propietario Asociado</span>
                        <span className="text-sm font-semibold text-foreground">
                          {expediente.propietario}
                        </span>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block">Ruta Asociada</span>
                        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-brand-400" />
                          {expediente.ciudad_origen || '—'} a {expediente.ciudad_destino || '—'}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider block">Concepto de la Reclamación</span>
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-line bg-secondary/20 p-4 rounded-xl border border-border/50">
                        {expediente.concepto || 'Sin descripción o concepto registrado.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* DESGLOSE FINANCIERO */}
              {activeTab === 'financiero' && (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle>Cuentas y Valores Financieros</CardTitle>
                    <CardDescription>Cálculo del deducible, valor neto y montos aprobados</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block">Valor de Cotización Activo</span>
                        <span className="text-lg font-semibold number-font text-foreground">
                          {formatCOP(expediente.valor_cotizacion)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block">Valor Negociado</span>
                        <span className="text-lg font-semibold number-font text-foreground">
                          {formatCOP(expediente.valor_negociado)}
                        </span>
                      </div>
                    </div>

                    {expediente.cotizaciones && expediente.cotizaciones.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-foreground">Detalle de Cotizaciones Asociadas</h4>
                        <div className="border border-border rounded-xl overflow-hidden bg-card">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="text-xs uppercase bg-secondary/40 text-muted-foreground border-b border-border">
                                <tr>
                                  <th className="px-4 py-3 font-semibold">Taller / Proveedor</th>
                                  <th className="px-4 py-3 font-semibold">Concepto</th>
                                  <th className="px-4 py-3 font-semibold text-right">Valor Cotizado</th>
                                  <th className="px-4 py-3 font-semibold text-right">Valor Negociado</th>
                                  <th className="px-4 py-3 font-semibold text-center">Deducible (%)</th>
                                  <th className="px-4 py-3 font-semibold text-right">Valor Deducible</th>
                                  <th className="px-4 py-3 font-semibold text-right">Valor a Pagar</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60">
                                {expediente.cotizaciones.map((cot, i) => (
                                  <tr key={cot.id || i} className="hover:bg-secondary/10 transition-colors">
                                    <td className="px-4 py-3 font-medium text-foreground">{cot.proveedor}</td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                      {cot.concepto === 'OTROS' ? (cot.concepto_otro || 'OTROS') : cot.concepto}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">{formatCOP(cot.valor_cotizacion)}</td>
                                    <td className="px-4 py-3 text-right font-mono text-foreground font-semibold">{formatCOP(cot.valor_negociado)}</td>
                                    <td className="px-4 py-3 text-center text-yellow-400 font-semibold">{cot.porcentaje_deducible}%</td>
                                    <td className="px-4 py-3 text-right font-mono text-yellow-500/95">{formatCOP(cot.valor_deducible)}</td>
                                    <td className="px-4 py-3 text-right font-mono text-green-400 font-bold">{formatCOP(cot.valor_a_pagar)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-border p-5 bg-secondary/10 space-y-3">
                      <h4 className="text-sm font-bold text-foreground">Cálculo de Cobertura FAM</h4>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valor Acordado Negociación:</span>
                        <span className="number-font text-foreground font-semibold">{formatCOP(expediente.valor_negociado)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Deducible del Fondo ({expediente.porcentaje_deducible || 0}%):</span>
                        <span className="number-font text-yellow-400 font-semibold">- {formatCOP(expediente.valor_deducible)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-base font-bold">
                        <span>Valor Neto a Pagar:</span>
                        <span className="number-font text-green-400">{formatCOP(expediente.valor_a_pagar)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block">Valor Salvamento (Recuperación)</span>
                        <span className="text-lg font-semibold number-font text-yellow-500/90">
                          {formatCOP(expediente.valor_salvamento)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block">Valor Final Aprobado</span>
                        <span className="text-lg font-bold number-font text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-lg inline-block">
                          {formatCOP(expediente.valor_final_aprobado)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* CONDUCTOR & RECUBROS */}
              {activeTab === 'conductor' && (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle>Conductor y Proceso de Recobros</CardTitle>
                    <CardDescription>Detalles del conductor a cargo y de recuperación económica</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-foreground">Datos del Conductor</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground block">Nombre</span>
                          <span className="text-sm font-semibold text-foreground">{expediente.nombre_conductor || '—'}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground block">Identificación</span>
                          <span className="text-sm font-mono text-foreground">{expediente.id_conductor || '—'}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground block">Celular</span>
                          <span className="text-sm font-mono text-foreground">{expediente.celular_conductor || '—'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground block">Culpabilidad Dictada</span>
                          <Badge variant={expediente.culpabilidad === 'Conductor' ? 'destructive' : 'outline'}>
                            {expediente.culpabilidad || 'Sin definir'}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground block">Descuento al Conductor</span>
                          <span className="text-sm font-semibold text-foreground number-font">
                            {formatCOP(expediente.valor_descuento_conductor)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground block">N° Memorando Descuento</span>
                          <span className="text-sm font-semibold text-foreground font-mono">{expediente.memorando_descuento || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-foreground">Valores de Recobro</h4>
                      <div className="space-y-3">
                        {[
                          { label: 'Recobro Vehículo (Tercero)', val: expediente.valor_recobro_vehiculo, pct: expediente.porcentaje_recobro_vehiculo },
                          { label: 'Recobro Abogado', val: expediente.valor_recobro_abogado, pct: expediente.porcentaje_recobro_abogado },
                          { label: 'Recobro Empresa', val: expediente.valor_recobro_empresa, pct: expediente.porcentaje_recobro_empresa },
                        ].map((rec, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/10">
                            <div>
                              <span className="text-sm text-foreground font-medium block">{rec.label}</span>
                              <span className="text-xs text-muted-foreground">Porcentaje del valor negociado</span>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold number-font text-foreground block">{formatCOP(rec.val)}</span>
                              <span className="text-xs font-mono font-semibold text-primary">{rec.pct || 0}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* COMITE & AUTORIZACION */}
              {activeTab === 'comite' && (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle>Comité de Seguridad Vial y Aprobaciones</CardTitle>
                    <CardDescription>Tratamiento de causas raíz y firmas autorizadas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block">Fecha del Comité</span>
                        <span className="text-sm font-semibold flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          {formatDate(expediente.fecha_comite)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block">Causa Raíz Dictaminada</span>
                        <span className="text-sm font-semibold text-foreground block bg-secondary/50 p-2 rounded border border-border">
                          {expediente.causa_raiz || 'Pendiente de definir causa.'}
                        </span>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <span className="text-xs text-muted-foreground block">Observaciones del Comité</span>
                        <p className="text-sm text-foreground bg-secondary/20 p-3 rounded-lg border border-border/50">
                          {expediente.observaciones_comite || 'No hay observaciones del comité.'}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-foreground">Autorización de Desembolso</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground block">Firmado / Autorizado Por</span>
                          <span className="text-sm font-semibold text-foreground">{expediente.autorizado_por || '—'}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground block">Cargo Autorizador</span>
                          <span className="text-sm text-foreground">{expediente.cargo_autorizador || '—'}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground block">Fecha de Autorización</span>
                          <span className="text-sm font-semibold text-foreground">{formatDate(expediente.fecha_autorizacion)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* DOCUMENTOS ADJUNTOS */}
              {activeTab === 'documentos' && (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle>Control Documental</CardTitle>
                    <CardDescription>Adjunte y consulte los soportes de este expediente</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Upload section */}
                    {currentUser.rol !== 'consultor' && (
                      <form onSubmit={handleUpload} className="p-4 rounded-xl border border-dashed border-border bg-secondary/5 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex-1 min-w-[200px] space-y-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">Categoría del Soporte</span>
                            <select
                              value={tipoDocumento}
                              onChange={(e) => setTipoDocumento(e.target.value)}
                              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              {TIPOS_DOCUMENTO.map((tipo) => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex-[2] min-w-[280px] space-y-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">Seleccionar Archivo</span>
                            <div className="relative flex items-center justify-between border border-border bg-background rounded-lg px-3 h-10 overflow-hidden text-sm">
                              <span className="truncate pr-4 text-muted-foreground">
                                {selectedFile ? selectedFile.name : 'Ningún archivo seleccionado'}
                              </span>
                              {selectedFile ? (
                                <button type="button" onClick={() => setSelectedFile(null)} className="text-red-400 hover:text-red-500">
                                  <X className="w-4 h-4" />
                                </button>
                              ) : (
                                <label className="cursor-pointer font-semibold text-primary hover:underline">
                                  Examinar...
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button type="submit" disabled={!selectedFile || uploading} className="w-full">
                          <UploadCloud className="w-4 h-4 mr-2" />
                          {uploading ? 'Subiendo archivo...' : 'Subir Archivo'}
                        </Button>
                      </form>
                    )}

                    {/* Files list */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-foreground">Archivos Cargados ({documentos.length})</h4>
                      <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
                        {documentos.length === 0 ? (
                          <div className="p-8 text-center text-muted-foreground">
                            <File className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                            No se han subido documentos de soporte para este caso.
                          </div>
                        ) : (
                          documentos.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                  <span className="font-semibold text-sm text-foreground block max-w-[250px] sm:max-w-md truncate" title={doc.nombre_archivo}>
                                    {doc.nombre_archivo}
                                  </span>
                                  <div className="flex gap-3 text-xs text-muted-foreground">
                                    <span className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                                      {doc.tipo_documento}
                                    </span>
                                    <span>{(doc.tamanio_bytes ? (doc.tamanio_bytes / 1024).toFixed(1) : 0)} KB</span>
                                    <span>• {formatDate(doc.created_at)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleDownloadDoc(doc.storage_path, doc.nombre_archivo)}
                                  title="Ver / Descargar"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {currentUser.rol === 'admin' && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                    onClick={() => handleDeleteDoc(doc.id, doc.storage_path)}
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* LOG DE AUDITORÍA */}
              {activeTab === 'auditoria' && (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle>Historial de Modificaciones</CardTitle>
                    <CardDescription>Registro cronológico de acciones ejecutadas sobre este caso</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="relative border-l border-border pl-6 ml-3 space-y-6">
                      {auditorias.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">No se han registrado auditorías para este expediente.</p>
                      ) : (
                        auditorias.map((audit) => {
                          let label = audit.valor_nuevo;
                          if (audit.accion === 'EDITAR' && audit.campo_modificado) {
                            label = `Modificó campo "${audit.campo_modificado}" (Valor anterior: "${audit.valor_anterior || 'vacío'}" → Nuevo: "${audit.valor_nuevo || 'vacío'}")`;
                          } else if (audit.accion === 'ESTADO') {
                            label = `Cambió estado de "${audit.valor_anterior}" a "${audit.valor_nuevo}"`;
                          }

                          return (
                            <div key={audit.id} className="relative">
                              {/* Dot */}
                              <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />

                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-foreground">
                                    {audit.usuario_email || 'Sistema'}
                                  </span>
                                  <Badge className="text-[10px] py-0 px-1 font-mono uppercase" variant="secondary">
                                    {audit.accion}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                                    {formatDateTime(audit.created_at)}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {label}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
