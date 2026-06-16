export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TipoReclamacion = 'Siniestro' | 'Vidrios' | 'Carrocería' | 'Repuestos' | 'Pérdida parcial' | 'Afectación por orden público' | 'Otro' | string;
export type Culpabilidad = 'Conductor' | 'Tercero' | 'Compartida' | 'Sin definir';
export type EstadoExpediente = 'Pendiente' | 'Revisado' | 'Aprobado' | 'Rechazado' | 'Inactivo';
export type RolUsuario = 'admin' | 'analista' | 'consultor';
export type AccionAuditoria = 'CREAR' | 'EDITAR' | 'ELIMINAR' | 'ESTADO' | 'FINANCIERO' | 'DOCUMENTO';

export interface Expediente {
  id: string;
  numero_expediente: string;
  fecha_incidente: string;
  placa: string;
  numero_interno: string | null;
  tipo_servicio: string | null;
  propietario: string;
  tipo_reclamacion: TipoReclamacion;
  ciudad_origen: string | null;
  ciudad_destino: string | null;
  concepto: string | null;
  // Financiero
  valor_cotizacion: number | null;
  valor_negociado: number | null;
  porcentaje_deducible: number | null;
  valor_deducible: number | null;
  valor_a_pagar: number | null;
  valor_salvamento: number | null;
  valor_final_aprobado: number | null;
  cotizaciones?: {
    id: string;
    proveedor: string;
    tipo_documento?: 'CC' | 'CE' | 'TI' | 'NIT' | 'PP' | null;
    numero_documento?: string | null;
    concepto: string;
    concepto_otro?: string;
    valor_cotizacion: number;
    valor_negociado: number;
    porcentaje_deducible: number;
    valor_deducible: number;
    valor_a_pagar: number;
    nombre_archivo?: string | null;
    storage_path?: string | null;
    seleccionada?: boolean;
  }[] | null;
  propietarios?: {
    nombre: string;
    tipo_documento: 'CC' | 'CE' | 'TI' | 'NIT' | 'PP';
    numero_documento: string;
  }[] | null;
  // Conductor
  nombre_conductor: string | null;
  tipo_documento_conductor?: 'CC' | 'CE' | 'TI' | 'NIT' | 'PP' | null;
  id_conductor: string | null;
  celular_conductor: string | null;
  culpabilidad: Culpabilidad | null;
  valor_descuento_conductor: number | null;
  memorando_descuento: string | null;
  // Recobros
  valor_recobro_vehiculo: number | null;
  porcentaje_recobro_vehiculo: number | null;
  valor_recobro_abogado: number | null;
  porcentaje_recobro_abogado: number | null;
  valor_recobro_empresa: number | null;
  porcentaje_recobro_empresa: number | null;
  // Comité
  fecha_comite: string | null;
  causa_raiz: string | null;
  observaciones_comite: string | null;
  numero_acta: string | null;
  // Autorización
  autorizado_por: string | null;
  cargo_autorizador: string | null;
  fecha_autorizacion: string | null;
  memorando_pago_nombre?: string | null;
  memorando_pago_storage_path?: string | null;
  memorando_pago_archivo_nombre?: string | null;
  estado: EstadoExpediente;
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

export interface Documento {
  id: string;
  expediente_id: string;
  nombre_archivo: string;
  tipo_documento: string;
  storage_path: string;
  tamanio_bytes: number | null;
  created_at: string;
  created_by: string | null;
}

export interface AuditoriaEntry {
  id: string;
  expediente_id: string | null;
  usuario_id: string | null;
  usuario_email: string | null;
  accion: AccionAuditoria;
  campo_modificado: string | null;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  created_at: string;
}

export interface CatalogoItem {
  id: string;
  tipo: string;
  valor: string;
  activo: boolean;
  orden: number | null;
  created_at: string;
}

export interface UsuarioPerfil {
  id: string;
  email: string;
  nombre: string | null;
  rol: RolUsuario;
  activo: boolean;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      expedientes: {
        Row: Expediente;
        Insert: Omit<Expediente, 'id' | 'numero_expediente' | 'created_at' | 'updated_at'>;
        Update: Partial<Expediente>;
      };
      documentos: {
        Row: Documento;
        Insert: Omit<Documento, 'id' | 'created_at'>;
        Update: Partial<Documento>;
      };
      auditoria: {
        Row: AuditoriaEntry;
        Insert: Omit<AuditoriaEntry, 'id' | 'created_at'>;
        Update: never;
      };
      catalogos: {
        Row: CatalogoItem;
        Insert: Omit<CatalogoItem, 'id' | 'created_at'>;
        Update: Partial<CatalogoItem>;
      };
      perfiles: {
        Row: UsuarioPerfil;
        Insert: Omit<UsuarioPerfil, 'created_at'>;
        Update: Partial<UsuarioPerfil>;
      };
    };
  };
};
