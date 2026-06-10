import { Header } from '@/components/layout/Header';
import { ReportesView } from '@/components/reportes/ReportesView';

export const metadata = { title: 'Reportes' };

export default function ReportesPage() {
  return (
    <>
      <Header title="Reportes" subtitle="SIGFAM — Análisis y exportación de datos" />
      <div className="flex-1 p-6 overflow-auto">
        <ReportesView />
      </div>
    </>
  );
}
