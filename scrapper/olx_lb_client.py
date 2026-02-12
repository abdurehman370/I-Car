import requests
import logging
from datetime import datetime
from config import REGION_CONFIG, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)

class OlxLbClient:
    def __init__(self, proxy=None):
        self.config = REGION_CONFIG["Lebanon"]
        
        # ES Configuration directly in client or move to config later
        # Found via investigation:
        self.es_url = "https://search.mena.sector.run"
        self.es_index = "olx-lb*" # Wildcard works best based on testing
        self.es_credentials = "olx-lb-production-search:>s+O3=s9@I4DF0Ia%ug?7QPuy2{Dj[Fr"
        
        self.session = requests.Session()
        
        # Use a standard browser user agent
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Content-Type": "application/json"
        })
        
        # Setup Auth
        if ":" in self.es_credentials:
            username, password = self.es_credentials.split(":", 1)
            self.session.auth = (username, password)
        
        if proxy:
            self.session.proxies = {
                "http": proxy,
                "https": proxy
            }
            logger.info(f"Using proxy: {proxy}")

    def get_listings(self, filters, page=1):
        payload = self._build_es_query(filters, page)
        
        try:
            url = f"{self.es_url}/{self.es_index}/_search"
            logger.info(f"Fetching OLX LB ES: {url} with query")
            
            response = self.session.post(
                url, 
                json=payload, 
                timeout=DEFAULT_TIMEOUT
            )
            response.raise_for_status()
            data = response.json()
            
            return self._parse_response(data)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"OLX LB ES Request failed: {e}")
            if e.response is not None:
                logger.error(f"Response: {e.response.text}")
            return [], 0, 0

    def _build_es_query(self, filters, page):
        page_size = 40 # Typical ES page size
        from_val = (page - 1) * page_size
        
        # Base query structure
        query = {
            "bool": {
                "must": [
                    # Filter for Cars category
                    # Based on investigation: category.lvl1.slug = "cars-for-sale" 
                    # or category.slug could work. Safe to check specifically for cars.
                    {"term": {"category.slug": "cars-for-sale"}}
                ],
                "filter": []
            }
        }
        
        # Numeric Filters (using extraFields)
        # Price
        if filters.get('price_min') or filters.get('price_max'):
            price_range = {}
            if filters.get('price_min'): price_range['gte'] = filters.get('price_min')
            if filters.get('price_max'): price_range['lte'] = filters.get('price_max')
            query['bool']['filter'].append({"range": {"price": price_range}}) # Root price field seems reliable
            
        # Year
        if filters.get('year_min') or filters.get('year_max'):
            year_range = {}
            if filters.get('year_min'): year_range['gte'] = filters.get('year_min')
            if filters.get('year_max'): year_range['lte'] = filters.get('year_max')
            query['bool']['filter'].append({"range": {"extraFields.year": year_range}})

        # Mileage
        if filters.get('mileage_max'):
            query['bool']['filter'].append({"range": {"extraFields.mileage": {"lte": filters.get('mileage_max')}}})
            
        # Text Search (Make/Model)
        # Using query_string on main fields (title, description, formattedExtraFields)
        make = (filters.get('make') or '').lower()
        model = (filters.get('model') or '').lower()
        variant = (filters.get('variant') or '').lower()
        
        # Build query string
        query_parts = []
        if make: query_parts.append(make)
        if model: query_parts.append(model)
        if variant: query_parts.append(variant)
        query_string = " ".join(query_parts)
             
        if query_string:
            # Use simple query_string on all fields
            query['bool']['must'].append({
                "query_string": {
                    "query": query_string
                }
            })

        return {
            "from": from_val,
            "size": page_size,
            "query": query,
            "sort": [
                {"timestamp": {"order": "desc"}} # Sort by newest
            ]
        }

    def _parse_response(self, data):
        hits = data.get('hits', {}).get('hits', [])
        total_hits = data.get('hits', {}).get('total', {}).get('value', 0)
        
        listings = []
        for hit in hits:
            source = hit.get('_source', {})
            listings.append(self._format_ad(source, hit.get('_id')))
            
        nb_pages = (total_hits // 40) + 1
        return listings, nb_pages, total_hits

    def _format_ad(self, ad, ad_id):
        # Extract fields from ES source
        title = ad.get('title', 'N/A')
        
        # Extra Fields
        extra = ad.get('extraFields', {})
        formatted_extra = ad.get('formattedExtraFields', [])
        
        # Price
        # Try root price first, then extraFields
        price = ad.get('price', 0)
        if isinstance(price, dict):
            price = price.get('amount', 0)
            
        if not price or price == 0:
            price = extra.get('price', 0)
            
        # Images
        image_url = 'N/A'
        photos = ad.get('photos', [])
        if photos:
            # Photos structure: [{id, externalID, ...}]
            # Need to construct URL. Usually: https://images.olx.com.lb/externalID/image;s=1000x700
            # Based on investigation, coverPhoto has externalID too
            # Let's try to mimic typical OLX image logic or use 'images' if present (it wasn't in keys)
            # The keys had 'photos' and 'coverPhoto'.
            first_photo = photos[0]
            if isinstance(first_photo, dict) and 'externalID' in first_photo:
                 # Construct URL pattern for Dubizzle/OLX usually
                 # URL pattern from `olx_lb_home.html` (lazy loaded images): 
                 # https://images.olx.com.lb/{externalID}/image;s={width}x{height}
                 eid = first_photo.get('externalID')
                 image_url = f"https://images.olx.com.lb/{eid}/image;s=1000x700"

        # Extra Fields
        extra = ad.get('extraFields', {})
        formatted_extra = ad.get('formattedExtraFields', [])
        
        year = extra.get('year', 'N/A')
        mileage = extra.get('mileage', 'N/A')
        
        # Location
        location_text = "N/A"
        loc = ad.get('location', [])
        if loc:
            # Usually list of levels: Country, Region, City
            # Get the most specific one (last one)
            location_text = loc[-1].get('name', 'N/A')

        # Listing URL
        slug = ad.get('slug')
        listing_url = self.config["listing_url_template"].format(slug=slug) if slug else 'N/A'
        if not slug and ad_id:
             listing_url = f"https://www.olx.com.lb/ad/{ad_id}"

        return {
            "title": title,
            "price": price,
            "year": year,
            "mileage": mileage,
            "location": location_text,
            "listing_url": listing_url,
            "image_url": image_url,
            "currency": self.config["currency"],
            "scraped_at": datetime.now().isoformat()
        }
