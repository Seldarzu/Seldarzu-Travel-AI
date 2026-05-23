import React, { useState, useEffect } from 'react';
import { Star, Phone, Globe, MapPin, Clock, ChevronDown, ChevronUp, X, Navigation, Heart } from 'lucide-react';

const PRICE = ['', '$', '$$', '$$$', '$$$$'];

const StarRow = ({ rating }) => (
  <span style={{ display: 'inline-flex', gap: '2px' }}>
    {[1,2,3,4,5].map(i => (
      <Star key={i} size={13}
        fill={i <= Math.round(rating) ? '#fbbf24' : 'transparent'}
        color="#fbbf24" />
    ))}
  </span>
);

export default function PlaceDetailDrawer({ place, onClose, onAddToRoute, routeStops, favorites, onToggleFavorite }) {
  const [imgSrc, setImgSrc]       = useState(null);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [tab, setTab]             = useState('info'); // 'info' | 'reviews'

  const isFav   = favorites?.find(f => place?.place_id ? f.place_id === place.place_id : f.name === place?.name);
  const inRoute = routeStops?.find(s => place?.place_id ? s.place_id === place.place_id : s.name === place?.name);

  useEffect(() => {
    if (!place) return;
    setTab('info');
    setHoursOpen(false);
    if (place.thumbnail) {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      setImgSrc(`${API_BASE}/api/photo?name=${encodeURIComponent(place.thumbnail)}`);
    } else {
      setImgSrc(null);
    }
  }, [place]);

  if (!place) return null;

  const openNow     = place.open_now;
  const hours       = place.opening_hours || [];
  const reviews     = place.reviews       || [];
  const hasReviews  = reviews.length > 0;

  const directionsUrl = place.maps_uri
    ? place.maps_uri
    : `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;

  return (
    <>
      {/* Backdrop (mobilde) */}
      <div className="drawer-backdrop" onClick={onClose} />

      <div className="place-drawer">
        {/* Üst kısım: fotoğraf + başlık */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {/* Kapama butonu */}
          <button onClick={onClose} className="drawer-close-btn">
            <X size={18} />
          </button>

          {/* Favori butonu */}
          <button
            className="drawer-fav-btn"
            onClick={() => onToggleFavorite?.(place)}
          >
            <Heart size={18} color="#ec4899"
              fill={isFav ? '#ec4899' : 'transparent'} />
          </button>

          {/* Fotoğraf */}
          <div className="drawer-photo">
            {imgSrc
              ? <img src={imgSrc} alt={place.name}
                  style={{ width:'100%', height:'100%', objectFit:'cover' }}
                  onError={() => setImgSrc(null)} />
              : <div style={{ width:'100%', height:'100%', background:'rgba(255,255,255,0.05)',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <MapPin size={36} color="#475569" />
                </div>
            }
            <div className="drawer-photo-gradient" />
          </div>

          {/* Başlık üst-üste */}
          <div className="drawer-title-area">
            <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
              <span className="drawer-category-chip">{place.category}</span>
              {openNow === true  && <span className="open-badge">● Open Now</span>}
              {openNow === false && <span className="closed-badge">● Closed</span>}
            </div>
            <h2 className="drawer-title">{place.name}</h2>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
              <span style={{ display:'flex', alignItems:'center', gap:'5px', color:'#fbbf24', fontWeight:600 }}>
                <Star size={15} fill="#fbbf24" />
                {place.google_rating}
                <span style={{ color:'#94a3b8', fontWeight:400, fontSize:'0.85rem' }}>
                  ({place.review_count?.toLocaleString()})
                </span>
              </span>
              {place.price_level > 0 && (
                <span style={{ color:'#94a3b8', fontSize:'0.85rem' }}>{PRICE[place.price_level]}</span>
              )}
              <span style={{ color:'#60a5fa', fontSize:'0.8rem', fontWeight:600 }}>
                Score: {place.final_score}
              </span>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="drawer-tabs">
          <button className={`drawer-tab ${tab==='info' ? 'active' : ''}`}
            onClick={() => setTab('info')}>Info</button>
          <button className={`drawer-tab ${tab==='reviews' ? 'active' : ''}`}
            onClick={() => setTab('reviews')}>
            Reviews {hasReviews ? `(${reviews.length})` : ''}
          </button>
        </div>

        {/* İçerik */}
        <div className="drawer-body">
          {tab === 'info' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

              {/* Açılış saatleri */}
              {hours.length > 0 && (
                <div className="drawer-info-card">
                  <button className="hours-toggle" onClick={() => setHoursOpen(!hoursOpen)}>
                    <span style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <Clock size={16} color="#60a5fa" />
                      <span style={{ fontWeight:600, color:'#fff' }}>Opening Hours</span>
                    </span>
                    {hoursOpen ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                  </button>
                  {hoursOpen && (
                    <div style={{ marginTop:'10px', display:'flex', flexDirection:'column', gap:'4px' }}>
                      {hours.map((h, i) => (
                        <p key={i} style={{ fontSize:'0.82rem', color:'#cbd5e1', margin:0 }}>{h}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Telefon */}
              {place.phone && (
                <a href={`tel:${place.phone}`} className="drawer-contact-row">
                  <Phone size={16} color="#34d399" />
                  <span>{place.phone}</span>
                </a>
              )}

              {/* Website */}
              {place.website && (
                <a href={place.website} target="_blank" rel="noreferrer" className="drawer-contact-row">
                  <Globe size={16} color="#60a5fa" />
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {place.website.replace(/^https?:\/\/(www\.)?/, '')}
                  </span>
                </a>
              )}
            </div>
          )}

          {tab === 'reviews' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {hasReviews ? reviews.map((r, i) => (
                <div key={i} className="review-card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                    <div>
                      <p style={{ color:'#fff', fontWeight:600, fontSize:'0.9rem', margin:0 }}>{r.author}</p>
                      <p style={{ color:'#94a3b8', fontSize:'0.75rem', margin:0 }}>{r.time}</p>
                    </div>
                    <StarRow rating={r.rating} />
                  </div>
                  <p style={{ color:'#cbd5e1', fontSize:'0.85rem', margin:0, lineHeight:1.5 }}>{r.text}</p>
                </div>
              )) : (
                <p style={{ color:'#64748b', textAlign:'center', marginTop:'20px' }}>
                  No review data available for this place.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Alt butonlar */}
        <div className="drawer-actions">
          <a href={directionsUrl} target="_blank" rel="noreferrer" className="btn-directions">
            <Navigation size={16} />
            Get Directions
          </a>
          <button
            onClick={() => onAddToRoute?.(place)}
            disabled={!!inRoute}
            className={`btn-route ${inRoute ? 'added' : ''}`}
          >
            {inRoute ? '✅ In Route' : '🗺 Add to Route'}
          </button>
        </div>
      </div>
    </>
  );
}
