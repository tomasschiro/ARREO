'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface MenuItem { href: string; icon: React.ReactNode; label: string; badge?: number }

function ToroBull() {
  return (
    <svg width="32" height="32" viewBox="22 40 158 120" fill="none" style={{ color: '#BDD18A' }}>
      <g transform="translate(0,200) scale(0.1,-0.1)"
         stroke="currentColor" strokeWidth="20"
         strokeLinejoin="round" strokeLinecap="round" fill="none">
        <path d="M340 1421 c-19 -36 -11 -101 20 -165 57 -117 110 -153 265 -180 78-13 93 -19 114 -44 22 -27 62 -159 91 -297 28 -134 135 -205 241 -161 73 31 105 78 119 177 6 39 14 78 19 87 5 9 11 37 15 62 7 47 38 109 62 123 8 4 14 17 14 27 0 11 3 20 8 21 4 0 16 2 27 4 11 1 47 5 81 9 75 7 141 34 174 72 89 101 123 207 84 262 -32 46 -73 19 -93 -61 -23 -96 -64 -139 -153 -162 -51 -12-76 -14 -100 -7 -18 6 -52 14 -75 17 -24 4 -46 11 -49 16 -3 5 -27 20 -52 32-37 17 -65 22 -133 22 -78 0 -92 -3 -160 -36 -99 -49 -168 -64 -222 -51 -23 6-58 14 -77 18 -39 8 -90 42 -90 61 0 7 -4 13 -8 13 -9 0 -32 59 -32 84 0 9 -7 30 -15 46 -18 35 -58 41 -75 11z"/>
      </g>
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  );
}
function MapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

function menuFor(rol: string, noLeidos: number): MenuItem[] {
  if (rol === 'superadmin') return [
    { href: '/admin',    icon: <ShieldIcon />, label: 'Panel Admin' },
    { href: '/mensajes', icon: <MailIcon />,   label: 'Mensajes', badge: noLeidos },
    { href: '/perfil',   icon: <UserIcon />,   label: 'Mi perfil' },
  ];
  if (rol === 'transportista') return [
    { href: '/dashboard',  icon: <DashboardIcon />, label: 'Dashboard' },
    { href: '/viajes',     icon: <MapIcon />,       label: 'Viajes disponibles' },
    { href: '/mis-viajes', icon: <TruckIcon />,     label: 'Mis viajes' },
    { href: '/mensajes',   icon: <MailIcon />,      label: 'Mensajes', badge: noLeidos },
    { href: '/perfil',     icon: <UserIcon />,      label: 'Mi perfil' },
  ];
  return [
    { href: '/dashboard',        icon: <ListIcon />,  label: 'Mis viajes' },
    { href: '/disponibilidades', icon: <TruckIcon />, label: 'Buscar camiones' },
    { href: '/mensajes',         icon: <MailIcon />,  label: 'Mensajes', badge: noLeidos },
    { href: '/perfil',           icon: <UserIcon />,  label: 'Mi perfil' },
  ];
}

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const pathname  = usePathname();
  const router    = useRouter();
  const [noLeidos, setNoLeidos] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.get('/mensajes/no-leidos')
      .then(({ data }) => setNoLeidos(data.total))
      .catch(() => {});
  }, [user, pathname]);

  const items = menuFor(user?.rol ?? 'productor', noLeidos);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <aside className="sidebar">

      {/* Logo */}
      <Link href="/dashboard" style={{ textDecoration: 'none' }}>
        <div className="sidebar-logo">
          <ToroBull />
          <div>
            <div className="sidebar-logo-name">ARREO</div>
            <div className="sidebar-logo-tag">Transporte Ganadero Inteligente</div>
          </div>
        </div>
      </Link>

      {/* Nav */}
      <div className="sidebar-section" style={{ flex: 1 }}>
        {items.map((item, idx) => {
          const isActive = pathname === item.href && (idx === 0 || pathname !== '/dashboard');
          return (
            <Link
              key={`${item.label}-${idx}`}
              href={item.href}
              className={`sidebar-item${isActive ? ' active' : ''}`}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span style={{
                  minWidth: 20, height: 20, padding: '0 4px', borderRadius: 9999,
                  backgroundColor: '#E24B4A', color: 'white', fontSize: 11,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                }}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* User + Logout */}
      <div style={{ padding: '16px 12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', flexShrink: 0, backgroundColor: 'rgba(139,175,78,0.3)', color: '#8BAF4E' }}>
              {(user.nombre ?? user.name ?? '?')[0]}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ color: 'white', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.nombre ?? user.name}</p>
              {user.rol === 'superadmin'
                ? <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', backgroundColor: '#E07B39', padding: '1px 6px', borderRadius: 4, letterSpacing: '0.05em' }}>SUPERADMIN</span>
                : <p style={{ color: '#8BAF4E', fontSize: 12, textTransform: 'capitalize' }}>{user.rol}</p>
              }
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="sidebar-item"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left' }}
        >
          <span className="sidebar-item-icon"><LogoutIcon /></span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
