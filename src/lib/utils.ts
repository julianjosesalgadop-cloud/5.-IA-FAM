import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCOP(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  
  // If the date string has a time part, don't append T00:00:00
  const cleanDate = date.includes('T') || date.includes(' ') || date.length > 10
    ? new Date(date)
    : new Date(date + 'T00:00:00');
  
  if (isNaN(cleanDate.getTime())) {
    const fallbackDate = new Date(date);
    if (isNaN(fallbackDate.getTime())) return '—';
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(fallbackDate);
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(cleanDate);
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function calcDeducible(valorNegociado: number, porcentaje: number): number {
  return (valorNegociado * porcentaje) / 100;
}

export function calcValorAPagar(valorNegociado: number, deducible: number): number {
  return Math.max(0, valorNegociado - deducible);
}

export function calcPorcentajeRecobro(valorRecobro: number, valorNegociado: number): number {
  if (!valorNegociado || valorNegociado === 0) return 0;
  return Math.round((valorRecobro / valorNegociado) * 10000) / 100;
}

export function getEstadoBadgeColor(estado: string): string {
  const colors: Record<string, string> = {
    'Pendiente': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    'Revisado': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'Aprobado': 'bg-green-500/15 text-green-400 border-green-500/30',
    'Rechazado': 'bg-red-500/15 text-red-400 border-red-500/30',
    'Inactivo': 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  };
  return colors[estado] || 'bg-gray-500/15 text-gray-400 border-gray-500/30';
}

export function getTipoReclamacionColor(tipo: string): string {
  const colors: Record<string, string> = {
    'Siniestro': 'bg-red-500/15 text-red-400',
    'Vidrios': 'bg-cyan-500/15 text-cyan-400',
    'Carrocería': 'bg-orange-500/15 text-orange-400',
    'Repuestos': 'bg-purple-500/15 text-purple-400',
    'Pérdida parcial': 'bg-rose-500/15 text-rose-400',
    'Otro': 'bg-gray-500/15 text-gray-400',
  };
  return colors[tipo] || 'bg-gray-500/15 text-gray-400';
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}
