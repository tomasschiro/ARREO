// StatusBadge component — ARREO Design System
// Usage: <StatusBadge status="active|pending|completed|cancelled|live" />

const StatusBadge = ({ status, children }) => {
  const configs = {
    active:    { bg: 'rgba(139,175,78,.15)',  color: '#5a7a2a', dot: '#8BAF4E',  glow: true,  label: 'En camino' },
    confirmed: { bg: 'rgba(139,175,78,.15)',  color: '#5a7a2a', dot: '#8BAF4E',  glow: false, label: 'Confirmado' },
    pending:   { bg: 'rgba(224,122,52,.15)',  color: '#b85e1e', dot: '#E07A34',  glow: false, label: 'Pendiente' },
    cancelled: { bg: 'rgba(200,60,60,.12)',   color: '#a02020', dot: '#C83C3C',  glow: false, label: 'Cancelado' },
    completed: { bg: 'rgba(0,0,0,.06)',       color: '#555',    dot: '#aaa',     glow: false, label: 'Completado' },
    live:      { bg: 'rgba(139,175,78,.12)',  color: '#5a7a2a', dot: '#8BAF4E',  glow: true,  label: 'En vivo' },
    available: { bg: 'rgba(139,175,78,.15)',  color: '#5a7a2a', dot: '#8BAF4E',  glow: false, label: 'Disponible' },
  };
  const cfg = configs[status] || configs.pending;
  const text = children || cfg.label;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      background: cfg.bg, color: cfg.color,
      fontSize:11, fontWeight:600,
      padding:'3px 9px', borderRadius:6,
      letterSpacing:'.01em', whiteSpace:'nowrap',
    }}>
      <span style={{
        width:6, height:6, borderRadius:'50%',
        background: cfg.dot, flexShrink:0,
        boxShadow: cfg.glow ? `0 0 5px ${cfg.dot}` : 'none',
        display:'inline-block',
      }}/>
      {text}
    </span>
  );
};

Object.assign(window, { StatusBadge });
