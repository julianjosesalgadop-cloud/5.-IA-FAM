'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  UserPlus,
  Search,
  Shield,
  CheckCircle,
  XCircle,
  Edit,
  UserCheck,
  UserX,
  Loader2,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { dbService, getMockUser } from '@/lib/services/dbService';
import type { RolUsuario } from '@/types/database';

interface Perfil {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  created_at: string;
}

export function UsuariosView() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPerfil, setSelectedPerfil] = useState<Perfil | null>(null);

  // Form state for creation
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRol, setNewRol] = useState<RolUsuario>('consultor');

  // Form state for editing
  const [editRol, setEditRol] = useState<RolUsuario>('consultor');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMock = dbService.isMockMode();

  const loadPerfiles = async () => {
    setLoading(true);
    toast.loading('Cargando perfiles de usuario...', { id: 'loading-perfiles' });
    try {
      const data = await dbService.getPerfiles();
      setPerfiles(data);
    } catch (err: any) {
      console.error(err);
      toast.error('Error al cargar perfiles de usuario');
    } finally {
      setLoading(false);
      toast.dismiss('loading-perfiles');
    }
  };

  useEffect(() => {
    loadPerfiles();
    setCurrentUser(getMockUser());
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      toast.error('Por favor, completa todos los campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isMock) {
        await dbService.createPerfil({
          nombre: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          rol: newRol,
        });
        toast.success('Usuario creado exitosamente');
        setShowCreateModal(false);
        // Reset
        setNewName('');
        setNewEmail('');
        setNewRol('consultor');
        loadPerfiles();
      } else {
        toast.error('No disponible', {
          description: 'La creación de usuarios en producción debe realizarse desde el Dashboard de Supabase.',
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al crear usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerfil) return;

    setIsSubmitting(true);
    try {
      await dbService.updatePerfil(selectedPerfil.id, { rol: editRol });
      toast.success(`Rol de ${selectedPerfil.nombre} actualizado a ${editRol}`);
      setShowEditModal(false);
      loadPerfiles();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el rol');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActivo = async (perfil: Perfil) => {
    if (currentUser?.id === perfil.id) {
      toast.error('No puedes desactivar tu propio usuario.');
      return;
    }

    try {
      await dbService.togglePerfilActivo(perfil.id);
      toast.success(`Usuario ${perfil.activo ? 'desactivado' : 'activado'} correctamente`);
      loadPerfiles();
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar estado del usuario');
    }
  };

  const filteredPerfiles = perfiles.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.nombre?.toLowerCase().includes(query) ||
      p.email?.toLowerCase().includes(query)
    );
  });

  const getRoleBadge = (role: RolUsuario) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <Shield className="w-3.5 h-3.5" />
            Administrador
          </span>
        );
      case 'analista':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Analista
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Consultor
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/40 border border-border p-4 rounded-xl backdrop-blur-sm shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o correo..."
            className="pl-9 bg-background/50 border-border focus:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto gradient-brand text-white shadow-glow-brand"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Agregar Usuario
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="border-border bg-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle>Usuarios Registrados</CardTitle>
          <CardDescription>
            Lista de perfiles con acceso al sistema y sus correspondientes privilegios.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm">Cargando perfiles...</p>
            </div>
          ) : filteredPerfiles.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No se encontraron usuarios para la búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/20 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    <th className="px-6 py-4">Usuario / Nombre</th>
                    <th className="px-6 py-4">Correo Electrónico</th>
                    <th className="px-6 py-4">Rol</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Fecha Creación</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPerfiles.map((perfil) => (
                    <tr key={perfil.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase border border-primary/20">
                            {perfil.nombre?.charAt(0) || perfil.email.charAt(0)}
                          </div>
                          <span className="font-semibold text-foreground">{perfil.nombre || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{perfil.email}</td>
                      <td className="px-6 py-4">{getRoleBadge(perfil.rol)}</td>
                      <td className="px-6 py-4">
                        {perfil.activo ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                            <XCircle className="w-3 h-3" />
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {perfil.created_at ? new Date(perfil.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                            title="Editar rol"
                            onClick={() => {
                              setSelectedPerfil(perfil);
                              setEditRol(perfil.rol);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-lg ${
                              perfil.activo
                                ? 'text-red-400 hover:text-red-500 hover:bg-red-500/10'
                                : 'text-green-400 hover:text-green-500 hover:bg-green-500/10'
                            }`}
                            title={perfil.activo ? 'Desactivar usuario' : 'Activar usuario'}
                            disabled={currentUser?.id === perfil.id}
                            onClick={() => handleToggleActivo(perfil)}
                          >
                            {perfil.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border bg-secondary/10 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Agregar Nuevo Usuario
                </h3>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                {!isMock && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg p-3 text-xs flex gap-2.5">
                    <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Nota de Producción:</strong> Los perfiles reales se crean registrando al usuario en Supabase Auth. Esta simulación insertará perfiles locales temporales.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="user-name">Nombre Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="user-name"
                      placeholder="Ej: Juan Pérez"
                      className="pl-9 bg-background border-border"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="user-email">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="user-email"
                      type="email"
                      placeholder="ejemplo@flotasugamuxi.co"
                      className="pl-9 bg-background border-border"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="user-role">Rol del Sistema</Label>
                  <select
                    id="user-role"
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    value={newRol}
                    onChange={(e) => setNewRol(e.target.value as RolUsuario)}
                  >
                    <option value="consultor">Consultor (Lectura)</option>
                    <option value="analista">Analista (Lectura/Escritura)</option>
                    <option value="admin">Administrador (Control Total)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="gradient-brand text-white shadow-glow-brand"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creando...
                      </>
                    ) : (
                      'Crear Usuario'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {showEditModal && selectedPerfil && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border bg-secondary/10 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Editar Rol de Usuario
                </h3>
              </div>

              <form onSubmit={handleUpdateRol} className="p-6 space-y-4">
                <div className="bg-secondary/40 rounded-lg p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">Usuario seleccionado:</p>
                  <p>• Nombre: <span className="text-foreground">{selectedPerfil.nombre || '—'}</span></p>
                  <p>• Correo: <span className="text-foreground">{selectedPerfil.email}</span></p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-role">Nuevo Rol Asignado</Label>
                  <select
                    id="edit-user-role"
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    value={editRol}
                    onChange={(e) => setEditRol(e.target.value as RolUsuario)}
                  >
                    <option value="consultor">Consultor (Lectura)</option>
                    <option value="analista">Analista (Lectura/Escritura)</option>
                    <option value="admin">Administrador (Control Total)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="gradient-brand text-white shadow-glow-brand"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar Cambios'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
