import requests
import logging
from datetime import datetime
from config import REGION_CONFIG, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)

TYPESENSE_URL = "https://hd7x32pwz5l1k9frp-1.a1.typesense.net/collections/cars_prod/documents/search"
API_KEY = "Tv1qKAFwcLU5hFb3W2Y2u4Xirp3IG6Ld"
IMAGE_BASE_URL = "https://img.carswitch.com"
BASE_URL = "https://carswitch.com"

class CarSwitchClient:
    def __init__(self, proxy=None):
        self.config = REGION_CONFIG["UAE"]
        self.currency = self.config["currency"]
        self.session = requests.Session()
        if proxy:
            self.session.proxies = {"http": proxy, "https": proxy}
        
        self.session.headers.update({
            "x-typesense-api-key": API_KEY,
            "Accept": "application/json, text/plain, */*",
            "Origin": "https://carswitch.com",
            "Referer": "https://carswitch.com/"
        })

    def _build_filter(self, make, model, **kwargs):
        filters = []
        if make:
            filters.append(f"makeName:=['{make.lower()}']")
        if model:
            # Typesense modelNames often lack spaces (e.g., "c200") 
            # or use them (e.g., "c 200"). We'll try both.
            m_clean = model.lower()
            m_nospace = m_clean.replace(" ", "")
            if m_nospace != m_clean:
                filters.append(f"modelName:=['{m_clean}', '{m_nospace}']")
            else:
                filters.append(f"modelName:=['{m_clean}']")
        
        if kwargs.get('year_min'):
            filters.append(f"year:>={kwargs['year_min']}")
        if kwargs.get('year_max'):
            filters.append(f"year:<={kwargs['year_max']}")
        if kwargs.get('price_min'):
            filters.append(f"price:>={kwargs['price_min']}")
        if kwargs.get('price_max'):
            filters.append(f"price:<={kwargs['price_max']}")
        if kwargs.get('mileage_max'):
            filters.append(f"mileage:<={kwargs['mileage_max']}")
            
        # For UAE region
        filters.append("countryName:=['uae']")
        
        return " && ".join(filters)

    def get_listings(self, make, model, page=1, **kwargs):
        """Fetches listings from CarSwitch UAE via Typesense API."""
        per_page = 24
        
        params = {
            "q": "*",
            "query_by": "makeName,modelName",
            "filter_by": self._build_filter(make, model, **kwargs),
            "page": page,
            "per_page": per_page,
            "sort_by": "createdAt:desc"
        }
        
        try:
            logger.info(f"Fetching CarSwitch UAE (Deep API): {make} {model} Page {page}")
            response = self.session.get(TYPESENSE_URL, params=params, timeout=DEFAULT_TIMEOUT)
            response.raise_for_status()
            
            data = response.json()
            hits = data.get("hits", [])
            found = data.get("found", 0)
            
            listings = []
            for hit in hits:
                doc = hit.get("document", {})
                listing_id = doc.get("id")
                
                # Verified URL structure: uae/used-cars/[make]/[model]/[id]
                # However, doc has uuid and id. Usually its https://carswitch.com/uae/used-cars/[make]/[model]/[uuid]
                make_slug = doc.get("makeName", "").replace(" ", "-").lower()
                model_slug = doc.get("modelName", "").replace(" ", "-").lower()
                uuid = doc.get("uuid")
                
                listing_url = f"{BASE_URL}/uae/used-cars/{make_slug}/{model_slug}/{uuid}"
                
                listings.append({
                    "id": listing_id,
                    "title": f"{doc.get('makeName', '').capitalize()} {doc.get('modelName', '').capitalize()} {doc.get('year')}".strip(),
                    "price": str(doc.get("price", "0")),
                    "year": str(doc.get("year", "")),
                    "mileage": str(doc.get("mileage", "0")),
                    "currency": self.currency,
                    "location": doc.get("cityName", "UAE").capitalize(),
                    "listing_url": listing_url,
                    "source": "carswitch",
                    "make": doc.get("makeName", "").lower(),
                    "model": doc.get("modelName", "").lower(),
                    "image": image_url,
                    "image_url": image_url, # Added image_url alias
                    "scraped_at": datetime.now().isoformat()
                })
            
            nb_pages = (found + per_page - 1) // per_page
            return listings, nb_pages, found
            
        except Exception as e:
            logger.error(f"CarSwitch API failed: {e}")
            return [], 0, 0
