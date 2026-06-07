import { Header } from '@/components/layout/Header';
import { AuditoriaView } from '@/components/auditoria/AuditoriaView';

export const metadata = { title: 'Auditoría' };

export default function AuditoriaPage() {
  return (
    <>
      <Header title="Auditoría" subtitle="Registro de actividad y cambios del sistema" />
      <div className="flex-1 p-6 overflow-auto">
        <AuditoriaView />
      </div>
    </>
  );
}
