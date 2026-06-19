import type { Metadata } from 'next';
import { LoginBackground } from '@/components/auth/LoginBackground';

export const metadata: Metadata = { title: 'Iniciar Sesión' };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Dynamic Background with particles animation */}
      <LoginBackground />
      
      <div className="relative z-10 w-full max-w-md px-4">
        {children}
      </div>
    </div>
  );
}
