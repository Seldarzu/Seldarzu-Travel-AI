import folium
from folium.plugins import HeatMap
import pandas as pd

def create_advanced_map(csv_file):
    df = pd.read_csv(csv_file).dropna(subset=['latitude', 'longitude'])
    
    # Haritayı New York merkezli başlat
    m = folium.Map(location=[40.7128, -74.0060], zoom_start=12, tiles='cartodbpositron')
    
    # 1. Isı Haritası Katmanı (Heatmap)
    # Puanı yüksek olan yerler daha "sıcak" görünecek
    heat_data = [[row['latitude'], row['longitude'], row['final_score']] for idx, row in df.iterrows()]
    HeatMap(heat_data, radius=15, blur=10).add_to(m)
    
    # 2. İşaretleyici Katmanı (Markers)
    for idx, row in df.iterrows():
        # Sadece en iyi yerlere yıldız koyalım (Skor > 75)
        if row['final_score'] > 75:
            popup_html = f"""
            <div style='font-family: Arial; width: 200px;'>
                <h4>{row['name']}</h4>
                <p><b>Kategori:</b> {row['category']}</p>
                <p><b>Mayıs Skoru:</b> {row['final_score']}</p>
                <a href='https://www.google.com/maps/search/?api=1&query={row['latitude']},{row['longitude']}' target='_blank'>Yol Tarifi Al</a>
            </div>
            """
            folium.Marker(
                location=[row['latitude'], row['longitude']],
                popup=folium.Popup(popup_html, max_width=250),
                icon=folium.Icon(color='green', icon='leaf', prefix='fa')
            ).add_to(m)

    m.save("arkadasim_icin_heatmap.html")
    print("🔥 Isı haritası ve işaretleyiciler hazır! 'arkadasim_icin_heatmap.html' dosyasını tarayıcıda aç.")

# Çalıştır
create_advanced_map('arkadasim_icin_amerika_listesi.csv')