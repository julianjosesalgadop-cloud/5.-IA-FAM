'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { LogIn, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
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

      let cargo = '';
      if (isMock) {
        if (data.email.toLowerCase().includes('admin') || data.email.toLowerCase() === 'sisflotasugamuxi@gmail.com') {
          role = 'admin';
          name = 'Administrador SIGFAM';
          cargo = 'Administrador de Sistema';
        } else if (data.email.toLowerCase().includes('analista')) {
          role = 'analista';
          name = 'Analista de Casos';
          cargo = 'Analista de Siniestros';
        } else {
          cargo = 'Consultor';
        }
        await new Promise((r) => setTimeout(r, 1000));
        setMockUser(role, name, cargo);
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
          .select('rol, nombre, must_change_password, cargo')
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
            if (data.email.toLowerCase().includes('admin') || data.email.toLowerCase() === 'sisflotasugamuxi@gmail.com') {
              role = 'admin';
            } else if (data.email.toLowerCase().includes('analista')) {
              role = 'analista';
            }
          }
        } else if (profile) {
          role = profile.rol as RolUsuario;
          name = profile.nombre || name;
          cargo = profile.cargo || '';

          if (data.email.toLowerCase() === 'sisflotasugamuxi@gmail.com') {
            role = 'admin';
          }
          
          if (profile.must_change_password) {
            setMockUser(role, name, cargo, authData.user.email || '');
            toast.info('Debes establecer una nueva contraseña antes de continuar.', {
              description: 'El administrador requiere que cambies tu contraseña.',
            });
            router.push('/auth/change-password');
            return;
          }
        }

        // Sincronizar el estado de sesión local
        setMockUser(role, name, cargo, authData.user.email || '');
      }

      const userCargo = isMock 
        ? cargo 
        : (cargo || (role === 'admin' ? 'Administrador' : role === 'analista' ? 'Analista' : 'Consultor'));

      toast.success('Bienvenido a SIGFAM', {
        description: `Ingresaste como ${name} (${userCargo})`,
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
            <div className="w-16 h-16 rounded-2xl bg-white border border-border flex items-center justify-center shadow-md p-1.5 overflow-hidden">
              <img src="/logo.png" alt="Logo Flota Sugamuxi" className="w-full h-full object-contain" />
            </div>
          </div>
           <h1 className="text-2xl font-bold text-foreground">SIGFAM</h1>
          <p className="text-sm text-muted-foreground mt-1">Flota Sugamuxi S.A.</p>
          <p className="text-xs text-muted-foreground">Sistema Integrado de Gestión del Fondo de Auxilio Mutuo</p>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-6">
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
              className="w-full mt-2 gradient-brand text-white shadow-glow-brand hover:opacity-95 transition-opacity border-0"
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
