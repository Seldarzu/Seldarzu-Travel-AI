import os
import time
import logging
import requests as req_lib
import concurrent.futures
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from data_engine import AmericaTravelEngine
from settings import GOOGLE_MAPS_API_KEY, get_search_queries

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("seldarzu")

# ── Rate Limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

# ── In-Memory Cache ───────────────────────────────────────────────────────────
_cache: dict = {}
CACHE_TTL = 3600  # 1 saat


def cache_get(key: str):
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"] < CACHE_TTL):
        logger.info(f"🗃️  Cache HIT: {key}")
        return entry["data"]
    return None


def cache_set(key: str, data):
    _cache[key] = {"data": data, "ts": time.time()}
    logger.info(f"💾  Cache SET: {key}")


# ── Startup / Shutdown ────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if not GOOGLE_MAPS_API_KEY:
        logger.critical("❌  GOOGLE_MAPS_API_KEY .env dosyasında tanımlı değil!")
        raise RuntimeError("GOOGLE_MAPS_API_KEY eksik — lütfen .env dosyasını kontrol edin.")
    logger.info("✅  Google Maps API Key doğrulandı.")
    logger.info(f"🌐  CORS origin'ler: {ALLOWED_ORIGINS}")
    logger.info("🚀  Seldarzu Travel AI backend başlatıldı.")
    yield
    # Shutdown
    logger.info("🛑  Backend kapatıldı.")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Seldarzu Travel AI", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — dev'de * bırak, prod'da .env'e ALLOWED_ORIGINS=https://siten.com yaz
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = ["*"] if _raw_origins == "*" else [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────────────────────────
class ExploreRequest(BaseModel):
    city: str

class ExploreRadiusRequest(BaseModel):
    city: str
    lat: float
    lng: float


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    """Render health check — servis uyanık mı kontrol eder."""
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/photo")
@limiter.limit("30/minute")
def get_photo(request: Request, name: str = Query(..., min_length=5, max_length=500)):
    """API key'i gizli tutarak Google foto proxy'si. Key header üzerinden gönderilir — URL loglarına düşmez."""
    url = f"https://places.googleapis.com/v1/{name}/media?maxHeightPx=800&skipHttpRedirect=true"
    try:
        resp = req_lib.get(url, stream=True, timeout=10, headers={"X-Goog-Api-Key": GOOGLE_MAPS_API_KEY})
        content_type = resp.headers.get("content-type", "image/jpeg")
        return StreamingResponse(resp.iter_content(chunk_size=8192), media_type=content_type)
    except Exception as e:
        logger.error(f"Fotoğraf proxy hatası: {e}")
        raise HTTPException(status_code=502, detail=f"Fotoğraf alınamadı: {str(e)}")


@app.post("/api/explore")
@limiter.limit("10/minute")
def explore_city(request: Request, req: ExploreRequest):
    city = req.city.strip()
    if len(city) < 2:
        raise HTTPException(status_code=400, detail="Şehir adı en az 2 karakter olmalıdır.")
    if len(city) > 100:
        raise HTTPException(status_code=400, detail="Şehir adı 100 karakterden uzun olamaz.")

    cache_key = f"city:{city.lower()}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    logger.info(f"🔍  Şehir taranıyor: {city}")
    engine = AmericaTravelEngine()
    queries = get_search_queries(city)

    with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(queries), 10)) as executor:
        futures = {executor.submit(engine.fetch_from_google, query, GOOGLE_MAPS_API_KEY): query for query in queries}
        for future in concurrent.futures.as_completed(futures):
            try:
                future.result()
            except Exception as e:
                logger.error(f"Thread hatası ({futures[future]}): {e}")

    final_df = engine.calculate_final_score()

    if final_df.empty:
        err_msg = getattr(engine, "api_error", None)
        if err_msg:
            logger.warning(f"Google API hatası ({city}): {err_msg}")
            return {"places": [], "error": err_msg}
        logger.warning(f"Sonuç bulunamadı: {city}")
        return {"places": []}

    final_df = final_df.fillna("")
    places = final_df.to_dict(orient="records")
    result = {"places": places}
    cache_set(cache_key, result)
    logger.info(f"✅  {city} için {len(places)} mekan bulundu.")
    return result


@app.post("/api/explore-radius")
@limiter.limit("20/minute")
def explore_radius(request: Request, req: ExploreRadiusRequest):
    if not (-90 <= req.lat <= 90) or not (-180 <= req.lng <= 180):
        raise HTTPException(status_code=400, detail="Geçersiz koordinat değerleri.")

    logger.info(f"📡  Radar taraması: lat={req.lat:.4f}, lng={req.lng:.4f}")
    engine = AmericaTravelEngine()

    queries = [
        "premium luxury shopping and boutiques",
        "best highly rated restaurants and fine dining",
        "aesthetic cafes and bakeries",
        "scenic parks and outdoor spaces",
        "museums and art galleries",
        "local hidden gem attractions",
    ]

    ll_param = f"{req.lat},{req.lng}"

    with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(queries), 10)) as executor:
        futures = {executor.submit(engine.fetch_from_google, query, GOOGLE_MAPS_API_KEY, ll_param): query for query in queries}
        for future in concurrent.futures.as_completed(futures):
            try:
                future.result()
            except Exception as e:
                logger.error(f"Radar thread hatası ({futures[future]}): {e}")

    final_df = engine.calculate_final_score()

    if final_df.empty:
        err_msg = getattr(engine, "api_error", None)
        if err_msg:
            logger.warning(f"Radar API hatası: {err_msg}")
            return {"places": [], "error": err_msg}
        return {"places": []}

    final_df = final_df.fillna("")
    places = final_df.to_dict(orient="records")
    logger.info(f"✅  Radar taraması tamamlandı: {len(places)} mekan bulundu.")
    return {"places": places}


# ── Dev Sunucu ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
