import { createClient as createActualBrowserClient } from '@/lib/supabase/client';
const createBrowserClient = () => createActualBrowserClient() as any;
import type { Expediente, Documento, AuditoriaEntry, RolUsuario } from '@/types/database';

const IS_MOCK_MODE =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('your-anon-key');

// --- LOCAL STORAGE MOCK DATABASE IMPLEMENTATION ---
const MOCK_STORAGE_KEYS = {
  EXPEDIENTES: 'fam_mock_expedientes',
  DOCUMENTOS: 'fam_mock_documentos',
  AUDITORIA: 'fam_mock_auditoria',
  USER: 'fam_mock_user',
  PERFILES: 'fam_mock_perfiles',
};

const formatCOPValue = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};

const isSameValue = (a: any, b: any) => {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) {
    return (a === null || a === undefined || a === '') && (b === null || b === undefined || b === '');
  }
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return String(a) === String(b);
};

const formatAuditValue = (key: string, value: any): string => {
  if (value === null || value === undefined || value === '') return 'vacío';
  if (typeof value === 'object') {
    if (key === 'cotizaciones' && Array.isArray(value)) {
      return value.map((c: any) => `${c.proveedor}: ${formatCOPValue(c.valor_final_aprobado || c.valor_a_pagar || 0)} (${c.seleccionada ? 'Seleccionada' : 'No sel'})`).join(', ');
    }
    if (key === 'propietarios' && Array.isArray(value)) {
      return value.map((p: any) => `${p.nombre} (${p.tipo_documento}: ${p.numero_documento})`).join(', ');
    }
    return JSON.stringify(value);
  }
  return String(value);
};

const INITIAL_EXPEDIENTES: Expediente[] = [
  {
    id: '1',
    numero_expediente: 'FAM-FS-2025-001',
    fecha_incidente: '2025-01-15',
    placa: 'ABC-123',
    numero_interno: '0042',
    tipo_servicio: 'Intermunicipal',
    propietario: 'Transportes Norte S.A.',
    propietarios: [{ nombre: 'Transportes Norte S.A.', tipo_documento: 'NIT', numero_documento: '900123456-7' }],
    tipo_reclamacion: 'Siniestro',
    ciudad_origen: 'Sogamoso',
    ciudad_destino: 'Bogotá',
    concepto: 'Choque simple por detrás con camión de carga en la salida de Sogamoso.',
    valor_cotizacion: 12000000,
    valor_negociado: 10000000,
    porcentaje_deducible: 15,
    valor_deducible: 1500000,
    valor_a_pagar: 8500000,
    valor_salvamento: 1200000,
    valor_final_aprobado: 8500000,
    nombre_conductor: 'Carlos Morales',
    tipo_documento_conductor: 'CC',
    id_conductor: '74125896',
    celular_conductor: '3124567890',
    culpabilidad: 'Conductor',
    valor_descuento_conductor: 1500000,
    estado_pago_conductor: 'Pagado',
    memorando_descuento: 'MEMO-2025-001',
    valor_recobro_vehiculo: 2000000,
    porcentaje_recobro_vehiculo: 20,
    valor_recobro_abogado: 500000,
    porcentaje_recobro_abogado: 5,
    valor_recobro_empresa: 1000000,
    porcentaje_recobro_empresa: 10,
    fecha_comite: '2025-01-20',
    causa_raiz: 'Error humano',
    observaciones_comite: 'El conductor no guardó la distancia de seguridad reglamentaria.',
    numero_acta: 'ACTA 0001',
    autorizado_por: 'Dr. Alejandro Restrepo',
    cargo_autorizador: 'Gerente General',
    fecha_autorizacion: '2025-01-22',
    estado: 'Aprobado',
    created_at: new Date('2025-01-16T10:00:00Z').toISOString(),
    updated_at: new Date('2025-01-22T15:30:00Z').toISOString(),
    created_by: 'mock-user-id',
    deleted_at: null,
  },
  {
    id: '2',
    numero_expediente: 'FAM-FS-2025-002',
    fecha_incidente: '2025-01-22',
    placa: 'XYZ-789',
    numero_interno: '0108',
    tipo_servicio: 'Especial',
    propietario: 'Flota Central Ltda.',
    tipo_reclamacion: 'Carrocería',
    ciudad_origen: 'Duitama',
    ciudad_destino: 'Yopal',
    concepto: 'Daño en lateral izquierdo al rozar contra poste en parqueadero.',
    valor_cotizacion: 4500000,
    valor_negociado: 3800000,
    porcentaje_deducible: 10,
    valor_deducible: 380000,
    valor_a_pagar: 3420000,
    valor_salvamento: 0,
    valor_final_aprobado: 3200000,
    nombre_conductor: 'Ana González',
    id_conductor: '1052347891',
    celular_conductor: '3157891234',
    culpabilidad: 'Tercero',
    valor_descuento_conductor: null,
    memorando_descuento: null,
    valor_recobro_vehiculo: 3800000,
    porcentaje_recobro_vehiculo: 100,
    valor_recobro_abogado: 0,
    porcentaje_recobro_abogado: 0,
    valor_recobro_empresa: 0,
    porcentaje_recobro_empresa: 0,
    fecha_comite: '2025-01-28',
    causa_raiz: 'Tercero involucrado',
    observaciones_comite: 'El choque fue responsabilidad del vehículo de servicios públicos.',
    numero_acta: null,
    autorizado_por: null,
    cargo_autorizador: null,
    fecha_autorizacion: null,
    estado: 'Pendiente',
    created_at: new Date('2025-01-23T09:00:00Z').toISOString(),
    updated_at: new Date('2025-01-23T09:00:00Z').toISOString(),
    created_by: 'mock-user-id',
    deleted_at: null,
  },
  {
    id: '3',
    numero_expediente: 'FAM-FS-2025-003',
    fecha_incidente: '2025-02-03',
    placa: 'DEF-456',
    numero_interno: '0015',
    tipo_servicio: 'Urbano',
    propietario: 'Cooperativa Sugamuxi',
    tipo_reclamacion: 'Vidrios',
    ciudad_origen: 'Tunja',
    ciudad_destino: 'Sogamoso',
    concepto: 'Piedra expulsada por camión contrario fractura el parabrisas delantero.',
    valor_cotizacion: 2200000,
    valor_negociado: 1850000,
    porcentaje_deducible: 50,
    valor_deducible: 925000,
    valor_a_pagar: 925000,
    valor_salvamento: 0,
    valor_final_aprobado: 1850000,
    nombre_conductor: 'Pedro Jiménez',
    id_conductor: '9547123',
    celular_conductor: '3201234567',
    culpabilidad: 'Sin definir',
    valor_descuento_conductor: null,
    memorando_descuento: null,
    valor_recobro_vehiculo: 0,
    porcentaje_recobro_vehiculo: 0,
    valor_recobro_abogado: 0,
    porcentaje_recobro_abogado: 0,
    valor_recobro_empresa: 0,
    porcentaje_recobro_empresa: 0,
    fecha_comite: '2025-02-06',
    causa_raiz: 'Condiciones climáticas',
    observaciones_comite: 'Incidente fortuito en carretera.',
    numero_acta: null,
    autorizado_por: 'Ing. Mauricio Gómez',
    cargo_autorizador: 'Director Operaciones',
    fecha_autorizacion: '2025-02-08',
    estado: 'Revisado',
    created_at: new Date('2025-02-04T11:00:00Z').toISOString(),
    updated_at: new Date('2025-02-08T10:00:00Z').toISOString(),
    created_by: 'mock-user-id',
    deleted_at: null,
  },
];

