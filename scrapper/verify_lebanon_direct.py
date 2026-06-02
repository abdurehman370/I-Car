
import requests
import json
import logging
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000/api/scrape"

def test_scrape(make, model, year_min=None, year_max=None, region="Lebanon"):
    logger.info(f"Testing scrape for {make} {model} ({year_min}-{year_max}) in {region}")
    payload = {
        "region": region,
        "make": make,
        "model": model,
        "year_min": year_min,
        "year_max": year_max,
        "max_pages": 1
    }
    try:
        response = requests.post(BASE_URL, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        total = data.get("total_results", 0)
        logger.info(f"Success! Found {total} results for {make} {model}")
        
        # Breakdown by source
        sources = {}
        for item in data.get("data", []):
            src = item.get("source", "unknown")
            sources[src] = sources.get(src, 0) + 1
            
            # Verify year
            year = item.get("year")
            if year and str(year).isdigit():
                y = int(year)
                if year_min and y < year_min:
                    logger.warning(f"Year mismatch: Found {y} but min requested was {year_min}")
                if year_max and y > year_max:
                    logger.warning(f"Year mismatch: Found {y} but max requested was {year_max}")
            
            # Verify price
            price = item.get("price")
            if price is None:
                logger.warning(f"Price missing for {item.get('title')} from {src}")
            elif not isinstance(price, (int, float)):
                logger.warning(f"Price is non-numeric: {price} for {item.get('title')} from {src}")
        
        for src, count in sources.items():
            logger.info(f" - {src}: {count} listings")
            
        if total > 0:
            first = data["data"][0]
            logger.info(f"Sample: {first.get('title')} - Year: {first.get('year')} - Price: {first.get('price')} {first.get('currency', '')}")
            
        return data
    except Exception as e:
        logger.error(f"Failed to scrape {make} {model}: {e}")
        return None

if __name__ == "__main__":
    from app import LEBANON_CLIENTS
    
    test_cases = [
        {"make": "Honda", "model": "Civic", "year_min": 2024, "year_max": 2024},
        {"make": "Mercedes", "model": "E 300", "year_min": 2020, "year_max": 2024},
        {"make": "BMW", "model": "320", "year_min": 2018, "year_max": 2024}
    ]
    
    for case in test_cases:
        print(f"\n{'='*50}")
        print(f"TESTING: {case['make']} {case['model']} Year: {case.get('year_min')}-{case.get('year_max')}")
        print(f"{'='*50}")
        
        for name, ClientClass in LEBANON_CLIENTS:
            try:
                client = ClientClass()
                hits, nb_pages, total = client.get_listings(case, page=1)
                print(f"[{name}] Found {len(hits)} raw listings")
                
                # Apply the filtering logic similar to app.py
                make_query = str(case.get('make', '')).lower().strip()
                model_query = str(case.get('model', '')).lower().strip()
                year_min = case.get("year_min")
                year_max = case.get("year_max")
                
                filtered = []
                for hit in hits:
                    title = hit.get("title", "").lower()
                    
                    # Make filter
                    if make_query and make_query not in title:
                        if make_query == "mercedes" and "benz" in title:
                            pass
                        elif "mercedes" in make_query and "benz" in title:
                             pass
                        else:
                            continue
                            
                    # Model filter
                    match = False
                    if model_query:
                        if model_query in title:
                            match = True
                        else:
                            stop_words = {"benz", "model", "cars", "car"}
                            model_clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', model_query)
                            model_parts = [p for p in model_clean.split() if p not in stop_words]
                            
                            # Categorical matching for BMW/Mercedes
                            if make_query == "bmw" and any(p.isdigit() and len(p) >= 3 for p in model_parts):
                                 for p in model_parts:
                                     if p.isdigit() and len(p) >= 3:
                                         series_digit = p[0]
                                         if f"{series_digit}-series" in title or f"{series_digit} series" in title:
                                             match = True; break
                            
                            if not match and make_query == "mercedes":
                                 for p in model_parts:
                                     if len(p) == 1 and p.isalpha():
                                         if f"{p.lower()}-class" in title or f"{p.lower()} class" in title:
                                             match = True; break
                            
                            if not match:
                                for p in model_parts:
                                    if len(p) == 1:
                                        if re.search(rf"\b{p}\d+|{p}\s|\s{p}\s", title, re.I):
                                            match = True; break
                                    elif p in title:
                                        match = True; break
                    else:
                        match = True
                    
                    if not match:
                        continue
                        
                    # Year filter
                    year_val = hit.get("year")
                    if year_val and str(year_val).isdigit():
                        y = int(year_val)
                        if year_min is not None and y < int(year_min):
                            continue
                        if year_max is not None and y > int(year_max):
                            continue
                    
                    filtered.append(hit)
                
                print(f"[{name}] {len(filtered)} listings passed filtering")
                for f in filtered[:3]:
                    print(f"      - {f['title']} | Year: {f['year']} | Price: {f['price']} {f.get('currency', '')}")
                
            except Exception as e:
                print(f"[{name}] ERROR: {e}")
