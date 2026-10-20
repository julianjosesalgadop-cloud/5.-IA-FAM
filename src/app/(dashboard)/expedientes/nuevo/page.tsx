import { Header } from '@/components/layout/Header';
import { ExpedienteForm } from '@/components/expedientes/ExpedienteForm';
import { Footer } from '@/components/layout/Footer';

export const metadata = { title: 'Nuevo Expediente' };

export default function NuevoExpedientePage() {
  return (
    <>
      <Header title="Nuevo Expediente" subtitle="Registrar nuevo caso - SIGFAM" />
      <div className="flex-1 p-6 overflow-auto">
        <ExpedienteForm />
        <Footer />
      </div>
    </>
  );
}
