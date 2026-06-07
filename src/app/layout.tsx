import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: { default: 'FAM Control — Flota Sugamuxi S.A.', template: '%s | FAM Control' },
  description: 'Sistema de Gestión de Expedientes del Fondo de Auxilio Mutuo — Flota Sugamuxi S.A.',
  keywords: ['FAM', 'Flota Sugamuxi', 'expedientes', 'siniestros', 'seguridad vial'],
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
