'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Shield,
  Save,
  Loader2,
  Calendar,
  Database,
  Eye,
  Lock,
  CheckCircle,
  XCircle,
  KeyRound,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { dbService, getMockUser } from '@/lib/services/dbService';

export function PerfilView() {
  const [userId, setUserId] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('');
  const [cargo, setCargo] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  
  const isMock = dbService.isMockMode();

  useEffect(() => {
    async function loadData() {
      const user = getMockUser();
      if (user) {
        setUserId(user.id || 'mock-user-id');
        setNombre(user.nombre || 'Administrador SIGFAM');
        setEmail(user.email || 'admin@flotasugamuxi.co');
        setRol(user.rol || 'admin');
        setCargo(user.cargo || '');
        setCreatedAt(user.created_at || new Date('2025-01-01').toISOString());

        // In real mode, fetch updated details directly from Supabase
        if (!isMock) {
          try {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            const { data } = (await supabase
              .from('perfiles')
              .select('nombre, cargo, created_at')
              .eq('id', user.id)
              .single()) as any;
            if (data) {
              setNombre(data.nombre || user.nombre);
              setCargo(data.cargo || '');
              if (data.created_at) setCreatedAt(data.created_at);

              // Update localStorage with fresh data
              const updatedUser = { ...user, nombre: data.nombre || user.nombre, cargo: data.cargo || '' };
              localStorage.setItem('fam_mock_user', JSON.stringify(updatedUser));
            }
          } catch (err) {
            console.error('Error fetching profile in PerfilView:', err);
          }
        }
      }
    }
    loadData();
  }, [isMock]);

  const handleUpdatePerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre no puede estar vacío.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dbService.updatePerfil(userId, {
        nombre: nombre.trim(),
        cargo: cargo.trim(),
        ...(isMock ? { email: email.trim().toLowerCase() } : {}),
      });

      // Synchronize changes to local session state
      const user = getMockUser();
      user.nombre = nombre.trim();
      user.cargo = cargo.trim();
      localStorage.setItem('fam_mock_user', JSON.stringify(user));
      window.dispatchEvent(new Event('storage'));

      toast.success('Perfil actualizado correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el perfil');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Por favor, ingresa tu contraseña actual.');
      return;
    }
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener mínimo 6 caracteres.');
      return;
    }

    setIsChangingPass(true);
    try {
      if (isMock) {
        // Simulate in mock mode
        await new Promise((r) => setTimeout(r, 800));
        toast.success('Contraseña actualizada correctamente (simulación)');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        return;
      }

      // Production: use Supabase client
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // 1. Re-authenticate to verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: currentPassword,
      });
      if (signInError) {
        toast.error('La contraseña actual es incorrecta.');
        return;
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw new Error(updateError.message);

      toast.success('Contraseña actualizada exitosamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar la contraseña');
    } finally {
      setIsChangingPass(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <Shield className="w-3.5 h-3.5" />
            Administrador (Control Total)
          </span>
        );
      case 'analista':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Analista (Escritura/Lectura)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Consultor (Solo Lectura)
          </span>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {/* Profile Overview Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="lg:col-span-1"
      >
        <Card className="border-border bg-card shadow-sm h-full flex flex-col justify-between">
          <CardContent className="pt-8 text-center flex-1 flex flex-col items-center justify-center pb-8">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full gradient-brand text-white flex items-center justify-center font-bold text-3xl shadow-glow-brand uppercase border border-primary/20 mb-4">
              {nombre.charAt(0) || email.charAt(0)}
            </div>

            <h2 className="text-xl font-bold text-foreground mb-1">{nombre}</h2>
            {cargo && <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wide">{cargo}</p>}
            <p className="text-sm font-mono text-muted-foreground mb-4">{email}</p>
            
            <div className="mb-6">{getRoleBadge(rol)}</div>

            <div className="w-full border-t border-border/60 pt-5 space-y-3.5 text-left text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  Miembro desde:
                </span>
                <span className="text-foreground font-semibold">
                  {new Date(createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Database className="w-3.5 h-3.5" />
                  Base de Datos:
                </span>
                <span className={`font-semibold ${isMock ? 'text-amber-400' : 'text-green-400'}`}>
                  {isMock ? 'Simulación (Local)' : 'Supabase (Producción)'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="lg:col-span-2"
      >
        <Card className="border-border bg-card shadow-sm h-full flex flex-col">
          {/* Tab Selector Header */}
          <div className="flex border-b border-border bg-secondary/10 px-6 pt-4 gap-4">
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all relative ${
                activeTab === 'info'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Detalles del Perfil
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all relative ${
                activeTab === 'password'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Cambiar Contraseña
            </button>
          </div>

          {activeTab === 'info' ? (
            <>
              <CardHeader>
                <CardTitle>Detalles del Perfil</CardTitle>
                <CardDescription>
                  Modifica la información de tu cuenta personal en la plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <form onSubmit={handleUpdatePerfil} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-name">Nombre Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="profile-name"
                        className="pl-9 bg-background border-border focus:ring-primary text-foreground"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="profile-cargo">Cargo / Puesto de Trabajo</Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-muted-foreground text-sm">
                        💼
                      </div>
                      <Input
                        id="profile-cargo"
                        className="pl-9 bg-background border-border text-foreground"
                        value={cargo}
                        onChange={(e) => setCargo(e.target.value)}
                        placeholder="Ej: Gerente Administrativo"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="profile-email">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="profile-email"
                        type="email"
                        className="pl-9 bg-background border-border text-foreground disabled:opacity-60"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={!isMock}
                        required
                      />
                    </div>
                    {!isMock && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                        <Lock className="w-3 h-3 text-muted-foreground" />
                        El correo electrónico se gestiona directamente en Supabase Auth y no puede ser modificado aquí.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>ID de Usuario (Sistema)</Label>
                    <Input
                      className="bg-secondary/40 border-border text-muted-foreground font-mono text-xs select-all"
                      value={userId}
                      disabled
                    />
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-border mt-6">
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
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Guardar Cambios
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Cambiar Contraseña</CardTitle>
                <CardDescription>
                  Actualiza tu clave de acceso para proteger tu cuenta.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <form onSubmit={handleUpdatePassword} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-password">Contraseña Actual</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="current-password"
                        type={showPasswords ? "text" : "password"}
                        className="pl-9 pr-9 bg-background border-border text-foreground"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Ingresa tu contraseña actual"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">Nueva Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type={showPasswords ? "text" : "password"}
                        className="pl-9 pr-9 bg-background border-border text-foreground"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showPasswords ? "text" : "password"}
                        className="pl-9 pr-9 bg-background border-border text-foreground"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repite la nueva contraseña"
                        required
                      />
                    </div>
                    {newPassword && confirmPassword && (
                      <div className="flex items-center gap-1 text-[11px] mt-1.5">
                        {newPassword !== confirmPassword ? (
                          <span className="text-red-400 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Las contraseñas no coinciden
                          </span>
                        ) : (
                          <span className="text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Las contraseñas coinciden
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-border mt-6">
                    <Button
                      type="submit"
                      className="gradient-brand text-white shadow-glow-brand"
                      disabled={isChangingPass}
                    >
                      {isChangingPass ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Actualizando...
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4 mr-2" />
                          Actualizar Contraseña
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
