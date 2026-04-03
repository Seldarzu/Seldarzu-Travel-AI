import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import LandingGlobe from './components/LandingGlobe';
import MapExplorer from './components/MapExplorer';

function App() {
  const [appState, setAppState] = useState('landing'); // 'landing' or 'exploring'
  const [placesData, setPlacesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch and parse the CSV data
    const loadPlaces = async () => {
      try {
        const response = await fetch('/data.csv');
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Sort by final_score descending
            const validData = results.data
              .filter(item => item.latitude && item.longitude)
              .sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
            setPlacesData(validData);
            setLoading(false);
          },
          error: (error) => {
            console.error("Error parsing CSV:", error);
            setLoading(false);
          }
        });
      } catch (err) {
        console.error("Failed to load places data:", err);
        setLoading(false);
      }
    };

    loadPlaces();
  }, []);

  const handleStartExploration = () => {
    setAppState('exploring');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-color)' }}>
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
        {appState === 'exploring' && <MapExplorer places={placesData} />}
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
          loading={loading}
          placesCount={placesData.length}
        />
      </div>
    </div>
  );
}

export default App;
