import React, { useRef, useEffect, useState } from 'react';
import Globe from 'react-globe.gl';
import { MapPin, ArrowRight, Search, Radar } from 'lucide-react';

const LandingGlobe = ({ onExplore, scanning, targetLocation }) => {
  const globeRef = useRef();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [city, setCity] = useState("Los Angeles");

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
      
      // Point camera roughly at North America with some tilt
      globeRef.current.pointOfView({ lat: 25, lng: -90, altitude: 2 });
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
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.6) 100%)',
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
            display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.2)'
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
            onClick={handleStart}
            disabled={scanning}
            style={{
              padding: '14px 32px',
              fontSize: '1.1rem',
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
              margin: '0 auto',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
            }}
          >
            Canlı Olarak Keşfet
            <ArrowRight size={20} />
          </button>
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
