import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1f5f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f19' },
  ],
};

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

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SIGFAM',
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
