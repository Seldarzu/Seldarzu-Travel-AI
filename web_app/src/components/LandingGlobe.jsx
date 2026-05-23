import React, { useRef, useEffect, useState } from 'react';
import Globe from 'react-globe.gl';
import { ArrowRight, Search, Radar, Zap, Map, Star, Heart, Navigation, Clock, Crosshair } from 'lucide-react';

const GLOBE_IMG  = 'https://cdn.jsdelivr.net/npm/three-globe@2/example/img/earth-blue-marble.jpg';
const GLOBE_BUMP = 'https://cdn.jsdelivr.net/npm/three-globe@2/example/img/earth-topology.png';
const GLOBE_BG   = 'https://cdn.jsdelivr.net/npm/three-globe@2/example/img/night-sky.png';

const FEATURES = [
  { icon: <Zap size={16} color="#60a5fa" />,        title: 'AI Scoring',        desc: 'Every spot gets a unique score based on rating, reviews, rarity, and category.' },
  { icon: <Map size={16} color="#a78bfa" />,         title: 'Interactive Map',   desc: 'Dark 3D map with tilt. Click any pin to see photos, hours, and contact info.' },
  { icon: <Crosshair size={16} color="#34d399" />,   title: 'Radar Scan',        desc: 'Tap anywhere on the map to deep-scan that exact neighborhood for hidden gems.' },
  { icon: <Navigation size={16} color="#f59e0b" />,  title: 'Route Planner',     desc: 'Build a custom route, drag to reorder stops, then export directly to Google Maps.' },
  { icon: <Heart size={16} color="#ec4899" />,       title: 'Favorites',         desc: 'Save your top picks locally and filter the map to show only what you love.' },
  { icon: <Clock size={16} color="#38bdf8" />,       title: 'Open Now Filter',   desc: 'Show only places currently open — real-time data pulled live from Google.' },
];

const QUICK_CITIES = [
  { label: '🗽 New York',   city: 'New York'   },
  { label: '🌴 Miami',      city: 'Miami'       },
  { label: '🎰 Las Vegas',  city: 'Las Vegas'   },
  { label: '🎶 Nashville',  city: 'Nashville'   },
  { label: '🌉 Chicago',    city: 'Chicago'     },
  { label: '🎸 Austin',     city: 'Austin'      },
];

const BENTO_CITIES = [
  {
    city: 'New York', emoji: '🗽',
    img: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80',
    sub: 'Luxury Boutiques & Flagships', color: '#93c5fd',
  },
  {
    city: 'Miami', emoji: '🌴',
    img: 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=600&q=80',
    sub: 'Beach Clubs & Rooftop Bars', color: '#34d399',
  },
  {
    city: 'Las Vegas', emoji: '🎰',
    img: 'https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=600&q=80',
    sub: 'Fine Dining & Entertainment', color: '#fbbf24',
  },
  {
    city: 'Delaware', emoji: '🛍️',
    img: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&q=80',
    sub: 'Tax-Free Shopping & Outlets', color: '#c084fc',
  },
];

