'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const css = `
/* ── TOKENS ───────────────────────────────────────────────── */
:root {
  --verde-bosque: #1F2B1F;
  --verde-bosque-mid: #2D3E2D;
  --verde-arreo: #8BAF4E;
  --verde-light: #BDD18A;
  --tierra: #E07A34;
  --niebla: #F2F2F0;
  --carbon: #111111;
  --blanco: #FFFFFF;
  --font: 'DM Sans', system-ui, sans-serif;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
.landing-root {
  font-family: var(--font);
  color: var(--carbon);
  background: var(--blanco);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* ── NAV ──────────────────────────────────────────────────── */
nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  padding: 0 48px;
  height: 64px;
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(31,43,31,.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.nav-logo-name { color: #fff; font-size: 17px; font-weight: 700; letter-spacing: .16em; }
.nav-links { display: flex; gap: 32px; align-items: center; }
.nav-links a { color: rgba(255,255,255,.6); font-size: 14px; font-weight: 500; text-decoration: none; transition: color .15s; }
.nav-links a:hover { color: #fff; }
.nav-login { color: rgba(255,255,255,.6); font-size: 14px; font-weight: 500; text-decoration: none; transition: color .15s; }
.nav-login:hover { color: #fff; }
.nav-cta { background: var(--tierra); color: #fff; padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; letter-spacing: .04em; transition: background .15s; }
.nav-cta:hover { background: #C86928; }

/* ── HERO ─────────────────────────────────────────────────── */
.hero {
  min-height: 100vh;
  background: var(--verde-bosque);
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  padding: 80px 48px 48px;
  gap: 48px;
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 60% 60% at 70% 40%, rgba(139,175,78,.08) 0%, transparent 60%);
  pointer-events: none;
}
.hero-left { position: relative; z-index: 1; }
.hero-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(139,175,78,.15); border: 1px solid rgba(139,175,78,.3);
  color: var(--verde-light); padding: 5px 12px; border-radius: 999px;
  font-size: 11px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase;
  margin-bottom: 24px;
}
.hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--verde-arreo); animation: pulse-dot 2s infinite; }
@keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
.hero-h1 { font-size: clamp(38px,4vw,58px); font-weight: 800; line-height: 1.05; letter-spacing: -.02em; color: #fff; }
.hero-h1 .accent { color: var(--verde-light); }
.hero-sub { color: rgba(255,255,255,.55); font-size: 18px; line-height: 1.6; margin-top: 20px; max-width: 440px; }
.hero-actions { display: flex; gap: 12px; margin-top: 36px; flex-wrap: wrap; }
.btn-hero-primary { background: var(--tierra); color: #fff; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; transition: background .15s, transform .1s; display: inline-block; }
.btn-hero-primary:hover { background: #C86928; transform: translateY(-1px); }
.btn-hero-ghost { border: 1.5px solid rgba(255,255,255,.25); color: rgba(255,255,255,.8); padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; transition: border-color .15s, color .15s; display: inline-block; }
.btn-hero-ghost:hover { border-color: rgba(255,255,255,.5); color: #fff; }
.hero-trust { display: flex; gap: 24px; margin-top: 48px; flex-wrap: wrap; }
.trust-item { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,.45); font-size: 13px; }
.trust-item svg { opacity: .6; }

/* ── MAP ─────────────────────────────────────────────────── */
.hero-map { position: relative; width: 100%; aspect-ratio: .85; z-index: 1; }
#map-svg { width: 100%; height: 100%; }

.arg-outline { fill: none; stroke: rgba(139,175,78,.15); stroke-width: 1.5; }
.arg-prov { fill: rgba(139,175,78,.04); stroke: rgba(139,175,78,.08); stroke-width: .5; }
.route-path { fill: none; stroke-linecap: round; }
.route-active { stroke: var(--verde-arreo); stroke-width: 1.5; stroke-dasharray: 6 5; opacity: .7; }
.route-completed { stroke: rgba(139,175,78,.25); stroke-width: 1; stroke-dasharray: 4 6; }
.city-node-outer { fill: rgba(139,175,78,.12); }
.city-node-inner { fill: var(--verde-arreo); }
.city-node-dest  { fill: var(--tierra); }
.city-label { fill: rgba(255,255,255,.5); font-size: 9px; font-family: var(--font); font-weight: 500; letter-spacing: .06em; }
.truck-dot { fill: var(--verde-light); filter: drop-shadow(0 0 6px #8BAF4E); }
.truck-dot-2 { fill: var(--tierra); filter: drop-shadow(0 0 6px #E07A34); }
@keyframes ring-pulse {
  0%   { r: 6; opacity: .6; }
  100% { r: 18; opacity: 0; }
}
.pulse-ring { animation: ring-pulse 2.4s ease-out infinite; fill: none; stroke: var(--verde-arreo); stroke-width: 1; }
.pulse-ring-2 { animation: ring-pulse 2.4s ease-out 1.2s infinite; fill: none; stroke: var(--verde-arreo); stroke-width: 1; }

@keyframes draw-route { from { stroke-dashoffset: 500; } to { stroke-dashoffset: 0; } }
.route-draw { stroke-dasharray: 500; animation: draw-route 2.5s ease forwards; }
.route-draw-2 { stroke-dasharray: 500; animation: draw-route 3s 0.4s ease forwards; stroke-dashoffset: 500; }
.route-draw-3 { stroke-dasharray: 500; animation: draw-route 2.8s 0.8s ease forwards; stroke-dashoffset: 500; }

/* ── STATS ────────────────────────────────────────────────── */
.stats { background: var(--niebla); padding: 64px 48px; }
.stats-grid { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(4,1fr); gap: 24px; }
.stat-card { background: var(--blanco); border-radius: 16px; padding: 28px 24px; box-shadow: 0 2px 12px rgba(0,0,0,.06); }
.stat-n { font-size: 42px; font-weight: 800; color: var(--verde-bosque); line-height: 1; }
.stat-l { font-size: 13px; color: #888; margin-top: 6px; font-weight: 500; }
.stat-accent { color: var(--verde-arreo); }

/* ── HOW IT WORKS ─────────────────────────────────────────── */
.how { background: var(--blanco); padding: 96px 48px; }
.section-label { font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--verde-arreo); margin-bottom: 12px; }
.section-title { font-size: clamp(28px,3vw,42px); font-weight: 800; color: var(--verde-bosque); line-height: 1.15; letter-spacing: -.02em; }
.section-sub { font-size: 17px; color: #666; margin-top: 12px; max-width: 500px; line-height: 1.6; }
.how-inner { max-width: 1100px; margin: 0 auto; }
.how-header { margin-bottom: 64px; }
.steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 40px; position: relative; }
.steps::before {
  content: '';
  position: absolute;
  top: 28px; left: calc(16.67% + 24px); right: calc(16.67% + 24px);
  height: 1px;
  background: repeating-linear-gradient(to right, var(--verde-arreo) 0, var(--verde-arreo) 4px, transparent 4px, transparent 10px);
  opacity: .4;
}
.step { display: flex; flex-direction: column; gap: 16px; }
.step-num {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--verde-bosque); color: var(--verde-light);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 800; letter-spacing: -.01em;
  flex-shrink: 0;
}
.step-title { font-size: 18px; font-weight: 700; color: var(--verde-bosque); }
.step-desc { font-size: 15px; color: #666; line-height: 1.6; }

/* ── FEATURES ─────────────────────────────────────────────── */
.features { background: var(--verde-bosque); padding: 96px 48px; }
.features-inner { max-width: 1100px; margin: 0 auto; }
.features-header { margin-bottom: 56px; }
.features-header .section-title { color: #fff; }
.features-header .section-sub { color: rgba(255,255,255,.5); }
.features-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
.feature-card {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 16px; padding: 28px;
  transition: background .2s, border-color .2s;
}
.feature-card:hover { background: rgba(255,255,255,.07); border-color: rgba(139,175,78,.2); }
.feature-icon {
  width: 44px; height: 44px; border-radius: 10px;
  background: rgba(139,175,78,.15);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
}
.feature-icon svg { color: var(--verde-light); }
.feature-title { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 8px; }
.feature-desc { font-size: 14px; color: rgba(255,255,255,.45); line-height: 1.6; }

/* ── TRACKING DEMO ────────────────────────────────────────── */
.tracking-demo { background: var(--niebla); padding: 96px 48px; }
.tracking-inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
.tracking-ui {
  background: #0d180d;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,.25);
}
.tracking-ui-header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,.06); }
.tracking-ui-status { display: flex; align-items: center; gap: 8px; }
.live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--verde-arreo); animation: pulse-dot 1.5s infinite; box-shadow: 0 0 8px var(--verde-arreo); }
.tracking-ui-map { height: 220px; position: relative; overflow: hidden; background: #0a1408; }
.tracking-ui-info { padding: 16px 20px; display: flex; gap: 16px; justify-content: space-between; }
.tracking-kv { display: flex; flex-direction: column; gap: 3px; }
.tracking-k { font-size: 10px; color: rgba(255,255,255,.3); text-transform: uppercase; letter-spacing: .1em; }
.tracking-v { font-size: 16px; font-weight: 700; color: #fff; }

/* ── CTA ──────────────────────────────────────────────────── */
.cta-section { background: var(--tierra); padding: 80px 48px; text-align: center; }
.cta-title { font-size: clamp(28px,3vw,48px); font-weight: 800; color: #fff; line-height: 1.1; letter-spacing: -.02em; margin-bottom: 16px; }
.cta-sub { font-size: 18px; color: rgba(255,255,255,.75); margin-bottom: 36px; }
.cta-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
.btn-cta-white { background: #fff; color: var(--tierra); padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; transition: transform .1s; display: inline-block; }
.btn-cta-white:hover { transform: translateY(-2px); }
.btn-cta-outline { border: 2px solid rgba(255,255,255,.5); color: #fff; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; transition: border-color .15s; display: inline-block; }
.btn-cta-outline:hover { border-color: #fff; }

/* ── FOOTER ──────────────────────────────────────────────── */
footer { background: #0d150d; padding: 40px 48px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
.footer-brand { display: flex; align-items: center; gap: 10px; }
.footer-name { color: #fff; font-size: 15px; font-weight: 700; letter-spacing: .14em; }
.footer-copy { font-size: 13px; color: rgba(255,255,255,.25); }

/* ── RESPONSIVE ──────────────────────────────────────────── */
@media (max-width: 900px) {
  .hero { grid-template-columns: 1fr; padding: 100px 24px 48px; }
  .hero-map { display: none; }
  .stats-grid { grid-template-columns: repeat(2,1fr); }
  .steps { grid-template-columns: 1fr; }
  .steps::before { display: none; }
  .features-grid { grid-template-columns: 1fr 1fr; }
  .tracking-inner { grid-template-columns: 1fr; }
  nav { padding: 0 24px; }
  .nav-links { display: none; }
}
`;

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) router.replace('/dashboard');
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Moving trucks on hero map
    const truckConfigs = [
      { truckId: 'truck1', routeId: 'route1', delay: 0 },
      { truckId: 'truck2', routeId: 'route2', delay: 600 },
      { truckId: 'truck3', routeId: 'route3', delay: 1200 },
    ];

    truckConfigs.forEach(({ truckId, routeId, delay }, i) => {
      const truck = document.getElementById(truckId) as SVGCircleElement | null;
      const path = document.getElementById(routeId) as SVGPathElement | null;
      if (!truck || !path) return;
      const len = path.getTotalLength();
      let progress = (i * 0.3) % 1;

      function step() {
        if (cancelled) return;
        progress = (progress + 0.0008) % 1;
        const pt = path!.getPointAtLength(progress * len);
        truck!.setAttribute('cx', String(pt.x));
        truck!.setAttribute('cy', String(pt.y));
        requestAnimationFrame(step);
      }

      const tid = setTimeout(() => requestAnimationFrame(step), delay);
      timeouts.push(tid);
    });

    // Moving truck on tracking UI
    const trackRoute = document.getElementById('track-route') as SVGPathElement | null;
    const trackTruck = document.getElementById('track-truck') as SVGCircleElement | null;
    const trackRing  = document.getElementById('track-truck-ring') as SVGCircleElement | null;
    const trackDone  = document.getElementById('track-done') as SVGPathElement | null;

    if (trackRoute && trackTruck) {
      const tLen = trackRoute.getTotalLength();
      let tProgress = 0.42;
      if (trackDone) trackDone.style.strokeDasharray = String(tLen);

      function trackStep() {
        if (cancelled) return;
        tProgress = (tProgress + 0.0005) % 1;
        const pt = trackRoute!.getPointAtLength(tProgress * tLen);
        trackTruck!.setAttribute('cx', String(pt.x));
        trackTruck!.setAttribute('cy', String(pt.y));
        if (trackRing) {
          trackRing.setAttribute('cx', String(pt.x));
          trackRing.setAttribute('cy', String(pt.y));
        }
        if (trackDone) {
          trackDone.style.strokeDashoffset = String(tLen - tProgress * tLen);
        }
        requestAnimationFrame(trackStep);
      }
      requestAnimationFrame(trackStep);
    }

    // Scroll fade-in
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).style.opacity = '1';
          (e.target as HTMLElement).style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.step, .feature-card, .stat-card').forEach(el => {
      (el as HTMLElement).style.opacity = '0';
      (el as HTMLElement).style.transform = 'translateY(20px)';
      (el as HTMLElement).style.transition = 'opacity .5s ease, transform .5s ease';
      observer.observe(el);
    });

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="landing-root">
      <style>{css}</style>

      {/* NAV */}
      <nav>
        <a href="#" className="nav-logo">
          <svg width="28" height="26" viewBox="22 40 158 120" fill="none">
            <g transform="translate(0,200) scale(0.1,-0.1)" stroke="#BDD18A" strokeWidth="20" strokeLinejoin="round" strokeLinecap="round" fill="none">
              <path d="M340 1421 c-19 -36 -11 -101 20 -165 57 -117 110 -153 265 -180 78-13 93 -19 114 -44 22 -27 62 -159 91 -297 28 -134 135 -205 241 -161 73 31 105 78 119 177 6 39 14 78 19 87 5 9 11 37 15 62 7 47 38 109 62 123 8 4 14 17 14 27 0 11 3 20 8 21 4 0 16 2 27 4 11 1 47 5 81 9 75 7 141 34 174 72 89 101 123 207 84 262 -32 46 -73 19 -93 -61 -23 -96 -64 -139 -153 -162 -51 -12-76 -14 -100 -7 -18 6 -52 14 -75 17 -24 4 -46 11 -49 16 -3 5 -27 20 -52 32-37 17 -65 22 -133 22 -78 0 -92 -3 -160 -36 -99 -49 -168 -64 -222 -51 -23 6-58 14 -77 18 -39 8 -90 42 -90 61 0 7 -4 13 -8 13 -9 0 -32 59 -32 84 0 9 -7 30 -15 46 -18 35 -58 41 -75 11z"/>
            </g>
          </svg>
          <span className="nav-logo-name">ARREO</span>
        </a>
        <div className="nav-links">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#features">Características</a>
          <a href="#seguridad">Seguridad</a>
          <a href="/login" className="nav-login">Iniciar sesión</a>
        </div>
        <a href="/register" className="nav-cta">Registrarse</a>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            Seguimiento en tiempo real
          </div>
          <h1 className="hero-h1">
            LA APP QUE<br/>
            CONECTA TU<br/>
            GANADO CON<br/>
            <span className="accent">EL CAMINO.</span>
          </h1>
          <p className="hero-sub">Transporte seguro, rápido y sin complicaciones. Conectamos productores con los mejores transportistas de Argentina.</p>
          <div className="hero-actions">
            <a href="/register" className="btn-hero-primary">Registrarse</a>
            <a href="#como-funciona" className="btn-hero-ghost">Ver cómo funciona</a>
          </div>
          <div className="hero-trust">
            <div className="trust-item">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M6.5 10l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Sin viajes falsos
            </div>
            <div className="trust-item">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M6.5 10l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Trazabilidad completa
            </div>
            <div className="trust-item">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M6.5 10l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              24/7 soporte
            </div>
          </div>
        </div>

        {/* INTERACTIVE MAP */}
        <div className="hero-map">
          <svg id="map-svg" viewBox="0 0 420 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path className="arg-outline" d="
              M 200 20
              C 230 18, 270 22, 290 30
              C 320 40, 340 55, 350 75
              C 365 100, 368 125, 360 150
              C 375 165, 390 180, 388 200
              C 386 220, 370 235, 358 250
              C 370 265, 378 280, 372 298
              C 365 318, 348 330, 335 345
              C 345 360, 350 378, 342 395
              C 332 415, 312 428, 295 440
              C 278 455, 255 462, 238 470
              C 225 476, 210 478, 198 475
              C 182 470, 165 458, 155 445
              C 142 428, 138 408, 130 390
              C 120 368, 108 352, 102 332
              C 95 310, 96 286, 90 264
              C 84 242, 74 222, 72 200
              C 70 178, 78 156, 72 136
              C 66 116, 50 100, 52 80
              C 55 58, 80 38, 108 28
              C 140 18, 170 22, 200 20 Z
            "/>

            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(139,175,78,.05)" strokeWidth=".5"/>
              </pattern>
            </defs>
            <rect width="420" height="500" fill="url(#grid)"/>

            {/* Routes */}
            <path id="route1" className="route-path route-active route-draw"
              d="M 158 95 C 170 150, 185 200, 200 260 C 215 320, 230 370, 258 415"/>
            <path id="route2" className="route-path route-active route-draw-2"
              d="M 108 230 C 145 220, 200 218, 240 222 C 280 226, 308 240, 335 260"/>
            <path id="route3" className="route-path route-active route-draw-3"
              d="M 168 130 C 195 155, 220 180, 258 200 C 290 218, 315 228, 335 240"/>
            <path className="route-path route-completed"
              d="M 200 260 C 220 250, 255 245, 285 250 C 315 255, 335 260, 340 262"/>
            <path className="route-path route-completed"
              d="M 158 95 C 148 120, 128 155, 110 180 C 92 205, 85 215, 84 220"/>

            {/* City nodes */}
            <circle className="pulse-ring" cx="158" cy="95" r="6"/>
            <circle className="pulse-ring-2" cx="158" cy="95" r="6"/>
            <circle className="city-node-outer" cx="158" cy="95" r="8" opacity=".3"/>
            <circle className="city-node-inner" cx="158" cy="95" r="5"/>
            <text className="city-label" x="168" y="92">SALTA</text>

            <circle className="city-node-outer" cx="170" cy="128" r="7" opacity=".2"/>
            <circle className="city-node-inner" cx="170" cy="128" r="4"/>
            <text className="city-label" x="180" y="125">TUCUMÁN</text>

            <circle className="pulse-ring" cx="212" cy="258" r="6" style={{animationDelay:'.8s'}}/>
            <circle className="city-node-outer" cx="212" cy="258" r="9" opacity=".3"/>
            <circle className="city-node-inner" cx="212" cy="258" r="5"/>
            <text className="city-label" x="222" y="255">CÓRDOBA</text>

            <circle className="city-node-outer" cx="270" cy="222" r="7" opacity=".2"/>
            <circle className="city-node-inner" cx="270" cy="222" r="4"/>
            <text className="city-label" x="278" y="219">ROSARIO</text>

            <circle className="city-node-outer" cx="335" cy="260" r="7" opacity=".2"/>
            <circle className="city-node-inner" cx="335" cy="260" r="4"/>
            <text className="city-label" x="342" y="257">E. RÍOS</text>

            <circle className="city-node-outer" cx="108" cy="230" r="7" opacity=".2"/>
            <circle className="city-node-inner" cx="108" cy="230" r="4"/>
            <text className="city-label" x="62" y="227">MENDOZA</text>

            <circle className="pulse-ring" cx="258" cy="415" r="6" style={{animationDelay:'1.2s', stroke:'#E07A34'}}/>
            <circle className="pulse-ring-2" cx="258" cy="415" r="6" style={{animationDelay:'2.4s', stroke:'#E07A34'}}/>
            <circle cx="258" cy="415" r="10" fill="rgba(224,122,52,.15)"/>
            <circle className="city-node-dest" cx="258" cy="415" r="6"/>
            <text className="city-label" x="270" y="412">BUENOS AIRES</text>

            {/* Moving trucks */}
            <circle id="truck1" className="truck-dot" cx="158" cy="95" r="5"/>
            <circle id="truck2" className="truck-dot-2" cx="108" cy="230" r="5"/>
            <circle id="truck3" className="truck-dot" cx="168" cy="130" r="4"/>

            {/* Info cards */}
            <g transform="translate(30, 330)">
              <rect width="110" height="52" rx="8" fill="rgba(31,43,31,.85)" stroke="rgba(139,175,78,.2)" strokeWidth="1"/>
              <text x="10" y="18" fill="rgba(255,255,255,.4)" fontSize="8" fontFamily="DM Sans" letterSpacing=".08em">EN RUTA AHORA</text>
              <text x="10" y="36" fill="#fff" fontSize="20" fontFamily="DM Sans" fontWeight="700">47</text>
              <text x="36" y="36" fill="rgba(255,255,255,.4)" fontSize="10" fontFamily="DM Sans">viajes</text>
            </g>
            <g transform="translate(30, 390)">
              <rect width="110" height="52" rx="8" fill="rgba(31,43,31,.85)" stroke="rgba(224,122,52,.2)" strokeWidth="1"/>
              <text x="10" y="18" fill="rgba(255,255,255,.4)" fontSize="8" fontFamily="DM Sans" letterSpacing=".08em">HOY COMPLETADOS</text>
              <text x="10" y="36" fill="#E07A34" fontSize="20" fontFamily="DM Sans" fontWeight="700">128</text>
              <text x="46" y="36" fill="rgba(255,255,255,.4)" fontSize="10" fontFamily="DM Sans">viajes</text>
            </g>
          </svg>
        </div>
      </section>

      {/* STATS */}
      <section className="stats">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-n">+2.500</div>
            <div className="stat-l">Viajes realizados</div>
          </div>
          <div className="stat-card">
            <div className="stat-n stat-accent">98%</div>
            <div className="stat-l">Entrega a tiempo</div>
          </div>
          <div className="stat-card">
            <div className="stat-n">+1.200</div>
            <div className="stat-l">Transportistas verificados</div>
          </div>
          <div className="stat-card">
            <div className="stat-n">24/7</div>
            <div className="stat-l">Soporte activo</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="como-funciona">
        <div className="how-inner">
          <div className="how-header">
            <div className="section-label">Cómo funciona</div>
            <h2 className="section-title">Simple como pedir<br/>un taxi, pero para<br/>tu ganado.</h2>
            <p className="section-sub">Tres pasos y tu carga está en camino, con seguimiento en tiempo real.</p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-num">01</div>
              <div className="step-title">Cargá tu viaje</div>
              <p className="step-desc">Ingresá origen, destino, cantidad de animales y fecha. Recibís presupuestos de transportistas verificados al instante.</p>
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <div className="step-title">Elegí tu transportista</div>
              <p className="step-desc">Comparé precios, calificaciones y vehículos. Todos están verificados con documentación y habilitaciones al día.</p>
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <div className="step-title">Seguimiento en vivo</div>
              <p className="step-desc">Seguí tu ganado en tiempo real desde la app. Notificaciones en cada etapa, hasta la entrega confirmada.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="features-inner">
          <div className="features-header">
            <div className="section-label">Características</div>
            <h2 className="section-title">Todo lo que necesitás,<br/>en una sola app.</h2>
            <p className="section-sub">Diseñada para productores y transportistas del campo argentino.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <div className="feature-title">Sin viajes falsos</div>
              <p className="feature-desc">Sistema de verificación que elimina el problema histórico del sector: transportistas que confirman y no aparecen.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="feature-title">Trazabilidad completa</div>
              <p className="feature-desc">Registro digital de cada viaje, con documentación, tiempos y estados. Historial permanente accesible desde la app.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div className="feature-title">GPS en tiempo real</div>
              <p className="feature-desc">Sabés dónde está tu carga en todo momento. Rutas, paradas y tiempos estimados actualizados al minuto.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div className="feature-title">Transportistas verificados</div>
              <p className="feature-desc">Todos los transportistas pasan por un proceso de validación: habilitaciones, vehículos y antecedentes.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              </div>
              <div className="feature-title">Bienestar animal</div>
              <p className="feature-desc">Monitoreo de condiciones del viaje, tiempos máximos de carga y protocolos de bienestar animal integrados.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div className="feature-title">Seguro y confiable</div>
              <p className="feature-desc">Pagos protegidos, cobertura de seguro integrada y soporte 24/7 para cualquier incidente en ruta.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TRACKING DEMO */}
      <section className="tracking-demo" id="seguridad">
        <div className="tracking-inner">
          <div>
            <div className="section-label">Seguimiento en vivo</div>
            <h2 className="section-title">Tu ganado,<br/>siempre a la vista.</h2>
            <p className="section-sub">La app muestra la posición exacta del camión, el estado del viaje y la hora estimada de llegada. Todo en tiempo real.</p>
            <div style={{marginTop:32, display:'flex', flexDirection:'column', gap:16}}>
              <div style={{display:'flex', alignItems:'center', gap:12}}>
                <div style={{width:8, height:8, borderRadius:'50%', background:'var(--verde-arreo)', flexShrink:0}}></div>
                <span style={{fontSize:15, color:'#444'}}>Notificaciones automáticas en cada etapa</span>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:12}}>
                <div style={{width:8, height:8, borderRadius:'50%', background:'var(--verde-arreo)', flexShrink:0}}></div>
                <span style={{fontSize:15, color:'#444'}}>Contacto directo con el transportista</span>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:12}}>
                <div style={{width:8, height:8, borderRadius:'50%', background:'var(--verde-arreo)', flexShrink:0}}></div>
                <span style={{fontSize:15, color:'#444'}}>Historial completo de cada viaje</span>
              </div>
            </div>
          </div>
          <div className="tracking-ui">
            <div className="tracking-ui-header">
              <div className="tracking-ui-status">
                <div className="live-dot"></div>
                <span style={{color:'#fff', fontSize:13, fontWeight:600}}>Seguimiento en vivo</span>
              </div>
              <div style={{fontSize:12, color:'rgba(255,255,255,.35)', marginTop:4}}>Ganadería del Sur S.A. · AA 121 BB</div>
            </div>
            <div className="tracking-ui-map" id="tracking-map">
              <svg id="track-svg" width="100%" height="100%" viewBox="0 0 380 220">
                <defs>
                  <pattern id="tgrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(139,175,78,.06)" strokeWidth=".5"/>
                  </pattern>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                <rect width="380" height="220" fill="url(#tgrid)"/>
                <path id="track-route" d="M 40 160 C 80 140, 120 130, 160 120 C 200 110, 240 100, 280 90 C 320 80, 350 70, 360 60"
                  fill="none" stroke="rgba(139,175,78,.3)" strokeWidth="2" strokeDasharray="6 5"/>
                <path id="track-done" d="M 40 160 C 80 140, 120 130, 160 120"
                  fill="none" stroke="var(--verde-arreo)" strokeWidth="2.5"/>
                <circle cx="40" cy="160" r="5" fill="var(--verde-arreo)"/>
                <circle cx="40" cy="160" r="10" fill="rgba(139,175,78,.15)"/>
                <circle cx="360" cy="60" r="5" fill="var(--tierra)"/>
                <circle cx="360" cy="60" r="10" fill="rgba(224,122,52,.15)"/>
                <circle id="track-truck" cx="165" cy="119" r="7" fill="var(--verde-light)" filter="url(#glow)"/>
                <circle id="track-truck-ring" cx="165" cy="119" r="12" fill="none" stroke="var(--verde-light)" strokeWidth="1" opacity=".4"/>
                <text x="30" y="178" fill="rgba(255,255,255,.35)" fontSize="8" fontFamily="DM Sans">ORIGEN</text>
                <text x="340" y="78" fill="rgba(224,122,52,.7)" fontSize="8" fontFamily="DM Sans">DESTINO</text>
              </svg>
            </div>
            <div className="tracking-ui-info">
              <div className="tracking-kv">
                <span className="tracking-k">En ruta</span>
                <span className="tracking-v">Córdoba → B.Aires</span>
              </div>
              <div className="tracking-kv">
                <span className="tracking-k">Llegada est.</span>
                <span className="tracking-v">14:30 hs</span>
              </div>
              <div className="tracking-kv">
                <span className="tracking-k">Estado</span>
                <span className="tracking-v" style={{color:'var(--verde-arreo)'}}>En camino</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="download">
        <h2 className="cta-title">Movemos tu ganado.<br/>Conectamos destinos.</h2>
        <p className="cta-sub">Registrate y hacé tu primer viaje hoy.</p>
        <div className="cta-actions">
          <a href="/register" className="btn-cta-white">Registrarse</a>
          <a href="/register" className="btn-cta-outline">Buscar transporte</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-brand">
          <svg width="24" height="22" viewBox="22 40 158 120" fill="none">
            <g transform="translate(0,200) scale(0.1,-0.1)" stroke="#BDD18A" strokeWidth="20" strokeLinejoin="round" strokeLinecap="round" fill="none">
              <path d="M340 1421 c-19 -36 -11 -101 20 -165 57 -117 110 -153 265 -180 78-13 93 -19 114 -44 22 -27 62 -159 91 -297 28 -134 135 -205 241 -161 73 31 105 78 119 177 6 39 14 78 19 87 5 9 11 37 15 62 7 47 38 109 62 123 8 4 14 17 14 27 0 11 3 20 8 21 4 0 16 2 27 4 11 1 47 5 81 9 75 7 141 34 174 72 89 101 123 207 84 262 -32 46 -73 19 -93 -61 -23 -96 -64 -139 -153 -162 -51 -12-76 -14 -100 -7 -18 6 -52 14 -75 17 -24 4 -46 11 -49 16 -3 5 -27 20 -52 32-37 17 -65 22 -133 22 -78 0 -92 -3 -160 -36 -99 -49 -168 -64 -222 -51 -23 6-58 14 -77 18 -39 8 -90 42 -90 61 0 7 -4 13 -8 13 -9 0 -32 59 -32 84 0 9 -7 30 -15 46 -18 35 -58 41 -75 11z"/>
            </g>
          </svg>
          <span className="footer-name">ARREO</span>
        </div>
        <span className="footer-copy">© 2025 ARREO. Transporte Ganadero Inteligente.</span>
      </footer>
    </div>
  );
}
