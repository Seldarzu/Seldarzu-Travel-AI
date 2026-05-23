import React, { useState, useMemo, useEffect, useRef } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Star, MapPin, Tag, Navigation2, Crosshair, Heart, Search, Clock, List, Map as MapIcon } from 'lucide-react';
import PlaceDetailDrawer from './PlaceDetailDrawer';

// Category emoji mapping
function getCategoryIcon(category) {
  const c = category.toLowerCase();
  if (c === 'all') return '✨';
  if (c.includes('restaurant') || c.includes('food') || c.includes('diner')) return '🍽';
  if (c.includes('cafe') || c.includes('coffee') || c.includes('bakery') || c.includes('pastry')) return '☕';
  if (c.includes('bar') || c.includes('cocktail') || c.includes('pub') || c.includes('lounge') || c.includes('speakeasy')) return '🍸';
  if (c.includes('park') || c.includes('garden') || c.includes('nature') || c.includes('botanical')) return '🌿';
  if (c.includes('beach') || c.includes('waterfront') || c.includes('harbor')) return '🏖';
  if (c.includes('museum') || c.includes('gallery') || c.includes('exhibit')) return '🏛';
  if (c.includes('shop') || c.includes('mall') || c.includes('store') || c.includes('boutique') || c.includes('market')) return '🛍';
  if (c.includes('hotel') || c.includes('resort') || c.includes('inn') || c.includes('lodging')) return '🏨';
  if (c.includes('spa') || c.includes('wellness') || c.includes('massage')) return '💆';
  if (c.includes('gym') || c.includes('fitness') || c.includes('sport')) return '💪';
  if (c.includes('rooftop') || c.includes('terrace') || c.includes('skybar')) return '🌆';
  if (c.includes('theater') || c.includes('cinema') || c.includes('movie')) return '🎭';
  if (c.includes('art') || c.includes('studio')) return '🎨';
  if (c.includes('pizza')) return '🍕';
  if (c.includes('sushi') || c.includes('japanese')) return '🍱';
  if (c.includes('burger') || c.includes('grill') || c.includes('bbq')) return '🍔';
  if (c.includes('ice cream') || c.includes('dessert') || c.includes('sweet')) return '🍦';
  return '📍';
}

