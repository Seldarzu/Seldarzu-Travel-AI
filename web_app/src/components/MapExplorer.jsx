import React, { useState, useMemo, useEffect, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Star, MapPin, Tag, Navigation2, Crosshair, Image as ImageIcon, Footprints, Heart, Search } from 'lucide-react';

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

// Distance Helper (Haversine Formula) in km
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}

const MapExplorer = ({ places, onDeepScan, onReturnHome }) => {
  const mapRef = useRef();
  const [popupInfo, setPopupInfo] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // New States
  const [userLocation, setUserLocation] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [placeImage, setPlaceImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [radarCenter, setRadarCenter] = useState(null);
  
  // Route & UI Management States
  const [routeStops, setRouteStops] = useState([]);
  const [routeMode, setRouteMode] = useState('driving'); // driving, walking
  const [activeTab, setActiveTab] = useState('explore'); // explore, route
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true); // For mobile bottom sheet
  
  // Bounds Limit
  const [mapBounds, setMapBounds] = useState(null);
  
  // Filter States
  const [minRating, setMinRating] = useState(false);
  const [highScoreOnly, setHighScoreOnly] = useState(false);
  const [onlyWalkingDistance, setOnlyWalkingDistance] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Favorites LocalStorage State
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('seldarzu_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('seldarzu_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (placeObj) => {
    if (favorites.find(f => f.name === placeObj.name)) {
      setFavorites(favorites.filter(f => f.name !== placeObj.name));
    } else {
      setFavorites([...favorites, { name: placeObj.name }]); 
    }
  };

  const [viewState, setViewState] = useState({
    longitude: -73.98,
    latitude: 40.75,
    zoom: 11,
    pitch: 45,
    bearing: -17.6
  });

  const hasFitBounds = useRef(false);

  // Dynamic initialization based on places fetched
  useEffect(() => {
    if (places && places.length > 0) {
      const lats = places.map(p => p.latitude).filter(l => l);
      const lngs = places.map(p => p.longitude).filter(l => l);
      
      if (lats.length > 0 && lngs.length > 0) {
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        // Slightly pad the bounds so markers aren't perfectly on the literal edge (e.g., 5% padding)
        const latPad = (maxLat - minLat) * 0.1 || 0.05;
        const lngPad = (maxLng - minLng) * 0.1 || 0.05;
        
        const bounds = [
          [minLng - lngPad, minLat - latPad], // Southwest [lng, lat]
          [maxLng + lngPad, maxLat + latPad]  // Northeast [lng, lat]
        ];
        
        setMapBounds(bounds);

        if (!hasFitBounds.current) {
          if (mapRef.current) {
            mapRef.current.fitBounds(bounds, { padding: 40, duration: 2500, pitch: 45 });
            hasFitBounds.current = true;
          } else {
            // Fallback if ref isn't attached yet
            setViewState(prev => ({
              ...prev,
              longitude: (minLng + maxLng) / 2,
              latitude: (minLat + maxLat) / 2,
              zoom: 12,
              pitch: 45
            }));
            hasFitBounds.current = true;
          }
        }
      }
    }
  }, [places]);

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
    let result = places;
    
    if (selectedCategory !== 'All') {
      result = result.filter(p => p.category === selectedCategory);
    }
    if (minRating) {
      result = result.filter(p => p.google_rating >= 4.5);
    }
    if (highScoreOnly) {
      result = result.filter(p => p.final_score >= 80);
    }
    if (onlyWalkingDistance && userLocation) {
      result = result.filter(p => {
        const dist = getDistanceFromLatLonInKm(userLocation.latitude, userLocation.longitude, p.latitude, p.longitude);
        return dist <= 2.0; // 2km radius is walking distance
      });
    }
    if (onlyFavorites) {
      result = result.filter(p => favorites.find(f => f.name === p.name));
    }

    return result;
  }, [places, selectedCategory, minRating, highScoreOnly, onlyWalkingDistance, userLocation, onlyFavorites, favorites]);

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
        // Priority 1: Real Google Place Photo (from SerpAPI)
        if (popupInfo.thumbnail) {
            setPlaceImage(popupInfo.thumbnail);
            setImageLoading(false);
            return;
        }

        // Priority 2: Wikipedia API
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
        console.error("Image fetching failed", err);
      }

      // Priority 3: Extended Category Fallback Theme
      const categoryStr = (popupInfo.category || '').toLowerCase();
      let fallback = 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80'; // Park default

      if (categoryStr.includes('store') || categoryStr.includes('shop') || categoryStr.includes('boutique') || categoryStr.includes('mall') || categoryStr.includes('clothing')) {
         fallback = 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&q=80'; // Retail shop interior
      } else if (categoryStr.includes('restaurant') || categoryStr.includes('cafe')) {
         fallback = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80'; // Restaurant aesthetic
      } else if (categoryStr.includes('bar') || categoryStr.includes('club')) {
         fallback = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80'; // Moody bar
      } else if (categoryStr.includes('art') || categoryStr.includes('museum')) {
         fallback = 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=600&q=80'; // Art gallery
      } else if (categoryStr.includes('coffee') || categoryStr.includes('bakery')) {
         fallback = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80'; // Coffee shop
      }

      setPlaceImage(fallback);
      setImageLoading(false);
    };

    fetchImage();
  }, [popupInfo]);

  // Handle Route Fetching
  useEffect(() => {
    const fetchRoute = async () => {
      const coords = [];
      if (userLocation) {
        coords.push(`${userLocation.longitude},${userLocation.latitude}`);
      }
      
      routeStops.forEach(stop => {
        coords.push(`${stop.longitude},${stop.latitude}`);
      });

      if (coords.length >= 2) {
        try {
          const coordsString = coords.join(';');
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/${routeMode}/${coordsString}?overview=full&geometries=geojson`
          );
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            setRouteData({
              type: 'Feature',
              properties: {},
              geometry: data.routes[0].geometry
            });

            // Calculate manual bbox to fit map
            const lons = coords.map(c => parseFloat(c.split(',')[0]));
            const lats = coords.map(c => parseFloat(c.split(',')[1]));
            
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
  }, [userLocation, routeStops, routeMode]);

  const handleTestLocation = () => {
    // A point centrally located in New York
    setUserLocation({
      latitude: 40.730610,
      longitude: -73.935242
    });
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [-73.935242, 40.730610],
        zoom: 14,
        duration: 1500,
        pitch: 50
      });
    }
  };

  const handleRealLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [position.coords.longitude, position.coords.latitude],
              zoom: 14,
              duration: 1500,
              pitch: 50
            });
          }
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
    if (mapRef.current) {
        mapRef.current.flyTo({
            center: [place.longitude, place.latitude],
            offset: [0, 100], // Y-offset to push marker down, making room for upward popup
            zoom: 14,
            duration: 1500,
            pitch: 60
        });
    }
  };

  const handleAddToRoute = () => {
    if (popupInfo && !routeStops.find(s => s.name === popupInfo.name)) {
      setRouteStops([...routeStops, popupInfo]);
      setActiveTab('route'); // Switch tab automatically to show
    }
  };

  const handleRemoveFromRoute = (placeName) => {
    setRouteStops(routeStops.filter(s => s.name !== placeName));
  };

  return (
    <div className="map-explorer-layout">
      
      {/* Sidebar for List View */}
      <div className={`sidebar glass-panel ${!isSidebarExpanded ? 'collapsed' : ''}`}>
        {/* Mobile Drag Handle */}
        <div className="sidebar-drag-handle" onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}>
          <div className="drag-pill"></div>
        </div>

        <div className="sidebar-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h2 style={{ color: '#fff', fontSize: '1.5rem', margin: 0 }}>Keşif Listesi</h2>
            {onReturnHome && (
              <button onClick={onReturnHome} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Search size={14} /> Şehir Ara
              </button>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
            Toplam {filteredPlaces.length} mekan listeleniyor.
          </p>

          {/* Location Controls */}
          <div className="location-controls-group">
            <button 
              onClick={handleTestLocation}
              className="location-btn"
              style={{
                background: userLocation?.latitude === 40.730610 ? '#3b82f6' : 'rgba(59, 130, 246, 0.1)',
                border: '1px solid #3b82f6',
              }}
            >
               <Navigation2 size={16} /> Test Konum
            </button>
            <button 
              onClick={handleRealLocation}
              className="location-btn"
              style={{
                background: userLocation?.latitude !== 40.730610 && userLocation ? '#10b981' : 'rgba(16, 185, 129, 0.1)',
                border: '1px solid #10b981',
              }}
            >
               <Crosshair size={16} /> Gerçek
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
            <button 
              onClick={() => setActiveTab('explore')}
              style={{ flex: 1, padding: '8px', borderRadius: '6px', background: activeTab === 'explore' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600 }}
            >
              Keşfet
            </button>
            <button 
              onClick={() => setActiveTab('route')}
              style={{ flex: 1, padding: '8px', borderRadius: '6px', background: activeTab === 'route' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600 }}
            >
              Rotam ({routeStops.length})
            </button>
          </div>

          {activeTab === 'explore' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

              {/* Filter Chips */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                <button
                  onClick={() => setOnlyFavorites(!onlyFavorites)}
                  style={{
                    flexShrink: 0, padding: '6px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #ec4899', cursor: 'pointer', transition: '0.2s',
                    background: onlyFavorites ? '#ec4899' : 'rgba(236, 72, 153, 0.1)', color: onlyFavorites ? '#fff' : '#ec4899'
                  }}
                >
                  {onlyFavorites ? '💖 Favorilerim' : '🤍 Favorilerim'}
                </button>
                <button
                  onClick={() => setMinRating(!minRating)}
                  style={{
                    flexShrink: 0, padding: '6px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #fbbf24', cursor: 'pointer', transition: '0.2s',
                    background: minRating ? '#fbbf24' : 'rgba(251, 191, 36, 0.1)', color: minRating ? '#000' : '#fbbf24'
                  }}
                >
                  ⭐ 4.5+ Puan
                </button>
                <button
                  onClick={() => setHighScoreOnly(!highScoreOnly)}
                  style={{
                    flexShrink: 0, padding: '6px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #ef4444', cursor: 'pointer', transition: '0.2s',
                    background: highScoreOnly ? '#ef4444' : 'rgba(239, 68, 68, 0.1)', color: highScoreOnly ? '#fff' : '#ef4444'
                  }}
                >
                  🔥 Premium (80+)
                </button>
                <button
                  onClick={() => {
                    if (!userLocation && !onlyWalkingDistance) {
                        alert("Yürüyüş mesafesi hesaplamak için üstten 'Gerçek Konum' veya 'Test Konum' seçmelisiniz.");
                        return;
                    }
                    setOnlyWalkingDistance(!onlyWalkingDistance)
                  }}
                  style={{
                    flexShrink: 0, padding: '6px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #10b981', cursor: 'pointer', transition: '0.2s',
                    background: onlyWalkingDistance ? '#10b981' : 'rgba(16, 185, 129, 0.1)', color: onlyWalkingDistance ? '#fff' : '#10b981'
                  }}
                >
                  🚶 Yürüme (2km)
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-scrollable-content">
          {activeTab === 'explore' && filteredPlaces.map((place, idx) => (
            <div 
              key={idx}
              className="glass-card"
              style={{ position: 'relative', padding: '16px', cursor: 'pointer', transition: '0.2s', border: popupInfo?.name === place.name ? '1px solid #3b82f6' : (place.isNewNode ? '1px solid rgba(16, 185, 129, 0.5)' : '')} }
              onClick={() => onPlaceClick(place)}
            >
              <div 
                style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 5, display: 'flex', gap: '8px', alignItems: 'center' }}
              >
                  {place.isNewNode && (
                    <span style={{ fontSize: '0.65rem', backgroundColor: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>YENİ</span>
                  )}
                  <div onClick={(e) => { e.stopPropagation(); toggleFavorite(place); }}>
                    <Heart size={20} color="#ec4899" fill={favorites.find(f => f.name === place.name) ? "#ec4899" : "transparent"} strokeWidth={2} style={{ transition: '0.2s' }} />
                  </div>
              </div>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '8px', paddingRight: place.isNewNode ? '60px' : '24px' }}>{place.name}</h3>
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

          {activeTab === 'route' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setRouteMode('driving')}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', background: routeMode === 'driving' ? '#10b981' : 'rgba(16, 185, 129, 0.1)', color: '#fff', border: '1px solid #10b981', cursor: 'pointer' }}
                >
                  🚗 Sürüş
                </button>
                <button 
                  onClick={() => setRouteMode('walking')}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', background: routeMode === 'walking' ? '#10b981' : 'rgba(16, 185, 129, 0.1)', color: '#fff', border: '1px solid #10b981', cursor: 'pointer' }}
                >
                  🚶 Yürüyüş
                </button>
              </div>
              
              {!userLocation && <div style={{ color: '#fbbf24', fontSize: '0.85rem' }}>⚠️ Rota başlangıcı için 'Gerçek Konumum' veya 'Test Konumu' seçin.</div>}
              
              {routeStops.length === 0 && (
                 <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>Henüz rotanıza mekan eklemediniz.</div>
              )}
              
              {routeStops.map((stop, idx) => (
                <div key={idx} className="glass-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#fff', fontSize: '1rem' }}>{idx + 1}. {stop.name}</div>
                  <button onClick={() => handleRemoveFromRoute(stop.name)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
                </div>
              ))}

              {routeStops.length > 0 && (
                <button onClick={() => setRouteStops([])} style={{ padding: '10px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' }}>
                  Rotayı Temizle
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Content */}
      <div className={`map-wrapper ${!isSidebarExpanded ? 'expanded' : ''}`}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          maxBounds={mapBounds}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          onClick={e => {
             // Haritada boş bir sokağa tıklanırsa Radar tetiklenir.
             // Mekan iğnelerine (Marker) tıklandığında stopPropagation sayesinde bu çalışmaz.
             setRadarCenter(e.lngLat);
          }}
        >
          <NavigationControl position="top-right" />
          
          {/* Render User Location Marker */}
          {userLocation && (
            <Marker longitude={userLocation.longitude} latitude={userLocation.latitude} anchor="center">
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{
                  position: 'absolute',
                  width: '30px', height: '30px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  opacity: 0.4,
                  animation: 'pulse 1.5s infinite',
                  pointerEvents: 'none'
                }} />
                <div style={{
                  position: 'relative',
                  width: '14px', height: '14px',
                  backgroundColor: '#fff',
                  border: '3px solid #3b82f6',
                  borderRadius: '50%',
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)',
                  pointerEvents: 'none'
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

          {/* Render Radar Deep Scan UI */}
          {radarCenter && (
            <Marker longitude={radarCenter.lng} latitude={radarCenter.lat} anchor="center">
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', animation: 'radarSweep 2s infinite linear', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981', pointerEvents: 'none' }} />
                <button 
                  onClick={async (e) => { 
                    e.stopPropagation(); 
                    const btn = e.currentTarget;
                    btn.innerHTML = '⏳ Taranıyor...';
                    btn.style.backgroundColor = '#fbbf24';
                    btn.style.color = '#000';
                    if(onDeepScan) await onDeepScan(radarCenter); 
                    setRadarCenter(null); 
                  }}
                  style={{ position: 'absolute', top: '15px', whiteSpace: 'nowrap', zIndex: 10, padding: '8px 16px', backgroundColor: '#3b82f6', color: '#fff', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.2s', filter: 'brightness(1.1)', pointerEvents: 'auto' }}
                  className="radar-btn"
                >
                  <Crosshair size={14} /> Burayı Derin Tara
                </button>
              </div>
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes radarSweep {
                  0% { transform: scale(0.1); opacity: 0.8; border: 2px solid #10b981; }
                  100% { transform: scale(1); opacity: 0; border: 1px solid #10b981; }
                }
                .radar-btn:hover { transform: scale(1.05); }
              `}} />
            </Marker>
          )}

          {/* Render Places */}
          {filteredPlaces.map((place, index) => (
            <Marker
              key={`marker-${index}`}
              longitude={place.longitude}
              latitude={place.latitude}
              anchor="bottom"
            >
              <div
                style={{ cursor: 'pointer', position: 'relative' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlaceClick(place);
                }}
              >
                {/* Glow/Pulse effect for new radar scans */}
                {place.isNewNode && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    opacity: 0.4,
                    animation: 'pulse 2s infinite',
                    zIndex: -1,
                    pointerEvents: 'none'
                  }} />
                )}
                <MapPin 
                  size={32} 
                  color={popupInfo?.name === place.name ? "#ef4444" : (place.isNewNode ? "#10b981" : "#9ca3af")} 
                  fill={popupInfo?.name === place.name ? "#7f1d1d" : (place.isNewNode ? "#065f46" : "#4b5563")} 
                  style={{ cursor: 'pointer', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))', transition: 'all 0.3s' }} 
                />
              </div>
            </Marker>
          ))}

          {/* Render Customized Popup */}
          {popupInfo && (
            <Popup
              anchor="bottom"
              longitude={popupInfo.longitude}
              latitude={popupInfo.latitude}
              onClose={() => setPopupInfo(null)}
              closeOnClick={false}
              maxWidth="360px"
              offset={[0, -40]}
              closeButton={true}
              className="custom-popup" 
            >
              <div className="popup-body">
                {/* Photo Header */}
                <div style={{ width: '100%', height: '160px', backgroundColor: '#1e293b', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Favorite Button on Image Overlay */}
                    <div 
                        style={{ position: 'absolute', top: '12px', right: '40px', cursor: 'pointer', zIndex: 10, background: 'rgba(0,0,0,0.5)', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(popupInfo); }}
                    >
                         <Heart size={20} color="#ec4899" fill={favorites.find(f => f.name === popupInfo.name) ? "#ec4899" : "transparent"} strokeWidth={2} style={{ transition: '0.2s' }} />
                    </div>

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
                    
                    {routeData && popupInfo && routeStops.includes(popupInfo) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: '#10b981', fontSize: '0.85rem', fontWeight: 500, background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '6px' }}>
                           <Footprints size={16} /> Rota çizildi!
                        </div>
                    )}

                    <button 
                       onClick={handleAddToRoute}
                       disabled={routeStops.find(s => s.name === popupInfo?.name)}
                       style={{ 
                         marginTop: '12px', padding: '10px', width: '100%', 
                         backgroundColor: routeStops.find(s => s.name === popupInfo?.name) ? 'rgba(16, 185, 129, 0.3)' : '#3b82f6', 
                         color: '#fff', border: 'none', borderRadius: '8px', 
                         cursor: routeStops.find(s => s.name === popupInfo?.name) ? 'default' : 'pointer', fontWeight: 600 
                       }}
                    >
                       {routeStops.find(s => s.name === popupInfo?.name) ? '✅ Rotaya Eklendi' : '🚗 Rotaya Ekle'}
                    </button>
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
