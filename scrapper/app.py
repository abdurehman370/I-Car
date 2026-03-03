from fastapi import FastAPI, HTTPException, Query, Security, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from starlette.status import HTTP_403_FORBIDDEN
from pydantic import BaseModel
from typing import Optional, List
import logging
import os
from dotenv import load_dotenv
load_dotenv()
import re
import json
import asyncio

from dubizzle_client import DubizzleClient
from dubicars_client import DubicarsClient
from yallamotor_client import YallaMotorClient
from hatla2ee_client import Hatla2eeClient
from carswitch_client import CarSwitchClient
from carabiacars_client import CarAbiaClient
from olx_lb_client import OlxLbClient
from autotrader_lb_client import AutotraderLbClient
from wheelers_lb_client import WheelersLbClient
from europe_client import EuropeClient
from filters import QueryBuilder
from exporter import Exporter
from evaluator import PriceEvaluator
from config import PRIMARY_INDEX, DEFAULT_HITS_PER_PAGE, REGION_CONFIG

# Core Modules
from core.normalization import normalize_make, normalize_model, normalize_variant
from core.matching import match_model, match_variant
from core.deduplication import deduplicate_listings
from core.analytics import compute_price_analytics
from core.cache import cache
from core.network import get_request_session

# Load Taxonomy
TAXONOMY_PATH = "data/car_taxonomy.json"
try:
    with open(TAXONOMY_PATH, "r") as f:
        CAR_TAXONOMY = json.load(f)
except Exception as e:
    logger.error(f"Failed to load taxonomy: {e}")
    CAR_TAXONOMY = {}

# Lebanon: aggregate from OLX, Autotrader, and Wheelers.me
LEBANON_CLIENTS = [
    ("OLX", OlxLbClient),
    ("Autotrader", AutotraderLbClient),
    ("Wheelers", WheelersLbClient),
]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Dubizzle Scraper API")

# API Key Security
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def get_api_key(api_key: str = Security(api_key_header)):
    # Default key for development, overridden by environment variable in production
    expected_key = os.environ.get("SCRAPER_API_KEY", "default_dev_key")
    # Also strip quotes just in case python-dotenv included them
    expected_key = expected_key.strip('"').strip("'")
    if api_key == expected_key:
        return api_key
    print(f"AUTH FAILED - received: '{api_key}', expected: '{expected_key}'")
    raise HTTPException(
        status_code=HTTP_403_FORBIDDEN, detail="Could not validate credentials"
    )

# Add CORS middleware to allow requests from Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

