# main.py
from data_engine import AmericaTravelEngine
from settings import SERP_API_KEY, SEARCH_QUERIES

def run_travel_analytics():
    """
    Seldarzu Travel AI - Backend Runner
    Bu fonksiyon Google verilerini çeker, analiz eder ve CSV olarak kaydeder.
    """
    # 1. Veri Madenciliği Motorunu Başlat
    engine = AmericaTravelEngine()

    print("🚀 Seldarzu Travel AI: Veri madenciliği motoru başlatıldı...")
    print(f"🔎 Hedef Şehir: New York | Tarama Yapılacak Kategori Sayısı: {len(SEARCH_QUERIES)}")
    print("-" * 50)

    # 2. Otomatik Veri Toplama (Scraping & API Fetching)
    for query in SEARCH_QUERIES:
        try:
            # Her bir kategori için Google Maps üzerinde derin tarama yapar
            engine.fetch_from_google(query, SERP_API_KEY)
        except Exception as e:
            print(f"❌ '{query}' araması sırasında teknik bir hata oluştu: {e}")

    # 3. Veri Analizi ve Akıllı Puanlama (Mayıs Skoru + Yerellik + Koordinat)
    print("\n📊 Veriler analiz ediliyor ve Mayıs ayına göre optimize ediliyor...")
    final_list = engine.calculate_final_score()

    # 4. Veri Setini Kaydetme (Backend Çıktısı)
    if not final_list.empty:
        filename = "arkadasim_icin_amerika_listesi.csv"
        
        # utf-8-sig: Excel ve diğer araçlarda Türkçe karakter sorunu yaşanmaması için
        final_list.to_csv(filename, index=False, encoding='utf-8-sig')
        
        print("\n" + "="*50)
        print("✅ ANALİZ BAŞARIYLA TAMAMLANDI")
        print(f"📊 Toplam {len(final_list)} benzersiz mekan koordinatlarıyla işlendi.")
        print("="*50)
        
        # Terminalde Hızlı Önizleme (Top 10)
        print("\n🌟 ARKADAŞIN İÇİN EN YÜKSEK PUANLI İLK 10 ÖNERİ:")
        preview_cols = ['name', 'category', 'final_score', 'google_rating']
        print(final_list[preview_cols].head(10).to_string(index=False))
        
        print(f"\n📁 Veri seti '{filename}' adıyla klasöre kaydedildi.")
        print("👉 Sırada: Tasarım (Frontend) aşamasına geçebiliriz.")
    else:
        print("\n⚠️ KRİTİK UYARI: Hiç veri toplanamadı.")
        print("Lütfen config.py içindeki SERP_API_KEY'i ve internet bağlantını kontrol et.")

if __name__ == "__main__":
    run_travel_analytics()
    