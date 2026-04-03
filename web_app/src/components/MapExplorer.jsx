import React, { useState, useMemo, useEffect, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Star, MapPin, Tag, Navigation2, Crosshair, Image as ImageIcon, Footprints } from 'lucide-react';

// OSRM Route Layer Style
const routeLayer = {
  id: 'route',
  type: 'line',
  paint: {
    'line-color': '#3b82f6',
    'line-width': 4,
    'line-dasharray': [2, 2] // Dashed line for a nicer look
  }
};

const MapExplorer = ({ places }) => {
  const mapRef = useRef();
  const [popupInfo, setPopupInfo] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // New States
  const [userLocation, setUserLocation] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [placeImage, setPlaceImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  // New York City coordinates roughly
  const [viewState, setViewState] = useState({
    longitude: -73.98,
    latitude: 40.75,
    zoom: 11,
    pitch: 45,
    bearing: -17.6
  });

  const categories = useMemo(() => {
    const cats = ['All'];
    places.forEach(p => {
      if (p.category && !cats.includes(p.category)) {
        cats.push(p.category);
      }
    });
    return cats;
  }, [places]);

  const filteredPlaces = useMemo(() => {
    return selectedCategory === 'All' 
      ? places 
      : places.filter(p => p.category === selectedCategory);
  }, [places, selectedCategory]);

  // Handle Image Fetching
  useEffect(() => {
    const fetchImage = async () => {
      if (!popupInfo) {
        setPlaceImage(null);
        return;
      }
      setImageLoading(true);
      setPlaceImage(null);

      try {
        // Try Wikipedia API first
        const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(popupInfo.name)}&prop=pageimages&format=json&pithumbsize=600&origin=*`);
        const data = await res.json();
        if (data.query && data.query.pages) {
          const pageId = Object.keys(data.query.pages)[0];
          if (pageId !== '-1' && data.query.pages[pageId].thumbnail) {
            setPlaceImage(data.query.pages[pageId].thumbnail.source);
            setImageLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Wiki fetching failed", err);
      }

      // Fallback 1: Botanical Garden Aesthetic
      const categoryImages = {
        'Botanical garden': 'https://images.unsplash.com/photo-1585320806297-9794b3e4ce11?w=600&q=80',
        'Park': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80',
        'Garden': 'https://images.unsplash.com/photo-1558234394-1ba145ceea07?w=600&q=80',
        'State park': 'https://images.unsplash.com/photo-1542273917363-3b1817f69a5d?w=600&q=80',
        'Tourist attraction': 'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=600&q=80',
        'Restaurant': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
        'Bar': 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80',
      };
      
      const fallback = categoryImages[popupInfo.category] || 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80';
      setPlaceImage(fallback);
      setImageLoading(false);
    };

    fetchImage();
  }, [popupInfo]);

  // Handle Route Fetching
  useEffect(() => {
    const fetchRoute = async () => {
      if (userLocation && popupInfo) {
        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${userLocation.longitude},${userLocation.latitude};${popupInfo.longitude},${popupInfo.latitude}?overview=full&geometries=geojson`
          );
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            setRouteData({
              type: 'Feature',
              properties: {},
              geometry: data.routes[0].geometry
            });

            // Calculate manual bbox to fit map
            const lons = [userLocation.longitude, popupInfo.longitude];
            const lats = [userLocation.latitude, popupInfo.latitude];
            
            if (mapRef.current) {
              mapRef.current.fitBounds(
                [
                  [Math.min(...lons) - 0.02, Math.min(...lats) - 0.02],
                  [Math.max(...lons) + 0.02, Math.max(...lats) + 0.02]
                ], 
                { padding: 80, duration: 1500 }
              );
            }
          }
        } catch (err) {
          console.error("OSRM route fetch error:", err);
          setRouteData(null); // Reset route on error
        }
      } else {
        setRouteData(null);
      }
    };

    fetchRoute();
  }, [userLocation, popupInfo]);

  const handleTestLocation = () => {
    // A point centrally located in New York
    setUserLocation({
      latitude: 40.730610,
      longitude: -73.935242
    });
  };

  const handleRealLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        err => {
          alert("Konum alınamadı. Tarayıcı izinlerini kontrol edin.");
        }
      );
    } else {
      alert("Tarayıcınız konum özelliğini desteklemiyor.");
    }
  };

  const onPlaceClick = (place) => {
    setPopupInfo(place);
    if (!userLocation && mapRef.current) {
        mapRef.current.flyTo({
            center: [place.longitude, place.latitude],
            zoom: 14,
            duration: 1500,
            pitch: 60
        });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', display: 'flex' }}>
      
      {/* Sidebar for List View */}
      <div 
        className="glass-panel"
        style={{ 
          width: '400px', 
          height: '100%', 
          zIndex: 10, 
          display: 'flex', 
          flexDirection: 'column',
          boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
          overflow: 'hidden' // prevent child overflow
        }}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
          <h2 style={{ marginBottom: '8px', color: '#fff', fontSize: '1.5rem' }}>Keşif Listesi</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
            Toplam {filteredPlaces.length} mekan listeleniyor.
          </p>

          {/* Location Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <button 
              onClick={handleTestLocation}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
                width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #3b82f6',
                background: userLocation?.latitude === 40.730610 ? '#3b82f6' : 'rgba(59, 130, 246, 0.1)',
                color: '#fff', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
               <Navigation2 size={16} /> Test Konumu (New York)
            </button>
            <button 
              onClick={handleRealLocation}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
                width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #10b981',
                background: userLocation?.latitude !== 40.730610 && userLocation ? '#10b981' : 'rgba(16, 185, 129, 0.1)',
                color: '#fff', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
               <Crosshair size={16} /> Gerçek Konumum
            </button>
          </div>

          <div style={{}}>
            <select 
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0,0,0,0.5)',
                color: '#fff',
                border: '1px solid var(--glass-border)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredPlaces.map((place, idx) => (
            <div 
              key={idx}
              className="glass-card"
              style={{ padding: '16px', cursor: 'pointer', transition: '0.2s', border: popupInfo?.name === place.name ? '1px solid #3b82f6' : ''} }
              onClick={() => onPlaceClick(place)}
            >
              <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '8px' }}>{place.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
                  <Star size={14} fill="#fbbf24" /> {place.google_rating} ({place.review_count})
                </span>
                <span>•</span>
                <span>Skor: {place.final_score}</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                <Tag size={12} /> {place.category}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Content */}
      <div style={{ flex: 1, height: '100%' }}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        >
          <NavigationControl position="top-right" />
          
          {/* Render User Location Marker */}
          {userLocation && (
            <Marker longitude={userLocation.longitude} latitude={userLocation.latitude} anchor="center">
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  position: 'absolute',
                  width: '30px', height: '30px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  opacity: 0.4,
                  animation: 'pulse 1.5s infinite'
                }} />
                <div style={{
                  position: 'relative',
                  width: '14px', height: '14px',
                  backgroundColor: '#fff',
                  border: '3px solid #3b82f6',
                  borderRadius: '50%',
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)'
                }} />
              </div>
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes pulse {
                  0% { transform: scale(1); opacity: 0.6; }
                  100% { transform: scale(2.5); opacity: 0; }
                }
              `}} />
            </Marker>
          )}

          {/* Render Route Layer */}
          {routeData && (
            <Source id="my-data" type="geojson" data={routeData}>
              <Layer {...routeLayer} />
            </Source>
          )}

          {/* Render Places */}
          {filteredPlaces.map((place, index) => (
            <Marker
              key={`marker-${index}`}
              longitude={place.longitude}
              latitude={place.latitude}
              anchor="bottom"
              onClick={e => {
                e.originalEvent.stopPropagation();
                onPlaceClick(place);
              }}
            >
              <MapPin size={32} color={popupInfo?.name === place.name ? "#ef4444" : "#9ca3af"} fill={popupInfo?.name === place.name ? "#7f1d1d" : "#4b5563"} style={{ cursor: 'pointer', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))', transition: 'all 0.3s' }} />
            </Marker>
          ))}

          {/* Render Customized Popup */}
          {popupInfo && (
            <Popup
              anchor="top"
              longitude={popupInfo.longitude}
              latitude={popupInfo.latitude}
              onClose={() => setPopupInfo(null)}
              closeOnClick={false}
              maxWidth="360px"
              offset={[0, 10]}
              closeButton={true}
              className="custom-popup" // Styled in index.css overrides implicitly
            >
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '12px', minWidth: '320px' }}>
                {/* Photo Header */}
                <div style={{ width: '100%', height: '160px', backgroundColor: '#1e293b', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {imageLoading ? (
                        <ImageIcon size={32} color="#94a3b8" className="animate-pulse" />
                    ) : placeImage ? (
                        <img src={placeImage} alt={popupInfo.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <ImageIcon size={32} color="#94a3b8" />
                    )}
                    
                    {/* Gradient Overlay for text readability */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '80px', background: 'linear-gradient(to top, var(--glass-bg), transparent)' }} />
                    
                    <div style={{ position: 'absolute', bottom: '12px', left: '16px', right: '16px' }}>
                         <h3 style={{ fontSize: '1.2rem', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{popupInfo.name}</h3>
                    </div>
                </div>
                
                {/* Info Body */}
                <div style={{ padding: '16px', textAlign: 'left', background: 'transparent' }}>
                  <div style={{ display: 'inline-block', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '16px', fontWeight: 500 }}>
                    {popupInfo.category}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Google Puanı</span>
                      <span style={{ fontWeight: 600, color: '#fbbf24', fontSize: '0.9rem' }}>{popupInfo.google_rating} ★</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Yorum Sayısı</span>
                      <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem' }}>{popupInfo.review_count}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Zeka Skoru</span>
                      <span style={{ fontWeight: 600, color: '#60a5fa', fontSize: '0.9rem' }}>{popupInfo.final_score}</span>
                    </div>
                    
                    {routeData && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: '#10b981', fontSize: '0.85rem', fontWeight: 500, background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '6px' }}>
                           <Footprints size={16} /> Rota hesaplandı! Mesafe rotada çizildi.
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </Popup>
          )}
        </Map>
      </div>

    </div>
  );
};

export default MapExplorer;
