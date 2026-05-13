import json
import requests as req_lib
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import concurrent.futures

from data_engine import AmericaTravelEngine
from settings import GOOGLE_MAPS_API_KEY, get_search_queries

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExploreRequest(BaseModel):
    city: str

@app.get("/api/photo")
def get_photo(name: str = Query(..., min_length=5, max_length=500)):
    """API key'i gizli tutarak Google foto proxy'si"""
    url = f"https://places.googleapis.com/v1/{name}/media?maxHeightPx=800&key={GOOGLE_MAPS_API_KEY}"
    try:
        resp = req_lib.get(url, stream=True, timeout=10)
        content_type = resp.headers.get("content-type", "image/jpeg")
        return StreamingResponse(resp.iter_content(chunk_size=8192), media_type=content_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Fotoğraf alınamadı: {str(e)}")


@app.post("/api/explore")
def explore_city(req: ExploreRequest):
    city = req.city.strip()
    if len(city) < 2:
        raise HTTPException(status_code=400, detail="Şehir adı en az 2 karakter olmalıdır.")
    if len(city) > 100:
        raise HTTPException(status_code=400, detail="Şehir adı 100 karakterden uzun olamaz.")
    engine = AmericaTravelEngine()
    queries = get_search_queries(city)
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(queries), 10)) as executor:
        futures = [executor.submit(engine.fetch_from_google, query, GOOGLE_MAPS_API_KEY) for query in queries]
        concurrent.futures.wait(futures)
        
    final_df = engine.calculate_final_score()
    
    if final_df.empty:
        err_msg = getattr(engine, 'api_error', None)
        if err_msg:
            return {"places": [], "error": err_msg}
        return {"places": []}
        
    final_df = final_df.fillna("")
    places = final_df.to_dict(orient="records")
    return {"places": places}

class ExploreRadiusRequest(BaseModel):
    city: str
    lat: float
    lng: float

@app.post("/api/explore-radius")
def explore_radius(req: ExploreRadiusRequest):
    if not (-90 <= req.lat <= 90) or not (-180 <= req.lng <= 180):
        raise HTTPException(status_code=400, detail="Geçersiz koordinat değerleri.")
    engine = AmericaTravelEngine()
    
    # Use generic queries since we rely on EXACT lat/lng location bias
    queries = [
        "premium luxury shopping and boutiques",
        "best highly rated restaurants and fine dining",
        "aesthetic cafes and bakeries",
        "scenic parks and outdoor spaces",
        "museums and art galleries",
        "local hidden gem attractions"
    ]
    
    # Pass raw lat,lng string for Google Places Location bias
    ll_param = f"{req.lat},{req.lng}"
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(queries), 10)) as executor:
        futures = [executor.submit(engine.fetch_from_google, query, GOOGLE_MAPS_API_KEY, ll_param) for query in queries]
        concurrent.futures.wait(futures)
        
    final_df = engine.calculate_final_score()
    
    if final_df.empty:
        err_msg = getattr(engine, 'api_error', None)
        if err_msg:
            return {"places": [], "error": err_msg}
        return {"places": []}
        
    final_df = final_df.fillna("")
    places = final_df.to_dict(orient="records")
    
    return {"places": places}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port)

