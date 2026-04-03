import streamlit as st
import pandas as pd
import folium
from streamlit_folium import st_folium
from math import radians, cos, sin, asin, sqrt

# --- SAYFA AYARLARI ---
st.set_page_config(page_title="Seldarzu Travel AI", layout="wide")
st.title("🗽 New York - Mayıs Ayı Akıllı Rehber")

# --- MESAFE HESAPLAMA (Haversine Formula) ---
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371 # Dünya yarıçapı (km)
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dlat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)**2
    return round(2 * R * asin(sqrt(a)), 2)

# --- VERİ YÜKLEME ---
@st.cache_data
def load_data():
    return pd.read_csv("arkadasim_icin_amerika_listesi.csv")

df = load_data()

# --- SIDEBAR (Filtreler) ---
st.sidebar.header("🔍 Filtreleme ve Kontrol")
sync_btn = st.sidebar.button("🔄 Verileri Senkronize Et")
selected_cat = st.sidebar.multiselect("Kategori Seç", df['category'].unique(), default=df['category'].unique())

# --- CANLI KONUM SİMÜLASYONU ---
# (Web tarayıcı GPS'i için özel eklentiler gerekir, şimdilik manuel giriş yapalım)
st.sidebar.subheader("📍 Mevcut Konumun")
my_lat = st.sidebar.number_input("Enlem (Latitude)", value=40.7580) # Örn: Times Square
my_lon = st.sidebar.number_input("Boylam (Longitude)", value=-73.9855)

# --- ANALİZ: SANA EN YAKIN YERLER ---
df['distance_km'] = df.apply(lambda x: calculate_distance(my_lat, my_lon, x['latitude'], x['longitude']), axis=1)
nearby_df = df[df['category'].isin(selected_cat)].sort_values(by='distance_km').head(10)

# --- EKRAN DÜZENİ ---
col1, col2 = st.columns([2, 1])

with col1:
    st.subheader("📍 Yakınındaki Mekanlar (Harita)")
    m = folium.Map(location=[my_lat, my_lon], zoom_start=14, tiles='CartoDB Positron')
    
    # Kendi konumunu işaretle
    folium.Marker([my_lat, my_lon], popup="Sen Buradasın!", icon=folium.Icon(color='red', icon='user', prefix='fa')).add_to(m)
    
    # Mekanları ekle
    for idx, row in nearby_df.iterrows():
        folium.Marker(
            [row['latitude'], row['longitude']],
            popup=f"{row['name']} ({row['distance_km']} km)",
            icon=folium.Icon(color='green', icon='leaf')
        ).add_to(m)
    
    st_folium(m, width=800, height=500)

with col2:
    st.subheader("📋 En Yakın 10 Tavsiye")
    st.dataframe(nearby_df[['name', 'distance_km', 'final_score']], use_container_width=True)

if sync_btn:
    st.success("Veriler Google Maps ile senkronize ediliyor... (Yeni veriler çekiliyor)")
    # Burada main.py'daki fetch fonksiyonlarını çağırabilirsin# app.py içindeki "if sync_btn:" kısmını güncelle:
if sync_btn:
    with st.spinner("Google Maps'ten güncel veriler çekiliyor..."):
        from data_engine import AmericaTravelEngine
        from config import SERP_API_KEY, SEARCH_QUERIES
        
        new_engine = AmericaTravelEngine()
        for query in SEARCH_QUERIES:
            new_engine.fetch_from_google(query, SERP_API_KEY)
        
        new_engine.calculate_final_score().to_csv("arkadasim_icin_amerika_listesi.csv", index=False)
        st.success("Veriler başarıyla güncellendi! Lütfen sayfayı yenile.")
        st.balloons() # Kutlama efekti!