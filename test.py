import requests
import json

def fetch_overpass():
    query = """
    [out:json];
    node(around:2000, 40.7306, -73.9352)["amenity"~"cafe|restaurant|bar|art_gallery|marketplace"];
    out 20;
    """
    url = "https://overpass-api.de/api/interpreter"
    response = requests.post(url, data={'data': query})
    
    if response.status_code == 200:
        data = response.json()
        print(len(data.get("elements", [])))
        if len(data.get("elements", [])) > 0:
            print(data["elements"][0])
    else:
        print("Failed", response.status_code)

fetch_overpass()
