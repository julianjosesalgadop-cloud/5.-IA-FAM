'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Tag, Plus, Trash2, Eye, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ROLES_USUARIO } from '@/lib/constants';
import type { RolUsuario } from '@/types/database';
import { getMockUser, setMockUser } from '@/lib/services/dbService';
import { useRouter } from 'next/navigation';

export function ConfiguracionView() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(getMockUser());
  const [catalogos, setCatalogos] = useState<string[]>([]);
  const [newCatalogo, setNewCatalogo] = useState('');

  if (currentUser.rol !== 'admin' && currentUser.rol !== 'consultor') {
    return (
      <Card className="max-w-4xl border-destructive bg-destructive/5 p-6 text-center">
        <CardHeader>
          <CardTitle className="text-destructive font-bold text-xl">Acceso Denegado</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            No tiene permisos para acceder al módulo de configuración.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4">
          <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
            Volver al Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Load custom catalog (causa raiz) from localStorage so it persists
  useEffect(() => {
    const stored = localStorage.getItem('fam_config_causas');
    if (stored) {
      setCatalogos(JSON.parse(stored));
    } else {
      const defaultCausas = [
        'Error humano',
        'Exceso de velocidad',
        'Maniobra indebida',
        'Condiciones climáticas',
        'Falla mecánica',
        'Tercero involucrado',
      ];
      setCatalogos(defaultCausas);
      localStorage.setItem('fam_config_causas', JSON.stringify(defaultCausas));
    }
  }, []);

  const addCatalogo = () => {
    if (!newCatalogo.trim()) return;
    if (catalogos.includes(newCatalogo.trim())) {
      toast.warning('Esta causa ya existe');
      return;
    }
    const updated = [...catalogos, newCatalogo.trim()];
    setCatalogos(updated);
    localStorage.setItem('fam_config_causas', JSON.stringify(updated));
    setNewCatalogo('');
    toast.success('Nueva causa de comité añadida');
  };

  const removeCatalogo = (name: string) => {
    const updated = catalogos.filter((c) => c !== name);
    setCatalogos(updated);
    localStorage.setItem('fam_config_causas', JSON.stringify(updated));
    toast.success('Causa de comité eliminada');
  };

  const handleRoleSimulation = (role: RolUsuario) => {
    const user = setMockUser(role);
    setCurrentUser(user);
    toast.success(`Rol cambiado a: ${ROLES_USUARIO[role].label}`, {
      description: 'Los permisos de la interfaz se han actualizado.',
    });
    // Force refresh navbar or other items if needed
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Role Simulator */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Simulador de Roles de Usuario
            </CardTitle>
            <CardDescription>
              Permite simular diferentes permisos y RLS para ver cómo reacciona la interfaz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {(['admin', 'analista', 'consultor'] as RolUsuario[]).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleSimulation(role)}
                  className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                    currentUser.rol === role
                      ? 'gradient-brand text-white border-transparent shadow-glow-brand'
                      : 'bg-card border-border text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                  }`}
                >
                  {ROLES_USUARIO[role].label}
                </button>
              ))}
            </div>
            <div className="rounded-lg bg-card border border-border p-3 text-xs text-muted-foreground">
              <p>
                <strong>Admin:</strong> Acceso completo (Crear, Editar, Eliminar, Configuración).<br />
                <strong>Analista:</strong> Lectura y escritura. No puede eliminar expedientes ni documentos.<br />
                <strong>Consultor:</strong> Solo lectura. No puede crear ni editar expedientes, ni subir documentos.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Users info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="w-5 h-5 text-primary" />
              Gestión de Cuentas de Usuario
            </CardTitle>
            <CardDescription>Administración de perfiles, permisos y acceso al sistema</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-sm text-muted-foreground mb-4">
              Para agregar nuevos usuarios, cambiar sus roles (Administrador, Analista, Consultor) o suspender/activar el acceso de cualquier perfil, ve al módulo dedicado de gestión de usuarios.
            </p>
            <Button
              onClick={() => router.push('/usuarios')}
              className="gradient-brand text-white shadow-glow-brand"
            >
              <Users className="w-4 h-4 mr-2" />
              Ir a Gestión de Usuarios
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Catalogos */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Tag className="w-5 h-5 text-primary" />
              Catálogos — Causas Raíz
            </CardTitle>
            <CardDescription>Administra los valores para causa raíz del comité</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {catalogos.map((cat) => (
                <div key={cat} className="group flex items-center gap-1.5 bg-secondary border border-border rounded-full pl-3 pr-2 py-1">
                  <span className="text-xs font-semibold text-foreground">{cat}</span>
                  {currentUser.rol === 'admin' && (
                    <button
                      onClick={() => removeCatalogo(cat)}
                      className="w-4 h-4 rounded-full bg-transparent hover:bg-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-2.5 h-2.5 text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {currentUser.rol === 'admin' && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Nueva causa raíz..."
                  value={newCatalogo}
                  onChange={(e) => setNewCatalogo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCatalogo()}
                  className="max-w-sm bg-background border-border"
                  id="config-new-catalogo-input"
                />
                <Button onClick={addCatalogo} size="sm" id="config-add-catalogo-btn">
                  <Plus className="w-4 h-4" />
                  Añadir
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* System info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Información del Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ['Aplicación', 'SIGFAM v0.1.0'],
              ['Empresa', 'Flota Sugamuxi S.A.'],
              ['Base de datos', 'Supabase (PostgreSQL)'],
              ['Autenticación', 'Supabase Auth'],
              ['Almacenamiento', 'Supabase Storage'],
            ].map(([key, val]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-border/80 last:border-0">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-semibold text-foreground">{val}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
