import React, { useState } from 'react';
import LandingGlobe from './components/LandingGlobe';
import MapExplorer from './components/MapExplorer';

function App() {
  const [appState, setAppState] = useState('landing'); // 'landing' or 'exploring'
  const [placesData, setPlacesData] = useState([]);
  const [targetLocation, setTargetLocation] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [currentCity, setCurrentCity] = useState('');

  const handleReturnHome = () => {
    setAppState('landing');
    setTargetLocation(null);
    setPlacesData([]);
    setCurrentCity('');
  };

  const handleStartExploration = async (city) => {
    setScanning(true);
    setCurrentCity(city);
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_BASE}/api/explore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ city })
      });
      
      const data = await response.json();
      
      if (data.error) {
          console.error("Backend Error:", data.error);
          alert(`Google Haritalar API Hatası: \n${data.error}\n\nLütfen Google Cloud Console üzerinden Places API (New) yetkilendirmelerini kontrol edin.`);
          setScanning(false);
          setPlacesData([]);
          setAppState('exploring');
          return;
      }
      
      if (data && data.places && data.places.length > 0) {
        // Sort by final_score descending
        const validData = data.places
          .filter(item => item.latitude && item.longitude)
          .sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
        setPlacesData(validData);
        setScanning(false);
        setTargetLocation({ lat: validData[0].latitude, lng: validData[0].longitude });
        
        setTimeout(() => {
          setAppState('exploring');
        }, 1500);
      } else {
        console.warn("No places found from API or error occurred. We could fallback to mock data here if needed.");
        setPlacesData([]);
        setScanning(false);
        setAppState('exploring');
      }
    } catch (err) {
      console.error("Failed to load live places data:", err);
      alert("Ağ hatası veya sunucuya ulaşılamadı. Lütfen backend'in çalıştığından emin olun.");
      setScanning(false);
      setAppState('exploring');
    }
  };

  const handleDeepScan = async (radarCenter) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_BASE}/api/explore-radius`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lat: radarCenter.lat, lng: radarCenter.lng, city: currentCity || 'Bölge' })
      });
      const data = await response.json();
      
      if (data.error) {
          console.error("Backend Radar Error:", data.error);
          alert(`Radar Taraması Hatası: \n${data.error}\n\nLütfen API Console yetkilerinizi aktif edin.`);
          return;
      }
      
      const newPlaces = data.places || [];
      
      setPlacesData(prevPlaces => {
        const _places = [...prevPlaces];
        let addedCount = 0;
        newPlaces.forEach(np => {
          if (!_places.find(p => p.name === np.name)) {
            _places.push({ ...np, isNewNode: true });
            addedCount++;
          }
        });
        
        setTimeout(() => alert(`Radar Taraması Tamamlandı! Seçilen alan etrafında ${addedCount} yeni elit mekan bulundu ve ana listeye eklendi.`), 500);
        return _places;
      });
      
    } catch (err) {
      console.error(err);
      alert("Radar taraması sırasında hata oluştu. Lütfen bağlantınızı kontrol edin.");
    }
  };

  return (
    <div className="app-wrapper">
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
        transition: 'opacity 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 1
      }}>
        {appState === 'exploring' && <MapExplorer places={placesData} onDeepScan={handleDeepScan} onReturnHome={handleReturnHome} />}
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
        <LandingGlobe 
          onExplore={handleStartExploration} 
          scanning={scanning}
          targetLocation={targetLocation}
        />
      </div>
    </div>
  );
}

export default App;
