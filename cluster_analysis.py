import pandas as pd
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt

def cluster_places(csv_file):
    df = pd.read_csv(csv_file)
    
    # Sadece koordinatları kullanarak 5 farklı bölge (küme) oluşturalım
    X = df[['latitude', 'longitude']]
    kmeans = KMeans(n_clusters=5, random_state=42).fit(X)
    
    df['cluster_id'] = kmeans.labels_
    
    # Her küme için en iyi mekanı bulalım
    print("\n📍 BÖLGELERE GÖRE ROTA ÖNERİLERİ:")
    for i in range(5):
        cluster_data = df[df['cluster_id'] == i]
        best_place = cluster_data.sort_values(by='final_score', ascending=False).iloc[0]
        print(f"Bölge {i+1} Favorisi: {best_place['name']} ({best_place['category']})")
    
    df.to_csv("rotali_amerika_listesi.csv", index=False)
    print("\n✅ Mekanlar bölgelere ayrıldı ve 'rotali_amerika_listesi.csv' kaydedildi.")

cluster_places('arkadasim_icin_amerika_listesi.csv')
