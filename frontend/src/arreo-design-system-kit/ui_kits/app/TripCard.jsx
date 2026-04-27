// TripCard component — ARREO Design System
// Props: trip { id, origin, destination, date, price, status, transporter, eta }

const TripCard = ({ trip, onAction }) => {
  const { origin, destination, date, price, status, transporter, eta } = trip;

  const actionLabel = {
    available: 'Tomar viaje',
    active:    'Ver seguimiento',
    confirmed: 'Ver detalles',
    pending:   'Ver detalles',
    completed: 'Ver comprobante',
    cancelled: 'Ver historial',
  }[status] || 'Ver detalles';

  const actionBg = {
    available: '#E07A34',
    active:    '#1F2B1F',
    confirmed: '#1F2B1F',
  }[status] || 'transparent';

  const actionBorder = ['completed','cancelled','pending'].includes(status)
    ? '1.5px solid #E0E0E0' : 'none';
  const actionColor = ['completed','cancelled','pending'].includes(status)
    ? '#666' : '#fff';

  const dotOriginColor = status === 'completed' ? '#bbb' : '#8BAF4E';
  const dotDestColor   = status === 'completed' ? '#bbb' : '#E07A34';
  const lineColor      = status === 'completed' ? 'rgba(0,0,0,0.12)' : 'rgba(139,175,78,0.4)';

  return (
    <div style={{
      background:'#fff', borderRadius:16, padding:'16px 18px',
      boxShadow:'0 2px 12px rgba(0,0,0,0.06)',
      display:'flex', flexDirection:'column', gap:10,
      width:220, flexShrink:0,
    }}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:9,color:'#999',fontWeight:500,letterSpacing:'.12em',textTransform:'uppercase'}}>
          {status === 'available' ? 'Viaje disponible' : status === 'active' ? 'Viaje activo' : status === 'completed' ? 'Completado' : 'Viaje'}
        </span>
        <StatusBadge status={status} />
      </div>

      {/* Origin */}
      <div>
        <div style={{fontSize:9,color:'#999',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:2}}>Origen</div>
        <div style={{fontSize:13,fontWeight:600,color:'#111'}}>{origin}</div>
      </div>

      {/* Route line */}
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'2px 0'}}>
        <div style={{width:7,height:7,borderRadius:'50%',background:dotOriginColor,flexShrink:0}}/>
        <div style={{flex:1,borderTop:`1.5px dashed ${lineColor}`}}/>
        {status === 'active' && (
          <div style={{width:9,height:9,borderRadius:'50%',background:'#8BAF4E',boxShadow:'0 0 6px #8BAF4E',flexShrink:0}}/>
        )}
        {status === 'active' && <div style={{flex:1,borderTop:'1.5px dashed rgba(0,0,0,.1)'}}/>}
        <div style={{width:7,height:7,borderRadius:'50%',background:dotDestColor,flexShrink:0}}/>
      </div>

      {/* Destination */}
      <div>
        <div style={{fontSize:9,color:'#999',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:2}}>Destino</div>
        <div style={{fontSize:13,fontWeight:600,color:'#111'}}>{destination}</div>
      </div>

      {/* Meta */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
        <div>
          <div style={{fontSize:9,color:'#999',marginBottom:1}}>
            {transporter ? 'Transportista' : 'Fecha'}
          </div>
          <div style={{fontSize:11,fontWeight:500,color:'#333'}}>
            {transporter || date}
          </div>
          {transporter && <div style={{fontSize:10,color:'#aaa'}}>{date}</div>}
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:9,color:'#999',marginBottom:1}}>
            {eta ? 'ETA' : 'Precio est.'}
          </div>
          <div style={{fontSize:eta ? 14 : 18, fontWeight:700, color: status==='completed'?'#666':'#1F2B1F'}}>
            {eta || price}
          </div>
        </div>
      </div>

      {/* Action button */}
      <button
        onClick={() => onAction && onAction(trip)}
        style={{
          fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600,
          background:actionBg, color:actionColor,
          border:actionBorder, borderRadius:8, padding:'9px 0',
          cursor:'pointer', width:'100%',
          transition:'opacity .15s',
        }}
        onMouseEnter={e => e.target.style.opacity='.85'}
        onMouseLeave={e => e.target.style.opacity='1'}
      >
        {actionLabel}
      </button>
    </div>
  );
};

Object.assign(window, { TripCard });
