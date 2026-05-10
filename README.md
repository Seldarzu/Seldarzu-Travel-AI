# Seldarzu Travel AI 🌍✈️

[English](#english) | [Türkçe](#türkçe)

---

## English

### 🌟 Overview
**Seldarzu Travel AI** is an AI-powered, highly interactive travel assistant and map exploration web application. It transforms the way you discover new cities and hidden gems by combining real-time geographic data with a custom, intelligent scoring algorithm. Whether you are looking for premium luxury shopping, highly-rated fine dining, or aesthetic cafes, Seldarzu Travel AI curates the perfect recommendations for you.

### ✨ Key Features
- **3D Globe Experience:** Starts with a breathtaking, interactive 3D spinning globe that transitions seamlessly into a 2D advanced map interface.
- **Deep Scan (Radius Search):** Utilize real-time geolocation to scan your immediate surroundings for the best spots, enforcing strict geographic boundaries for accurate results.
- **Smart Data Engine:** Employs a custom "Advanced Scoring Algorithm" that factors in Google Maps ratings, review volumes, price penalties, and "hidden gem" bonuses to filter out tourist traps and highlight authentic local favorites.
- **Premium Glassmorphism UI:** A sleek, dark-themed, highly responsive user interface designed for both desktop and modern mobile devices (iPhone 15+ optimized).
- **Asynchronous Data Fetching:** Fast and responsive data loading using threaded background tasks to fetch information simultaneously.

### 💻 Technology Stack
#### Frontend
- **React 19 & Vite:** Lightning-fast build tool and modern React components.
- **React Globe.gl:** For rendering the interactive 3D WebGL globe.
- **MapLibre GL & React Map GL:** High-performance, customizable vector maps.
- **Lucide React:** Beautiful and consistent iconography.
- **TailwindCSS / Vanilla CSS:** Modern styling focusing on dynamic animations and glassmorphism.

#### Backend
- **FastAPI (Python):** High-performance, asynchronous RESTful API framework.
- **Pandas:** Powerful data manipulation for the core Travel Engine scoring and deduplication.
- **Google Maps Places API (New):** Integrated for fetching authentic, up-to-date location data, photos, and ratings.
- **Concurrent Futures (Threading):** Optimized API requests to Google to minimize latency and improve user experience.

### 🚀 How to Run
1. **Backend:**
   ```bash
   python server.py
   # Runs on http://localhost:8000
   ```
2. **Frontend:**
   ```bash
   cd web_app
   npm install
   npm run dev
   # Runs on http://localhost:5173
   ```

---

## Türkçe

### 🌟 Genel Bakış
**Seldarzu Travel AI**, yapay zeka destekli, etkileşimli bir seyahat asistanı ve harita keşif web uygulamasıdır. Gerçek zamanlı coğrafi verileri, özel ve akıllı bir puanlama algoritmasıyla birleştirerek yeni şehirleri ve gizli kalmış mekanları (hidden gems) keşfetme şeklinizi dönüştürür. İster lüks alışveriş noktaları, ister yüksek puanlı restoranlar veya estetik kafeler arıyor olun, Seldarzu Travel AI sizin için en kusursuz önerileri derler.

### ✨ Temel Özellikler
- **3D Küre Deneyimi:** Kusursuz bir şekilde 2D gelişmiş harita arayüzüne geçiş yapan, nefes kesici, etkileşimli 3 boyutlu dönen bir dünya haritası ile başlar.
- **Derin Tarama (Yarıçap Araması):** En iyi noktaları bulmak için bulunduğunuz çevreyi tarayan ve kesin sonuçlar için katı coğrafi sınırlar uygulayan gerçek zamanlı konum taraması.
- **Akıllı Veri Motoru (Data Engine):** Google Haritalar puanlarını, yorum sayılarını, fiyat cezalarını ve "gizli cevher" bonuslarını hesaba katarak turistik tuzakları filtreleyen ve yerel favorileri öne çıkaran özel bir algoritma kullanır.
- **Premium Glassmorphism Arayüz:** Hem masaüstü hem de modern mobil cihazlar (iPhone 15+ optimize) için tasarlanmış şık, karanlık temalı, son derece duyarlı (responsive) bir kullanıcı arayüzü.
- **Asenkron Veri Çekimi:** Eşzamanlı arka plan görevleri (threading) kullanılarak hızlı ve kesintisiz veri yüklemesi.

### 💻 Kullanılan Teknolojiler
#### Frontend
- **React 19 & Vite:** Işık hızında derleme aracı ve modern React bileşenleri.
- **React Globe.gl:** Etkileşimli 3D WebGL küresini oluşturmak için.
- **MapLibre GL & React Map GL:** Yüksek performanslı, özelleştirilebilir vektör haritaları.
- **Lucide React:** Modern ve tutarlı ikon setleri.
- **TailwindCSS / Vanilla CSS:** Dinamik animasyonlara ve "glassmorphism" (cam efekti) konseptine odaklanan modern tasarımlar.

#### Backend
- **FastAPI (Python):** Yüksek performanslı, asenkron RESTful API altyapısı.
- **Pandas:** Çekirdek Seyahat Motoru puanlaması ve veri manipülasyonu için kullanıldı.
- **Google Haritalar Places API (Yeni):** Orijinal, güncel konum verileri, fotoğraflar ve puanları çekmek için entegre edildi.
- **Concurrent Futures (Threading):** Gecikmeyi en aza indirmek ve kullanıcı deneyimini iyileştirmek adına Google API isteklerini optimize etmek için kullanıldı.

### 🚀 Nasıl Çalıştırılır
1. **Backend:**
   ```bash
   python server.py
   # http://localhost:8000 portunda çalışır
   ```
2. **Frontend:**
   ```bash
   cd web_app
   npm install
   npm run dev
   # http://localhost:5173 portunda çalışır
   ```
