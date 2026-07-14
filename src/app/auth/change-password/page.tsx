'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { KeyRound, Eye, EyeOff, Loader2, ShieldCheck, CheckCircle, XCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { dbService } from '@/lib/services/dbService';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Validation helpers
  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsDontMatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const isStrong = newPassword.length >= 8;

  useEffect(() => {
    async function checkSession() {
      const isMock = dbService.isMockMode();
      if (isMock) {
        // In mock mode, allow access directly
        setUserId('mock-user-id');
        setUserEmail('admin@flotasugamuxi.co');
        setIsChecking(false);
        return;
      }
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/auth/login');
          return;
        }

        // Check if must_change_password is actually set
        const { data: profile } = await supabase
          .from('perfiles')
          .select('must_change_password')
          .eq('id', user.id)
          .single() as any;

        if (!profile?.must_change_password) {
          // No need to be here — redirect to dashboard
          router.replace('/dashboard');
          return;
        }

        setUserId(user.id);
        setUserEmail(user.email || '');
      } catch {
        router.replace('/auth/login');
      } finally {
        setIsChecking(false);
      }
    }
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const isMock = dbService.isMockMode();
      if (isMock) {
        // Simulate in mock mode
        await new Promise((r) => setTimeout(r, 800));
        await dbService.markPasswordChanged('mock-user-id');
        toast.success('Contraseña actualizada correctamente (simulación)');
        router.replace('/dashboard');
        return;
      }

      // Real Supabase: update password via client SDK (user updates their own password)
      const supabase = createClient();

      // Re-authenticate first with current password to verify identity
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });
      if (signInError) {
        toast.error('La contraseña actual es incorrecta.');
        return;
      }

      // Now update to the new password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw new Error(updateError.message);

      // Mark flag as cleared in perfiles
      if (userId) {
        await dbService.markPasswordChanged(userId);
      }

      toast.success('¡Contraseña actualizada exitosamente!', {
        description: 'Ya puedes usar tu nueva contraseña para iniciar sesión.',
      });
      router.replace('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem('fam_mock_user');
    router.replace('/auth/login');
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-brand-700/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <Card className="border-border shadow-card-dark bg-card">
          <CardHeader className="text-center pb-2 pt-8">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <KeyRound className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Cambio de Contraseña</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Por seguridad, el administrador requiere que establezcas una nueva contraseña antes de continuar.
            </p>
            {userEmail && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-mono mx-auto">
                <ShieldCheck className="w-3.5 h-3.5" />
                {userEmail}
              </div>
            )}
          </CardHeader>

          <CardContent className="px-8 pb-8 pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Current password — only in production (to re-verify identity) */}
              {!dbService.isMockMode() && (
                <div className="space-y-1.5">
                  <Label htmlFor="current-password">Contraseña Actual</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPw ? 'text' : 'password'}
                      placeholder="Tu contraseña actual"
                      className="pr-10 bg-background border-border"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* New password */}
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    className="pr-10 bg-background border-border"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Password strength indicator */}
                {newPassword.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            newPassword.length >= i * 2
                              ? newPassword.length >= 8
                                ? 'bg-green-500'
                                : newPassword.length >= 6
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                              : 'bg-secondary'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${isStrong ? 'text-green-400' : 'text-amber-400'}`}>
                      {newPassword.length < 6
                        ? 'Muy corta — mínimo 6 caracteres'
                        : newPassword.length < 8
                        ? 'Aceptable — se recomienda 8 o más caracteres'
                        : 'Contraseña segura ✓'}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm new password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repite la nueva contraseña"
                  className="bg-background border-border"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {passwordsDontMatch && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Las contraseñas no coinciden
                  </p>
                )}
                {passwordsMatch && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Las contraseñas coinciden
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full mt-2 gradient-brand text-white font-semibold"
                disabled={isLoading || !passwordsMatch || newPassword.length < 6}
                id="change-password-submit"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Actualizando contraseña...</>
                ) : (
                  <><KeyRound className="w-4 h-4 mr-2" />Establecer Nueva Contraseña</>
                )}
              </Button>
            </form>

            {/* Logout link */}
            <div className="mt-6 text-center">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión y entrar con otra cuenta
              </button>
            </div>

            <div className="text-center text-xs text-muted-foreground/80 mt-6 pt-4 border-t border-border/50 font-semibold">
              Desarrollado Por Julián Salgado | Flota Sugamuxi S.A.
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
