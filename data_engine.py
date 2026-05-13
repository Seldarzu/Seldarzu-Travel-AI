import time
import logging
import pandas as pd
import requests
import threading
from settings import MAY_BONUS, WEIGHTS

logger = logging.getLogger("seldarzu")

class AmericaTravelEngine:
    def __init__(self):
        self.columns = [
            'name', 'category', 'google_rating', 'review_count',
            'price_level', 'is_local_favorite', 'may_suitability',
            'latitude', 'longitude', 'thumbnail',
            # Yeni alanlar
            'open_now', 'opening_hours', 'phone', 'website', 'maps_uri', 'reviews'
        ]
        self.data = pd.DataFrame(columns=self.columns)
        self.lock = threading.Lock()
        self.api_error = None

    def add_place(self, name, cat, rating, review_count, price, lat, lng,
                  thumbnail, local=False,
                  open_now=None, opening_hours=None,
                  phone="", website="", maps_uri="", reviews=None):
        may_score = 0
        cat_str = str(cat).lower()
        for key, bonus in MAY_BONUS.items():
            if key.lower() in cat_str:
                may_score = bonus
                break

        new_row = {
            'name': name, 'category': cat, 'google_rating': rating,
            'review_count': review_count, 'price_level': price,
            'is_local_favorite': local, 'may_suitability': may_score,
            'latitude': lat, 'longitude': lng, 'thumbnail': thumbnail,
            'open_now': open_now,
            'opening_hours': opening_hours or [],
            'phone': phone,
            'website': website,
            'maps_uri': maps_uri,
            'reviews': reviews or [],
        }
        with self.lock:
            self.data = pd.concat([self.data, pd.DataFrame([new_row])], ignore_index=True)

    def fetch_from_google(self, query, api_key, ll=None):
        url = "https://places.googleapis.com/v1/places:searchText"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": (
                "places.displayName,"
                "places.primaryTypeDisplayName,"
                "places.rating,"
                "places.userRatingCount,"
                "places.priceLevel,"
                "places.location,"
                "places.photos,"
                "places.currentOpeningHours,"
                "places.nationalPhoneNumber,"
                "places.websiteUri,"
                "places.googleMapsUri,"
                "places.reviews"
            )
        }

        data = {"textQuery": query}

        if ll:
            try:
                lat_str, lng_str = ll.split(",")
                lat_val = float(lat_str)
                lng_val = float(lng_str)
                data["locationRestriction"] = {
                    "rectangle": {
                        "low":  {"latitude": lat_val - 0.007, "longitude": lng_val - 0.009},
                        "high": {"latitude": lat_val + 0.007, "longitude": lng_val + 0.009}
                    }
                }
            except Exception:
                pass

        for attempt in range(3):
            try:
                response = requests.post(url, headers=headers, json=data, timeout=15)
                resp_data = response.json()

                if "error" in resp_data:
                    err_msg = resp_data["error"].get("message", "API Hatası")
                    self.api_error = err_msg
                    logger.warning(f"Google API hatası: {err_msg}")
                    return False

                for place in resp_data.get("places", []):
                    name     = place.get("displayName", {}).get("text", "Unknown")
                    category = place.get("primaryTypeDisplayName", {}).get("text", "General")
                    rating   = place.get("rating", 0)
                    rev_cnt  = place.get("userRatingCount", 0)

                    price_map = {
                        "PRICE_LEVEL_INEXPENSIVE": 1,
                        "PRICE_LEVEL_MODERATE":    2,
                        "PRICE_LEVEL_EXPENSIVE":   3,
                        "PRICE_LEVEL_VERY_EXPENSIVE": 4,
                    }
                    price_int = price_map.get(place.get("priceLevel", ""), 1)

                    lat = place.get("location", {}).get("latitude")
                    lng = place.get("location", {}).get("longitude")

                    # Fotoğraf — sadece name sakla
                    photos = place.get("photos", [])
                    thumbnail = photos[0].get("name", "") if photos else ""

                    # Açılış saatleri
                    hours_obj  = place.get("currentOpeningHours", {})
                    open_now   = hours_obj.get("openNow", None)   # True / False / None
                    open_hours = hours_obj.get("weekdayDescriptions", [])

                    # İletişim
                    phone    = place.get("nationalPhoneNumber", "")
                    website  = place.get("websiteUri", "")
                    maps_uri = place.get("googleMapsUri", "")

                    # Kullanıcı yorumları (max 3)
                    raw_reviews = place.get("reviews", [])[:3]
                    reviews = [
                        {
                            "author": r.get("authorAttribution", {}).get("displayName", ""),
                            "rating": r.get("rating", 0),
                            "text":   r.get("text", {}).get("text", ""),
                            "time":   r.get("relativePublishTimeDescription", ""),
                        }
                        for r in raw_reviews
                        if r.get("text", {}).get("text", "")
                    ]

                    if lat and lng:
                        self.add_place(
                            name, category, rating, rev_cnt, price_int, lat, lng, thumbnail,
                            local=(0 < rev_cnt < 5000 and rating >= 4.6),
                            open_now=open_now,
                            opening_hours=open_hours,
                            phone=phone,
                            website=website,
                            maps_uri=maps_uri,
                            reviews=reviews,
                        )
                return True

            except Exception as e:
                logger.error(f"Google API ağ hatası (deneme {attempt + 1}/3): {e}")
                self.api_error = str(e)
                if attempt < 2:
                    time.sleep(1)
                else:
                    return False

    def calculate_final_score(self):
        if self.data.empty:
            return self.data
        self.data = self.data.drop_duplicates(subset=["name"])

        def score_logic(row):
            s = (row["google_rating"] * 12) + row["may_suitability"]
            cat = str(row.get("category", "")).lower()
            if any(k in cat for k in ["park", "garden", "outdoor", "nature", "beach"]):
                s += WEIGHTS["outdoor_bonus"]
            if any(k in cat for k in ["rooftop", "terrace", "rooftop bar"]):
                s += WEIGHTS["rooftop_bonus"]
            if 200 < row["review_count"] < 3000:
                s += WEIGHTS["hidden_gem_bonus"]
            if row["is_local_favorite"]:
                s += 10
            s -= row["price_level"] * WEIGHTS["price_penalty"]
            return round(s, 1)

        self.data["final_score"] = self.data.apply(score_logic, axis=1)
        return self.data.sort_values(by="final_score", ascending=False)
