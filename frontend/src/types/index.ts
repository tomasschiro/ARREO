export interface User {
  id: number;
  nombre?: string;
  name?: string;
  email: string;
  rol: 'transportista' | 'productor' | 'consignataria' | 'superadmin';
  estado?: string;
  motivo_rechazo?: string | null;
  zona?: string;
  telefono?: string;
  cuit_cuil?: string;
  patente?: string;
  marca_camion?: string;
  modelo_camion?: string;
  año_camion?: number;
  tipo_remolque?: string;
  capacidad_kg?: number;
  foto_camion_url?: string;
  puntuacion_promedio?: number;
  cantidad_reseñas?: number;
  declaracion_jurada?: boolean;
  declaracion_jurada_fecha?: string | null;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Remate {
  id: number;
  nombre: string;
  tipo: 'feria' | 'en_campo';
  fecha: string;
  lugar_direccion?: string;
  lugar_lat?: number;
  lugar_lng?: number;
  zona?: string;
  descripcion?: string;
  plazo_coordinacion: string;
  estado: 'borrador' | 'publicado' | 'en_curso' | 'cerrado' | 'cancelado';
  consignataria_id: number;
  consignataria_nombre?: string;
  consignataria_email?: string;
  total_lotes?: number;
  total_transportistas?: number;
  lotes_con_viaje?: number;
  created_at: string;
}

export interface RemateLote {
  id: number;
  remate_id: number;
  descripcion?: string;
  tipo_hacienda?: string;
  cantidad_cabezas_estimada?: number;
  origen_direccion?: string;
  origen_lat?: number;
  origen_lng?: number;
  estado: 'pendiente' | 'vendido' | 'cancelado';
  comprador_nombre?: string;
  destino_direccion?: string;
  destino_lat?: number;
  destino_lng?: number;
  transportista_asignado_id?: number;
  transportista_asignado_nombre?: string;
  viaje_id?: number;
  created_at: string;
}

export interface RemateTransportista {
  id: number;
  remate_id: number;
  transportista_id: number;
  nombre: string;
  zona?: string;
  capacidad_kg?: number;
  puntuacion_promedio?: number;
  cantidad_reseñas?: number;
  tipo_remolque?: string;
  estado: 'pre-anotado' | 'confirmado' | 'rechazado';
  created_at: string;
}
