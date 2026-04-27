// Sidebar component — ARREO Design System
// Props: activeScreen, onNavigate, role ('ganadero'|'transportista')

const BULL_PATH = "M340 1421 c-19 -36 -11 -101 20 -165 57 -117 110 -153 265 -180 78-13 93 -19 114 -44 22 -27 62 -159 91 -297 28 -134 135 -205 241 -161 73 31 105 78 119 177 6 39 14 78 19 87 5 9 11 37 15 62 7 47 38 109 62 123 8 4 14 17 14 27 0 11 3 20 8 21 4 0 16 2 27 4 11 1 47 5 81 9 75 7 141 34 174 72 89 101 123 207 84 262 -32 46 -73 19 -93 -61 -23 -96 -64 -139 -153 -162 -51 -12-76 -14 -100 -7 -18 6 -52 14 -75 17 -24 4 -46 11 -49 16 -3 5 -27 20 -52 32-37 17 -65 22 -133 22 -78 0 -92 -3 -160 -36 -99 -49 -168 -64 -222 -51 -23 6-58 14 -77 18 -39 8 -90 42 -90 61 0 7 -4 13 -8 13 -9 0 -32 59 -32 84 0 9 -7 30 -15 46 -18 35 -58 41 -75 11z";

const BullIcon = ({ size = 24, color = '#BDD18A' }) => (
  <svg width={size} height={size} viewBox="22 40 158 120">
    <g transform="translate(0,200) scale(0.1,-0.1)" fill="none" stroke={color} strokeWidth="22" strokeLinejoin="round" strokeLinecap="round">
      <path d={BULL_PATH}/>
    </g>
  </svg>
);

const Icon = ({ name, size = 16 }) => {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    trips:     <><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></>,
    tracking:  <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    users:     <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    calendar:  <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    money:     <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    truck:     <><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
  };
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

const NAV_GANADERO = [
  { id:'dashboard',       label:'Dashboard',       icon:'dashboard' },
  { id:'trips',           label:'Mis viajes',      icon:'trips' },
  { id:'tracking',        label:'Seguimiento',     icon:'tracking' },
  { id:'disponibilidades',label:'Disponibilidades',icon:'calendar' },
  { id:'liquidaciones',   label:'Liquidaciones',   icon:'money' },
];

const NAV_TRANSPORTISTA = [
  { id:'dashboard',       label:'Dashboard',       icon:'dashboard' },
  { id:'trips',           label:'Mis viajes',      icon:'truck' },
  { id:'tracking',        label:'Seguimiento',     icon:'tracking' },
  { id:'disponibilidades',label:'Mis disponibilidades', icon:'calendar' },
  { id:'liquidaciones',   label:'Liquidaciones',   icon:'money' },
];

const Sidebar = ({ activeScreen, onNavigate, role = 'ganadero', userName = 'Martín García' }) => {
  const items = role === 'transportista' ? NAV_TRANSPORTISTA : NAV_GANADERO;
  const initials = userName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();

  return (
    <div style={{
      background:'#1F2B1F', width:220, display:'flex', flexDirection:'column',
      padding:'20px 0', flexShrink:0, minHeight:'100vh',
    }}>
      {/* Logo */}
      <div style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'0 18px 20px', borderBottom:'1px solid rgba(255,255,255,.07)',
        marginBottom:12,
      }}>
        <BullIcon size={26}/>
        <span style={{fontSize:16,fontWeight:700,letterSpacing:'.16em',color:'#fff'}}>ARREO</span>
      </div>

      {/* Nav */}
      <nav style={{flex:1, display:'flex', flexDirection:'column', gap:2, padding:'0 10px'}}>
        <div style={{fontSize:9,letterSpacing:'.14em',color:'rgba(255,255,255,.25)',textTransform:'uppercase',padding:'10px 12px 4px'}}>
          Principal
        </div>
        {items.slice(0,3).map(item => (
          <button key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'9px 12px', borderRadius:8,
              fontSize:13, fontWeight:500,
              color: activeScreen === item.id ? '#fff' : 'rgba(255,255,255,.65)',
              background: activeScreen === item.id ? 'rgba(139,175,78,.13)' : 'transparent',
              border:'none', cursor:'pointer', width:'100%', textAlign:'left',
              fontFamily:"'DM Sans',sans-serif",
              transition:'all .15s',
            }}
          >
            <span style={{opacity: activeScreen===item.id ? 1 : .65}}><Icon name={item.icon}/></span>
            {item.label}
          </button>
        ))}
        <div style={{fontSize:9,letterSpacing:'.14em',color:'rgba(255,255,255,.25)',textTransform:'uppercase',padding:'12px 12px 4px'}}>
          Gestión
        </div>
        {items.slice(3).map(item => (
          <button key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'9px 12px', borderRadius:8,
              fontSize:13, fontWeight:500,
              color: activeScreen === item.id ? '#fff' : 'rgba(255,255,255,.65)',
              background: activeScreen === item.id ? 'rgba(139,175,78,.13)' : 'transparent',
              border:'none', cursor:'pointer', width:'100%', textAlign:'left',
              fontFamily:"'DM Sans',sans-serif",
              transition:'all .15s',
            }}
          >
            <span style={{opacity: activeScreen===item.id ? 1 : .65}}><Icon name={item.icon}/></span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding:'14px 18px', borderTop:'1px solid rgba(255,255,255,.07)',
        display:'flex', alignItems:'center', gap:10,
      }}>
        <div style={{
          width:30, height:30, borderRadius:'50%', background:'#8BAF4E',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:12, fontWeight:700, color:'#1F2B1F', flexShrink:0,
        }}>{initials}</div>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:'#fff'}}>{userName}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,.4)',textTransform:'capitalize'}}>{role}</div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Sidebar, BullIcon, Icon });
