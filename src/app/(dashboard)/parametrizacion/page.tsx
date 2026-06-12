import { Header } from '@/components/layout/Header';
import { ParametrizacionView } from '@/components/configuracion/ParametrizacionView';

export const metadata = { title: 'Parametrización del Formulario' };

export default function ParametrizacionPage() {
  return (
    <>
      <Header title="Parametrización" subtitle="Configurar campos y fases del formulario de expedientes" />
      <div className="flex-1 p-6 overflow-auto">
        <ParametrizacionView />
      </div>
    </>
  );
}
