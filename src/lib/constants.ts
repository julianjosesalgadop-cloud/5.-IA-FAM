export const TIPOS_RECLAMACION = [
  'Siniestro',
  'Vidrios',
  'Carrocería',
  'Repuestos',
  'Pérdida parcial',
  'Afectación por orden público',
  'Otro',
] as const;

export const CULPABILIDADES = ['Conductor', 'Tercero', 'Compartida', 'Sin definir'] as const;

export const ESTADOS_EXPEDIENTE = ['Pendiente', 'Revisado', 'Aprobado', 'Rechazado', 'Inactivo'] as const;

export const PORCENTAJES_DEDUCIBLE = [
  { label: '50%', value: 50 },
  { label: '15%', value: 15 },
  { label: '10%', value: 10 },
] as const;

export const TIPOS_DOCUMENTO = [
  'Solicitud', 'Cotización', 'Documento Vario', 'Fotografía', 'Factura', 'Acta', 'Memorando', 'Soporte de pago', 'Otro',
] as const;

export const CAUSAS_RAIZ_DEFAULT = [
  'Error humano',
  'Exceso de velocidad',
  'Maniobra indebida',
  'Condiciones climáticas',
  'Falla mecánica',
  'Tercero involucrado',
] as const;

export const ROLES_USUARIO = {
  admin: { label: 'Administrador', color: 'text-red-400 bg-red-500/10' },
  analista: { label: 'Analista', color: 'text-blue-400 bg-blue-500/10' },
  consultor: { label: 'Consultor', color: 'text-green-400 bg-green-500/10' },
} as const;

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', roles: ['admin', 'analista', 'consultor'] },
  { href: '/expedientes', label: 'Expedientes', icon: 'FolderOpen', roles: ['admin', 'analista', 'consultor'] },
  { href: '/ingresos', label: 'Ingresos FAM', icon: 'Coins', roles: ['admin', 'analista'] },
  { href: '/reportes', label: 'Reportes', icon: 'BarChart3', roles: ['admin', 'analista', 'consultor'] },
  { href: '/configuracion', label: 'Configuración', icon: 'Settings', roles: ['admin'] },
  { href: '/auditoria', label: 'Auditoría', icon: 'Shield', roles: ['admin'] },
] as const;
