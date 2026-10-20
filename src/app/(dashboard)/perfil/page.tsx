import { Header } from '@/components/layout/Header';
import { PerfilView } from '@/components/perfil/PerfilView';
import { Footer } from '@/components/layout/Footer';

export const metadata = { title: 'Mi Perfil' };

export default function PerfilPage() {
  return (
    <>
      <Header title="Mi Perfil" subtitle="Información de usuario y ajustes personales" />
      <div className="flex-1 p-6 overflow-auto">
        <PerfilView />
        <Footer />
      </div>
    </>
  );
}
