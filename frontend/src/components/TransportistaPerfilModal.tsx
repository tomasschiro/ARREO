'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import StarRating from './StarRating';
import api from '@/lib/api';

interface Transportista {
  id: number;
  nombre: string;
  zona?: string;
  patente?: string;
  marca_camion?: string;
  modelo_camion?: string;
  año_camion?: number;
  tipo_remolque?: string;
  capacidad_kg?: number;
  puntuacion_promedio?: number;
  cantidad_reseñas?: number;
}

interface Reseña {
  id: number;
  puntuacion: number;
  comentario?: string;
  created_at: string;
  productor_nombre: string;
}

interface Props {
  transportistaId: number;
  onClose: () => void;
  canReview?: boolean;
}

export default function TransportistaPerfilModal({ transportistaId, onClose, canReview = false }: Props) {
  const { user } = useAuth();
  const [transportista, setTransportista] = useState<Transportista | null>(null);
  const [reseñas,       setReseñas]       = useState<Reseña[]>([]);
  const [loading,       setLoading]       = useState(true);

  const [reviewStars,   setReviewStars]   = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSaving,  setReviewSaving]  = useState(false);
  const [reviewError,   setReviewError]   = useState('');
  const [reviewDone,    setReviewDone]    = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/transportistas/${transportistaId}`);
      setTransportista(data.transportista);
      setReseñas(data.reseñas);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [transportistaId]);

  async function handleReview() {
    setReviewSaving(true);
    setReviewError('');
    try {
      await api.post('/reseñas', {
        transportista_id: transportistaId,
        puntuacion: reviewStars,
        comentario: reviewComment || undefined,
      });
      setReviewDone(true);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setReviewError(msg || 'Error al enviar la reseña');
    } finally {
      setReviewSaving(false);
    }
  }

  const showReviewForm = canReview && user && ['productor', 'consignataria'].includes(user.rol);
  const yaReseñó = reseñas.some(r => r.productor_nombre === (user?.nombre ?? user?.name));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 16px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-8 h-8 border-4 border-[#8BAF4E] border-t-transparent rounded-full" />
          </div>
        ) : !transportista ? null : (
          <>
            {/* Header */}
            <div className="rounded-t-2xl px-6 py-5 flex items-center justify-between"
              style={{ backgroundColor: '#1F2B1F' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl uppercase"
                  style={{ backgroundColor: 'rgba(139,175,78,0.3)' }}>
                  {transportista.nombre[0]}
                </div>
                <div>
                  <p className="text-white font-bold text-base">{transportista.nombre}</p>
                  {transportista.zona && (
                    <p className="text-xs" style={{ color: '#8BAF4E' }}>📍 {transportista.zona}</p>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="text-white/60 hover:text-white text-xl transition">✕</button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Puntuación */}
              {(transportista.cantidad_reseñas ?? 0) > 0 && (
                <div className="flex items-center gap-3">
                  <StarRating value={Number(transportista.puntuacion_promedio ?? 0)} size="md" />
                  <span className="text-sm font-bold text-[#111111]">
                    {Number(transportista.puntuacion_promedio ?? 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-400">({transportista.cantidad_reseñas} reseñas)</span>
                </div>
              )}

              {/* Datos del camión */}
              {(transportista.patente || transportista.tipo_remolque) && (
                <div className="rounded-xl p-4 bg-[#F2F2F0]">
                  <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#8BAF4E' }}>
                    Datos del camión
                  </p>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    {[
                      { label: 'Patente',    value: transportista.patente },
                      { label: 'Tipo',       value: transportista.tipo_remolque?.split(',').map(t => t.trim()).filter(Boolean).join(' · ') },
                      { label: 'Marca',      value: transportista.marca_camion },
                      { label: 'Modelo',     value: transportista.modelo_camion },
                      { label: 'Año',        value: transportista.año_camion?.toString() },
                      { label: 'Capacidad',  value: transportista.capacidad_kg
                          ? `${Number(transportista.capacidad_kg).toLocaleString('es-AR')} kg`
                          : undefined },
                    ].filter(item => item.value).map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="text-sm font-bold text-[#111111]">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reseñas */}
              {reseñas.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[#555555] uppercase tracking-wide mb-3">Reseñas</p>
                  <div className="flex flex-col gap-3">
                    {reseñas.map(r => (
                      <div key={r.id} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-[#111111]">{r.productor_nombre}</span>
                          <StarRating value={r.puntuacion} size="sm" />
                        </div>
                        {r.comentario && <p className="text-sm text-[#555555]">{r.comentario}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(r.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulario de reseña */}
              {showReviewForm && !yaReseñó && !reviewDone && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-bold text-[#111111] mb-3">Dejar una reseña</p>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <StarRating value={reviewStars} size="md" onChange={setReviewStars} />
                      <span className="text-sm text-gray-400">{reviewStars}/5</span>
                    </div>
                    <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                      placeholder="Contá tu experiencia (opcional)" rows={3}
                      className="w-full border border-[#E0E0E0] rounded-lg px-4 py-2.5 text-sm text-[#111111] bg-white focus:outline-none focus:ring-2 focus:ring-[#8BAF4E] resize-none" />
                    {reviewError && <p className="text-xs text-red-500">{reviewError}</p>}
                    <button onClick={handleReview} disabled={reviewSaving}
                      className="w-full py-2.5 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition"
                      style={{ backgroundColor: '#E07A34' }}>
                      {reviewSaving ? 'Enviando…' : 'Enviar reseña'}
                    </button>
                  </div>
                </div>
              )}
              {reviewDone && (
                <p className="text-sm text-center font-semibold py-2" style={{ color: '#8BAF4E' }}>
                  ✓ Reseña enviada. ¡Gracias!
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
