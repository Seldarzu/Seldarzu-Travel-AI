import React, { useRef, useEffect, useState } from 'react';
import Globe from 'react-globe.gl';
import { MapPin, ArrowRight, Search, Radar } from 'lucide-react';

const LandingGlobe = ({ onExplore, scanning, targetLocation }) => {
  const globeRef = useRef();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [city, setCity] = useState("");

  // Handle resize
  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Globe Setup
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 1.2;
      globeRef.current.controls().enableZoom = false; // Disable zoom on landing
      
      // Globe sağda görünsün — kart solda olduğu için kamerayı sağa kaydır
      globeRef.current.pointOfView({ lat: 35, lng: -60, altitude: 1.6 });
    }
  }, []);

  // Trigger Globe dive animation when targetLocation is passed
  useEffect(() => {
    if (targetLocation && globeRef.current) {
      globeRef.current.controls().autoRotate = false;
      globeRef.current.pointOfView({ 
        lat: targetLocation.lat, 
        lng: targetLocation.lng, 
        altitude: 0.05 
      }, 1500);
    }
  }, [targetLocation]);

  const handleStart = () => {
    if (!city.trim()) return;
    
    // Just trigger the scan in App.jsx. Globe animation will happen
    // after the scan succeeds, triggered by the useEffect above.
    onExplore(city);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' }}>
      {/* 3D Globe Background */}
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="#3b82f6"
        atmosphereAltitude={0.15}
      />

      {/* Overlay Content */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingLeft: 'clamp(24px, 5vw, 80px)',
          background: 'linear-gradient(to right, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)',
          pointerEvents: 'none',
          opacity: targetLocation ? 0 : 1,
          transition: 'opacity 0.5s ease'
        }}
      >
        <div className="glass-card animate-fade-in responsive-glass-card">
          {scanning && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
               <Radar size={64} className="text-blue-500" style={{ animation: 'spin 2s linear infinite' }} color="#3b82f6" />
               <h2 style={{ color: '#fff', marginTop: '20px', fontSize: '1.5rem' }}>{city} Taranıyor...</h2>
               <p style={{ color: '#cbd5e1', marginTop: '10px' }}>Canlı veriler analiz ediliyor, en iyi noktalar seçiliyor. Bu işlem 10-15 saniye sürebilir.</p>
            </div>
          )}

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            marginBottom: '16px'
          }}>
            <MapPin size={24} color="#3b82f6" />
          </div>
          
          <h1 className="responsive-title">
            Seldarzu Travel AI
          </h1>
          
          <p style={{ fontSize: '1rem', color: '#cbd5e1', marginBottom: '24px', lineHeight: 1.5 }}>
            Premium alışveriş noktaları, gizli kalmış mekanlar ve lüks rotalar için canlı olarak şehrinizi keşfedin.
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.2)', pointerEvents: targetLocation ? 'none' : 'auto'
          }}>
             <Search size={20} color="#cbd5e1" style={{ marginRight: '10px' }} />
             <input 
               type="text" 
               value={city}
               onChange={e => setCity(e.target.value)}
               placeholder="Örn: Los Angeles"
               style={{
                 background: 'transparent', border: 'none', color: '#fff', fontSize: '1.1rem', outline: 'none', flex: 1, width: '100%'
               }}
               onKeyDown={e => e.key === 'Enter' && handleStart()}
             />
          </div>

          <button
            className="landing-btn"
            onClick={handleStart}
            disabled={scanning}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              cursor: scanning ? 'not-allowed' : 'pointer',
              opacity: scanning ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '0 auto 24px auto',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
              pointerEvents: targetLocation ? 'none' : 'auto'
            }}
          >
            Keşfet
            <ArrowRight size={18} />
          </button>

          {/* Premium Bento Showcase */}
          <div style={{ width: '100%', pointerEvents: targetLocation ? 'none' : 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ height: '1px', flex: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.2))' }} />
              <span style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Öne Çıkan Rotalar</span>
              <div style={{ height: '1px', flex: 1, background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.2))' }} />
            </div>

            <div className="bento-container" style={{
              display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'
            }}>
              {/* New York Card */}
              <div 
                className="bento-card"
                onClick={() => { setCity('New York'); onExplore('New York'); }}
                style={{
                  minWidth: '220px', flex: 1, height: '140px', borderRadius: '12px', position: 'relative', overflow: 'hidden', cursor: scanning ? 'not-allowed' : 'pointer', transition: 'all 0.3s'
                }}
              >
                <img src="https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80" alt="New York Shopping" style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} className="bento-img" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.2))' }} />
                <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}>
                  <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '4px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>🗽 New York</h3>
                  <p style={{ color: '#93c5fd', fontSize: '0.75rem', fontWeight: 500 }}>Lüks Butikler & Flagship'ler</p>
                </div>
              </div>

              {/* Delaware Card */}
              <div 
                className="bento-card"
                onClick={() => { setCity('Delaware'); onExplore('Delaware'); }}
                style={{
                  minWidth: '220px', flex: 1, height: '140px', borderRadius: '12px', position: 'relative', overflow: 'hidden', cursor: scanning ? 'not-allowed' : 'pointer', transition: 'all 0.3s'
                }}
              >
                <img src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&q=80" alt="Delaware Shopping" style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} className="bento-img" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.2))' }} />
                <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}>
                  <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '4px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>🛍️ Delaware</h3>
                  <p style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 500 }}>Tax-Free Modası & Outletler</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default LandingGlobe;
