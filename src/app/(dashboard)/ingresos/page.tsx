'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { dbService, getMockUser } from '@/lib/services/dbService';
import type { IngresoFAM } from '@/types/database';
import {
  Coins,
  TrendingUp,
  Calendar,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  ArrowLeftRight,
  Info,
  CheckCircle2,
  FileSpreadsheet,
  X,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { formatCOP } from '@/lib/utils';
import Link from 'next/link';
import * as XLSX from 'xlsx';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: 'hsla(var(--card), 0.95)',
  backdropFilter: 'blur(8px)',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--foreground))',
  fontSize: '12px',
};

export default function IngresosPage() {
  const [ingresos, setIngresos] = useState<IngresoFAM[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnio, setSelectedAnio] = useState<number>(2026);
  const [userRole, setUserRole] = useState<string>('admin');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingIngreso, setEditingIngreso] = useState<Partial<IngresoFAM> | null>(null);
  const [formAnio, setFormAnio] = useState<number>(2026);
  const [formMes, setFormMes] = useState<number>(1);
  const [formValor, setFormValor] = useState<string>('');
  const [formConcepto, setFormConcepto] = useState<string>('Aportes Mensuales FAM');
  const [formObservaciones, setFormObservaciones] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<{ anio: number; mes: number; mes_nombre: string; valor: number }[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Check role
  useEffect(() => {
    const user = getMockUser();
    setUserRole(user.rol || 'admin');
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await dbService.getIngresosFAM();
      setIngresos(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar ingresos FAM');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Available Years
  const availableYears = useMemo(() => {
    const set = new Set<number>([2025, 2026]);
    ingresos.forEach((i) => set.add(i.anio));
    return Array.from(set).sort((a, b) => b - a);
  }, [ingresos]);

  // Current Year Items (ensure all 12 months are represented)
  const currentYearItems = useMemo(() => {
    const map = new Map<number, IngresoFAM>();
    ingresos
      .filter((i) => i.anio === selectedAnio)
      .forEach((i) => map.set(i.mes, i));

    return Array.from({ length: 12 }, (_, idx) => {
      const mesNum = idx + 1;
      const existing = map.get(mesNum);
      if (existing) return existing;
      return {
        id: `virtual-${selectedAnio}-${mesNum}`,
        anio: selectedAnio,
        mes: mesNum,
        mes_nombre: MONTH_NAMES[idx],
        valor: 0,
        concepto: 'Aportes Mensuales FAM',
        observaciones: null,
        created_at: '',
        updated_at: '',
      } as IngresoFAM;
    });
  }, [ingresos, selectedAnio]);

  // Previous Year Items (for comparison)
  const prevYearItems = useMemo(() => {
    const prevYear = selectedAnio - 1;
    const map = new Map<number, IngresoFAM>();
    ingresos
      .filter((i) => i.anio === prevYear)
      .forEach((i) => map.set(i.mes, i));

    return Array.from({ length: 12 }, (_, idx) => {
      const mesNum = idx + 1;
      return map.get(mesNum)?.valor || 0;
    });
  }, [ingresos, selectedAnio]);

  // KPIs
  const totalAnio = useMemo(() => {
    return currentYearItems.reduce((acc, i) => acc + (Number(i.valor) || 0), 0);
  }, [currentYearItems]);

  const activeMonths = useMemo(() => {
    return currentYearItems.filter((i) => Number(i.valor) > 0);
  }, [currentYearItems]);

  const promedioMensual = useMemo(() => {
    if (activeMonths.length === 0) return 0;
    return Math.round(totalAnio / activeMonths.length);
  }, [totalAnio, activeMonths]);

  const mesMayor = useMemo(() => {
    if (activeMonths.length === 0) return null;
    return [...activeMonths].sort((a, b) => Number(b.valor) - Number(a.valor))[0];
  }, [activeMonths]);

  const mesMenor = useMemo(() => {
    if (activeMonths.length === 0) return null;
    return [...activeMonths].sort((a, b) => Number(a.valor) - Number(b.valor))[0];
  }, [activeMonths]);

  const comparativoPrevYear = useMemo(() => {
    if (activeMonths.length === 0) return { pct: 0, diff: 0 };
    // Compare same active months count with previous year
    const activeIndices = activeMonths.map((m) => m.mes - 1);
    const prevTotalSameMonths = activeIndices.reduce((acc, idx) => acc + (prevYearItems[idx] || 0), 0);
    const currTotalSameMonths = activeMonths.reduce((acc, m) => acc + Number(m.valor), 0);

    if (prevTotalSameMonths === 0) return { pct: 0, diff: 0 };
    const diff = currTotalSameMonths - prevTotalSameMonths;
    const pct = Math.round((diff / prevTotalSameMonths) * 1000) / 10;
    return { pct, diff };
  }, [activeMonths, prevYearItems]);

  // Chart Data
  const chartMonthlyData = useMemo(() => {
    return currentYearItems.map((item, idx) => ({
      mes: MONTH_SHORT[idx],
      mesCompleto: item.mes_nombre,
      valor: Number(item.valor) || 0,
      valorPrev: prevYearItems[idx] || 0,
    }));
  }, [currentYearItems, prevYearItems]);

  // Open Create/Edit Modal
  const handleOpenModal = (ingreso?: IngresoFAM) => {
    if (ingreso && ingreso.valor > 0) {
      setEditingIngreso(ingreso);
      setFormAnio(ingreso.anio);
      setFormMes(ingreso.mes);
      setFormValor(String(ingreso.valor));
      setFormConcepto(ingreso.concepto || 'Aportes Mensuales FAM');
      setFormObservaciones(ingreso.observaciones || '');
    } else {
      setEditingIngreso(null);
      setFormAnio(selectedAnio);
      // Auto select next unpopulated month if any
      const firstEmpty = currentYearItems.find((m) => m.valor === 0)?.mes || 1;
      setFormMes(firstEmpty);
      setFormValor('');
      setFormConcepto('Aportes Mensuales FAM');
      setFormObservaciones('');
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numVal = parseFloat(formValor.replace(/[^0-9.-]+/g, ''));
    if (isNaN(numVal) || numVal < 0) {
      toast.error('Por favor ingrese un valor válido en COP');
      return;
    }

    setIsSaving(true);
    try {
      await dbService.saveIngresoFAM({
        id: editingIngreso?.id?.startsWith('virtual-') ? undefined : editingIngreso?.id,
        anio: formAnio,
        mes: formMes,
        mes_nombre: MONTH_NAMES[formMes - 1],
        valor: numVal,
        concepto: formConcepto.trim() || 'Aportes Mensuales FAM',
        observaciones: formObservaciones.trim() || null,
      });

      toast.success(`Ingreso de ${MONTH_NAMES[formMes - 1]} ${formAnio} guardado exitosamente`);
      setShowModal(false);
      setSelectedAnio(formAnio);
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(`Error al guardar: ${err.message || 'No se pudo guardar el registro'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (ingreso: IngresoFAM) => {
    if (ingreso.valor === 0) return;
    const confirmed = window.confirm(
      `¿Está seguro de eliminar el registro de ingreso para ${ingreso.mes_nombre} ${ingreso.anio}?`
    );
    if (!confirmed) return;

    try {
      if (ingreso.id && !ingreso.id.startsWith('virtual-')) {
        await dbService.deleteIngresoFAM(ingreso.id);
      } else {
        await dbService.saveIngresoFAM({
          anio: ingreso.anio,
          mes: ingreso.mes,
          mes_nombre: ingreso.mes_nombre,
          valor: 0,
        });
      }
      toast.success(`Ingreso de ${ingreso.mes_nombre} eliminado`);
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error('Error al eliminar registro');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      availableYears.forEach((year) => {
        const yearData = ingresos
          .filter((i) => i.anio === year)
          .sort((a, b) => a.mes - b.mes);

        const rows = yearData.map((item) => ({
          MES: item.mes_nombre,
          VALOR: item.valor,
          CONCEPTO: item.concepto || 'Aportes Mensuales FAM',
          OBSERVACIONES: item.observaciones || '',
        }));

        const totalRow = {
          MES: 'TOTAL',
          VALOR: yearData.reduce((acc, i) => acc + (Number(i.valor) || 0), 0),
          CONCEPTO: '',
          OBSERVACIONES: '',
        };

        const ws = XLSX.utils.json_to_sheet([...rows, totalRow]);
        XLSX.utils.book_append_sheet(wb, ws, String(year));
      });

      XLSX.writeFile(wb, `Ingresos_FAM_Consolidado_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Archivo Excel exportado exitosamente');
    } catch (err) {
      console.error(err);
      toast.error('Error al exportar archivo Excel');
    }
  };

  // Import from Excel handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const itemsToImport: { anio: number; mes: number; mes_nombre: string; valor: number }[] = [];

        const MONTH_MAP: Record<string, number> = {
          enero: 1, febrero: 2, marzo: 3, abril: 4,
          mayo: 5, junio: 6, julio: 7, agosto: 8,
          septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
        };

        wb.SheetNames.forEach((sheetName) => {
          const parsedYear = parseInt(sheetName.trim(), 10);
          const anio = !isNaN(parsedYear) && parsedYear >= 2000 ? parsedYear : selectedAnio;
          const ws = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any>(ws);

          rows.forEach((row) => {
            const rawMes = String(row.MES || row.mes || row.Mes || '').trim().toLowerCase();
            const val = Number(row.VALOR || row.valor || row.Valor || 0);

            if (rawMes && !rawMes.startsWith('total') && val > 0) {
              const mesNum = MONTH_MAP[rawMes];
              if (mesNum) {
                itemsToImport.push({
                  anio,
                  mes: mesNum,
                  mes_nombre: MONTH_NAMES[mesNum - 1],
                  valor: val,
                });
              }
            }
          });
        });

        if (itemsToImport.length === 0) {
          toast.error('No se encontraron filas con formato válido (columnas MES y VALOR)');
          return;
        }

        setImportPreview(itemsToImport);
        setShowImportModal(true);
      } catch (err) {
        console.error(err);
        toast.error('Error al procesar el archivo Excel');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    setIsSaving(true);
    try {
      await dbService.bulkSaveIngresosFAM(
        importPreview.map((item) => ({
          anio: item.anio,
          mes: item.mes,
          mes_nombre: item.mes_nombre,
          valor: item.valor,
          concepto: 'Aportes Mensuales FAM (Importado)',
        }))
      );
      toast.success(`${importPreview.length} registros de ingresos importados exitosamente`);
      setShowImportModal(false);
      setImportPreview([]);
      setImportFile(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error('Error al guardar datos importados');
    } finally {
      setIsSaving(false);
    }
  };

  // Access Control: Only Administrador and Analista
  const isAuthorized = userRole === 'admin' || userRole === 'analista';

  if (!isAuthorized) {
    return (
      <>
        <Header title="Ingresos FAM" subtitle="Fondo de Auxilio Mutuo — Flota Sugamuxi S.A." />
        <div className="flex-1 p-6 flex items-center justify-center">
          <Card className="max-w-md w-full border-border bg-card p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Acceso Restringido</h3>
              <p className="text-sm text-muted-foreground mt-1">
                El módulo de registro y control de <strong>Ingresos FAM</strong> está reservado exclusivamente para los usuarios con rol de <strong>Administrador</strong> y <strong>Analista</strong>.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">Volver al Dashboard</Link>
            </Button>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header
        title="Ingresos FAM"
        subtitle="Módulo oficial de registro y control de ingresos mensuales por aportes (Reemplazo Excel)"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="h-9 px-3 border-white/10 bg-white/5 hover:bg-white/10 text-foreground"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button asChild variant="default" size="sm" className="h-9 px-3 gradient-brand">
              <Link href="/dashboard/gasvsing">
                <ArrowLeftRight className="w-4 h-4 mr-1.5" />
                Gastos Vs Ingresos
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-auto">
        {/* Top Control Bar */}
        <div className="bg-card border border-border p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Año Fiscal:</span>
            </div>
            <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-lg border border-border">
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedAnio(yr)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    selectedAnio === yr
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {yr}
                </button>
              ))}
              <button
                onClick={() => {
                  const nextYear = Math.max(...availableYears) + 1;
                  setSelectedAnio(nextYear);
                  handleOpenModal();
                }}
                className="px-2 py-1.5 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                title="Añadir nuevo año"
              >
                + Añadir Año
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-9 text-xs border-border text-foreground hover:bg-secondary"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Exportar Excel
            </Button>

            <label className="cursor-pointer">
              <div className="inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium border border-border bg-transparent hover:bg-secondary h-9 px-3 text-foreground transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Importar Excel
              </div>
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            <Button
              onClick={() => handleOpenModal()}
              size="sm"
              className="h-9 text-xs gradient-brand text-white shadow-glow-brand"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Registrar Ingreso Mensual
            </Button>
          </div>
        </div>

        {/* KPIs Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Total Ingresos {selectedAnio}</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold number-font text-emerald-400">
                {formatCOP(totalAnio)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {activeMonths.length} de 12 meses registrados
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Promedio Mensual</span>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xl font-bold number-font text-foreground">
                {formatCOP(promedioMensual)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Sobre meses registrados (&gt; $0)
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Mes Más Alto</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-base font-bold text-foreground truncate">
                {mesMayor ? mesMayor.mes_nombre : '—'}
              </p>
              <p className="text-xs font-bold number-font text-emerald-400">
                {mesMayor ? formatCOP(mesMayor.valor) : '$0'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Mes Más Bajo</span>
                <ArrowDownRight className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-base font-bold text-foreground truncate">
                {mesMenor ? mesMenor.mes_nombre : '—'}
              </p>
              <p className="text-xs font-bold number-font text-amber-400">
                {mesMenor ? formatCOP(mesMenor.valor) : '$0'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Variación vs {selectedAnio - 1}</span>
                <Coins className="w-4 h-4 text-gold-500" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xl font-bold number-font ${comparativoPrevYear.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {comparativoPrevYear.diff >= 0 ? '+' : ''}{comparativoPrevYear.pct}%
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({formatCOP(Math.abs(comparativoPrevYear.diff))})
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Periodo homologado a la fecha
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Monthly Bar Chart */}
          <Card className="lg:col-span-8 border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Evolución Mensual de Ingresos ({selectedAnio})</CardTitle>
                  <CardDescription className="text-xs">
                    Comportamiento de los aportes percibidos mes a mes por el Fondo de Auxilio Mutuo
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  Promedio: {formatCOP(promedioMensual)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartMonthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip
                      contentStyle={CUSTOM_TOOLTIP_STYLE}
                      formatter={(val: any) => [formatCOP(val), 'Ingreso FAM']}
                      labelFormatter={(_label, payload) => payload?.[0]?.payload?.mesCompleto || _label}
                    />
                    {promedioMensual > 0 && (
                      <ReferenceLine
                        y={promedioMensual}
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        label={{ value: 'Promedio', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
                      />
                    )}
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Ingresos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Comparative vs Previous Year */}
          <Card className="lg:col-span-4 border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Comparativo {selectedAnio} vs {selectedAnio - 1}</CardTitle>
              <CardDescription className="text-xs">
                Contraste mensual interanual
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartMonthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip
                      contentStyle={CUSTOM_TOOLTIP_STYLE}
                      formatter={(val: any, name: any) => [formatCOP(val), name]}
                      labelFormatter={(_label, payload) => payload?.[0]?.payload?.mesCompleto || _label}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Bar dataKey="valorPrev" fill="#64748b" radius={[3, 3, 0, 0]} name={`${selectedAnio - 1}`} />
                    <Bar dataKey="valor" fill="#10b981" radius={[3, 3, 0, 0]} name={`${selectedAnio}`} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Data Table */}
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader className="border-b border-border/60 py-4 px-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                Matriz Mensual de Ingresos — Año {selectedAnio}
              </CardTitle>
              <CardDescription className="text-xs">
                Haga clic en el botón de edición para actualizar el valor o concepto de cualquier mes
              </CardDescription>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Total Acumulado: <strong className="text-foreground">{formatCOP(totalAnio)}</strong>
            </span>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground uppercase tracking-wider text-left">
                    <th className="py-3 px-4 font-semibold w-12 text-center">N°</th>
                    <th className="py-3 px-4 font-semibold">Mes</th>
                    <th className="py-3 px-4 font-semibold text-right">Valor Ingreso (COP)</th>
                    <th className="py-3 px-4 font-semibold text-center">% Part. Anual</th>
                    <th className="py-3 px-4 font-semibold text-right">Var. vs Mes Anterior</th>
                    <th className="py-3 px-4 font-semibold">Concepto</th>
                    <th className="py-3 px-4 font-semibold">Observaciones</th>
                    <th className="py-3 px-4 font-semibold text-center w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {currentYearItems.map((item, idx) => {
                    const val = Number(item.valor) || 0;
                    const prevVal = idx > 0 ? Number(currentYearItems[idx - 1].valor) || 0 : 0;
                    const hasData = val > 0;
                    const partPct = totalAnio > 0 && hasData ? ((val / totalAnio) * 100).toFixed(1) : '—';
                    
                    let varMoMText = '—';
                    let varMoMColor = 'text-muted-foreground';
                    if (idx > 0 && prevVal > 0 && hasData) {
                      const diff = val - prevVal;
                      const pct = ((diff / prevVal) * 100).toFixed(1);
                      varMoMText = `${diff >= 0 ? '+' : ''}${pct}%`;
                      varMoMColor = diff >= 0 ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold';
                    }

                    return (
                      <tr
                        key={item.mes}
                        className={`hover:bg-secondary/20 transition-colors ${!hasData ? 'opacity-60 bg-secondary/5' : ''}`}
                      >
                        <td className="py-3 px-4 text-center text-xs text-muted-foreground font-mono">
                          {item.mes}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{item.mes_nombre}</span>
                            {hasData ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                Sin registro
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right number-font font-bold">
                          {hasData ? (
                            <span className="text-emerald-500 dark:text-emerald-400">
                              {formatCOP(val)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">$0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs">
                          {partPct !== '—' ? `${partPct}%` : '—'}
                        </td>
                        <td className={`py-3 px-4 text-right text-xs font-mono ${varMoMColor}`}>
                          {varMoMText}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground max-w-[200px] truncate">
                          {item.concepto || 'Aportes Mensuales FAM'}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground max-w-[200px] truncate">
                          {item.observaciones || '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:bg-primary/10"
                              onClick={() => handleOpenModal(item)}
                              title="Editar ingreso del mes"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {hasData && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-400 hover:bg-rose-500/10 hover:text-rose-500"
                                onClick={() => handleDelete(item)}
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-secondary/40 font-bold">
                    <td colSpan={2} className="py-3.5 px-4 text-foreground uppercase tracking-wider text-xs">
                      TOTAL AÑO {selectedAnio}
                    </td>
                    <td className="py-3.5 px-4 text-right number-font text-base text-emerald-500 dark:text-emerald-400">
                      {formatCOP(totalAnio)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs font-mono text-foreground">
                      100%
                    </td>
                    <td colSpan={4} className="py-3.5 px-4 text-xs text-muted-foreground">
                      Consolidado anual de aportes e ingresos recibidos
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODAL REGISTRAR / EDITAR INGRESO */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center text-white shadow-glow-brand">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {editingIngreso && editingIngreso.valor && editingIngreso.valor > 0
                        ? `Editar Ingreso — ${MONTH_NAMES[formMes - 1]} ${formAnio}`
                        : `Registrar Ingreso Mensual FAM`}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Almacenado directamente en Supabase
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowModal(false)}
                  className="h-8 w-8 rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Año</label>
                    <Input
                      type="number"
                      min={2000}
                      max={2099}
                      value={formAnio}
                      onChange={(e) => setFormAnio(parseInt(e.target.value, 10) || 2026)}
                      className="h-10 text-sm font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Mes</label>
                    <select
                      value={formMes}
                      onChange={(e) => setFormMes(parseInt(e.target.value, 10))}
                      className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {idx + 1}. {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Valor del Ingreso en COP *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="text"
                      placeholder="Ej: 203.926.938"
                      value={formValor}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        if (!raw) {
                          setFormValor('');
                        } else {
                          const num = parseInt(raw, 10);
                          setFormValor(new Intl.NumberFormat('es-CO').format(num));
                        }
                      }}
                      className="h-10 pl-7 text-sm font-bold number-font text-emerald-400 bg-emerald-500/5 border-emerald-500/30 focus:border-emerald-500"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Ingrese el valor total consolidado de los aportes del mes.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Concepto</label>
                  <Input
                    placeholder="Ej: Aportes Mensuales FAM"
                    value={formConcepto}
                    onChange={(e) => setFormConcepto(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Observaciones (Opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="Detalles adicionales, número de recibo o novedades contables..."
                    value={formObservaciones}
                    onChange={(e) => setFormObservaciones(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="gradient-brand text-white shadow-glow-brand"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Guardando...' : 'Guardar Ingreso'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL IMPORTACIÓN EXCEL */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Vista Previa de Importación</h3>
                    <p className="text-xs text-muted-foreground">
                      Se detectaron {importPreview.length} registros en el archivo seleccionado
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowImportModal(false)}
                  className="h-8 w-8 rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-4 flex-1 overflow-auto space-y-3">
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-secondary/40 border-b border-border text-muted-foreground">
                        <th className="py-2 px-3 text-left">Año</th>
                        <th className="py-2 px-3 text-left">Mes</th>
                        <th className="py-2 px-3 text-right">Valor Detectado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-mono">
                      {importPreview.map((item, i) => (
                        <tr key={i} className="hover:bg-secondary/10">
                          <td className="py-2 px-3 font-bold text-foreground">{item.anio}</td>
                          <td className="py-2 px-3 font-sans">{item.mes_nombre}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-400">
                            {formatCOP(item.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  Si ya existen registros para el mismo año y mes, serán actualizados con los nuevos valores del Excel.
                </p>
              </div>

              <div className="p-4 border-t border-border flex items-center justify-end gap-2 bg-secondary/10">
                <Button
                  variant="outline"
                  onClick={() => setShowImportModal(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  className="gradient-brand text-white shadow-glow-brand"
                  disabled={isSaving}
                >
                  {isSaving ? 'Importando...' : 'Confirmar e Importar'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </>
  );
}
