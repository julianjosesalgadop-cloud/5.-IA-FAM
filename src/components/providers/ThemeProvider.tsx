'use client';
import * as React from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

const ThemeContext = React.createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  attribute = 'class',
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);

  React.useEffect(() => {
    const stored = localStorage.getItem('fam-theme') as Theme;
    if (stored) setThemeState(stored);
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    if (disableTransitionOnChange) {
      root.style.transition = 'none';
    }
    root.classList.remove('light', 'dark');
    const effectiveTheme =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;
    root.classList.add(effectiveTheme);
    if (attribute === 'class') root.setAttribute('data-theme', effectiveTheme);
    if (disableTransitionOnChange) {
      setTimeout(() => {
        root.style.transition = '';
      }, 0);
    }
  }, [theme, attribute, disableTransitionOnChange]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('fam-theme', t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
