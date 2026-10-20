import { Header } from '@/components/layout/Header';
import { ConfiguracionView } from '@/components/configuracion/ConfiguracionView';

export const metadata = { title: 'Configuración' };

export default function ConfiguracionPage() {
  return (
    <>
      <Header title="Configuración" subtitle="Administración del sistema SIGFAM" />
      <div className="flex-1 p-6 overflow-auto">
        <ConfiguracionView />
      </div>
    </>
  );
}