const LandingGlobe = ({ onExplore, scanning, targetLocation }) => {
  const globeRef = useRef();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [globeError, setGlobeError] = useState(false);
  const [city, setCity] = useState('');

  useEffect(() => {
    const onResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate      = true;
      globeRef.current.controls().autoRotateSpeed = 1.2;
      globeRef.current.controls().enableZoom      = false;
      globeRef.current.pointOfView({ lat: 35, lng: -60, altitude: 1.6 });
    }
  }, []);

  useEffect(() => {
    if (targetLocation && globeRef.current) {
      globeRef.current.controls().autoRotate = false;
      globeRef.current.pointOfView({ lat: targetLocation.lat, lng: targetLocation.lng, altitude: 0.05 }, 1500);
    }
  }, [targetLocation]);

  const handleStart = () => { if (city.trim()) onExplore(city.trim()); };
  const handleQuick = (c)  => { setCity(c); onExplore(c); };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' }}>

      {/* ── Globe ── */}
      {!globeError ? (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl={GLOBE_IMG}
          bumpImageUrl={GLOBE_BUMP}
          backgroundImageUrl={GLOBE_BG}
          atmosphereColor="#3b82f6"
          atmosphereAltitude={0.15}
          onGlobeError={() => setGlobeError(true)}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 50%, #0f172a 0%, #1e3a5f 40%, #000 100%)' }} />
      )}

      {/* ── Gradient vignette (non-interactive) ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)',
      }} />

      {/* ── Scanning overlay ── */}
      {scanning && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(5,8,20,0.92)', backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
        }}>
          <Radar size={56} color="#3b82f6" style={{ animation: 'spin 2s linear infinite' }} />
          <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700 }}>Scanning {city}…</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', maxWidth: '300px', lineHeight: 1.6 }}>
            Analyzing live data and hand-picking the best spots. Takes 10–15 seconds.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Scrollable panel ── */}
      <div style={{
        position: 'absolute', inset: 0,
        overflowY: 'auto', overflowX: 'hidden',
        paddingLeft:   'clamp(16px, 5vw, 80px)',
        paddingRight:  'clamp(16px, 40vw, 48px)',
        paddingTop:    'clamp(28px, 6vh, 56px)',
        paddingBottom: '56px',
        scrollbarWidth: 'none',
        opacity: targetLocation ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: targetLocation ? 'none' : 'auto',
      }}>
        <div style={{ maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '0' }}>

          {/* ── Badge ── */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start',
            background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)',
            borderRadius: '20px', padding: '5px 13px', marginBottom: '18px',
          }}>
            <Zap size={12} color="#60a5fa" />
            <span style={{ color: '#60a5fa', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.4px' }}>
              Powered by Google Places · Live Data
            </span>
          </div>

          {/* ── Hero title ── */}
          <h1 style={{
            fontSize: 'clamp(1.9rem, 4vw, 3rem)', fontWeight: 800,
            color: '#fff', lineHeight: 1.18, marginBottom: '14px',
            textShadow: '0 2px 30px rgba(0,0,0,0.6)',
          }}>
            Discover America's<br />
            <span style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Hidden Gems
            </span>
          </h1>

          <p style={{ fontSize: '0.97rem', color: '#94a3b8', lineHeight: 1.65, marginBottom: '26px', maxWidth: '420px' }}>
            AI-scored restaurants, rooftop bars, boutiques, and local favorites — curated live from any American city. No ads, no sponsored results.
          </p>

          {/* ── Search row ── */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.07)', borderRadius: '10px',
              padding: '10px 16px', border: '1px solid rgba(255,255,255,0.14)',
              backdropFilter: 'blur(10px)',
            }}>
              <Search size={17} color="#475569" style={{ marginRight: '10px', flexShrink: 0 }} />
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Enter any U.S. city…"
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.97rem', outline: 'none', flex: 1 }}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
              />
            </div>
            <button
              onClick={handleStart}
              disabled={scanning || !city.trim()}
              style={{
                padding: '10px 20px', background: city.trim() ? '#3b82f6' : 'rgba(59,130,246,0.3)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontWeight: 700, fontSize: '0.93rem',
                cursor: city.trim() && !scanning ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                boxShadow: city.trim() ? '0 4px 16px rgba(59,130,246,0.45)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              Explore <ArrowRight size={15} />
            </button>
          </div>

          {/* ── Quick city chips ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '32px' }}>
            {QUICK_CITIES.map(({ label, city: c }) => (
              <button
                key={c}
                onClick={() => handleQuick(c)}
                disabled={scanning}
                style={{
                  padding: '5px 13px', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 600,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)',
                  color: '#94a3b8', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(59,130,246,0.18)';
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)';
                  e.currentTarget.style.color = '#93c5fd';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >{label}</button>
            ))}
          </div>

          {/* ── Features grid ── */}
          <p style={{ color: '#334155', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.8px', marginBottom: '12px' }}>
            What's Inside
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '32px' }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px', padding: '14px', backdropFilter: 'blur(6px)',
              }}>
                <div style={{ marginBottom: '8px' }}>{f.icon}</div>
                <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.83rem', marginBottom: '4px' }}>{f.title}</p>
                <p style={{ color: '#475569', fontSize: '0.72rem', lineHeight: 1.55 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* ── Featured cities ── */}
          <p style={{ color: '#334155', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.8px', marginBottom: '12px' }}>
            Featured Cities
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {BENTO_CITIES.map(({ city: c, emoji, img, sub, color }) => (
              <div
                key={c}
                onClick={() => handleQuick(c)}
                style={{
                  height: '105px', borderRadius: '12px', position: 'relative',
                  overflow: 'hidden', cursor: scanning ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = 'none'; }}
              >
                <img
                  src={img} alt={c}
                  style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.88), rgba(0,0,0,0.08))' }} />
                <div style={{ position: 'absolute', bottom: '10px', left: '12px', right: '12px' }}>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem', marginBottom: '2px' }}>{emoji} {c}</p>
                  <p style={{ color, fontSize: '0.67rem', fontWeight: 600 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Footer note ── */}
          <p style={{ marginTop: '28px', color: '#1e293b', fontSize: '0.72rem', textAlign: 'center' }}>
            Free to use · No account needed · Results powered by Google Places API
          </p>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40%            { transform: scale(1.2); opacity: 1; }
        }
      `}} />
    </div>
  );
};

export default LandingGlobe;
