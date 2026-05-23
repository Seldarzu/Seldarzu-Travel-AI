# config.py
import os
from dotenv import load_dotenv

load_dotenv()

# --- API AYARLARI ---
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")

# --- PUANLAMA PARAMETRELERİ ---
WEIGHTS = {
    'outdoor_bonus':    25,
    'rooftop_bonus':    20,
    'hidden_gem_bonus': 15,
    'price_penalty':    8,
}

# --- KATEGORİ BAZLI MEVSİM BONUSLARI ---
MAY_BONUS = {
    'Park': 20, 'Garden': 20, 'Rooftop': 15,
    'Terrace': 15, 'Outdoor': 12, 'Waterfront': 10, 'Market': 5,
}

# --- ŞEHİR BAZLI ARAMA SORGULARI ---
_CITY_QUERIES: dict[str, list[str]] = {

    "new york": [
        "Exclusive 5th Avenue designer boutiques and flagship stores in New York",
        "Hidden vintage clothing stores and luxury consignment in SoHo New York",
        "Premium concept stores and high-end showrooms in Manhattan",
        "Luxury jewelry and watch boutiques in New York City",
        "Locally loved coffee shops and aesthetic cafes in New York",
        "Hidden speakeasies and underground jazz clubs in Brooklyn",
        "Premium omakase and Michelin star dining in NYC",
        "Scenic rooftop bars and skyline views in Manhattan",
    ],

    "los angeles": [
        "Luxury designer boutiques and concept stores in Beverly Hills and West Hollywood",
        "Trendy cafes and aesthetic coffee shops in Silver Lake and Los Feliz",
        "Best rooftop bars and outdoor dining with views in Los Angeles",
        "Hidden gem restaurants and celebrity chef spots in LA",
        "Premium vintage stores and streetwear boutiques in Melrose",
        "Scenic parks beaches and outdoor spots in Los Angeles",
        "Iconic art galleries and contemporary museums in LA",
        "Upscale sushi omakase and fine dining in Los Angeles",
    ],

    "miami": [
        "Luxury boutiques and designer stores in Wynwood and Design District Miami",
        "Best beach clubs and oceanfront bars in Miami Beach",
        "Trendy rooftop bars and cocktail lounges in Brickell Miami",
        "Hidden gem restaurants and seafood spots in Miami",
        "Premium spas and wellness centers in South Beach",
        "Art galleries and cultural spaces in Wynwood Miami",
        "Iconic outdoor markets and artisan spots in Miami",
        "Best brunch spots and aesthetic cafes in Miami",
    ],

    "chicago": [
        "Luxury flagship stores and designer boutiques on Magnificent Mile Chicago",
        "Hidden gem restaurants and deep dish pizza spots in Chicago",
        "Best rooftop bars with skyline views in Chicago",
        "Premium steakhouse and fine dining in River North Chicago",
        "Trendy cafes and specialty coffee shops in Wicker Park",
        "Scenic waterfront parks and outdoor spaces along Lake Michigan",
        "Best jazz clubs and live music venues in Chicago",
        "Unique concept stores and vintage shops in Lincoln Park",
    ],

    "san francisco": [
        "Luxury boutiques and designer stores on Union Square San Francisco",
        "Trendy cafes and specialty coffee in the Mission and Hayes Valley",
        "Best rooftop bars with bay views in San Francisco",
        "Hidden gem restaurants and Michelin star dining in SF",
        "Premium wine bars and craft cocktail lounges in SoMa",
        "Scenic parks and outdoor spaces in San Francisco",
        "Unique concept stores and local artisan shops in Haight-Ashbury",
        "Best brunch spots and aesthetic bakeries in San Francisco",
    ],

    "las vegas": [
        "Luxury casino hotel bars and premium lounges on the Las Vegas Strip",
        "Best fine dining and celebrity chef restaurants in Las Vegas",
        "High-end shopping malls and designer boutiques in Las Vegas",
        "Hidden gem restaurants and local favorites off the Strip",
        "Best rooftop pools and outdoor bars in Las Vegas",
        "Premium steakhouse and omakase dining in Las Vegas",
        "Exclusive nightclubs and entertainment venues in Las Vegas",
        "Scenic desert parks and outdoor escapes near Las Vegas",
    ],

    "boston": [
        "Luxury boutiques and high-end shopping on Newbury Street Boston",
        "Hidden gem restaurants and seafood spots in the North End Boston",
        "Best craft beer bars and historic pubs in Boston",
        "Trendy cafes and specialty coffee shops in Cambridge",
        "Premium fine dining and Michelin-recommended restaurants in Boston",
        "Scenic parks and waterfront spaces along the Charles River",
        "Best rooftop bars and cocktail lounges in Back Bay",
        "Unique vintage stores and bookshops in Boston",
    ],

    "seattle": [
        "Luxury boutiques and concept stores in Capitol Hill and Belltown Seattle",
        "Best specialty coffee shops and iconic cafes in Seattle",
        "Hidden gem restaurants and Pacific Northwest cuisine in Seattle",
        "Premium seafood spots and waterfront dining in Pike Place area",
        "Best craft breweries and cocktail bars in Seattle",
        "Scenic parks and waterfront spaces in Seattle",
        "Trendy rooftop bars with mountain and water views in Seattle",
        "Unique vintage and artisan shops in Fremont Seattle",
    ],

    "nashville": [
        "Best live music venues and honky-tonks on Broadway Nashville",
        "Hidden gem restaurants and hot chicken spots in Nashville",
        "Trendy cafes and aesthetic brunch spots in East Nashville",
        "Premium cocktail bars and speakeasies in Nashville",
        "Luxury boutiques and local fashion stores in The Gulch Nashville",
        "Best rooftop bars with skyline views in Nashville",
        "Scenic parks and outdoor spaces in Nashville",
        "Unique concept stores and artisan shops in 12 South Nashville",
    ],

    "austin": [
        "Best live music bars and iconic venues on 6th Street Austin",
        "Hidden gem restaurants and BBQ spots in Austin",
        "Trendy cafes and specialty coffee shops on South Congress Austin",
        "Premium cocktail bars and craft breweries in Austin",
        "Luxury boutiques and local fashion in South Congress",
        "Scenic parks lakes and outdoor spaces in Austin",
        "Best rooftop bars and outdoor patios in Austin",
        "Unique vintage stores and artisan shops in East Austin",
    ],

    "new orleans": [
        "Best jazz clubs and live music bars in the French Quarter New Orleans",
        "Hidden gem Creole and Cajun restaurants in New Orleans",
        "Premium cocktail bars and absinthe lounges in New Orleans",
        "Luxury boutiques and antique stores on Magazine Street",
        "Iconic outdoor markets and artisan spots in New Orleans",
        "Best brunch spots and beignet cafes in New Orleans",
        "Scenic parks and historic outdoor spaces in New Orleans",
        "Unique concept bars and speakeasies in the Marigny New Orleans",
    ],

    "delaware": [
        "Premium tax-free outlet malls and designer outlets in Delaware",
        "Exclusive designer shopping centers and upscale fashion in Wilmington DE",
        "Local artisan crafts and coastal boutiques in Rehoboth Beach",
        "High-end footwear and boutique fashion retailers in Delaware",
        "Locally famous crab houses and premium seafood spots in Delaware",
        "Scenic waterfront cafes and oceanview dining in Rehoboth Beach",
        "Historic Wilmington estates and picturesque botanical gardens",
        "Best hidden gem restaurants in Delaware",
    ],
}

# Arama için normalize et: büyük/küçük harf + kısmi eşleşme
def get_search_queries(city: str) -> list[str]:
    city_lower = city.strip().lower()

    # Tam veya kısmi eşleşme ara
    for key, queries in _CITY_QUERIES.items():
        if key in city_lower or city_lower in key:
            return queries

    # Hiçbiri eşleşmedi → genel sorgular (5 adet)
    return [
        f"luxury fashion boutiques and premium shopping in {city}",
        f"best hidden gem restaurants and local favorites in {city}",
        f"trendy cafes specialty coffee and aesthetic spots in {city}",
        f"scenic parks outdoor spaces and waterfront in {city}",
        f"best rooftop bars cocktail lounges and nightlife in {city}",
    ]
