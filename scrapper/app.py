from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import logging
import os

from dubizzle_client import DubizzleClient
from olx_lb_client import OlxLbClient
from europe_client import EuropeClient
from filters import QueryBuilder
from exporter import Exporter
from evaluator import PriceEvaluator
from config import PRIMARY_INDEX, DEFAULT_HITS_PER_PAGE, REGION_CONFIG

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Dubizzle Scraper API")

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

@app.post("/api/scrape")
async def scrape_listings(req: ScrapeRequest):
    logger.info(f"Received scrape request: {req}")
    
    proxy = req.proxy if req.use_proxy else None
    
    # Initialize appropriate client
    if req.region == "Lebanon":
        client = OlxLbClient(proxy=proxy)
    elif req.region == "Europe": # Added
        client = EuropeClient(proxy=proxy) # Added
    else:
        client = DubizzleClient(proxy=proxy)
        
    all_results = []
    evaluation = {} # Initialize evaluation
    
    try:
        if req.region == "Europe": # Added
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
        
        elif req.region == "Lebanon":
            # Prepare filters dict
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
            # OLX pagination is 1-based usually, or page index
            for page in range(req.max_pages):
                hits, nb_pages, total_hits = client.get_listings(filters, page=page+1)
                
                if not hits:
                    break
                    
                all_results.extend(hits)
                
                if page + 1 >= nb_pages:
                    break
            
            evaluation = PriceEvaluator.calculate_stats(all_results)
                
        else: # UAE / Dubizzle
            # Build payload using QueryBuilder
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
            
            for page in range(req.max_pages):
                payload = QueryBuilder.build_payload(
                    args, 
                    page=page, 
                    hits_per_page=DEFAULT_HITS_PER_PAGE,
                    index_name=PRIMARY_INDEX
                )
                
                hits, nb_pages, total_hits = client.get_listings(payload)
                
                if not hits:
                    break
                    
                for hit in hits:
                    all_results.append(Exporter.format_listing(hit))
                
                if page + 1 >= nb_pages:
                    break
            
            evaluation = PriceEvaluator.calculate_stats(all_results)
        
        # Determine currency for response metadata if needed
        currency = REGION_CONFIG.get(req.region, {}).get("currency", "AED")
                
        return {
            "status": "success",
            "region": req.region,
            "country": req.country if req.region == "Europe" else None, # Added
            "currency": currency,
            "total_results": len(all_results),
            "data": all_results,
            "evaluation": evaluation
        }
        
    except Exception as e:
        logger.error(f"Scrape error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/evaluate")
async def evaluate_car(req: ValuationRequest):
    logger.info(f"Received valuation request: {req}")
    
    proxy = req.proxy if req.use_proxy else None
    
    # Initialize appropriate client
    if req.region == "Lebanon":
        client = OlxLbClient(proxy=proxy)
    elif req.region == "Europe":
        client = EuropeClient(proxy=proxy)
    else:
        client = DubizzleClient(proxy=proxy)
        
    all_results = []
    
    try:
        # Use a small range for the year to get relevant comparisons
        year_min = req.year - 1
        year_max = req.year + 1
        
        if req.region == "Europe":
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
        
        elif req.region == "Lebanon":
            filters = {
                "make": req.make,
                "model": req.model,
                "variant": req.variant,
                "year_min": year_min,
                "year_max": year_max,
                "mileage_max": req.mileage + 20000
            }
            # Fetch 2 pages for better statistical data
            for page in range(2):
                hits, nb_pages, _ = client.get_listings(filters, page=page+1)
                if not hits: break
                all_results.extend(hits)
                if page + 1 >= nb_pages: break
            
            evaluation = PriceEvaluator.calculate_valuation(all_results, {"year": req.year, "mileage": req.mileage})
                
        else: # UAE / Dubizzle
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
            
            for page in range(2):
                payload = QueryBuilder.build_payload(args, page=page)
                hits, nb_pages, _ = client.get_listings(payload)
                if not hits: break
                for hit in hits:
                    all_results.append(Exporter.format_listing(hit))
                if page + 1 >= nb_pages: break
            
            evaluation = PriceEvaluator.calculate_valuation(all_results, {"year": req.year, "mileage": req.mileage})

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
    uvicorn.run(app, host="0.0.0.0", port=8000)
