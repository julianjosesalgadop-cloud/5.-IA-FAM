import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: {
    default: 'SIGFAM | Flota Sugamuxi S.A.',
    template: 'SIGFAM | %s'
  },
  description: 'Sistema Integrado de Gestión del Fondo de Auxilio Mutuo – Flota Sugamuxi S.A.',
  keywords: ['SIGFAM', 'FAM', 'Flota Sugamuxi', 'expedientes', 'siniestros', 'seguridad vial'],

  icons: {
    icon: '/favicon.ico.png',
    shortcut: '/favicon.ico.png',
    apple: '/favicon.ico.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange={false}>
          {children}
          <Toaster richColors position="top-right" expand />
        </ThemeProvider>
      </body>
    </html>
  );
}