// CARTO Dark Matter raster tile style (vektör GL yerine raster — daha güvenilir)
const DARK_MAP_STYLE = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
      ],
      tileSize: 256,
      attribution: '© <a href="https://carto.com/attributions">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  },
  layers: [{ id: 'carto-dark-tiles', type: 'raster', source: 'carto-dark', minzoom: 0, maxzoom: 20 }]
};

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
  const chipScrollRef = useRef();
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);

  // Rota drag-and-drop sıralaması
  const routeDragItem     = useRef(null); // sürüklenen index
  const routeDragOverItem = useRef(null); // üzerine gelinen index
  const [routeDragActiveIdx, setRouteDragActiveIdx] = useState(null);

  // Touch drag state
  const touchDragRef = useRef({ active: false, startY: 0, currentIdx: null });
  const [popupInfo, setPopupInfo] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // New States
  const [userLocation, setUserLocation] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [radarCenter, setRadarCenter] = useState(null);
  
  // Route & UI Management States
  const [routeStops, setRouteStops] = useState([]);
  const [routeMode, setRouteMode] = useState('driving'); // driving, walking
  const [activeTab, setActiveTab] = useState('explore'); // explore, route
  const [isRouteFetching, setIsRouteFetching] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null); // { distance, duration }
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true); // For mobile bottom sheet
  
  // Bounds Limit
  const [mapBounds, setMapBounds] = useState(null);
  
  // Filter States
  const [minRating, setMinRating] = useState(false);
  const [highScoreOnly, setHighScoreOnly] = useState(false);
  const [onlyWalkingDistance, setOnlyWalkingDistance] = useState(false);
  const [onlyFavorites, setOnlyFavorites]   = useState(false);
  const [onlyOpenNow, setOnlyOpenNow]       = useState(false);
  const [sortBy, setSortBy]                 = useState('score'); // score | rating | distance | reviews

  // Dahili toast (alert() yerine)
  const [inlineToast, setInlineToast] = useState(null);
  const showToast = (msg, type = 'warn') => {
    setInlineToast({ msg, type });
    setTimeout(() => setInlineToast(null), 3500);
  };

  // Radar sekme filtreleri
  const [radarCategory, setRadarCategory]   = useState('All');
  const [radarOpenNow,  setRadarOpenNow]    = useState(false);
  const [radarSortBy,   setRadarSortBy]     = useState('score');

  // Favorites LocalStorage State
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('seldarzu_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('seldarzu_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (placeObj) => {
    const uid = placeObj.place_id || placeObj.name;
    const isAlready = favorites.find(f => (f.place_id || f.name) === uid);
    if (isAlready) {
      setFavorites(favorites.filter(f => (f.place_id || f.name) !== uid));
    } else {
      setFavorites([...favorites, { place_id: placeObj.place_id || '', name: placeObj.name }]);
    }
  };

  const [viewState, setViewState] = useState({
    longitude: -73.98,
    latitude: 40.75,
    zoom: 11,
    pitch: 45,
    bearing: -17.6
  });

  const hasFitBounds        = useRef(false);
  const placesSignatureRef  = useRef(null); // ilk mekanın place_id'si — şehir değişince reset

  // Dynamic initialization based on places fetched
  useEffect(() => {
    if (places && places.length > 0) {
      // Yeni şehir mi yüklendi? İmzayı kontrol et
      const sig = places[0].place_id || places[0].name;
      if (sig !== placesSignatureRef.current) {
        placesSignatureRef.current = sig;
        hasFitBounds.current = false; // yeni şehir → yeniden fit et
      }
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

  // Sadece radar taramasından gelen yeni mekanlar (ham)
  const radarPlaces = useMemo(() => places.filter(p => p.isNewNode), [places]);

  // Radar kategorileri
  const radarCategories = useMemo(() => {
    const cats = ['All'];
    radarPlaces.forEach(p => { if (p.category && !cats.includes(p.category)) cats.push(p.category); });
    return cats;
  }, [radarPlaces]);

  // Filtreli + sıralı radar listesi
  const filteredRadarPlaces = useMemo(() => {
    let r = radarPlaces;
    if (radarCategory !== 'All') r = r.filter(p => p.category === radarCategory);
    if (radarOpenNow) r = r.filter(p => p.open_now === true);
    if (radarSortBy === 'rating')   r = [...r].sort((a, b) => b.google_rating - a.google_rating);
    else if (radarSortBy === 'distance' && userLocation)
      r = [...r].sort((a, b) =>
        getDistanceFromLatLonInKm(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude) -
        getDistanceFromLatLonInKm(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude)
      );
    else r = [...r].sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
    return r;
  }, [radarPlaces, radarCategory, radarOpenNow, radarSortBy, userLocation]);

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
      const favIds = new Set(favorites.map(f => f.place_id || f.name));
      result = result.filter(p => favIds.has(p.place_id || p.name));
    }
    if (onlyOpenNow) {
      result = result.filter(p => p.open_now === true);
    }

    // Sıralama
    if (sortBy === 'rating') result = [...result].sort((a, b) => b.google_rating - a.google_rating);
    else if (sortBy === 'reviews') result = [...result].sort((a, b) => b.review_count - a.review_count);
    else if (sortBy === 'distance' && userLocation) {
      result = [...result].sort((a, b) => {
        const da = getDistanceFromLatLonInKm(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude);
        const db = getDistanceFromLatLonInKm(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude);
        return da - db;
      });
    } else {
      result = [...result].sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
    }

    return result;
  }, [places, selectedCategory, minRating, highScoreOnly, onlyWalkingDistance, userLocation, onlyFavorites, favorites, onlyOpenNow, sortBy]);

  // Popup image logic artık PlaceDetailDrawer içinde yönetiliyor

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
        setIsRouteFetching(true);
        setRouteInfo(null);
        try {
          const coordsString = coords.join(';');
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/${routeMode}/${coordsString}?overview=full&geometries=geojson`,
            { signal: AbortSignal.timeout(15000) }
          );
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            setRouteData({ type: 'Feature', properties: {}, geometry: route.geometry });

            // Süre ve mesafe bilgisini sakla
            const distKm  = (route.distance / 1000).toFixed(1);
            const durMin  = Math.round(route.duration / 60);
            setRouteInfo({ distance: distKm, duration: durMin });

            const lons = coords.map(c => parseFloat(c.split(',')[0]));
            const lats = coords.map(c => parseFloat(c.split(',')[1]));
            mapRef.current?.fitBounds(
              [[Math.min(...lons) - 0.02, Math.min(...lats) - 0.02],
               [Math.max(...lons) + 0.02, Math.max(...lats) + 0.02]],
              { padding: 80, duration: 1500 }
            );
          }
        } catch (err) {
          console.error("OSRM route fetch error:", err);
          setRouteData(null);
          setRouteInfo(null);
        } finally {
          setIsRouteFetching(false);
        }
      } else {
        setRouteData(null);
        setRouteInfo(null);
        setIsRouteFetching(false);
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
          showToast("Couldn't get location. Check browser permissions.");
        }
      );
    } else {
      showToast("Your browser doesn't support geolocation.");
    }
  };

  const onPlaceClick = (place) => {
    setPopupInfo(place);
    // Mobilde: listeyi kapat, haritayı aç
    if (window.innerWidth <= 768) setIsSidebarExpanded(false);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [place.longitude, place.latitude],
        zoom: 14,
        duration: 1200,
        pitch: 55
      });
    }
  };

  const handleAddToRoute = () => {
    if (popupInfo && !routeStops.find(s => (s.place_id || s.name) === (popupInfo.place_id || popupInfo.name))) {
      setRouteStops([...routeStops, popupInfo]);
      setActiveTab('route'); // Switch tab automatically to show
    }
  };

  const handleRemoveFromRoute = (place) => {
    const uid = place.place_id || place.name;
    setRouteStops(routeStops.filter(s => (s.place_id || s.name) !== uid));
  };

  // ── Rota sıralama: drag end → array yeniden sırala ──
  const handleRouteDragEnd = () => {
    if (routeDragItem.current === null || routeDragOverItem.current === null) {
      routeDragItem.current = null;
      routeDragOverItem.current = null;
      setRouteDragActiveIdx(null);
      return;
    }
    const reordered = [...routeStops];
    const [dragged] = reordered.splice(routeDragItem.current, 1);
    reordered.splice(routeDragOverItem.current, 0, dragged);
    routeDragItem.current = null;
    routeDragOverItem.current = null;
    setRouteDragActiveIdx(null);
    setRouteStops(reordered);
  };

  const handleExportToGoogleMaps = () => {
    const stops = userLocation
      ? [{ latitude: userLocation.latitude, longitude: userLocation.longitude }, ...routeStops]
      : routeStops;
    if (stops.length < 2) return;
    const origin = `${stops[0].latitude},${stops[0].longitude}`;
    const destination = `${stops[stops.length - 1].latitude},${stops[stops.length - 1].longitude}`;
    const waypoints = stops.slice(1, -1).map(s => `${s.latitude},${s.longitude}`).join('|');
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
    url += `&travelmode=${routeMode === 'driving' ? 'driving' : 'walking'}`;
    window.open(url, '_blank');
  };

  return (
    <div className="map-explorer-layout">
      
      {/* Sidebar for List View */}
      <div className={`sidebar glass-panel ${!isSidebarExpanded ? 'collapsed' : ''}`}>
        {/* Mobile: Harita modunda "Listeye Dön" handle */}
        <div className="sidebar-drag-handle" onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}>
          {!isSidebarExpanded
            ? <span className="drag-back-label"><List size={14} /> Back to List</span>
            : <div className="drag-pill" />
          }
        </div>

        <div className="sidebar-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h2 style={{ color: '#fff', fontSize: '1.5rem', margin: 0 }}>Explore</h2>
            {onReturnHome && (
              <button onClick={onReturnHome} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Search size={14} /> Search City
              </button>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
            {filteredPlaces.length} places listed.
          </p>

          {/* Location Controls */}
          <button
            className={`gps-main-btn ${userLocation ? 'active' : ''}`}
            onClick={userLocation ? () => setUserLocation(null) : handleRealLocation}
          >
            {userLocation ? (
              <><span className="gps-pulse-dot" />Location Active &nbsp;·&nbsp; Clear</>
            ) : (
              <><Crosshair size={16} />📍 Use My Location</>
            )}
          </button>

          {/* Tabs */}
          <div className="sidebar-tabs" style={{ display: 'flex', gap: '6px', marginBottom: '16px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveTab('explore')}
              style={{ flex: 1, padding: '8px 4px', borderRadius: '6px', background: activeTab === 'explore' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600, fontSize: '0.82rem' }}
            >
              Explore
            </button>
            <button
              onClick={() => setActiveTab('radar')}
              style={{ flex: 1, padding: '8px 4px', borderRadius: '6px', background: activeTab === 'radar' ? '#10b981' : 'transparent', color: radarPlaces.length > 0 ? '#34d399' : '#64748b', border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600, fontSize: '0.82rem', position: 'relative' }}
            >
              📡 Radar
              {radarPlaces.length > 0 && (
                <span style={{ position: 'absolute', top: '2px', right: '4px', background: '#10b981', color: '#fff', borderRadius: '10px', fontSize: '0.6rem', padding: '1px 5px', fontWeight: 700 }}>
                  {radarPlaces.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('route')}
              style={{ flex: 1, padding: '8px 4px', borderRadius: '6px', background: activeTab === 'route' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600, fontSize: '0.82rem' }}
            >
              Route ({routeStops.length})
            </button>
          </div>

          {activeTab === 'explore' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Category Chips */}
              <div
                className="category-chips-scroll"
                ref={chipScrollRef}
                onMouseDown={e => {
                  isDraggingRef.current = true;
                  dragStartXRef.current = e.pageX - chipScrollRef.current.offsetLeft;
                  dragScrollLeftRef.current = chipScrollRef.current.scrollLeft;
                }}
                onMouseMove={e => {
                  if (!isDraggingRef.current) return;
                  e.preventDefault();
                  const x = e.pageX - chipScrollRef.current.offsetLeft;
                  chipScrollRef.current.scrollLeft = dragScrollLeftRef.current - (x - dragStartXRef.current);
                }}
                onMouseUp={() => { isDraggingRef.current = false; }}
                onMouseLeave={() => { isDraggingRef.current = false; }}
              >
                {categories.map(c => (
                  <button
                    key={c}
                    className={`category-chip ${selectedCategory === c ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(c)}
                  >
                    {getCategoryIcon(c)} {c}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="sort-btn-group" style={{ display: 'flex', gap: '6px' }}>
                {[
                  { key: 'score',    label: '🏆 Score' },
                  { key: 'rating',   label: '⭐ Rating' },
                  { key: 'reviews',  label: '💬 Reviews' },
                  { key: 'distance', label: '📍 Nearby' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSortBy(opt.key)}
                    disabled={opt.key === 'distance' && !userLocation}
                    style={{
                      flex: 1, padding: '6px 4px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 600,
                      cursor: opt.key === 'distance' && !userLocation ? 'not-allowed' : 'pointer',
                      border: sortBy === opt.key ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                      background: sortBy === opt.key ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                      color: sortBy === opt.key ? '#60a5fa' : (opt.key === 'distance' && !userLocation ? '#374151' : '#94a3b8'),
                      transition: 'all 0.15s'
                    }}
                  >{opt.label}</button>
                ))}
              </div>

              {/* Filter Chips */}
              <div className="filter-chips-row" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                <button
                  onClick={() => setOnlyFavorites(!onlyFavorites)}
                  style={{
                    flexShrink: 0, padding: '6px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #ec4899', cursor: 'pointer', transition: '0.2s',
                    background: onlyFavorites ? '#ec4899' : 'rgba(236, 72, 153, 0.1)', color: onlyFavorites ? '#fff' : '#ec4899'
                  }}
                >
                  {onlyFavorites ? '💖 Favorites' : '🤍 Favorites'}
                </button>
                <button
                  onClick={() => setMinRating(!minRating)}
                  style={{
                    flexShrink: 0, padding: '6px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #fbbf24', cursor: 'pointer', transition: '0.2s',
                    background: minRating ? '#fbbf24' : 'rgba(251, 191, 36, 0.1)', color: minRating ? '#000' : '#fbbf24'
                  }}
                >
                  ⭐ 4.5+ Rating
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
                      showToast("📍 Enable location first to use the walking filter.");
                      return;
                    }
                    setOnlyWalkingDistance(!onlyWalkingDistance);
                  }}
                  style={{
                    flexShrink: 0, padding: '6px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #10b981', cursor: 'pointer', transition: '0.2s',
                    background: onlyWalkingDistance ? '#10b981' : 'rgba(16, 185, 129, 0.1)', color: onlyWalkingDistance ? '#fff' : '#10b981'
                  }}
                >
                  🚶 Walking (2km)
                </button>
                <button
                  onClick={() => setOnlyOpenNow(!onlyOpenNow)}
                  style={{
                    flexShrink: 0, padding: '6px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #34d399', cursor: 'pointer', transition: '0.2s',
                    background: onlyOpenNow ? '#34d399' : 'rgba(52, 211, 153, 0.1)', color: onlyOpenNow ? '#000' : '#34d399',
                    display: 'flex', alignItems: 'center', gap: '5px'
                  }}
                >
                  <Clock size={13} /> Open Now
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-scrollable-content">

          {/* ── Dahili toast ── */}
          {inlineToast && (
            <div style={{
              margin: '0 0 12px 0', padding: '10px 14px', borderRadius: '10px',
              background: inlineToast.type === 'warn' ? 'rgba(251,191,36,0.15)' : 'rgba(59,130,246,0.15)',
              border: `1px solid ${inlineToast.type === 'warn' ? '#fbbf24' : '#3b82f6'}`,
              color: inlineToast.type === 'warn' ? '#fbbf24' : '#93c5fd',
              fontSize: '0.85rem', fontWeight: 500,
            }}>
              {inlineToast.msg}
            </div>
          )}

          {/* ── Keşfet sekmesi boş durumlar ── */}
          {activeTab === 'explore' && places.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#475569' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🌎</div>
              <p style={{ fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>No city scanned yet</p>
              <p style={{ fontSize: '0.82rem' }}>Use the "Search City" button to get started.</p>
            </div>
          )}

          {activeTab === 'explore' && places.length > 0 && filteredPlaces.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#475569' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔍</div>
              <p style={{ fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>No places match your filters</p>
              <p style={{ fontSize: '0.82rem', marginBottom: '16px' }}>Try relaxing your filters.</p>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setMinRating(false);
                  setHighScoreOnly(false);
                  setOnlyWalkingDistance(false);
                  setOnlyFavorites(false);
                  setOnlyOpenNow(false);
                }}
                style={{
                  padding: '8px 18px', borderRadius: '8px', border: '1px solid #3b82f6',
                  background: 'rgba(59,130,246,0.1)', color: '#60a5fa',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                }}
              >
                Clear Filters
              </button>
            </div>
          )}

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
                    <span style={{ fontSize: '0.65rem', backgroundColor: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>NEW</span>
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
                <span>Score: {place.final_score}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                  <Tag size={12} /> {place.category}
                </div>
                {userLocation && (() => {
                  const d = getDistanceFromLatLonInKm(userLocation.latitude, userLocation.longitude, place.latitude, place.longitude);
                  return (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
                      📍 {d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}

          {activeTab === 'radar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Başlık */}
              <div style={{ padding: '12px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px' }}>
                <p style={{ color: '#34d399', fontWeight: 700, fontSize: '0.88rem', margin: '0 0 4px' }}>
                  📡 Radar Scan Results
                </p>
                <p style={{ color: '#64748b', fontSize: '0.78rem', margin: 0 }}>
                  {radarPlaces.length > 0
                    ? `${filteredRadarPlaces.length} / ${radarPlaces.length} places shown`
                    : 'Tap anywhere on the map → press "Deep Scan Here"'}
                </p>
              </div>

              {radarPlaces.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Kategori chip'leri */}
                  <div className="category-chips-scroll">
                    {radarCategories.map(c => (
                      <button
                        key={c}
                        className={`category-chip ${radarCategory === c ? 'active' : ''}`}
                        onClick={() => setRadarCategory(c)}
                      >
                        {getCategoryIcon(c)} {c}
                      </button>
                    ))}
                  </div>

                  {/* Sort + Open filter */}
                  <div className="sort-btn-group" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {[
                      { key: 'score',    label: '🏆' },
                      { key: 'rating',   label: '⭐' },
                      { key: 'distance', label: '📍' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setRadarSortBy(opt.key)}
                        disabled={opt.key === 'distance' && !userLocation}
                        title={opt.key === 'distance' ? 'Location required' : ''}
                        style={{
                          padding: '6px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600,
                          cursor: opt.key === 'distance' && !userLocation ? 'not-allowed' : 'pointer',
                          border: radarSortBy === opt.key ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                          background: radarSortBy === opt.key ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                          color: radarSortBy === opt.key ? '#34d399' : (opt.key === 'distance' && !userLocation ? '#374151' : '#94a3b8'),
                        }}
                      >{opt.label}</button>
                    ))}
                    <button
                      onClick={() => setRadarOpenNow(!radarOpenNow)}
                      style={{
                        marginLeft: 'auto', padding: '6px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                        border: radarOpenNow ? '1px solid #34d399' : '1px solid rgba(255,255,255,0.1)',
                        background: radarOpenNow ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.04)',
                        color: radarOpenNow ? '#34d399' : '#64748b',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <Clock size={12} /> Open
                    </button>
                  </div>
                </div>
              )}

              {radarPlaces.length === 0 && (
                <div style={{ textAlign: 'center', color: '#475569', padding: '32px 16px' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📡</div>
                  <p style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
                    Tap anywhere on the map, then press<br />
                    <strong style={{ color: '#34d399' }}>Deep Scan Here</strong>
                  </p>
                </div>
              )}

              {radarPlaces.length > 0 && filteredRadarPlaces.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 16px', color: '#475569' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
                  <p style={{ fontSize: '0.82rem', color: '#64748b' }}>No radar results match this filter.</p>
                </div>
              )}

              {filteredRadarPlaces.map((place, idx) => (
                <div
                  key={idx}
                  className="glass-card"
                  style={{ position: 'relative', padding: '14px', cursor: 'pointer', border: '1px solid rgba(16,185,129,0.35)', transition: '0.2s',
                    background: popupInfo?.name === place.name ? 'rgba(16,185,129,0.12)' : 'rgba(15,23,42,0.55)' }}
                  onClick={() => onPlaceClick(place)}
                >
                  <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6rem', background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontWeight: 700 }}>NEW</span>
                    <div onClick={(e) => { e.stopPropagation(); toggleFavorite(place); }}>
                      <Heart size={18} color="#ec4899" fill={favorites.find(f => f.name === place.name) ? '#ec4899' : 'transparent'} />
                    </div>
                  </div>
                  <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '6px', paddingRight: '64px' }}>{place.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', marginBottom: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
                      <Star size={13} fill="#fbbf24" /> {place.google_rating} ({place.review_count})
                    </span>
                    <span style={{ color: '#64748b' }}>•</span>
                    <span style={{ color: '#60a5fa' }}>Score: {place.final_score}</span>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem' }}>
                    <Tag size={11} /> {place.category}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'route' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setRouteMode('driving')}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', background: routeMode === 'driving' ? '#10b981' : 'rgba(16, 185, 129, 0.1)', color: '#fff', border: '1px solid #10b981', cursor: 'pointer' }}
                >
                  🚗 Driving
                </button>
                <button
                  onClick={() => setRouteMode('walking')}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', background: routeMode === 'walking' ? '#10b981' : 'rgba(16, 185, 129, 0.1)', color: '#fff', border: '1px solid #10b981', cursor: 'pointer' }}
                >
                  🚶 Walking
                </button>
              </div>
              
              {!userLocation && (
                <div style={{ color: '#fbbf24', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⚠️ Enable location to set a route start point.
                </div>
              )}

              {/* Rota hesaplanıyor loading */}
              {isRouteFetching && routeStops.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                  color: '#60a5fa', fontSize: '0.85rem', fontWeight: 500,
                }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #3b82f6', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                  Calculating route...
                </div>
              )}

              {/* Rota özeti: mesafe + süre */}
              {!isRouteFetching && routeInfo && routeStops.length > 0 && (
                <div style={{
                  display: 'flex', gap: '8px',
                  padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                }}>
                  <span style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>
                    🛣 {routeInfo.distance} km
                  </span>
                  <span style={{ color: '#475569', fontSize: '0.85rem' }}>·</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    ⏱ ~{routeInfo.duration} min
                  </span>
                </div>
              )}

              {routeStops.length === 0 && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
                  No stops added to your route yet.
                </div>
              )}

              {routeStops.length > 0 && (
                <div style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center', marginBottom: '4px' }}>
                  ↕ Drag to reorder
                </div>
              )}

              {routeStops.map((stop, idx) => (
                <div
                  key={stop.place_id || stop.name}
                  draggable
                  onDragStart={() => {
                    routeDragItem.current = idx;
                    setRouteDragActiveIdx(idx);
                  }}
                  onDragEnter={() => { routeDragOverItem.current = idx; }}
                  onDragOver={e => e.preventDefault()}
                  onDragEnd={handleRouteDragEnd}
                  className="glass-card route-stop-card"
                  style={{
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'grab',
                    opacity: routeDragActiveIdx === idx ? 0.4 : 1,
                    border: routeDragOverItem.current === idx && routeDragActiveIdx !== idx
                      ? '1px solid #3b82f6'
                      : '1px solid rgba(255,255,255,0.06)',
                    transition: 'opacity 0.15s, border-color 0.15s',
                    userSelect: 'none',
                  }}
                >
                  {/* Drag handle */}
                  <span style={{ color: '#475569', fontSize: '1rem', lineHeight: 1, flexShrink: 0, cursor: 'grab' }}>
                    ⠿
                  </span>

                  {/* Numara */}
                  <span style={{
                    minWidth: '22px', height: '22px', borderRadius: '50%',
                    background: '#3b82f6', color: '#fff', fontSize: '0.75rem',
                    fontWeight: 700, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                  }}>
                    {idx + 1}
                  </span>

                  {/* İsim */}
                  <span style={{ color: '#e2e8f0', fontSize: '0.88rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {stop.name}
                  </span>

                  {/* Kaldır */}
                  <button
                    onClick={() => handleRemoveFromRoute(stop)}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem', padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}
                    title="Remove from route"
                  >
                    &times;
                  </button>
                </div>
              ))}

              {routeStops.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                  <button
                    onClick={handleExportToGoogleMaps}
                    style={{ padding: '12px', background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6', color: '#60a5fa', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    🗺 Open in Google Maps
                  </button>
                  <button onClick={() => setRouteStops([])} style={{ padding: '10px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer' }}>
                    Clear Route
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Content */}
      <div className={`map-wrapper ${!isSidebarExpanded ? 'expanded' : ''}`} style={{ position: 'relative' }}>
        {/* Mobile FAB: Liste / Harita toggle */}
        <button
          className="fab-toggle"
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          aria-label={isSidebarExpanded ? 'View map' : 'Back to list'}
        >
          {isSidebarExpanded ? <><MapIcon size={18} /> View Map</> : <><List size={18} /> Back to List</>}
        </button>
        <Map
          ref={mapRef}
          {...viewState}
          style={{ width: '100%', height: '100%' }}
          onMove={evt => setViewState(evt.viewState)}
          mapStyle={DARK_MAP_STYLE}
          onLoad={() => {
            // Opacity transition içinde mount olduğu için canvas boyutunu yeniden hesapla
            setTimeout(() => {
              mapRef.current?.resize();
              // fitBounds'u map hazır olduğunda tekrar çalıştır
              if (mapBounds) {
                mapRef.current?.fitBounds(mapBounds, { padding: 60, duration: 1200, pitch: 45 });
              }
            }, 100);
          }}
          onClick={e => {
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
                  style={{ position: 'absolute', top: '15px', whiteSpace: 'nowrap', zIndex: 10, padding: '8px 16px', backgroundColor: '#3b82f6', color: '#fff', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.2s', filter: 'brightness(1.1)', pointerEvents: 'auto' }}
                  className="radar-btn"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const btn = e.currentTarget;
                    btn.innerHTML = '⏳ Scanning...';
                    btn.style.backgroundColor = '#fbbf24';
                    btn.style.color = '#000';
                    if (onDeepScan) await onDeepScan(radarCenter);
                    setRadarCenter(null);
                    setActiveTab('radar');
                    setIsSidebarExpanded(true);
                  }}
                >
                  <Crosshair size={14} /> Deep Scan Here
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

          {/* PlaceDetailDrawer haritanın üstüne ekleniyor */}
        </Map>

        {/* Detail Drawer */}
        {popupInfo && (
          <PlaceDetailDrawer
            place={popupInfo}
            onClose={() => setPopupInfo(null)}
            onAddToRoute={(place) => {
              if (!routeStops.find(s => (s.place_id || s.name) === (place.place_id || place.name))) {
                setRouteStops([...routeStops, place]);
                setActiveTab('route');
              }
            }}
            routeStops={routeStops}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </div>

    </div>
  );
};

export default MapExplorer;
