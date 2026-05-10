# config.py
import os
from dotenv import load_dotenv

load_dotenv()

# --- API AYARLARI ---
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "") 

# --- SEYAHAT DETAYLARI ---
TRAVEL_MONTH = "May"

# --- GELİŞMİŞ ARAMA SORGULARI ---
# Veri madenciliği motoru bu kategorilerde derin tarama yapacak
def get_search_queries(city: str):
    city_lower = city.lower()
    
    if "new york" in city_lower or "ny" in city_lower or "nyc" in city_lower:
        return [
            # NYC Ultra-Premium Shopping & Core Experiences
            "Exclusive 5th Avenue designer boutiques and flagship stores in New York",
            "Hidden vintage clothing stores and luxury consignment in SoHo New York",
            "Premium concept stores and high-end showrooms in Manhattan",
            "Luxury jewelry and watch boutiques in New York City",
            "Famous NYC department stores and iconic shopping spots",
            "Locally loved coffee shops and aesthetic bakeries in New York",
            "Hidden speakeasies and underground jazz clubs in Brooklyn",
            "Premium omakase and Michelin star dining in NYC"
        ]
    elif "delaware" in city_lower or "de" in city_lower or "wilmington" in city_lower:
        return [
            # Delaware Tax-Free Shopping & Coastal Luxury
            "Premium tax-free outlet malls and designer outlets in Delaware",
            "Exclusive designer shopping centers and upscale fashion in Wilmington DE",
            "Local artisan crafts and coastal boutiques in Rehoboth Beach",
            "High-end footwear and boutique fashion retailers in Delaware",
            "Luxury homeware and unique concept boutiques in Delaware",
            "Locally famous crab houses and premium seafood spots in Delaware",
            "Scenic waterfront cafes and oceanview dining in Rehoboth Beach",
            "Historic Wilmington estates and picturesque botanical gardens"
        ]
    else:
        # Fallback for other searches
        return [
            f"luxury fashion boutiques and premium shopping in {city}",
            f"famous outlet malls and designer discount stores in {city}",
            f"unique concept stores and artisan boutiques in {city}",
            f"best hidden gem restaurants and cafes in {city}",
            f"scenic parks and beautiful outdoor spaces in {city}"
        ]

# --- PUANLAMA PARAMETRELERİ (Ağırlıklar) ---
# Mayıs ayı için açık hava ve yerellik öncelikli
WEIGHTS = {
    'outdoor_bonus': 25,    # Park/Bahçe bonusu
    'rooftop_bonus': 20,    # Teras bonusu
    'hidden_gem_bonus': 15, # Az bilinen ama yüksek puanlı yerler
    'price_penalty': 8      # Her fiyat seviyesi için puan düşüşü ($ - $$$$)
}

# --- KATEGORİ BAZLI MAYIS BONUSLARI ---
MAY_BONUS = {
    'Park': 20,
    'Garden': 20,
    'Rooftop': 15,
    'Terrace': 15,
    'Outdoor': 12,
    'Waterfront': 10,
    'Market': 5
}