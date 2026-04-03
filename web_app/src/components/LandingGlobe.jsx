import React, { useRef, useEffect, useState } from 'react';
import Globe from 'react-globe.gl';
import { MapPin, ArrowRight } from 'lucide-react';

const LandingGlobe = ({ onExplore, loading, placesCount }) => {
  const globeRef = useRef();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

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

  const handleStart = () => {
    if (globeRef.current) {
      // Zoom into New York and then trigger parent explore callback
      // New York Coordinates: 40.7128, -74.0060
      globeRef.current.controls().autoRotate = false;
      globeRef.current.pointOfView({ lat: 40.7128, lng: -74.0060, altitude: 0.05 }, 1500);
      
      setTimeout(() => {
        onExplore();
      }, 1400); // Trigger transition just before finishing the zoom
    } else {
      onExplore();
    }
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
          pointerEvents: 'none', // Let touches pass through to the globe, wait, button needs pointer events
        }}
      >
        <div 
          className="glass-card animate-fade-in"
          style={{
            pointerEvents: 'auto', // Button inside needs clicks
            textAlign: 'center',
            maxWidth: '500px',
            padding: '40px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            marginBottom: '24px'
          }}>
            <MapPin size={32} color="#3b82f6" />
          </div>
          
          <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: '#fff' }}>
            Seldarzu Travel AI
          </h1>
          
          <p style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '32px', lineHeight: 1.6 }}>
            Arkadaşınız için özenle derlenen <strong>{loading ? '...' : placesCount}</strong> benzersiz mekanı keşfetmeye hazır mısınız? 
            New York'un en iyi noktaları sizi bekliyor.
          </p>

          <button
            onClick={handleStart}
            disabled={loading}
            style={{
              padding: '14px 32px',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '0 auto',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
            }}
            onMouseOver={(e) => {
              if(!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseOut={(e) => {
              if(!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            {loading ? 'Hazırlanıyor...' : 'Yolculuğa Başla'}
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingGlobe;
