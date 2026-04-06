# config.py
import os
from dotenv import load_dotenv

load_dotenv()

# --- API AYARLARI ---
SERP_API_KEY = os.environ.get("SERP_API_KEY", "") 

# --- SEYAHAT DETAYLARI ---
TRAVEL_MONTH = "May"

# --- GELİŞMİŞ ARAMA SORGULARI ---
# Veri madenciliği motoru bu kategorilerde derin tarama yapacak
def get_search_queries(city: str):
    return [
        # Mevcut Premium Seyahat Kategorileri
        f"best botanical gardens and parks in {city}",
        f"hidden gems and secret spots in {city}",
        f"locally loved coffee shops and bakeries in {city}",
        f"best rooftop bars and terraces in {city}",
        f"authentic jazz clubs and speakeasies in {city}",
        f"scenic waterfront views in {city}",
        
        # Eklenen Detaylı Alışveriş Kategorileri (Premium odaklı ve yerel)
        f"luxury fashion boutiques and high-end shopping in {city}",
        f"famous street markets and local artisan crafts in {city}",
        f"exclusive designer districts and premium malls in {city}",
        f"vintage clothing stores and thrift shops in {city}",
        f"unique concept stores and concept boutiques in {city}"
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