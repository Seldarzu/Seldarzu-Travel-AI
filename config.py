# config.py

# --- API AYARLARI ---
# Kopyaladığın API Key'i buradaki tırnakların içine yapıştır
SERP_API_KEY = "0a47a8dcafd534f47c5a8f14edc4f6e852faea7554f84b27170d7935d5f87abd" 
# config.py

# --- SEYAHAT DETAYLARI ---
CITY = "New York"
TRAVEL_MONTH = "May"

# --- GELİŞMİŞ ARAMA SORGULARI ---
# Veri madenciliği motoru bu kategorilerde derin tarama yapacak
SEARCH_QUERIES = [
    f"best botanical gardens and parks in {CITY}",
    f"hidden gems and secret spots in {CITY}",
    f"locally loved coffee shops and bakeries {CITY}",
    f"best rooftop bars and terraces {CITY}",
    f"authentic jazz clubs and speakeasies {CITY}",
    f"scenic waterfront views {CITY}",
    f"flea markets and vintage stores {CITY}"
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