const INITIAL_AUDITORIA: AuditoriaEntry[] = [
  {
    id: 'a1',
    expediente_id: '1',
    usuario_id: 'mock-user-id',
    usuario_email: 'admin@flotasugamuxi.co',
    accion: 'CREAR',
    campo_modificado: null,
    valor_anterior: null,
    valor_nuevo: 'Expediente creado en el sistema.',
    created_at: new Date('2025-01-16T10:00:00Z').toISOString(),
  },
  {
    id: 'a2',
    expediente_id: '1',
    usuario_id: 'mock-user-id',
    usuario_email: 'admin@flotasugamuxi.co',
    accion: 'ESTADO',
    campo_modificado: 'estado',
    valor_anterior: 'Pendiente',
    valor_nuevo: 'Aprobado',
    created_at: new Date('2025-01-22T15:30:00Z').toISOString(),
  },
];

function getLocalData<T>(key: string, initial: T[]): T[] {
  if (typeof window === 'undefined') return initial;
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  let parsed = JSON.parse(data);
  if (key === MOCK_STORAGE_KEYS.EXPEDIENTES && Array.isArray(parsed)) {
    let migrated = false;
    parsed = parsed.map((exp: any) => {
      if (exp && typeof exp.numero_expediente === 'string') {
        const num = exp.numero_expediente;
        const isStandard = /^FAM-FS-\d{4}-\d{3}$/.test(num);
        if (!isStandard) {
          migrated = true;
          const parts = num.split('-');
          if (parts.length >= 3) {
            const year = parts[parts.length - 2];
            const seqStr = parts[parts.length - 1];
            const seq = parseInt(seqStr, 10);
            if (!isNaN(seq) && year) {
              const paddedSeq = String(seq).padStart(3, '0');
              return {
                ...exp,
                numero_expediente: `FAM-FS-${year}-${paddedSeq}`
              };
            }
          }
        }
      }
      return exp;
    });
    if (migrated) {
      localStorage.setItem(key, JSON.stringify(parsed));
    }
  }
  return parsed;
}

