import time
import pandas as pd
import requests
import threading
from settings import MAY_BONUS, WEIGHTS

class AmericaTravelEngine:
    def __init__(self):
        self.columns = [
            'name', 'category', 'google_rating', 'review_count', 
            'price_level', 'is_local_favorite', 'may_suitability',
            'latitude', 'longitude', 'thumbnail'
        ]
        self.data = pd.DataFrame(columns=self.columns)
        self.lock = threading.Lock()
        self.api_error = None

    def add_place(self, name, cat, rating, reviews, price, lat, lng, thumbnail, local=False):
        may_score = 0
        cat_str = str(cat).lower()
        for key, bonus in MAY_BONUS.items():
            if key.lower() in cat_str:
                may_score = bonus
                break
        
        new_row = {
            'name': name, 'category': cat, 'google_rating': rating,
            'review_count': reviews, 'price_level': price,
            'is_local_favorite': local, 'may_suitability': may_score,
            'latitude': lat, 'longitude': lng, 'thumbnail': thumbnail
        }
        with self.lock:
            self.data = pd.concat([self.data, pd.DataFrame([new_row])], ignore_index=True)

    def fetch_from_google(self, query, api_key, ll=None):
        url = "https://places.googleapis.com/v1/places:searchText"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "places.displayName,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.priceLevel,places.location,places.photos"
        }
        
        data = {
            "textQuery": query
        }
        
        # If location parameter is provided (from Deep Scan), use it to RESTRICT results strictly
        if ll:
            try:
                lat_str, lng_str = ll.split(",")
                lat_val = float(lat_str)
                lng_val = float(lng_str)
                # 800 meters is ~0.007 degrees lat, and ~0.009 degrees lng (in USA)
                data["locationRestriction"] = {
                    "rectangle": {
                        "low": {
                            "latitude": lat_val - 0.007,
                            "longitude": lng_val - 0.009
                        },
                        "high": {
                            "latitude": lat_val + 0.007,
                            "longitude": lng_val + 0.009
                        }
                    }
                }
            except Exception:
                pass

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post(url, headers=headers, json=data, timeout=15)
                resp_data = response.json()
                
                # Check for API error
                if "error" in resp_data:
                    err_msg = resp_data["error"].get("message", "API Hatası")
                    self.api_error = err_msg
                    print(f"Google API Reddedildi: {err_msg}")
                    return False
                    
                places_list = resp_data.get("places", [])
                
                for place in places_list:
                    name = place.get("displayName", {}).get("text", "Unknown")
                    category = place.get("primaryTypeDisplayName", {}).get("text", "General")
                    
                    rating = place.get("rating", 0)
                    reviews = place.get("userRatingCount", 0)
                    
                    price_val = place.get("priceLevel", "")
                    price_int = 1
                    if price_val == "PRICE_LEVEL_INEXPENSIVE": price_int = 1
                    elif price_val == "PRICE_LEVEL_MODERATE": price_int = 2
                    elif price_val == "PRICE_LEVEL_EXPENSIVE": price_int = 3
                    elif price_val == "PRICE_LEVEL_VERY_EXPENSIVE": price_int = 4
                    
                    lat = place.get("location", {}).get("latitude")
                    lng = place.get("location", {}).get("longitude")
                    
                    # Sadece photo_name sakla — API key'i frontend'e gönderme
                    photos = place.get("photos", [])
                    thumbnail = ""
                    if photos:
                        photo_name = photos[0].get("name", "")
                        if photo_name:
                            thumbnail = photo_name  # Tam URL değil, sadece name
                    
                    if lat and lng:
                        self.add_place(
                            name, category, rating, reviews, price_int, lat, lng, thumbnail,
                            local=(0 < reviews < 5000 and rating >= 4.6)
                        )
                return True
            except Exception as e:
                print(f"Google API Ağ Hatası (Deneme {attempt+1}/{max_retries}): {e}")
                self.api_error = str(e)
                if attempt < max_retries - 1:
                    time.sleep(1) # Wait 1 second before retrying to allow SSL socket recovery
                else:
                    return False

    def calculate_final_score(self):
        if self.data.empty: return self.data
        self.data = self.data.drop_duplicates(subset=['name'])
        
        # Gelişmiş Puanlama Algoritması
        def score_logic(row):
            s = (row['google_rating'] * 12) + row['may_suitability']
            cat = str(row.get('category', '')).lower()
            # Açık hava bonusu (daha önce tanımlıydı ama kullanılmıyordu)
            if any(k in cat for k in ['park', 'garden', 'outdoor', 'nature', 'beach']):
                s += WEIGHTS['outdoor_bonus']
            # Teras / çatı bonusu
            if any(k in cat for k in ['rooftop', 'terrace', 'rooftop bar']):
                s += WEIGHTS['rooftop_bonus']
            if 200 < row['review_count'] < 3000: s += WEIGHTS['hidden_gem_bonus']
            if row['is_local_favorite']: s += 10
            s -= (row['price_level'] * WEIGHTS['price_penalty'])
            return round(s, 1)

        self.data['final_score'] = self.data.apply(score_logic, axis=1)
        return self.data.sort_values(by='final_score', ascending=False)