class ScrapeRequest(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    variant: Optional[str] = None
    year_min: Optional[int] = None
    year_max: Optional[int] = None
    mileage_max: Optional[int] = None
    price_min: Optional[int] = None
    price_max: Optional[int] = None
    max_pages: int = 1
    region: str = "UAE" # Default to UAE
    country: Optional[str] = None  # Added for Europe
    use_proxy: bool = False
    proxy: Optional[str] = None

class ValuationRequest(BaseModel):
    region: str
    country: Optional[str] = None # For Europe
    make: str
    model: str
    variant: Optional[str] = None
    year: int
    mileage: int
    use_proxy: bool = False
    proxy: Optional[str] = None

@app.get("/")
async def read_index():
    return FileResponse("static/index.html")

@app.get("/api/config")
async def get_config():
    """Returns the API key for the embedded web UI. Only expose to localhost."""
    key = os.environ.get("SCRAPER_API_KEY", "default_dev_key").strip('"').strip("'")
    return {"api_key": key}

# Taxonomy Endpoints
@app.get("/taxonomy/makes")
async def get_makes(api_key: str = Depends(get_api_key)):
    return sorted(list(CAR_TAXONOMY.keys()))

@app.get("/taxonomy/models")
async def get_models(make: str, api_key: str = Depends(get_api_key)):
    norm_make = normalize_make(make)
    if norm_make not in CAR_TAXONOMY:
        return []
    return sorted(list(CAR_TAXONOMY[norm_make]["models"].keys()))

@app.get("/taxonomy/variants")
async def get_variants(make: str, model: str, api_key: str = Depends(get_api_key)):
    norm_make = normalize_make(make)
    norm_model = normalize_model(norm_make, model)
    if norm_make not in CAR_TAXONOMY:
        return []
    models = CAR_TAXONOMY[norm_make]["models"]
    if norm_model not in models:
        # Try finding the model via partial match if normalized slug didn't work directly
        for m_name in models:
            if norm_model in m_name.lower() or m_name.lower() in norm_model:
                return models[m_name]
        return []
    return models[norm_model]

@app.post("/api/scrape")
async def scrape_listings(req: ScrapeRequest, api_key: str = Depends(get_api_key)):
    logger.info(f"Received scrape request: {req}")
    
    # 1. Normalization
    req.make = normalize_make(req.make)
    req.model = normalize_model(req.make, req.model)
    req.variant = normalize_variant(req.make, req.model, req.variant)
    
    # 2. Check Cache
    cache_key = req.dict()
    cached_res = cache.get(cache_key)
    if cached_res:
        return cached_res

    proxy = req.proxy if req.use_proxy else None
    
    # Initialize appropriate client(s)
    if req.region == "Lebanon":
        clients = [(name, cls(proxy=proxy)) for name, cls in LEBANON_CLIENTS]
    elif req.region == "Europe": # Added
        client = EuropeClient(proxy=proxy) # Added
    else:
        client = DubizzleClient(proxy=proxy)
        
    all_results = []
    evaluation = {} # Initialize evaluation
    
    try:
        if req.region == "Lebanon":
            # Aggregate from OLX and Autotrader
            filters = {
                "make": req.make,
                "model": req.model,
                "variant": req.variant,
                "year_min": req.year_min,
                "year_max": req.year_max,
                "mileage_max": req.mileage_max,
                "price_min": req.price_min,
                "price_max": req.price_max
            }
            def fetch_lebanon(source_name, lb_client):
                client_results = []
                try:
                    for page in range(req.max_pages):
                        hits, nb_pages, _ = lb_client.get_listings(filters, page=page + 1)
                        if not hits:
                            break
                        
                        if source_name == "OLX":
                            logger.debug(f"[DEBUG] OLX Raw Hits: {json.dumps(hits, default=str)}")

                        # Strict filtering to ensure only searching vehicles are shown
                        make_query = (req.make or "").lower().strip()
                        model_query = (req.model or "").lower().strip()
                        
                        filtered_hits = []
                        for hit in hits:
                            title = hit.get("title", "").lower()
                            # Check if make is in title
                            if make_query and make_query not in title:
                                # For Mercedes, sometimes it's just 'Benz' or the title starts with model
                                if make_query == "mercedes" and "benz" in title:
                                    pass
                                else:
                                    if len(hits) < 5: logger.debug(f"[{source_name}] Rejected '{title}' due to Make mismatch (Query: {make_query})")
                                    continue
                            
                            # Check if model is in title (resilient matching)
                            if model_query:
                                if model_query in title:
                                    pass # Direct match
                                else:
                                    # Normalizing model: remove generic words
                                    stop_words = {"benz", "model", "cars", "car"}
                                    model_clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', model_query)
                                    model_parts = [p for p in model_clean.split() if p not in stop_words]
                                    
                                    if not model_parts:
                                         if model_query not in title:
                                             continue
                                         
                                    # Check if ANY significant part is in the title
                                    match = False
                                    
                                    # Categorical matching for BMW/Mercedes
                                    if make_query == "bmw" and any(p.isdigit() and len(p) >= 3 for p in model_parts):
                                         # e.g. "320" -> check for "3" + "-series"
                                         for p in model_parts:
                                             if p.isdigit() and len(p) >= 3:
                                                 series_digit = p[0]
                                                 if f"{series_digit}-series" in title or f"{series_digit} series" in title:
                                                     match = True; break
                                    
                                    if not match and make_query == "mercedes":
                                         # e.g. "E 300" -> check for "E" + "-class"
                                         for p in model_parts:
                                             if len(p) == 1 and p.isalpha():
                                                 if f"{p.lower()}-class" in title or f"{p.lower()} class" in title:
                                                     match = True; break
                                    
                                    if not match:
                                        for p in model_parts:
                                            # For single letters (E, C, S), check if it's a prefix or standalone
                                            # e.g. "E" in "E300"
                                            if len(p) == 1:
                                                if re.search(rf"\b{p}\d+|{p}\s|\s{p}\s", title, re.I):
                                                    match = True; break
                                            elif p in title:
                                                match = True; break
                                    
                                    if not match:
                                        if len(hits) < 5: logger.debug(f"[{source_name}] Rejected '{title}' due to Model mismatch (Query: {model_query})")
                                        continue
                                        
                            # Variant filtering
                            variant_query = (req.variant or "").lower().strip()
                            if variant_query:
                                var_clean = re.sub(r'[^a-zA-Z0-9]', '', variant_query)
                                title_clean = re.sub(r'[^a-zA-Z0-9]', '', title)
                                hit_var_clean = re.sub(r'[^a-zA-Z0-9]', '', str(hit.get("variant", "")).lower())
                                if var_clean and var_clean not in title_clean and var_clean not in hit_var_clean:
                                    if len(hits) < 5: logger.debug(f"[{source_name}] Rejected '{title}' due to Variant mismatch")
                                    continue
                                        
                            # Year filtering
                            year_val = hit.get("year")
                            if year_val and str(year_val).isdigit():
                                year_int = int(year_val)
                                if req.year_min and year_int < req.year_min:
                                    if len(hits) < 5: logger.debug(f"[{source_name}] Rejected '{title}' due to Year < Min ({year_int} < {req.year_min})")
                                    continue
                                if req.year_max and year_int > req.year_max:
                                    if len(hits) < 5: logger.debug(f"[{source_name}] Rejected '{title}' due to Year > Max ({year_int} > {req.year_max})")
                                    continue
                            
                            # Mileage filtering
                            mileage_val = hit.get("mileage")
                            if mileage_val and str(mileage_val).isdigit() and req.mileage_max:
                                if int(mileage_val) > req.mileage_max:
                                    if len(hits) < 5: logger.debug(f"[{source_name}] Rejected '{title}' due to Mileage ({mileage_val} > {req.mileage_max})")
                                    continue
                                    
                            filtered_hits.append(hit)
                        
                        logger.info(f"[{source_name}] Page {page + 1}: Found {len(hits)} raw, {len(filtered_hits)} valid")
                        client_results.extend(filtered_hits)
                        if page + 1 >= nb_pages:
                            break
                except Exception as e:
                    logger.warning(f"Lebanon source {source_name} failed: {e}")
                return client_results
            
            tasks = [asyncio.to_thread(fetch_lebanon, name, c) for name, c in clients]
            results_lists = await asyncio.gather(*tasks)
            for lst in results_lists:
                all_results.extend(lst)
            
            evaluation = PriceEvaluator.calculate_stats(all_results) if all_results else {}
        elif req.region == "Europe": # Added
            # Europe specific logic
            filters = {
                "make": req.make,
                "model": req.model,
                "variant": req.variant,
                "year_min": req.year_min,
                "mileage_max": req.mileage_max
            }
            # Europe uses country parameter
            country = req.country or "Germany"
            hits, _, _ = client.get_listings(filters, country_name=country, page=1)
            all_results = hits
            
            # Special valuation for Europe
            vehicle_input = {
                "year": req.year_min, # Using year_min as the vehicle year for valuation
                "mileage": req.mileage_max
            }
            evaluation = EuropeClient.calculate_valuation(all_results, vehicle_input)
        
        else: # UAE
            clients = [
                ("Dubizzle", DubizzleClient(proxy=proxy)),
                ("Dubicars", DubicarsClient(proxy=proxy)),
                ("YallaMotor", YallaMotorClient(proxy=proxy)),
                ("Hatla2ee", Hatla2eeClient(proxy=proxy)),
                ("CarSwitch", CarSwitchClient(proxy=proxy)),
                ("CarAbia", CarAbiaClient(proxy=proxy))
            ]
            
            # Build payload for algolia (Dubizzle)
            class MockArgs:
                pass
            args = MockArgs()
            args.make = req.make
            args.model = req.model
            args.variant = req.variant
            args.year_min = req.year_min
            args.year_max = req.year_max
            args.mileage_max = req.mileage_max
            args.price_min = req.price_min
            args.price_max = req.price_max
            
            def fetch_uae(source_name, uae_client):
                client_results = []
                try:
                    for page in range(req.max_pages):
                        if source_name == "Dubizzle":
                            payload = QueryBuilder.build_payload(
                                args, 
                                page=page, 
                                hits_per_page=DEFAULT_HITS_PER_PAGE,
                                index_name=PRIMARY_INDEX
                            )
                            hits, nb_pages, total_hits = uae_client.get_listings(payload)
                            
                            if not hits:
                                break
                                
                            for hit in hits:
                                formatted = Exporter.format_listing(hit)
                                
                                if req.variant:
                                    var_clean = re.sub(r'[^a-zA-Z0-9]', '', str(req.variant).lower())
                                    title_clean = re.sub(r'[^a-zA-Z0-9]', '', str(formatted.get("title", "")).lower())
                                    hit_var_clean = re.sub(r'[^a-zA-Z0-9]', '', str(formatted.get("variant", "")).lower())
                                    if var_clean and var_clean not in title_clean and var_clean not in hit_var_clean:
                                        continue
                                        
                                logger.info(f"[{source_name}] Found: {formatted.get('title')} | {formatted.get('year')} | {formatted.get('price')} {formatted.get('currency')}")
                                client_results.append(formatted)
                            
                            if page + 1 >= nb_pages:
                                break
                        else:
                            # Both Dubicars and YallaMotor use identical filter arguments
                            filters = {
                                "year_min": req.year_min,
                                "year_max": req.year_max,
                                "mileage_max": req.mileage_max,
                                "price_min": req.price_min,
                                "price_max": req.price_max
                            }
                            hits, nb_pages, _ = uae_client.get_listings(req.make, req.model, page=page + 1, **filters)
                            if not hits:
                                break
                            
                            filtered_hits = []
                            logger.info(f"[{source_name}] get_listings returned {len(hits)} raw hits.")
                            for hit in hits:
                                title = hit.get("title", "").lower()
                                make_query = (req.make or "").lower().strip()
                                
                                # Basic make check to avoid totally unrelated cars
                                if make_query and make_query not in title:
                                    continue
                                
                                # Variant filtering
                                variant_query = (req.variant or "").lower().strip()
                                if variant_query:
                                    var_clean = re.sub(r'[^a-zA-Z0-9]', '', variant_query)
                                    title_clean = re.sub(r'[^a-zA-Z0-9]', '', title)
                                    hit_var_clean = re.sub(r'[^a-zA-Z0-9]', '', str(hit.get("variant", "")).lower())
                                    if var_clean and var_clean not in title_clean and var_clean not in hit_var_clean:
                                        continue

                                # Year filtering
                                year_val = hit.get("year")
                                if year_val and str(year_val).isdigit():
                                    year_int = int(year_val)
                                    if req.year_min and year_int < req.year_min:
                                        continue
                                    if req.year_max and year_int > req.year_max:
                                        continue
                                
                                # Mileage filter
                                mileage_val = hit.get("mileage")
                                if mileage_val and str(mileage_val).isdigit() and req.mileage_max:
                                    if int(mileage_val) > req.mileage_max:
                                        continue
                                filtered_hits.append(hit)

                            for hit in filtered_hits:
                                logger.info(f"[{source_name}] Found: {hit.get('title')} | {hit.get('year')} | {hit.get('price')} {hit.get('currency')}")
                            
                            logger.info(f"[{source_name}] Page {page + 1}: Found {len(hits)} raw, {len(filtered_hits)} valid")
                            client_results.extend(filtered_hits)
                            
                            if page + 1 >= nb_pages:
                                break

                except Exception as e:
                    logger.warning(f"UAE source {source_name} failed: {e}")
                return client_results
                
            tasks = [asyncio.to_thread(fetch_uae, name, c) for name, c in clients]
            results_lists = await asyncio.gather(*tasks)
            for lst in results_lists:
                all_results.extend(lst)
        
        # 3. Post-Aggregation Processing
        # Deduplication
        all_results = deduplicate_listings(all_results)
        
        # Analytics
        analytics = compute_price_analytics(all_results)
        
        # Determine currency for response metadata if needed
        currency = REGION_CONFIG.get(req.region, {}).get("currency", "AED")
                
        response = {
            "status": "success",
            "region": req.region,
            "country": req.country if req.region == "Europe" else None,
            "currency": currency,
            "total_results": len(all_results),
            "data": all_results,
            "analytics": analytics,
            "evaluation": analytics # Keep evaluation for backward compatibility
        }
        
        # 4. Cache Result
        cache.set(cache_key, response)
        
        return response
        
    except Exception as e:
        logger.error(f"Scrape error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/evaluate")
async def evaluate_car(req: ValuationRequest, api_key: str = Depends(get_api_key)):
    logger.info(f"Received valuation request: {req}")
    
    # 1. Normalization
    req.make = normalize_make(req.make)
    req.model = normalize_model(req.make, req.model)
    req.variant = normalize_variant(req.make, req.model, req.variant)

    proxy = req.proxy if req.use_proxy else None
    
    # Initialize appropriate client(s)
    if req.region == "Lebanon":
        clients = [(name, cls(proxy=proxy)) for name, cls in LEBANON_CLIENTS]
    elif req.region == "Europe":
        client = EuropeClient(proxy=proxy)
    else:
        client = DubizzleClient(proxy=proxy)
        
    all_results = []
    
    try:
        # Use a small range for the year to get relevant comparisons
        year_min = req.year - 1
        year_max = req.year + 1
        
        if req.region == "Lebanon":
            filters = {
                "make": req.make,
                "model": req.model,
                "variant": req.variant,
                "year_min": year_min,
                "year_max": year_max,
                "mileage_max": req.mileage + 20000
            }
            def eval_lebanon(source_name, lb_client):
                client_results = []
                try:
                    for page in range(2):
                        hits, nb_pages, _ = lb_client.get_listings(filters, page=page + 1)
                        if not hits:
                            break
                        for hit in hits:
                            title_clean = re.sub(r'[^a-zA-Z0-9]', '', str(hit.get("title", "")).lower())
                            make_clean = re.sub(r'[^a-zA-Z0-9]', '', (req.make or "")).lower()
                            if make_clean and make_clean not in title_clean and make_clean not in re.sub(r'[^a-zA-Z0-9]', '', str(hit.get("make", "")).lower()):
                                continue
                            variant_clean = re.sub(r'[^a-zA-Z0-9]', '', (req.variant or "")).lower()
                            hit_var_clean = re.sub(r'[^a-zA-Z0-9]', '', str(hit.get("variant", "")).lower())
                            if variant_clean and variant_clean not in title_clean and variant_clean not in hit_var_clean:
                                continue
                            client_results.append(hit)
                        if page + 1 >= nb_pages:
                            break
                except Exception as e:
                    logger.warning(f"Lebanon source {source_name} failed: {e}")
                return client_results
                
            tasks = [asyncio.to_thread(eval_lebanon, name, c) for name, c in clients]
            results_lists = await asyncio.gather(*tasks)
            for lst in results_lists:
                all_results.extend(lst)
            evaluation = PriceEvaluator.calculate_valuation(all_results, {"year": req.year, "mileage": req.mileage}) if all_results else None
        elif req.region == "Europe":
            filters = {
                "make": req.make,
                "model": req.model,
                "variant": req.variant,
                "year_min": year_min,
                # For valuation we might want a bit higher mileage to see trends, 
                # but let's stick to the requested mileage as a soft filter or nearby
                "mileage_max": req.mileage + 20000 
            }
            country = req.country or "Germany"
            # EuropeClient usually returns 1 page of results
            hits, _, _ = client.get_listings(filters, country_name=country, page=1)
            all_results = hits
            
            evaluation = EuropeClient.calculate_valuation(all_results, {"year": req.year, "mileage": req.mileage})
                
        else: # UAE
            clients = [
                ("Dubizzle", DubizzleClient(proxy=proxy)),
                ("Dubicars", DubicarsClient(proxy=proxy)),
                ("YallaMotor", YallaMotorClient(proxy=proxy)),
                ("Hatla2ee", Hatla2eeClient(proxy=proxy)),
                ("CarSwitch", CarSwitchClient(proxy=proxy)),
                ("CarAbia", CarAbiaClient(proxy=proxy))
            ]

            class MockArgs:
                pass
            args = MockArgs()
            args.make = req.make
            args.model = req.model
            args.variant = req.variant
            args.year_min = year_min
            args.year_max = year_max
            args.mileage_max = req.mileage + 20000
            args.price_min = None
            args.price_max = None
            
            def eval_uae(source_name, uae_client):
                client_results = []
                try:
                    for page in range(2):
                        if source_name == "Dubizzle":
                            payload = QueryBuilder.build_payload(args, page=page)
                            hits, nb_pages, _ = uae_client.get_listings(payload)
                            if not hits: break
                            for hit in hits:
                                formatted = Exporter.format_listing(hit)
                                title_clean = re.sub(r'[^a-zA-Z0-9]', '', str(formatted.get("title", "")).lower())
                                make_clean = re.sub(r'[^a-zA-Z0-9]', '', (req.make or "")).lower()
                                if make_clean and make_clean not in title_clean and make_clean not in re.sub(r'[^a-zA-Z0-9]', '', str(formatted.get("make", "")).lower()):
                                    continue
                                variant_clean = re.sub(r'[^a-zA-Z0-9]', '', (req.variant or "")).lower()
                                hit_var_clean = re.sub(r'[^a-zA-Z0-9]', '', str(formatted.get("variant", "")).lower())
                                if variant_clean and variant_clean not in title_clean and variant_clean not in hit_var_clean:
                                    continue
                                client_results.append(formatted)
                            if page + 1 >= nb_pages: break
                        else:
                            filters = {
                                "year_min": year_min,
                                "year_max": year_max,
                                "mileage_max": req.mileage + 20000,
                            }
                            hits, nb_pages, _ = uae_client.get_listings(req.make, req.model, page=page + 1, **filters)
                            if not hits: break
                            # Evaluate requires similar fields
                            for hit in hits:
                                title_clean = re.sub(r'[^a-zA-Z0-9]', '', str(hit.get("title", "")).lower())
                                make_clean = re.sub(r'[^a-zA-Z0-9]', '', (req.make or "")).lower()
                                if make_clean and make_clean not in title_clean and make_clean not in re.sub(r'[^a-zA-Z0-9]', '', str(hit.get("make", "")).lower()):
                                    continue
                                variant_clean = re.sub(r'[^a-zA-Z0-9]', '', (req.variant or "")).lower()
                                hit_var_clean = re.sub(r'[^a-zA-Z0-9]', '', str(hit.get("variant", "")).lower())
                                if variant_clean and variant_clean not in title_clean and variant_clean not in hit_var_clean:
                                    continue
                                client_results.append(hit)
                            if page + 1 >= nb_pages: break

                except Exception as e:
                    logger.warning(f"UAE valuation source {source_name} failed: {e}")
                return client_results
                
            tasks = [asyncio.to_thread(eval_uae, name, c) for name, c in clients]
            results_lists = await asyncio.gather(*tasks)
            for lst in results_lists:
                all_results.extend(lst)
            
            # Deduplicate and calculate valuation
            all_results = deduplicate_listings(all_results)
            analytics = compute_price_analytics(all_results)
            
            # Use analytics for valuation
            evaluation = analytics

        currency = REGION_CONFIG.get(req.region, {}).get("currency", "AED")
        
        if not evaluation:
            return {
                "status": "partial_success",
                "message": "No listings found to calculate valuation.",
                "region": req.region,
                "currency": currency,
                "valuation": None
            }

        return {
            "status": "success",
            "region": req.region,
            "currency": currency,
            "valuation": {
                "estimated_valuation": evaluation.get("estimated_price") or evaluation.get("median_price"),
                "price_range": {
                    "min": evaluation.get("min_price"),
                    "max": evaluation.get("max_price")
                },
                "market_average": evaluation.get("average_price"),
                "market_median": evaluation.get("median_price"),
                "listings_count": evaluation.get("total_evaluated") or evaluation.get("listings_used") or 0
            }
        }

    except Exception as e:
        logger.error(f"Valuation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # workers=4 allows 4 concurrent scrape requests to be handled in parallel.
    # Without this, sync requests.Session() calls block the single event loop
    # and concurrent BullMQ jobs queue up, causing timeouts.
    uvicorn.run("app:app", host="0.0.0.0", port=8000, workers=4)
