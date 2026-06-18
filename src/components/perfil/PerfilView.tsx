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
  const [createdAt, setCreatedAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isMock = dbService.isMockMode();

  useEffect(() => {
    const user = getMockUser();
    if (user) {
      setUserId(user.id || 'mock-user-id');
      setNombre(user.nombre || 'Administrador SIGFAM');
      setEmail(user.email || 'admin@flotasugamuxi.co');
      setRol(user.rol || 'admin');
      setCreatedAt(user.created_at || new Date('2025-01-01').toISOString());
    }
  }, []);

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
        ...(isMock ? { email: email.trim().toLowerCase() } : {}),
      });
      toast.success('Perfil actualizado correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el perfil');
    } finally {
      setIsSubmitting(false);
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
        <Card className="border-border bg-card shadow-sm h-full">
          <CardHeader>
            <CardTitle>Detalles del Perfil</CardTitle>
            <CardDescription>
              Modifica la información de tu cuenta personal en la plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
        </Card>
      </motion.div>
    </div>
  );
}
