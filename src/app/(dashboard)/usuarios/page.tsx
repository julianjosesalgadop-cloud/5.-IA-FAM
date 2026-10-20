import { Header } from '@/components/layout/Header';
import { UsuariosView } from '@/components/usuarios/UsuariosView';
import { Footer } from '@/components/layout/Footer';

export const metadata = { title: 'Gestión de Usuarios' };

export default function UsuariosPage() {
  return (
    <>
      <Header title="Gestión de Usuarios" subtitle="Administración de perfiles y permisos del sistema" />
      <div className="flex-1 p-6 overflow-auto">
        <UsuariosView />
        <Footer />
      </div>
    </>
  );
}
