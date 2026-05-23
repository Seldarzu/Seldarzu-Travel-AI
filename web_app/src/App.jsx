import React, { useState, useEffect } from 'react';
import LandingGlobe from './components/LandingGlobe';
import MapExplorer from './components/MapExplorer';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [appState, setAppState] = useState('landing'); // 'landing' or 'exploring'
  const [placesData, setPlacesData] = useState([]);
  const [targetLocation, setTargetLocation] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [currentCity, setCurrentCity] = useState('');
  const [fetchError, setFetchError] = useState(null);
  const [radarAddedCount, setRadarAddedCount] = useState(null);
  const [scanElapsed, setScanElapsed] = useState(0); // saniye cinsinden tarama süresi

  // Sayfa açılınca backend'i sessizce uyandır (cold start için)
  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || '';
    if (!API_BASE) return; // local dev'de gerek yok
    fetch(`${API_BASE}/api/health`, { method: 'GET' }).catch(() => {});
  }, []);

  // Tarama süresi sayacı — cold start uyarısı için
  useEffect(() => {
    if (!scanning) { setScanElapsed(0); return; }
    const t = setInterval(() => setScanElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [scanning]);

  // Toast otomatik kapanma
  useEffect(() => {
    if (!fetchError) return;
    const t = setTimeout(() => setFetchError(null), 6000);
    return () => clearTimeout(t);
  }, [fetchError]);

  useEffect(() => {
    if (radarAddedCount === null) return;
    const t = setTimeout(() => setRadarAddedCount(null), 4000);
    return () => clearTimeout(t);
  }, [radarAddedCount]);

  const handleReturnHome = () => {
    setAppState('landing');
    setTargetLocation(null);
    setPlacesData([]);
    setCurrentCity('');
  };

  const handleStartExploration = async (city) => {
    setScanning(true);
    setCurrentCity(city);

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 90000); // 90s — cold start için

    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_BASE}/api/explore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (data.error) {
        console.error("Backend Error:", data.error);
        setScanning(false);
        setPlacesData([]);
        setAppState('exploring');
        setFetchError(`Google API Error: ${data.error}`);
        return;
      }

      if (data?.places?.length > 0) {
        const validData = data.places
          .filter(item => item.latitude && item.longitude)
          .sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
        setPlacesData(validData);
        setScanning(false);
        setTargetLocation({ lat: validData[0].latitude, lng: validData[0].longitude });
        setTimeout(() => setAppState('exploring'), 1500);
      } else {
        setPlacesData([]);
        setScanning(false);
        setAppState('exploring');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Failed to load live places data:", err);
      const msg = err.name === 'AbortError'
        ? 'Request timed out (90s). The server may be under heavy load — please try again.'
        : 'Network error — could not reach the server. Please try again.';
      setFetchError(msg);
      setScanning(false);
      setAppState('exploring');
    }
  };

  const handleDeepScan = async (radarCenter) => {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 90000);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_BASE}/api/explore-radius`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: radarCenter.lat, lng: radarCenter.lng, city: currentCity || 'Area' }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (data.error) {
        console.error("Backend Radar Error:", data.error);
        setFetchError(`Radar Error: ${data.error}`);
        return;
      }

      const newPlaces = data.places || [];

      setPlacesData(prevPlaces => {
        const existing = new Set(prevPlaces.map(p => p.place_id || p.name));
        const toAdd = newPlaces.filter(np => !existing.has(np.place_id || np.name));
        setRadarAddedCount(toAdd.length);
        return [...prevPlaces, ...toAdd.map(np => ({ ...np, isNewNode: true }))];
      });

    } catch (err) {
      clearTimeout(timeoutId);
      console.error(err);
      const msg = err.name === 'AbortError'
        ? 'Radar scan timed out.'
        : 'An error occurred during the radar scan.';
      setFetchError(msg);
    }
  };

  return (
    <div className="app-wrapper">
      {/* Hata toast */}
      {fetchError && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: '#ef4444', color: '#fff', borderRadius: '12px',
          padding: '12px 20px', fontWeight: 600, fontSize: '0.9rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)', maxWidth: 'calc(100vw - 48px)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          ⚠️ {fetchError}
          <button onClick={() => setFetchError(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px', fontSize: '1rem' }}>
            ✕
          </button>
        </div>
      )}
      {/* Radar başarı toast */}
      {radarAddedCount !== null && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: '#10b981', color: '#fff', borderRadius: '12px',
          padding: '12px 20px', fontWeight: 600, fontSize: '0.9rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)', maxWidth: 'calc(100vw - 48px)'
        }}>
          📡 Radar complete — {radarAddedCount} new places added!
        </div>
      )}
      {/* Tarama yüklenme ekranı */}
      {scanning && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,15,25,0.88)', backdropFilter: 'blur(16px)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px', animation: 'scanPulse 1.2s ease-in-out infinite' }}>📡</div>
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.4rem', marginBottom: '8px' }}>
            Scanning {currentCity}...
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '6px' }}>
            Searching for premium places
          </p>

          {/* Cold start uyarısı — 8 saniyeden sonra göster */}
          <div style={{
            minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '20px', padding: '0 16px',
          }}>
            {scanElapsed >= 8 && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
                borderRadius: '10px', padding: '10px 16px', maxWidth: '340px',
                animation: 'fadeIn 0.4s ease',
              }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🌙</span>
                <div>
                  <p style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.85rem', marginBottom: '3px' }}>
                    Server is waking up from sleep
                  </p>
                  <p style={{ color: '#92400e', fontSize: '0.78rem', lineHeight: 1.5 }}>
                    The free server sleeps after inactivity. First load may take up to 60 seconds — hang tight!
                  </p>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>

          {/* Geçen süre göstergesi */}
          {scanElapsed >= 5 && (
            <p style={{ color: '#334155', fontSize: '0.75rem', marginTop: '16px' }}>
              {scanElapsed}s elapsed
            </p>
          )}
        </div>
      )}
      {/* Container for crossfading between states */}
      
      {/* Map Explorer Layer - Initially hidden or beneath */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%',
        opacity: appState === 'exploring' ? 1 : 0,
        pointerEvents: appState === 'exploring' ? 'auto' : 'none',
        transition: 'opacity 0.6s ease-out',
        zIndex: 1
      }}>
        {appState === 'exploring' && (
          <ErrorBoundary label="An error occurred while loading the map. Please refresh the page.">
            <MapExplorer places={placesData} onDeepScan={handleDeepScan} onReturnHome={handleReturnHome} />
          </ErrorBoundary>
        )}
      </div>

      {/* Landing Layer - Initially visible */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%',
        opacity: appState === 'landing' ? 1 : 0,
        pointerEvents: appState === 'landing' ? 'auto' : 'none',
        transition: 'opacity 1s ease-in-out',
        zIndex: 2
      }}>
        <ErrorBoundary label="Globe failed to load. Your browser may not support WebGL.">
          <LandingGlobe
            onExplore={handleStartExploration}
            scanning={scanning}
            targetLocation={targetLocation}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default App;
