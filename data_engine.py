# data_engine.py - FINAL VERSION
import pandas as pd
import requests
from config import MAY_BONUS, WEIGHTS

class AmericaTravelEngine:
    def __init__(self):
        self.columns = [
            'name', 'category', 'google_rating', 'review_count', 
            'price_level', 'is_local_favorite', 'may_suitability',
            'latitude', 'longitude'
        ]
        self.data = pd.DataFrame(columns=self.columns)

    def add_place(self, name, cat, rating, reviews, price, lat, lng, local=False):
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
            'latitude': lat, 'longitude': lng
        }
        self.data = pd.concat([self.data, pd.DataFrame([new_row])], ignore_index=True)

    def fetch_from_google(self, query, api_key):
        url = "https://serpapi.com/search.json"
        params = {"engine": "google_maps", "q": query, "type": "search", "api_key": api_key}
        try:
            response = requests.get(url, params=params)
            results = response.json().get("local_results", [])
            for place in results:
                gps = place.get("gps_coordinates", {})
                lat, lng = gps.get("latitude"), gps.get("longitude")
                if lat and lng:
                    self.add_place(
                        place.get("title"), place.get("type", "General"),
                        place.get("rating", 0), place.get("reviews", 0),
                        len(place.get("price", "$")), lat, lng,
                        local=(place.get("reviews", 0) < 5000 and place.get("rating", 0) >= 4.6)
                    )
            return True
        except Exception as e:
            print(f"Backend Hatası: {e}")
            return False

    def calculate_final_score(self):
        if self.data.empty: return self.data
        self.data = self.data.drop_duplicates(subset=['name'])
        
        # Gelişmiş Puanlama Algoritması
        def score_logic(row):
            s = (row['google_rating'] * 12) + row['may_suitability']
            if 200 < row['review_count'] < 3000: s += WEIGHTS['hidden_gem_bonus']
            if row['is_local_favorite']: s += 10
            s -= (row['price_level'] * WEIGHTS['price_penalty'])
            return round(s, 1)

        self.data['final_score'] = self.data.apply(score_logic, axis=1)
        return self.data.sort_values(by='final_score', ascending=False)