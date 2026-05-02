'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Beef, AlertTriangle } from 'lucide-react';

const CIUDADES = [
  'Paraná', 'Gualeguaychú', 'Concordia', 'Villaguay', 'Victoria',
  'Corrientes Capital', 'Mercedes', 'Paso de los Libres', 'Monte Caseros', 'Curuzú Cuatiá',
];
const TIPOS_HACIENDA = ['Novillos', 'Vacas', 'Terneros', 'Toros', 'Vaquillonas'];
const CATEGORIAS     = ['Invernada', 'Cría', 'Destete', 'Reproducción', 'Faena'];

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#555555]">
        {label} {required && <span style={{ color: '#8BAF4E' }}>*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = 'w-full border border-[#E0E0E0] rounded-lg px-4 py-2.5 text-sm text-[#111111] bg-white focus:outline-none focus:ring-2 focus:ring-[#8BAF4E] focus:border-transparent transition';

interface FormState {
  origen: string; destino: string; fecha_salida: string; tipo_hacienda: string;
  cantidad_cabezas: string; categoria: string; observaciones: string;
}

const EMPTY: FormState = {
  origen: '', destino: '', fecha_salida: '', tipo_hacienda: '',
  cantidad_cabezas: '', categoria: '', observaciones: '',
};

export default function PublicarViajePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (!['productor', 'consignataria'].includes(user.rol)) router.push('/dashboard');
  }, [authLoading, user, router]);

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
    setServerError('');
  }

  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.origen) e.origen = 'Seleccioná el origen';
    if (!form.destino) e.destino = 'Seleccioná el destino';
    if (form.origen && form.destino && form.origen === form.destino) e.destino = 'El destino no puede ser igual al origen';
    if (!form.fecha_salida) e.fecha_salida = 'Seleccioná la fecha';
    else if (new Date(form.fecha_salida) < new Date(new Date().toDateString())) e.fecha_salida = 'La fecha no puede ser en el pasado';
    if (!form.tipo_hacienda) e.tipo_hacienda = 'Seleccioná el tipo de hacienda';
    if (!form.cantidad_cabezas) e.cantidad_cabezas = 'Ingresá la cantidad';
    else if (parseInt(form.cantidad_cabezas) < 1) e.cantidad_cabezas = 'Debe ser mayor a 0';
    if (!form.categoria) e.categoria = 'Seleccioná la categoría';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError('');
    try {
      await api.post('/viajes', {
        ...form,
        cantidad_cabezas: parseInt(form.cantidad_cabezas),
        observaciones: form.observaciones || undefined,
      });
      setSuccess(true);
      setForm(EMPTY);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setServerError(msg || 'Error al publicar el viaje');
    } finally {
      setSubmitting(false);
    }
  }

  const hoy = new Date().toISOString().split('T')[0];

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2F2F0]">
        <div className="animate-spin w-8 h-8 border-4 border-[#8BAF4E] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F0]">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-[#111111] transition text-lg">←</Link>
          <div>
            <h1 className="text-base font-bold text-[#111111]">Publicar viaje</h1>
            <p className="text-xs text-gray-400">Completá los datos del traslado</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm uppercase"
            style={{ backgroundColor: 'rgba(139,175,78,0.15)', color: '#4d6b1a' }}>
            {(user.nombre ?? user.name ?? '?')[0]}
          </div>
          <span className="text-sm font-medium text-[#111111] hidden sm:block">{user.nombre ?? user.name}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">

        {success && (
          <div className="mb-6 rounded-2xl p-5 flex items-start gap-3"
            style={{ backgroundColor: 'rgba(139,175,78,0.1)', border: '1px solid rgba(139,175,78,0.3)' }}>
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-bold" style={{ color: '#4d6b1a' }}>¡Viaje publicado con éxito!</p>
              <p className="text-sm text-[#555555] mt-1">Los transportistas ya pueden ver tu viaje y aplicar.</p>
              <div className="flex gap-3 mt-3">
                <button onClick={() => setSuccess(false)} className="text-sm font-semibold hover:underline"
                  style={{ color: '#8BAF4E' }}>
                  Publicar otro viaje
                </button>
                <Link href="/dashboard" className="text-sm font-medium text-gray-400 hover:underline">
                  Ir al dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 sm:p-8" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Origen" required error={errors.origen}>
                <select value={form.origen} onChange={e => set('origen', e.target.value)} className={inputCls}>
                  <option value="">Seleccioná ciudad</option>
                  {CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Destino" required error={errors.destino}>
                <select value={form.destino} onChange={e => set('destino', e.target.value)} className={inputCls}>
                  <option value="">Seleccioná ciudad</option>
                  {CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            {form.origen && form.destino && form.origen !== form.destino && (
              <div className="flex items-center justify-center gap-3 -mt-2 text-sm">
                <span className="font-semibold text-[#111111]">{form.origen}</span>
                <span className="text-lg font-bold" style={{ color: '#8BAF4E' }}>→</span>
                <span className="font-semibold text-[#111111]">{form.destino}</span>
              </div>
            )}

            <Field label="Fecha de salida" required error={errors.fecha_salida}>
              <input type="date" min={hoy} value={form.fecha_salida}
                onChange={e => set('fecha_salida', e.target.value)} className={inputCls} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tipo de hacienda" required error={errors.tipo_hacienda}>
                <select value={form.tipo_hacienda} onChange={e => set('tipo_hacienda', e.target.value)} className={inputCls}>
                  <option value="">Seleccioná tipo</option>
                  {TIPOS_HACIENDA.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Categoría" required error={errors.categoria}>
                <select value={form.categoria} onChange={e => set('categoria', e.target.value)} className={inputCls}>
                  <option value="">Seleccioná categoría</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Cantidad de cabezas" required error={errors.cantidad_cabezas}>
              <div className="relative">
                <input type="number" min={1} value={form.cantidad_cabezas}
                  onChange={e => set('cantidad_cabezas', e.target.value)}
                  placeholder="Ej: 150" className={inputCls} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                  cabezas
                </span>
              </div>
            </Field>

            <Field label="Observaciones" error={errors.observaciones}>
              <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
                placeholder="Información adicional: condiciones del campo, acceso al establecimiento, horario preferido de carga…"
                rows={3} className={`${inputCls} resize-none`} />
              <p className="text-xs text-gray-400">Opcional — ayuda a los transportistas a prepararse mejor</p>
            </Field>

            {serverError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3">
                <AlertTriangle size={14} className="shrink-0" /> {serverError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Link href="/dashboard"
                className="flex-1 text-center py-2.5 rounded-lg border-2 text-sm font-semibold transition"
                style={{ borderColor: '#1F2B1F', color: '#1F2B1F' }}>
                Cancelar
              </Link>
              <button type="submit" disabled={submitting}
                className="flex-grow-[2] text-white font-semibold py-2.5 px-6 rounded-lg transition disabled:opacity-60"
                style={{ backgroundColor: '#E07A34' }}>
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Publicando...
                  </span>
                ) : <span className="flex items-center justify-center gap-2"><Beef size={16} /> Publicar viaje</span>}
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