function setLocalData<T>(key: string, data: T[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

// Helper to log audit in Mock Mode
function logMockAudit(
  expedienteId: string | null,
  accion: 'CREAR' | 'EDITAR' | 'ELIMINAR' | 'ESTADO' | 'FINANCIERO' | 'DOCUMENTO',
  campo: string | null = null,
  anterior: string | null = null,
  nuevo: string | null = null
) {
  const user = getMockUser();
  const audits = getLocalData<AuditoriaEntry>(MOCK_STORAGE_KEYS.AUDITORIA, INITIAL_AUDITORIA);
  const newEntry: AuditoriaEntry = {
    id: Math.random().toString(36).substring(2, 9),
    expediente_id: expedienteId,
    usuario_id: user.id,
    usuario_email: user.email,
    accion,
    campo_modificado: campo,
    valor_anterior: anterior,
    valor_nuevo: nuevo,
    created_at: new Date().toISOString(),
  };
  audits.unshift(newEntry); // Newest first
  setLocalData(MOCK_STORAGE_KEYS.AUDITORIA, audits);
}

interface Perfil {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  cargo?: string | null;
  tipo_documento?: string | null;
  numero_documento?: string | null;
  must_change_password?: boolean;
  created_at: string;
}

const INITIAL_PERFILES: Perfil[] = [
  {
    id: 'mock-user-id',
    nombre: 'Administrador SIGFAM',
    email: 'admin@flotasugamuxi.co',
    rol: 'admin',
    activo: true,
    cargo: 'Administrador del Sistema',
    tipo_documento: 'CC',
    numero_documento: '1234567890',
    must_change_password: false,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'mock-analista-id',
    nombre: 'Analista de Casos',
    email: 'analista@flotasugamuxi.co',
    rol: 'analista',
    activo: true,
    cargo: 'Analista FAM',
    tipo_documento: 'CC',
    numero_documento: '9876543210',
    must_change_password: false,
    created_at: '2025-01-02T00:00:00Z',
  },
  {
    id: 'mock-sisflotas-id',
    nombre: 'Administrador Flotas',
    email: 'sisflotasugamuxi@gmail.com',
    rol: 'admin',
    activo: true,
    cargo: 'Administrador de Flotas',
    tipo_documento: 'CC',
    numero_documento: '1098765432',
    must_change_password: false,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'mock-consultor-id',
    nombre: 'Consultor Invitado',
    email: 'consultor@flotasugamuxi.co',
    rol: 'consultor',
    activo: true,
    cargo: null,
    numero_documento: null,
    must_change_password: false,
    created_at: '2025-01-03T00:00:00Z',
  },
];

function formatExpedienteUppercase(e: any) {
  if (!e) return e;
  const clone = { ...e };
  if (typeof clone.placa === 'string') clone.placa = clone.placa.toUpperCase();
  if (typeof clone.numero_interno === 'string') clone.numero_interno = clone.numero_interno.toUpperCase();
  if (typeof clone.propietario === 'string') clone.propietario = clone.propietario.toUpperCase();
  if (typeof clone.ciudad_origen === 'string') clone.ciudad_origen = clone.ciudad_origen.toUpperCase();
  if (typeof clone.ciudad_destino === 'string') clone.ciudad_destino = clone.ciudad_destino.toUpperCase();
  if (typeof clone.nombre_conductor === 'string') clone.nombre_conductor = clone.nombre_conductor.toUpperCase();
  
  if (Array.isArray(clone.cotizaciones)) {
    clone.cotizaciones = clone.cotizaciones.map((cot: any) => ({
      ...cot,
      proveedor: typeof cot.proveedor === 'string' ? cot.proveedor.toUpperCase() : cot.proveedor,
    }));
  }
  
  if (Array.isArray(clone.propietarios)) {
    clone.propietarios = clone.propietarios.map((prop: any) => ({
      ...prop,
      nombre: typeof prop.nombre === 'string' ? prop.nombre.toUpperCase() : prop.nombre,
    }));
  }
  return clone;
}

// Mock active user profile
export function getMockUser() {
  if (typeof window === 'undefined') {
    return { id: 'mock-user-id', email: 'admin@flotasugamuxi.co', nombre: 'Administrador SIGFAM', rol: 'admin' as RolUsuario };
  }
  const userStr = localStorage.getItem(MOCK_STORAGE_KEYS.USER);
  if (userStr) {
    const parsed = JSON.parse(userStr);
    if (parsed.email?.toLowerCase() === 'sisflotasugamuxi@gmail.com') {
      parsed.rol = 'admin';
    }
    return parsed;
  }
  
  return null;
}

export function setMockUser(rol: RolUsuario, nombre: string = '', cargo: string = '', email: string = '') {
  const finalEmail = email || `${rol}@flotasugamuxi.co`;
  const name = nombre || (rol === 'admin' ? 'Administrador SIGFAM' : rol === 'analista' ? 'Analista de Casos' : 'Consultor Invitado');
  const defaultCargo = cargo || (rol === 'admin' ? 'Administrador de Sistema' : rol === 'analista' ? 'Analista de Casos' : 'Consultor');
  const user = { id: 'mock-user-id', email: finalEmail, nombre: name, rol, cargo: defaultCargo };
  localStorage.setItem(MOCK_STORAGE_KEYS.USER, JSON.stringify(user));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
  }
  return user;
}

async function verifyRole(allowedRoles: RolUsuario[]): Promise<void> {
  if (IS_MOCK_MODE) {
    const user = getMockUser();
    if (!allowedRoles.includes(user.rol)) {
      throw new Error(`Permisos insuficientes. Se requiere rol: ${allowedRoles.join(', ')}`);
    }
    return;
  }

  const supabase = createActualBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuario no autenticado.');
  }

  const { data } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();
  const perfil = data as any;

  const role = (perfil?.rol || 'consultor') as RolUsuario;
  if (!allowedRoles.includes(role)) {
    throw new Error(`Permisos insuficientes. Se requiere rol: ${allowedRoles.join(', ')}`);
  }
}

