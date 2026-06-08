'use client';
import React from 'react';
import { Bell, Sun, Moon, Search, User, Menu } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Header({ title = 'Dashboard', subtitle, action }: HeaderProps) {
  const { theme, setTheme } = useTheme();

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

        {/* User avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
}
