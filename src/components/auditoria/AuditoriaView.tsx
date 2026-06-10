'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, User, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import type { AuditoriaEntry } from '@/types/database';
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

export function AuditoriaView() {
  const [currentUser] = useState(() => getMockUser());
  const [logs, setLogs] = useState<AuditoriaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await dbService.getAuditoria();
      setLogs(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar logs de auditoría');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((entry) => {
    const term = search.toLowerCase();
    return (
      !search ||
      entry.usuario_email?.toLowerCase().includes(term) ||
      entry.accion?.toLowerCase().includes(term) ||
      entry.campo_modificado?.toLowerCase().includes(term) ||
      entry.valor_nuevo?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Search and Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuario, acción, valor..."
            className="pl-9 bg-background border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="auditoria-search"
            autoComplete="off"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refrescar logs
        </Button>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
          Cargando log de auditoría...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border bg-card p-12 text-center text-muted-foreground">
          No hay registros de auditoría que coincidan con la búsqueda.
        </Card>
      ) : (
        <div className="relative space-y-0">
          <div className="absolute left-6 top-8 bottom-8 w-px bg-border" />
          <AnimatePresence>
            {filtered.map((entry, i) => (
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
                        <div className="flex items-center gap-2">
                          <Badge variant={ACCION_COLORS[entry.accion || ''] as any}>
                            {ACCION_LABELS[entry.accion || ''] || entry.accion}
                          </Badge>
                          {entry.expediente_id && (
                            <span className="text-xs font-mono text-primary font-bold">SIGFAM Case Ref: {entry.expediente_id}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>{entry.usuario_email || 'Sistema'}</span>
                        </div>
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
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
