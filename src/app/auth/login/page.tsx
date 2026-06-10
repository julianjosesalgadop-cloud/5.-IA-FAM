'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { LogIn, Bus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { dbService, setMockUser } from '@/lib/services/dbService';
import { createClient } from '@/lib/supabase/client';
import type { RolUsuario } from '@/types/database';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const isMock = dbService.isMockMode();
      let role: RolUsuario = 'consultor';
      let name = 'Consultor Invitado';

      if (isMock) {
        if (data.email.toLowerCase().includes('admin')) {
          role = 'admin';
          name = 'Administrador SIGFAM';
        } else if (data.email.toLowerCase().includes('analista')) {
          role = 'analista';
          name = 'Analista de Casos';
        }
        await new Promise((r) => setTimeout(r, 1000));
        setMockUser(role, name);
      } else {
        // Autenticación real de Supabase
        const supabase = createClient();
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (authError) {
          throw new Error(authError.message);
        }

        if (!authData.user) {
          throw new Error('No se pudo obtener la información del usuario.');
        }

        // Obtener el perfil real desde la base de datos
        const { data: profile, error: profileError } = (await supabase
          .from('perfiles')
          .select('rol, nombre')
          .eq('id', authData.user.id)
          .single()) as any;

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          // Fallback a los metadatos del usuario o rol según el prefijo del correo
          if (authData.user.user_metadata?.nombre) {
            name = authData.user.user_metadata.nombre;
          }
          if (authData.user.user_metadata?.rol) {
            role = authData.user.user_metadata.rol as RolUsuario;
          } else {
            if (data.email.toLowerCase().includes('admin')) {
              role = 'admin';
            } else if (data.email.toLowerCase().includes('analista')) {
              role = 'analista';
            }
          }
        } else if (profile) {
          role = profile.rol as RolUsuario;
          name = profile.nombre || name;
        }

        // Sincronizar el estado de sesión local
        setMockUser(role, name);
      }

      toast.success('Bienvenido a SIGFAM', {
        description: `Ingresaste como ${name} (${role})`,
      });

      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Credenciales incorrectas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Card className="border-border shadow-card-dark bg-card">
        <CardHeader className="text-center pb-2 pt-8">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center shadow-glow-brand">
              <Bus className="w-8 h-8 text-white" />
            </div>
          </div>
           <h1 className="text-2xl font-bold text-foreground">SIGFAM</h1>
          <p className="text-sm text-muted-foreground mt-1">Flota Sugamuxi S.A.</p>
          <p className="text-xs text-muted-foreground">Sistema Integrado de Gestión del Fondo de Auxilio Mutuo</p>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-6">
          <div className="mb-6 rounded-lg bg-secondary/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Credenciales de prueba disponibles:</p>
            <p>• Admin: <span className="font-mono text-primary">admin@flotasugamuxi.co</span> / password</p>
            <p>• Analista: <span className="font-mono text-primary">analista@flotasugamuxi.co</span> / password</p>
            <p>• Consultor: <span className="font-mono text-primary">consultor@flotasugamuxi.co</span> / password</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Correo Electrónico</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="usuario@flotasugamuxi.co"
                autoComplete="email"
                className="bg-background border-border"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-red-400 text-xs">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-10 bg-background border-border"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  id="login-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={isLoading}
              id="login-submit-btn"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Sistema de uso exclusivo para personal autorizado de{' '}
            <span className="text-foreground font-medium">Flota Sugamuxi S.A.</span>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
