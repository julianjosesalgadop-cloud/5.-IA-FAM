'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/lib/constants';
import {
  LayoutDashboard,
  FolderOpen,
  PlusCircle,
  BarChart3,
  Settings,
  Shield,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
  X,
  Users,
  GitCompare,
  Coins,
} from 'lucide-react';
import { getMockUser } from '@/lib/services/dbService';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';


const NAV_GROUPS = [
  {
    title: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', roles: ['admin', 'analista', 'consultor'] },
      { href: '/dashboard/comparativo', label: 'Comparativo', icon: 'GitCompare', roles: ['admin', 'analista', 'consultor'] },
      { href: '/dashboard/gasvsing', label: 'Gastos Vs Ingresos', icon: 'Coins', roles: ['admin', 'analista', 'consultor'] },
    ],
  },
  {
    title: 'Operaciones',
    items: [
      { href: '/expedientes', label: 'Expedientes', icon: 'FolderOpen', roles: ['admin', 'analista', 'consultor'] },
      { href: '/expedientes/nuevo', label: 'Nuevo Expediente', icon: 'PlusCircle', roles: ['admin', 'analista'] },
      { href: '/reportes', label: 'Reportes', icon: 'BarChart3', roles: ['admin', 'analista', 'consultor'] },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { href: '/usuarios', label: 'Usuarios', icon: 'Users', roles: ['admin'] },
      { href: '/configuracion', label: 'Configuración', icon: 'Settings', roles: ['admin', 'consultor'] },
      { href: '/parametrizacion', label: 'Parametrización', icon: 'SlidersHorizontal', roles: ['admin'] },
      { href: '/auditoria', label: 'Auditoría', icon: 'Shield', roles: ['admin', 'consultor'] },
    ],
  },
];

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard,
  FolderOpen,
  PlusCircle,
  BarChart3,
  Settings,
  SlidersHorizontal,
  Shield,
  Users,
  GitCompare,
  Coins,
};

export function Sidebar({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState<string>('admin');
  const router = useRouter();
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const updateRole = () => {
      setRole(getMockUser().rol);
    };
    updateRole();
    window.addEventListener('storage', updateRole);
    return () => window.removeEventListener('storage', updateRole);
  }, []);

  useEffect(() => {
    // Generate particles on client side to avoid SSR/hydration mismatch
    const generated = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 2 + 1, // 1px to 3px (smaller size)
      duration: Math.random() * 15 + 15, // 15s to 30s (slower/longer duration)
      delay: Math.random() * -30,
      opacity: Math.random() * 0.15 + 0.05, // 0.05 to 0.20 (lower opacity)
    }));
    setParticles(generated);
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

  const allowedGroups = NAV_GROUPS.map((group) => {
    return {
      ...group,
      items: group.items.filter((item) => !item.roles || (item.roles as readonly string[]).includes(role)),
    };
  }).filter((group) => group.items.length > 0);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen border-r border-white/10 z-30 overflow-hidden text-slate-300"
    >
      {/* Background gradient and ambient glow matching Login */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-950 via-slate-950 to-[#00263e] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-20%] w-[200px] h-[200px] rounded-full bg-brand-600/15 blur-[60px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-20%] w-[200px] h-[200px] rounded-full bg-brand-500/10 blur-[50px] pointer-events-none" />

      {/* Floating Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-brand-400 pointer-events-none animate-float-particle"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            bottom: '-20px',
            boxShadow: '0 0 6px hsla(203, 100%, 55%, 0.3)',
            '--particle-duration': `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          } as any}
        />
      ))}

      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10 w-full relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white border border-white/10 flex items-center justify-center shadow-sm p-0.5 overflow-hidden">
            <img src="/logo.png" alt="Logo Flota Sugamuxi" className="w-full h-full object-contain" />
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-sm font-bold text-slate-100 leading-tight">SIGFAM</p>
                <p className="text-xs text-slate-400 leading-tight">Flota Sugamuxi S.A.</p>
                <p className="text-[10px] text-slate-300/90 leading-tight mt-1 max-w-[165px] font-medium">
                  Sistema Integrado de Gestión del Fondo de Auxilio Mutuo
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {onNavClick && (
          <button 
            type="button" 
            onClick={onNavClick} 
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-6 overflow-y-auto relative z-10">
        {allowedGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            {!collapsed && (
              <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {group.title}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : item.href === '/expedientes'
                    ? pathname === '/expedientes' || (pathname.startsWith('/expedientes/') && !pathname.startsWith('/expedientes/nuevo'))
                    : pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavClick}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group/item z-10',
                      isActive
                        ? 'gradient-brand text-white shadow-glow-brand'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                    <AnimatePresence mode="wait">
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="truncate"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-white/10 rounded-md text-xs text-slate-200 whitespace-nowrap opacity-0 group-hover/item:opacity-100 pointer-events-none transition-opacity z-50">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: collapse + logout */}
      <div className="border-t border-white/10 px-2 py-3 space-y-1 relative z-10">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 z-10"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Colapsar
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 z-10"
        >
          <LogOut className="w-5 h-5" />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Cerrar sesión
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
