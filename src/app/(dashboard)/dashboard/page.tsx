'use client';
import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { dbService } from '@/lib/services/dbService';
import type { Expediente } from '@/types/database';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <>
      <Header 
        title="Dashboard Ejecutivo" 
        subtitle="FAM — Fondo de Auxilio Mutuo" 
        action={
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        }
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
            <p>Calculando estadísticas en tiempo real...</p>
          </div>
        ) : (
          <>
            <DashboardKPIs expedientes={expedientes} />
            <DashboardCharts expedientes={expedientes} />
          </>
        )}
      </div>
    </>
  );
}