// --- CORE DB SERVICE EXPORT ---
export const dbService = {
  isMockMode: () => IS_MOCK_MODE,

  // --- EXPEDIENTES ---
  getExpedientes: async (): Promise<Expediente[]> => {
    if (IS_MOCK_MODE) {
      const list = getLocalData<Expediente>(MOCK_STORAGE_KEYS.EXPEDIENTES, INITIAL_EXPEDIENTES);
      return list.filter((e) => e.deleted_at === null).sort((a, b) => b.numero_expediente.localeCompare(a.numero_expediente));
    }

    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from('expedientes')
      .select('*')
      .is('deleted_at', null)
      .order('numero_expediente', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  getExpedienteById: async (id: string): Promise<Expediente | null> => {
    if (IS_MOCK_MODE) {
      const list = getLocalData<Expediente>(MOCK_STORAGE_KEYS.EXPEDIENTES, INITIAL_EXPEDIENTES);
      const item = list.find((e) => e.id === id);
      return item || null;
    }

    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from('expedientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  },

  checkDuplicateExpediente: async (
    placa: string,
    fechaIncidente: string,
    tipoReclamacion: string,
    excludeId?: string
  ): Promise<void> => {
    const formattedPlaca = placa.trim().toUpperCase();
    if (IS_MOCK_MODE) {
      const list = getLocalData<Expediente>(MOCK_STORAGE_KEYS.EXPEDIENTES, INITIAL_EXPEDIENTES);
      const duplicate = list.find((e) => 
        e.deleted_at === null &&
        e.estado !== 'Inactivo' &&
        e.placa.trim().toUpperCase() === formattedPlaca &&
        e.fecha_incidente === fechaIncidente &&
        e.tipo_reclamacion === tipoReclamacion &&
        e.id !== excludeId
      );
      if (duplicate) {
        throw new Error(`Ya existe un expediente activo (${duplicate.numero_expediente}) para el vehículo con placa ${placa} con la misma fecha de incidente (${fechaIncidente}) y tipo de reclamación (${tipoReclamacion}).`);
      }
      return;
    }

    const supabase = createBrowserClient();
    let query = supabase
      .from('expedientes')
      .select('numero_expediente')
      .is('deleted_at', null)
      .neq('estado', 'Inactivo')
      .eq('placa', formattedPlaca)
      .eq('fecha_incidente', fechaIncidente)
      .eq('tipo_reclamacion', tipoReclamacion);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (data) {
      throw new Error(`Ya existe un expediente activo (${data.numero_expediente}) para el vehículo con placa ${placa} con la misma fecha de incidente (${fechaIncidente}) y tipo de reclamación (${tipoReclamacion}).`);
    }
  },

  createExpediente: async (payload: Omit<Expediente, 'id' | 'numero_expediente' | 'created_at' | 'updated_at' | 'created_by' | 'deleted_at'>): Promise<Expediente> => {
    await verifyRole(['admin', 'analista']);
    const formattedPayload = formatExpedienteUppercase(payload);
    await dbService.checkDuplicateExpediente(formattedPayload.placa, formattedPayload.fecha_incidente, formattedPayload.tipo_reclamacion);
    if (IS_MOCK_MODE) {
      const list = getLocalData<Expediente>(MOCK_STORAGE_KEYS.EXPEDIENTES, INITIAL_EXPEDIENTES);
      const user = getMockUser();

      const yearStr = formattedPayload.fecha_incidente ? formattedPayload.fecha_incidente.split('-')[0] : '';
      const year = parseInt(yearStr, 10) || new Date().getFullYear();
      const yearCases = list.filter((e) => {
        if (e.deleted_at !== null) return false;
        const itemYearStr = e.fecha_incidente ? e.fecha_incidente.split('-')[0] : '';
        return parseInt(itemYearStr, 10) === year;
      });
      let maxSeq = 0;
      yearCases.forEach(e => {
        const parts = e.numero_expediente.split('-');
        if (parts.length >= 3) {
          const seq = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      });
      const nextSeq = maxSeq + 1;
      const numero_expediente = `FAM-FS-${year}-${String(nextSeq).padStart(3, '0')}`;

      const newExpediente: Expediente = {
        ...(formattedPayload as any),
        id: Math.random().toString(36).substring(2, 9),
        numero_expediente,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user.id,
        deleted_at: null,
      };

      list.unshift(newExpediente);
      setLocalData(MOCK_STORAGE_KEYS.EXPEDIENTES, list);
      logMockAudit(newExpediente.id, 'CREAR', null, null, `Expediente ${numero_expediente} creado.`);
      return newExpediente;
    }

    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    const payloadWithUser = {
      ...formattedPayload,
      created_by: user?.id || null
    };

    const { data, error } = await supabase
      .from('expedientes')
      .insert(payloadWithUser as any)
      .select()
      .single();

    if (error) throw error;
    
    // Log audit in Supabase
    await supabase.from('auditoria').insert({
      expediente_id: (data as any).id,
      usuario_id: user?.id || null,
      usuario_email: user?.email || null,
      accion: 'CREAR',
      valor_nuevo: `Expediente ${(data as any).numero_expediente} creado.`,
    } as any);

    return data as any;
  },

  updateExpediente: async (id: string, payload: Partial<Expediente>): Promise<Expediente> => {
    await verifyRole(['admin', 'analista']);
    const formattedPayload = formatExpedienteUppercase(payload);
    if (IS_MOCK_MODE) {
      const list = getLocalData<Expediente>(MOCK_STORAGE_KEYS.EXPEDIENTES, INITIAL_EXPEDIENTES);
      const idx = list.findIndex((e) => e.id === id);
      if (idx === -1) throw new Error('Expediente no encontrado');
 
      const old = list[idx];
      const currentUser = getMockUser();
      const isAdmin = currentUser.rol === 'admin';

      const newPlaca = formattedPayload.placa ?? old.placa;
      const newFecha = formattedPayload.fecha_incidente ?? old.fecha_incidente;
      const newTipo = formattedPayload.tipo_reclamacion ?? old.tipo_reclamacion;
      await dbService.checkDuplicateExpediente(newPlaca, newFecha, newTipo, id);

      if (!isAdmin) {
        if (old.estado === 'Aprobado' || old.estado === 'Rechazado') {
          throw new Error('No se pueden modificar expedientes en estado Aprobado o Rechazado.');
        }
        if (old.estado === 'Revisado') {
          const updatedKeys = Object.keys(formattedPayload).filter(k => k !== 'updated_at');
          if (updatedKeys.length > 1 || (updatedKeys.length === 1 && updatedKeys[0] !== 'estado')) {
            throw new Error('En estado Revisado solo se permite cambiar el estado.');
          }
        }
      }

      const updated: Expediente = {
        ...old,
        ...formattedPayload,
        updated_at: new Date().toISOString(),
      } as Expediente;
 
      list[idx] = updated;
      setLocalData(MOCK_STORAGE_KEYS.EXPEDIENTES, list);

      // Simple audit logging for changed values
      Object.keys(formattedPayload).forEach((key) => {
        const k = key as keyof Expediente;
        if (!isSameValue(old[k], formattedPayload[k]) && key !== 'updated_at') {
          logMockAudit(
            id,
            k === 'estado' ? 'ESTADO' : 'EDITAR',
            key,
            formatAuditValue(key, old[k]),
            formatAuditValue(key, formattedPayload[k])
          );
        }
      });

      return updated;
    }

    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    let isAdmin = false;
    if (user) {
      const { data: profile } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', user.id)
        .single();
      isAdmin = (profile as any)?.rol === 'admin';
    }

    const { data: oldData } = await supabase.from('expedientes').select('*').eq('id', id).single();
 
    if (oldData) {
      const newPlaca = formattedPayload.placa ?? oldData.placa;
      const newFecha = formattedPayload.fecha_incidente ?? oldData.fecha_incidente;
      const newTipo = formattedPayload.tipo_reclamacion ?? oldData.tipo_reclamacion;
      await dbService.checkDuplicateExpediente(newPlaca, newFecha, newTipo, id);
    }

    if (oldData && !isAdmin) {
      if (oldData.estado === 'Aprobado' || oldData.estado === 'Rechazado') {
        throw new Error('No se pueden modificar expedientes en estado Aprobado o Rechazado.');
      }
      if (oldData.estado === 'Revisado') {
        const updatedKeys = Object.keys(formattedPayload).filter(k => k !== 'updated_at');
        if (updatedKeys.length > 1 || (updatedKeys.length === 1 && updatedKeys[0] !== 'estado')) {
          throw new Error('En estado Revisado solo se permite cambiar el estado.');
        }
      }
    }

    const { data, error } = await supabase
      .from('expedientes')
      .update(formattedPayload as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (oldData) {
      // Audit log insertions
      const auditLogs = Object.keys(formattedPayload)
        .filter((key) => !isSameValue(oldData[key as keyof typeof oldData], formattedPayload[key as keyof typeof formattedPayload]) && key !== 'updated_at')
        .map((key) => ({
          expediente_id: id,
          usuario_id: user?.id || null,
          usuario_email: user?.email || null,
          accion: key === 'estado' ? 'ESTADO' : 'EDITAR',
          campo_modificado: key,
          valor_anterior: formatAuditValue(key, oldData[key as keyof typeof oldData]),
          valor_nuevo: formatAuditValue(key, formattedPayload[key as keyof typeof formattedPayload]),
        }));

      if (auditLogs.length > 0) {
        await supabase.from('auditoria').insert(auditLogs as any);
      }
    }

    return data;
  },

  deleteExpedienteLogical: async (id: string): Promise<void> => {
    await verifyRole(['admin']);
    if (IS_MOCK_MODE) {
      const list = getLocalData<Expediente>(MOCK_STORAGE_KEYS.EXPEDIENTES, INITIAL_EXPEDIENTES);
      const idx = list.findIndex((e) => e.id === id);
      if (idx !== -1) {
        const old = list[idx];
        list[idx].estado = 'Inactivo';
        list[idx].updated_at = new Date().toISOString();
        setLocalData(MOCK_STORAGE_KEYS.EXPEDIENTES, list);
        logMockAudit(id, 'ESTADO', 'estado', old.estado, 'Inactivo');
      }
      return;
    }

    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: oldData } = await supabase.from('expedientes').select('estado').eq('id', id).single();
 
    const { error } = await supabase
      .from('expedientes')
      .update({ estado: 'Inactivo' } as any)
      .eq('id', id);

    if (error) throw error;

    await supabase.from('auditoria').insert({
      expediente_id: id,
      usuario_id: user?.id || null,
      usuario_email: user?.email || null,
      accion: 'ESTADO',
      campo_modificado: 'estado',
      valor_anterior: oldData?.estado || null,
      valor_nuevo: 'Inactivo',
    } as any);
  },

  // --- DOCUMENTOS ---
  getDocumentos: async (expedienteId: string): Promise<Documento[]> => {
    if (IS_MOCK_MODE) {
      const docs = getLocalData<Documento>(MOCK_STORAGE_KEYS.DOCUMENTOS, []);
      return docs.filter((d) => d.expediente_id === expedienteId);
    }

    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('expediente_id', expedienteId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  uploadDocumento: async (
    expedienteId: string,
    file: File,
    tipoDocumento: string,
    numeroExpediente?: string
  ): Promise<Documento> => {
    await verifyRole(['admin', 'analista']);
    if (IS_MOCK_MODE) {
      const list = getLocalData<Expediente>(MOCK_STORAGE_KEYS.EXPEDIENTES, INITIAL_EXPEDIENTES);
      const exp = list.find((e) => e.id === expedienteId);
      if (exp && exp.estado !== 'Pendiente') {
        throw new Error('Solo se pueden subir documentos a expedientes en estado Pendiente.');
      }

      const docs = getLocalData<Documento>(MOCK_STORAGE_KEYS.DOCUMENTOS, []);
      const user = getMockUser();

      // Read file as mock data URL
      const mockPath = `mock-storage/${expedienteId}/${Date.now()}_${file.name}`;
      
      const newDoc: Documento = {
        id: Math.random().toString(36).substring(2, 9),
        expediente_id: expedienteId,
        nombre_archivo: file.name,
        tipo_documento: tipoDocumento,
        storage_path: mockPath,
        tamanio_bytes: file.size,
        created_at: new Date().toISOString(),
        created_by: user.id,
      };

      docs.unshift(newDoc);
      setLocalData(MOCK_STORAGE_KEYS.DOCUMENTOS, docs);
      logMockAudit(expedienteId, 'DOCUMENTO', 'documento', null, `Documento subido: ${file.name} (${tipoDocumento})`);
      return newDoc;
    }

    const supabase = createBrowserClient();
    const { data: exp } = await supabase
      .from('expedientes')
      .select('estado')
      .eq('id', expedienteId)
      .single();

    if (exp && exp.estado !== 'Pendiente') {
      throw new Error('Solo se pueden subir documentos a expedientes en estado Pendiente.');
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    // Upload file to OneDrive via API route
    const formData = new FormData();
    formData.append('file', file);
    formData.append('expedienteId', expedienteId);
    if (numeroExpediente) {
      formData.append('numeroExpediente', numeroExpediente);
    }

    const uploadRes = await fetch('/api/onedrive/upload', {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Error al subir a OneDrive: ${errText}`);
    }

    const { storagePath } = await uploadRes.json();

    // Insert to DB Table
    const { data, error: dbError } = await supabase
      .from('documentos')
      .insert({
        expediente_id: expedienteId,
        nombre_archivo: file.name,
        tipo_documento: tipoDocumento,
        storage_path: storagePath,
        tamanio_bytes: file.size,
        created_by: user?.id || null,
      } as any)
      .select()
      .single();

    if (dbError) throw dbError;

    await supabase.from('auditoria').insert({
      expediente_id: expedienteId,
      usuario_id: user?.id || null,
      usuario_email: user?.email || null,
      accion: 'DOCUMENTO',
      valor_nuevo: `Documento subido a OneDrive: ${file.name} (${tipoDocumento})`,
    } as any);

    return data;
  },

  deleteDocumento: async (docId: string, storagePath: string, expedienteId: string): Promise<void> => {
    await verifyRole(['admin']);
    if (IS_MOCK_MODE) {
      const list = getLocalData<Expediente>(MOCK_STORAGE_KEYS.EXPEDIENTES, INITIAL_EXPEDIENTES);
      const exp = list.find((e) => e.id === expedienteId);
      if (exp && exp.estado !== 'Pendiente') {
        throw new Error('Solo se pueden eliminar documentos de expedientes en estado Pendiente.');
      }

      const docs = getLocalData<Documento>(MOCK_STORAGE_KEYS.DOCUMENTOS, []);
      const doc = docs.find((d) => d.id === docId);
      const filtered = docs.filter((d) => d.id !== docId);
      setLocalData(MOCK_STORAGE_KEYS.DOCUMENTOS, filtered);
      logMockAudit(expedienteId, 'DOCUMENTO', 'documento', doc?.nombre_archivo || null, 'Documento eliminado');
      return;
    }

    const supabase = createBrowserClient();
    const { data: exp } = await supabase
      .from('expedientes')
      .select('estado')
      .eq('id', expedienteId)
      .single();

    if (exp && exp.estado !== 'Pendiente') {
      throw new Error('Solo se pueden eliminar documentos de expedientes en estado Pendiente.');
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Delete from OneDrive or Supabase Storage based on path type
    if (storagePath.startsWith('onedrive:')) {
      const itemId = storagePath.replace('onedrive:', '');
      const deleteRes = await fetch(`/api/onedrive/delete?itemId=${itemId}`, {
        method: 'POST',
      });
      if (!deleteRes.ok) {
        const errText = await deleteRes.text();
        console.warn(`No se pudo borrar el archivo de OneDrive: ${errText}`);
      }
    } else {
      // Delete from Supabase Storage (backwards compatibility)
      const { error: storageError } = await supabase.storage
        .from('expedientes-documentos')
        .remove([storagePath]);

      if (storageError) throw storageError;
    }

    // Delete from DB Table
    const { error: dbError } = await supabase
      .from('documentos')
      .delete()
      .eq('id', docId);

    if (dbError) throw dbError;

    await supabase.from('auditoria').insert({
      expediente_id: expedienteId,
      usuario_id: user?.id || null,
      usuario_email: user?.email || null,
      accion: 'DOCUMENTO',
      valor_nuevo: `Documento eliminado. Path: ${storagePath}`,
    } as any);
  },

  getDownloadUrl: async (storagePath: string, fileName?: string): Promise<string> => {
    if (IS_MOCK_MODE) {
      // In mock mode, we just return a placeholder or create a simulated file download
      return `https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=600&auto=format&fit=crop`;
    }

    if (storagePath.startsWith('onedrive:')) {
      const itemId = storagePath.replace('onedrive:', '');
      const nameParam = fileName ? `&fileName=${encodeURIComponent(fileName)}` : '';
      return `/api/onedrive/download?itemId=${itemId}${nameParam}`;
    }

    const supabase = createBrowserClient();
    const { data, error } = await supabase.storage
      .from('expedientes-documentos')
      .createSignedUrl(storagePath, 3600); // 1 hour valid

    if (error) throw error;
    return data.signedUrl;
  },

  // --- AUDITORIA ---
  getAuditoria: async (expedienteId?: string): Promise<AuditoriaEntry[]> => {
    if (IS_MOCK_MODE) {
      const list = getLocalData<AuditoriaEntry>(MOCK_STORAGE_KEYS.AUDITORIA, INITIAL_AUDITORIA);
      if (expedienteId) {
        return list.filter((a) => a.expediente_id === expedienteId);
      }
      return list;
    }

    const supabase = createBrowserClient();
    let query = supabase.from('auditoria').select('*').order('created_at', { ascending: false });
    
    if (expedienteId) {
      query = query.eq('expediente_id', expedienteId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // --- PERFILES ---
  getPerfiles: async (): Promise<any[]> => {
    if (IS_MOCK_MODE) {
      return getLocalData<any>(MOCK_STORAGE_KEYS.PERFILES, INITIAL_PERFILES);
    }
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  getPerfilById: async (id: string): Promise<any | null> => {
    if (IS_MOCK_MODE) {
      const list = getLocalData<any>(MOCK_STORAGE_KEYS.PERFILES, INITIAL_PERFILES);
      return list.find((p) => p.id === id) || null;
    }
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data || null;
  },

  updatePerfil: async (id: string, payload: { 
    nombre?: string; 
    email?: string; 
    rol?: RolUsuario; 
    activo?: boolean; 
    cargo?: string | null; 
    tipo_documento?: string | null; 
    numero_documento?: string | null; 
  }): Promise<any> => {
    if (IS_MOCK_MODE) {
      const list = getLocalData<any>(MOCK_STORAGE_KEYS.PERFILES, INITIAL_PERFILES);
      const idx = list.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error('Perfil no encontrado');
      const updated = { ...list[idx], ...payload };
      list[idx] = updated;
      setLocalData(MOCK_STORAGE_KEYS.PERFILES, list);
      
      // If updating active user, sync mock user
      const currentUser = getMockUser();
      if (currentUser.id === id) {
        const nextUser = {
          ...currentUser,
          nombre: updated.nombre,
          rol: updated.rol,
          cargo: updated.cargo,
          email: updated.email,
        };
        localStorage.setItem(MOCK_STORAGE_KEYS.USER, JSON.stringify(nextUser));
        window.dispatchEvent(new Event('storage'));
      }
      return updated;
    }
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from('perfiles')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  createPerfil: async (payload: { nombre: string; email: string; rol: RolUsuario; cargo?: string; tipo_documento?: string; numero_documento?: string; password?: string; must_change_password?: boolean }): Promise<any> => {
    if (IS_MOCK_MODE) {
      const list = getLocalData<any>(MOCK_STORAGE_KEYS.PERFILES, INITIAL_PERFILES);
      const newPerfil = {
        ...payload,
        id: Math.random().toString(36).substring(2, 9),
        activo: true,
        must_change_password: payload.must_change_password ?? false,
        created_at: new Date().toISOString(),
      };
      list.push(newPerfil);
      setLocalData(MOCK_STORAGE_KEYS.PERFILES, list);
      return newPerfil;
    }
    // Production: call server-side API route which uses SUPABASE_SERVICE_ROLE_KEY
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al crear usuario.');
    return json.perfil;
  },

  resetPasswordAdmin: async (userId: string, newPassword: string, mustChangePassword: boolean = false): Promise<void> => {
    if (IS_MOCK_MODE) {
      // In mock mode, simulate the operation (no real auth exists)
      const list = getLocalData<any>(MOCK_STORAGE_KEYS.PERFILES, INITIAL_PERFILES);
      const idx = list.findIndex((p: any) => p.id === userId);
      if (idx !== -1) {
        list[idx].must_change_password = mustChangePassword;
        setLocalData(MOCK_STORAGE_KEYS.PERFILES, list);
      }
      return;
    }
    // Production: call server-side API route
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPassword, mustChangePassword }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al cambiar la contraseña.');
  },

  markPasswordChanged: async (userId: string): Promise<void> => {
    if (IS_MOCK_MODE) {
      const list = getLocalData<any>(MOCK_STORAGE_KEYS.PERFILES, INITIAL_PERFILES);
      const idx = list.findIndex((p: any) => p.id === userId);
      if (idx !== -1) {
        list[idx].must_change_password = false;
        setLocalData(MOCK_STORAGE_KEYS.PERFILES, list);
      }
      return;
    }
    const supabase = createBrowserClient();
    await supabase.from('perfiles').update({ must_change_password: false } as any).eq('id', userId);
  },

  togglePerfilActivo: async (id: string): Promise<any> => {
    const perfil = await dbService.getPerfilById(id);
    if (!perfil) throw new Error('Perfil no encontrado');
    return dbService.updatePerfil(id, { activo: !perfil.activo });
  },
};
