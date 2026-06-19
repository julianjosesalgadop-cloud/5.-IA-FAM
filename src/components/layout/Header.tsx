'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Sun, Moon, Search, User, Menu, LogOut, Settings } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getMockUser } from '@/lib/services/dbService';
import type { RolUsuario } from '@/types/database';
import { ROLES_USUARIO } from '@/lib/constants';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Header({ title = 'Dashboard', subtitle, action }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<{ nombre: string; email: string; rol: RolUsuario } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('your-anon-key');

      if (isMock) {
        const mockUser = getMockUser();
        setUser({
          nombre: mockUser.nombre || 'Administrador',
          email: mockUser.email,
          rol: (mockUser.email?.toLowerCase() === 'sisflotasugamuxi@gmail.com') ? 'admin' : mockUser.rol,
        });
      } else {
        try {
          const supabase = createClient();
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();
          if (supabaseUser) {
            const { data } = await supabase
              .from('perfiles')
              .select('nombre, rol')
              .eq('id', supabaseUser.id)
              .single();
            const profile = data as any;

            const userRole = (supabaseUser.email?.toLowerCase() === 'sisflotasugamuxi@gmail.com')
              ? 'admin'
              : ((profile?.rol || 'consultor') as RolUsuario);

            setUser({
              nombre: profile?.nombre || supabaseUser.email?.split('@')[0] || 'Usuario',
              email: supabaseUser.email || '',
              rol: userRole,
            });
          }
        } catch (err) {
          console.error('Error loading user in header:', err);
        }
      }
    }
    loadUser();

    const handleStorageChange = () => {
      loadUser();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('fam_mock_user');
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
    router.push('/auth/login');
  };

  const getRoleConfig = (rol: RolUsuario) => {
    return ROLES_USUARIO[rol] || { label: rol, color: 'text-gray-400 bg-gray-500/10' };
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 sm:px-6 border-b border-border glass dark:bg-dark-800/60">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Hamburger menu for mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
          className="md:hidden text-muted-foreground hover:text-foreground h-9 w-9"
          id="header-mobile-toggle"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-base sm:text-lg font-semibold text-foreground truncate max-w-[160px] sm:max-w-none" title={title}>
            {title}
          </h1>
          {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[140px] sm:max-w-none">{subtitle}</p>}
        </div>
        {action && <div className="ml-1 sm:ml-2">{action}</div>}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          id="header-search-btn"
        >
          <Search className="w-4 h-4" />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground relative"
          id="header-notifications-btn"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-gold-500 rounded-full" />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="text-muted-foreground hover:text-foreground"
          id="header-theme-toggle"
        >
          <motion.div
            key={theme}
            initial={{ rotate: -30, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </motion.div>
        </Button>

        {/* User avatar and dropdown */}
        <div className="relative flex items-center gap-2 pl-2 border-l border-border" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center hover:opacity-90 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-ring"
            id="header-user-profile-btn"
          >
            <User className="w-4 h-4 text-white" />
          </button>

          <AnimatePresence>
            {dropdownOpen && user && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-card-dark z-50 text-left"
              >
                {/* User info */}
                <div className="px-3 py-2.5">
                  <p className="text-sm font-semibold text-foreground truncate">{user.nombre}</p>
                  <p className="text-xs text-muted-foreground truncate mb-2">{user.email}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${getRoleConfig(user.rol).color}`}>
                    {getRoleConfig(user.rol).label}
                  </span>
                </div>

                <div className="h-px bg-border my-1" />

                {/* Menu options */}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push('/perfil');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left"
                >
                  <User className="w-4 h-4" />
                  <span>Mi Perfil</span>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push('/configuracion');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configuración</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-red-500 hover:bg-red-500/10 transition-colors text-left font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar sesión</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
