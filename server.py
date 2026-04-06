import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import math

from data_engine import AmericaTravelEngine
from settings import SERP_API_KEY, get_search_queries

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
    
    for query in queries:
        engine.fetch_from_google(query, SERP_API_KEY)
        
    final_df = engine.calculate_final_score()
    
    if final_df.empty:
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
    queries = get_search_queries(req.city)
    
    # 15z roughly covers a local neighborhood area in Google Maps radius
    ll_param = f"@{req.lat},{req.lng},15z"
    
    for query in queries:
        engine.fetch_from_google(query, SERP_API_KEY, ll=ll_param)
        
    final_df = engine.calculate_final_score()
    
    if final_df.empty:
        return {"places": []}
        
    final_df = final_df.fillna("")
    places = final_df.to_dict(orient="records")
    
    return {"places": places}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port)

