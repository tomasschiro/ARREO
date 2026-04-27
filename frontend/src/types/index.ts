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
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
