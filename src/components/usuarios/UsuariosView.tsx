'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  UserPlus,
  Search,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit3,
  UserCheck,
  UserX,
  Loader2,
  KeyRound,
  Mail,
  User,
  Briefcase,
  CreditCard,
  Eye,
  EyeOff,
  AlertTriangle,
  Users,
  RotateCcw,
  Copy,
  Check,
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
  cargo?: string | null;
  tipo_documento?: string | null;
  numero_documento?: string | null;
  must_change_password?: boolean;
  created_at: string;
}

export function UsuariosView() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const isMock = dbService.isMockMode();

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedPerfil, setSelectedPerfil] = useState<Perfil | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRol, setNewRol] = useState<RolUsuario>('consultor');
  const [newCargo, setNewCargo] = useState('');
  const [newTipoDoc, setNewTipoDoc] = useState('CC');
  const [newNumDoc, setNewNumDoc] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [newMustChange, setNewMustChange] = useState(true);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Edit form state
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCargo, setEditCargo] = useState('');
  const [editRol, setEditRol] = useState<RolUsuario>('consultor');
  const [editActivo, setEditActivo] = useState(true);
  const [editTipoDoc, setEditTipoDoc] = useState('CC');
  const [editNumDoc, setEditNumDoc] = useState('');

  // Password reset modal state
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetMustChange, setResetMustChange] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const loadPerfiles = async () => {
    setLoading(true);
    toast.loading('Cargando usuarios...', { id: 'loading-perfiles' });
    try {
      const data = await dbService.getPerfiles();
      setPerfiles(data);
    } catch (err: any) {
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

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    toast.success('Correo copiado al portapapeles');
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const resetCreateForm = () => {
    setNewName('');
    setNewEmail('');
    setNewRol('consultor');
    setNewCargo('');
    setNewTipoDoc('CC');
    setNewNumDoc('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setNewMustChange(true);
    setShowNewPassword(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      toast.error('Por favor, completa los campos obligatorios.');
      return;
    }
    if (!isMock) {
      if (!newPassword.trim()) {
        toast.error('La contraseña es obligatoria en modo producción.');
        return;
      }
      if (newPassword !== newPasswordConfirm) {
        toast.error('Las contraseñas no coinciden.');
        return;
      }
      if (newPassword.length < 6) {
        toast.error('La contraseña debe tener mínimo 6 caracteres.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await dbService.createPerfil({
        nombre: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        rol: newRol,
        cargo: newCargo.trim() || undefined,
        tipo_documento: newTipoDoc || undefined,
        numero_documento: newNumDoc.trim() || undefined,
        password: newPassword || undefined,
        must_change_password: newMustChange,
      });
      toast.success('Usuario creado exitosamente');
      setShowCreateModal(false);
      resetCreateForm();
      loadPerfiles();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerfil) return;
    if (!editNombre.trim() || !editEmail.trim()) {
      toast.error('Por favor, completa los campos obligatorios.');
      return;
    }
    setIsSubmitting(true);
    try {
      await dbService.updatePerfil(selectedPerfil.id, {
        nombre: editNombre.trim(),
        email: editEmail.trim().toLowerCase(),
        rol: editRol,
        activo: editActivo,
        cargo: editCargo.trim() || null,
        tipo_documento: editTipoDoc || null,
        numero_documento: editNumDoc.trim() || null,
      });
      toast.success(`Información de ${editNombre} actualizada correctamente`);
      setShowEditModal(false);
      loadPerfiles();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerfil) return;
    if (!resetPassword.trim()) {
      toast.error('Ingresa la nueva contraseña.');
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    if (resetPassword.length < 6) {
      toast.error('La contraseña debe tener mínimo 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dbService.resetPasswordAdmin(selectedPerfil.id, resetPassword, resetMustChange);
      toast.success(
        isMock
          ? `Contraseña simulada cambiada para ${selectedPerfil.nombre}`
          : `Contraseña cambiada correctamente para ${selectedPerfil.nombre}`
      );
      setShowPasswordModal(false);
      setResetPassword('');
      setResetPasswordConfirm('');
      setResetMustChange(false);
      setShowResetPassword(false);
      loadPerfiles();
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar la contraseña');
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

  // Metrics
  const totalUsers = perfiles.length;
  const activeUsers = perfiles.filter((p) => p.activo).length;
  const inactiveUsers = perfiles.filter((p) => !p.activo).length;
  const adminAnalystCount = perfiles.filter((p) => p.rol === 'admin' || p.rol === 'analista').length;

  const filteredPerfiles = perfiles.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      p.nombre?.toLowerCase().includes(query) ||
      p.email?.toLowerCase().includes(query) ||
      p.cargo?.toLowerCase().includes(query) ||
      p.numero_documento?.toLowerCase().includes(query);

    const matchesRole = roleFilter === 'todos' || p.rol === roleFilter;
    const matchesStatus =
      statusFilter === 'todos' ||
      (statusFilter === 'activos' && p.activo) ||
      (statusFilter === 'inactivos' && !p.activo);

    return matchesQuery && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: RolUsuario) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Shield className="w-3.5 h-3.5" />
            Administrador
          </span>
        );
      case 'analista':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <UserCheck className="w-3.5 h-3.5" />
            Analista
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Eye className="w-3.5 h-3.5" />
            Consultor
          </span>
        );
    }
  };

  const getAvatarBg = (role: RolUsuario) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-br from-rose-500/20 to-rose-600/30 text-rose-600 dark:text-rose-300 border-rose-500/30';
      case 'analista':
        return 'bg-gradient-to-br from-amber-500/20 to-amber-600/30 text-amber-600 dark:text-amber-300 border-amber-500/30';
      default:
        return 'bg-gradient-to-br from-blue-500/20 to-blue-600/30 text-blue-600 dark:text-blue-300 border-blue-500/30';
    }
  };

  const inputWithIcon = 'pl-9 bg-background border-border';
  const iconClass = 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground';

  if (currentUser && currentUser.rol !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-card border border-border rounded-xl">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-foreground mb-2">Acceso Denegado</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          No tienes permisos para visualizar ni ingresar al módulo de Gestión de Usuarios. Solo los administradores tienen acceso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Metric KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Users */}
        <Card className="relative overflow-hidden bg-card border-border shadow-sm flex flex-col justify-between h-full w-full min-h-[105px] transition-all duration-200 hover:shadow-md">
          <CardHeader className="p-3 px-3.5 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Total Registrados</span>
              <Users className="w-4 h-4 text-slate-400" />
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-primary mt-0.5">
              {totalUsers}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-2.5 pt-0">
            <div className="flex items-center justify-between text-[11px] border-t border-border/40 pt-1.5 mt-0.5">
              <span className="text-muted-foreground text-[10.5px]">Cuentas en plataforma</span>
              <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">SIGFAM</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Active Users */}
        <Card className="relative overflow-hidden bg-card border-border shadow-sm flex flex-col justify-between h-full w-full min-h-[105px] transition-all duration-200 hover:shadow-md">
          <CardHeader className="p-3 px-3.5 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Usuarios Activos</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 mt-0.5">
              {activeUsers}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-2.5 pt-0">
            <div className="flex items-center justify-between text-[11px] border-t border-border/40 pt-1.5 mt-0.5">
              <span className="text-muted-foreground text-[10.5px]">Con acceso habilitado</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10">
                {totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0}% del total
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Inactive Users */}
        <Card className="relative overflow-hidden bg-card border-border shadow-sm flex flex-col justify-between h-full w-full min-h-[105px] transition-all duration-200 hover:shadow-md">
          <CardHeader className="p-3 px-3.5 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Usuarios Inactivos</span>
              <XCircle className="w-4 h-4 text-slate-400" />
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-500 mt-0.5">
              {inactiveUsers}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-2.5 pt-0">
            <div className="flex items-center justify-between text-[11px] border-t border-border/40 pt-1.5 mt-0.5">
              <span className="text-muted-foreground text-[10.5px]">Acceso bloqueado</span>
              <span className="text-[10px] font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-500/10">
                {inactiveUsers} inactivos
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Privileged Roles */}
        <Card className="relative overflow-hidden bg-card border-border shadow-sm flex flex-col justify-between h-full w-full min-h-[105px] transition-all duration-200 hover:shadow-md">
          <CardHeader className="p-3 px-3.5 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Admins y Analistas</span>
              <ShieldCheck className="w-4 h-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400 mt-0.5">
              {adminAnalystCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-2.5 pt-0">
            <div className="flex items-center justify-between text-[11px] border-t border-border/40 pt-1.5 mt-0.5">
              <span className="text-muted-foreground text-[10.5px]">Permiso de edición</span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10">
                Gestión avanzada
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Controls & Filters Toolbar ───────────────────────────────────────── */}
      <div className="bg-card border border-border p-3 sm:p-3.5 rounded-xl flex flex-wrap items-end gap-2.5 sm:gap-3 shadow-sm">
        {/* Search */}
        <div className="flex-1 min-w-[200px] sm:min-w-[260px] space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Buscar Usuario</span>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, correo, cargo o documento..."
              className="pl-8 h-9 text-xs bg-background/50 border-border focus:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Role Filter */}
        <div className="w-[130px] sm:w-[150px] space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Filtrar por Rol</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          >
            <option value="todos">Todos los Roles</option>
            <option value="admin">Administrador</option>
            <option value="analista">Analista</option>
            <option value="consultor">Consultor</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-[130px] sm:w-[150px] space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Filtrar por Estado</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          >
            <option value="todos">Todos los Estados</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>

        {/* Clear Filters button if any active */}
        {(searchQuery || roleFilter !== 'todos' || statusFilter !== 'todos') && (
          <Button
            variant="outline"
            size="sm"
            title="Limpiar filtros"
            onClick={() => {
              setSearchQuery('');
              setRoleFilter('todos');
              setStatusFilter('todos');
            }}
            className="h-9 px-2.5 text-xs text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 shrink-0 flex items-center gap-1.5 rounded-lg font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Limpiar</span>
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1 hidden md:block" />

        {/* Add User Button */}
        {currentUser?.rol === 'admin' && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="h-9 px-3.5 text-xs gradient-brand text-white shadow-glow-brand font-semibold rounded-lg shrink-0"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Agregar Usuario
          </Button>
        )}
      </div>

      {/* ─── Main Table Card ─────────────────────────────────────────────────── */}
      <Card className="border-border bg-card overflow-hidden shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Perfiles de Usuario
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Mostrando {filteredPerfiles.length} de {perfiles.length} usuarios registrados en la plataforma.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-xs font-medium">Cargando perfiles de usuario...</p>
            </div>
          ) : filteredPerfiles.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              No se encontraron usuarios que coincidan con los criterios de búsqueda o filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[920px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3 px-4 w-[25%]">Usuario / Documento</th>
                    <th className="py-3 px-4 w-[23%]">Correo Electrónico</th>
                    <th className="py-3 px-4 w-[18%]">Cargo / Función</th>
                    <th className="py-3 px-4 w-[14%]">Rol</th>
                    <th className="py-3 px-4 w-[10%]">Estado</th>
                    <th className="py-3 px-4 w-[10%]">Creación</th>
                    <th className="py-3 px-4 text-right w-[110px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredPerfiles.map((perfil) => (
                    <tr
                      key={perfil.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Usuario / Documento */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase border shadow-sm ${getAvatarBg(
                                perfil.rol
                              )}`}
                            >
                              {perfil.nombre?.charAt(0) || perfil.email.charAt(0)}
                            </div>
                            {perfil.must_change_password && (
                              <span
                                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center shadow"
                                title="Debe cambiar contraseña en su próximo inicio de sesión"
                              >
                                <KeyRound className="w-2 h-2 text-white" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground text-xs leading-tight truncate">
                              {perfil.nombre || '—'}
                            </p>
                            {perfil.numero_documento ? (
                              <span className="inline-block mt-0.5 text-[10.5px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40 font-mono">
                                {perfil.tipo_documento ? `${perfil.tipo_documento}: ` : ''}
                                {perfil.numero_documento}
                              </span>
                            ) : (
                              <p className="text-[10.5px] text-muted-foreground italic">Sin documento</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Correo Electrónico */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="text-xs text-foreground/90 font-normal truncate max-w-[210px]"
                            title={perfil.email}
                          >
                            {perfil.email}
                          </span>
                          <button
                            onClick={() => handleCopyEmail(perfil.email)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary p-1 rounded"
                            title="Copiar correo"
                          >
                            {copiedEmail === perfil.email ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Cargo / Función */}
                      <td className="py-3 px-4">
                        <p className="text-xs text-muted-foreground leading-snug truncate max-w-[190px]" title={perfil.cargo || '—'}>
                          {perfil.cargo || '—'}
                        </p>
                      </td>

                      {/* Rol */}
                      <td className="py-3 px-4 whitespace-nowrap">{getRoleBadge(perfil.rol)}</td>

                      {/* Estado */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {perfil.activo ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" /> Inactivo
                          </span>
                        )}
                      </td>

                      {/* Creación */}
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {perfil.created_at ? new Date(perfil.created_at).toLocaleDateString('es-CO') : '—'}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {currentUser?.rol === 'admin' ? (
                          <div className="flex items-center justify-end gap-1">
                            {/* Editar Usuario */}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md border-border/60"
                              title="Editar usuario"
                              onClick={() => {
                                setSelectedPerfil(perfil);
                                setEditNombre(perfil.nombre || '');
                                setEditEmail(perfil.email || '');
                                setEditCargo(perfil.cargo || '');
                                setEditRol(perfil.rol);
                                setEditActivo(perfil.activo);
                                setEditTipoDoc(perfil.tipo_documento || 'CC');
                                setEditNumDoc(perfil.numero_documento || '');
                                setShowEditModal(true);
                              }}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>

                            {/* Cambiar Contraseña */}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 border-amber-500/20 rounded-md"
                              title="Cambiar contraseña"
                              onClick={() => {
                                setSelectedPerfil(perfil);
                                setResetPassword('');
                                setResetPasswordConfirm('');
                                setResetMustChange(false);
                                setShowResetPassword(false);
                                setShowPasswordModal(true);
                              }}
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </Button>

                            {/* Toggle Activo */}
                            <Button
                              variant="outline"
                              size="icon"
                              className={`h-7 w-7 rounded-md border ${
                                perfil.activo
                                  ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/20'
                                  : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20'
                              }`}
                              title={perfil.activo ? 'Desactivar usuario' : 'Activar usuario'}
                              disabled={currentUser?.id === perfil.id}
                              onClick={() => handleToggleActivo(perfil)}
                            >
                              {perfil.activo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">Solo lectura</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════ CREATE USER MODAL ══════════════════════ */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border bg-secondary/10 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Agregar Nuevo Usuario
                </h3>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Nombre */}
                <div className="space-y-1.5">
                  <Label htmlFor="user-name" className="text-xs">Nombre Completo <span className="text-rose-500">*</span></Label>
                  <div className="relative">
                    <User className={iconClass} />
                    <Input id="user-name" placeholder="Ej: Juan Pérez" className={inputWithIcon}
                      value={newName} onChange={(e) => setNewName(e.target.value)} required />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="user-email" className="text-xs">Correo Electrónico <span className="text-rose-500">*</span></Label>
                  <div className="relative">
                    <Mail className={iconClass} />
                    <Input id="user-email" type="email" placeholder="ejemplo@flotasugamuxi.co"
                      className={inputWithIcon} value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)} required />
                  </div>
                </div>

                {/* Documento — Tipo + Número */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Documento de Identidad</Label>
                  <div className="flex gap-2">
                    <select
                      id="user-tipo-doc"
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground flex-shrink-0 w-[120px]"
                      value={newTipoDoc}
                      onChange={(e) => setNewTipoDoc(e.target.value)}
                    >
                      <option value="CC">CC</option>
                      <option value="TI">TI</option>
                      <option value="CE">CE</option>
                      <option value="Pasaporte">Pasaporte</option>
                      <option value="NIT">NIT</option>
                      <option value="Otro">Otro</option>
                    </select>
                    <div className="relative flex-1">
                      <CreditCard className={iconClass} />
                      <Input
                        id="user-doc"
                        placeholder="Número de documento"
                        className={inputWithIcon}
                        value={newNumDoc}
                        onChange={(e) => setNewNumDoc(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Cargo */}
                <div className="space-y-1.5">
                  <Label htmlFor="user-cargo" className="text-xs">Cargo</Label>
                  <div className="relative">
                    <Briefcase className={iconClass} />
                    <Input id="user-cargo" placeholder="Ej: Analista FAM" className={inputWithIcon}
                      value={newCargo} onChange={(e) => setNewCargo(e.target.value)} />
                  </div>
                </div>

                {/* Rol */}
                <div className="space-y-1.5">
                  <Label htmlFor="user-role" className="text-xs">Rol del Sistema <span className="text-rose-500">*</span></Label>
                  <select id="user-role"
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    value={newRol} onChange={(e) => setNewRol(e.target.value as RolUsuario)}>
                    <option value="consultor">Consultor (Solo lectura)</option>
                    <option value="analista">Analista (Lectura y escritura)</option>
                    <option value="admin">Administrador (Control total)</option>
                  </select>
                </div>

                {/* Password fields — only relevant in production */}
                {!isMock && (
                  <div className="space-y-3 border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Contraseña inicial</p>

                    <div className="space-y-1.5">
                      <Label htmlFor="user-password" className="text-xs">Contraseña Temporal <span className="text-rose-500">*</span></Label>
                      <div className="relative">
                        <Input id="user-password" type={showNewPassword ? 'text' : 'password'}
                          placeholder="Mínimo 6 caracteres" className="pr-10 bg-background border-border"
                          value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        <button type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="user-password-confirm" className="text-xs">Confirmar Contraseña <span className="text-rose-500">*</span></Label>
                      <Input id="user-password-confirm" type="password" placeholder="Repite la contraseña"
                        className="bg-background border-border" value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)} />
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input type="checkbox" className="w-4 h-4 rounded accent-amber-500"
                        checked={newMustChange} onChange={(e) => setNewMustChange(e.target.checked)} />
                      <div>
                        <p className="text-xs text-foreground">Forzar cambio en primer inicio de sesión</p>
                        <p className="text-[11px] text-muted-foreground">El usuario deberá crear una nueva contraseña al ingresar.</p>
                      </div>
                    </label>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                    disabled={isSubmitting}>Cancelar</Button>
                  <Button type="submit" className="gradient-brand text-white shadow-glow-brand" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creando...</> : 'Crear Usuario'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════ EDIT USER MODAL ══════════════════════ */}
      <AnimatePresence>
        {showEditModal && selectedPerfil && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border bg-secondary/10 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-primary" />
                  Editar Información de Usuario
                </h3>
              </div>

              <form onSubmit={handleUpdateUser} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Nombre */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-name" className="text-xs">Nombre Completo <span className="text-rose-500">*</span></Label>
                  <div className="relative">
                    <User className={iconClass} />
                    <Input id="edit-user-name" placeholder="Ej: Juan Pérez" className={inputWithIcon}
                      value={editNombre} onChange={(e) => setEditNombre(e.target.value)} required />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-email" className="text-xs">Correo Electrónico <span className="text-rose-500">*</span></Label>
                  <div className="relative">
                    <Mail className={iconClass} />
                    <Input id="edit-user-email" type="email" placeholder="ejemplo@flotasugamuxi.co"
                      className={inputWithIcon} value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)} required />
                  </div>
                </div>

                {/* Documento — Tipo + Número */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Documento de Identidad</Label>
                  <div className="flex gap-2">
                    <select
                      id="edit-user-tipo-doc"
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground flex-shrink-0 w-[120px]"
                      value={editTipoDoc}
                      onChange={(e) => setEditTipoDoc(e.target.value)}
                    >
                      <option value="CC">CC</option>
                      <option value="TI">TI</option>
                      <option value="CE">CE</option>
                      <option value="Pasaporte">Pasaporte</option>
                      <option value="NIT">NIT</option>
                      <option value="Otro">Otro</option>
                    </select>
                    <div className="relative flex-1">
                      <CreditCard className={iconClass} />
                      <Input
                        id="edit-user-doc"
                        placeholder="Número de documento"
                        className={inputWithIcon}
                        value={editNumDoc}
                        onChange={(e) => setEditNumDoc(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Cargo */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-cargo" className="text-xs">Cargo</Label>
                  <div className="relative">
                    <Briefcase className={iconClass} />
                    <Input id="edit-user-cargo" placeholder="Ej: Analista FAM" className={inputWithIcon}
                      value={editCargo} onChange={(e) => setEditCargo(e.target.value)} />
                  </div>
                </div>

                {/* Rol */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-role" className="text-xs">Rol del Sistema <span className="text-rose-500">*</span></Label>
                  <select id="edit-user-role"
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    value={editRol} onChange={(e) => setEditRol(e.target.value as RolUsuario)}>
                    <option value="consultor">Consultor (Solo lectura)</option>
                    <option value="analista">Analista (Lectura y escritura)</option>
                    <option value="admin">Administrador (Control total)</option>
                  </select>
                </div>

                {/* Estado */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-status" className="text-xs">Estado del Usuario <span className="text-rose-500">*</span></Label>
                  <select id="edit-user-status"
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    value={editActivo ? "activo" : "inactivo"} 
                    onChange={(e) => setEditActivo(e.target.value === "activo")}
                    disabled={currentUser?.id === selectedPerfil.id}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                  {currentUser?.id === selectedPerfil.id && (
                    <p className="text-[10px] text-amber-500">No puedes desactivar tu propio usuario en sesión.</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}
                    disabled={isSubmitting}>Cancelar</Button>
                  <Button type="submit" className="gradient-brand text-white shadow-glow-brand" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</> : 'Guardar Cambios'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════ CHANGE PASSWORD MODAL ══════════════════════ */}
      <AnimatePresence>
        {showPasswordModal && selectedPerfil && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border bg-secondary/10">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-500" />
                  Cambiar Contraseña
                </h3>
              </div>

              <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                {/* User info */}
                <div className="bg-secondary/40 rounded-lg p-3 text-xs text-muted-foreground border border-border/50">
                  <p className="font-semibold text-foreground mb-1">Cambiando contraseña de:</p>
                  <p>• Nombre: <span className="text-foreground font-medium">{selectedPerfil.nombre || '—'}</span></p>
                  <p>• Correo: <span className="text-foreground font-medium">{selectedPerfil.email}</span></p>
                </div>

                {isMock && (
                  <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg p-3 text-xs flex gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>En modo de demostración, esta acción es simulada y no cambia contraseñas reales.</p>
                  </div>
                )}

                {/* New password */}
                <div className="space-y-1.5">
                  <Label htmlFor="reset-password" className="text-xs">Nueva Contraseña <span className="text-rose-500">*</span></Label>
                  <div className="relative">
                    <Input id="reset-password"
                      type={showResetPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      className="pr-10 bg-background border-border"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)} />
                    <button type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <Label htmlFor="reset-password-confirm" className="text-xs">Confirmar Nueva Contraseña <span className="text-rose-500">*</span></Label>
                  <Input id="reset-password-confirm" type="password"
                    placeholder="Repite la nueva contraseña"
                    className="bg-background border-border"
                    value={resetPasswordConfirm}
                    onChange={(e) => setResetPasswordConfirm(e.target.value)} />
                  {resetPasswordConfirm && resetPassword !== resetPasswordConfirm && (
                    <p className="text-xs text-rose-500 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Las contraseñas no coinciden
                    </p>
                  )}
                  {resetPasswordConfirm && resetPassword === resetPasswordConfirm && resetPassword.length >= 6 && (
                    <p className="text-xs text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Las contraseñas coinciden
                    </p>
                  )}
                </div>

                {/* Force change checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors">
                  <input type="checkbox" className="w-4 h-4 rounded accent-amber-500 mt-0.5"
                    checked={resetMustChange} onChange={(e) => setResetMustChange(e.target.checked)} />
                  <div>
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Forzar cambio en próximo inicio de sesión</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Al activar esta opción, el usuario deberá crear una nueva contraseña la próxima vez que inicie sesión.
                    </p>
                  </div>
                </label>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="outline"
                    onClick={() => { setShowPasswordModal(false); setResetPassword(''); setResetPasswordConfirm(''); }}
                    disabled={isSubmitting}>Cancelar</Button>
                  <Button type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                    disabled={isSubmitting || resetPassword !== resetPasswordConfirm || resetPassword.length < 6}>
                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Cambiando...</> : 'Cambiar Contraseña'}
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

