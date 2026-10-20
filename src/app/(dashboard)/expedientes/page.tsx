import { Header } from '@/components/layout/Header';
import { ExpedientesList } from '@/components/expedientes/ExpedientesList';
import { Footer } from '@/components/layout/Footer';

export const metadata = { title: 'Expedientes' };

export default function ExpedientesPage() {
  return (
    <>
      <Header title="Expedientes" subtitle="SIGFAM — Sistema Integrado de Gestión del Fondo de Auxilio Mutuo" />
      <div className="flex-1 p-6 overflow-auto">
        <ExpedientesList />
        <Footer />
      </div>
    </>
  );
}
