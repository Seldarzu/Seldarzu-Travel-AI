import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import math
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

@app.post("/api/explore")
def explore_city(req: ExploreRequest):
    engine = AmericaTravelEngine()
    queries = get_search_queries(req.city)
    
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

