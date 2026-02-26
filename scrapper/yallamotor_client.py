"""
YallaMotor UAE (uae.yallamotor.com) scraper client.
Fetches used car listings safely bypassing Cloudflare, parsing standard JSON-LD Schema.org data for robustness.
"""
import cloudscraper
from bs4 import BeautifulSoup
import json
import logging
import time
from datetime import datetime
from config import REGION_CONFIG, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)

BASE_URL = "https://uae.yallamotor.com"
TIMEOUT = min(20, DEFAULT_TIMEOUT)
MAX_RETRIES = 3
RETRY_DELAY = 1.0

class YallaMotorClient:
    def __init__(self, proxy=None):
        self.config = REGION_CONFIG["UAE"]
        # Use cloudscraper to bypass Cloudflare
        self.scraper = cloudscraper.create_scraper()
        self.currency = self.config["currency"]
        
        if proxy:
            self.scraper.proxies = {"http": proxy, "https": proxy}
            logger.info(f"YallaMotorClient initialized with proxy: {proxy}")

    def _build_candidate_url(self, make, model, page=1, **kwargs):
        """
        Builds URL to try based on the make, model, and pagination.
        YallaMotor uses /used-cars/make-slug/model-slug
        """
        make_slug = make.lower().replace(" ", "-") if make else ""
        model_slug = model.lower().replace(" ", "-") if model else ""
        
        path = f"{BASE_URL}/used-cars"
        if make_slug:
            path += f"/{make_slug}"
            if model_slug:
                 path += f"/{model_slug}"
                 
        if page > 1:
            path += f"?page={page}"
            
        return path

    def get_listings(self, make, model, page=1, **kwargs):
        """Fetches listings from YallaMotor."""
        url = self._build_candidate_url(make, model, page, **kwargs)
        
        for attempt in range(MAX_RETRIES):
            try:
                logger.info(f"Fetching YallaMotor UAE: {url}")
                response = self.scraper.get(url, timeout=TIMEOUT)
                
                if response.status_code == 404:
                    logger.warning(f"YallaMotor 404 for {url} - No results or invalid URL.")
                    return [], 0, 0
                elif response.status_code in [403, 503]:
                    logger.warning(f"YallaMotor anti-bot block ({response.status_code}) on attempt {attempt+1}/{MAX_RETRIES}.")
                    time.sleep(RETRY_DELAY)
                    continue
                    
                response.raise_for_status()
                return self._parse_json_ld(response.text, page, url, **kwargs)
                
            except Exception as e:
                logger.warning(f"YallaMotor request failed for {url} (Attempt {attempt+1}): {e}")
                time.sleep(RETRY_DELAY)
                
        logger.error(f"YallaMotor all retries failed for {url}.")
        return [], 0, 0

    def _parse_json_ld(self, html, current_page, current_url, **kwargs):
        """Parse HTML to extract JSON-LD listings with local filtering."""
        soup = BeautifulSoup(html, "html.parser")
        listings = []
        
        # Select JSON-LD scripts
        scripts = soup.find_all("script", type="application/ld+json")
        for script in scripts:
            try:
                data = json.loads(script.string)
                if not isinstance(data, dict):
                    continue
                
                # Verify it's a Car
                t = data.get("@type", [])
                if "Car" not in t and t != "Car":
                    continue
                    
                # Extract listing data
                title = data.get("name", "")
                
                # Price Extraction
                price = 0
                offers = data.get("offers", {})
                if isinstance(offers, dict):
                    price_val = offers.get("price")
                    if price_val:
                        try:
                            price = float(price_val)
                        except ValueError:
                            pass
                
                # Deal properties
                year_val = data.get("vehicleModelDate") or data.get("modelDate", "")
                mileage_val = ""
                mileage_node = data.get("mileageFromOdometer")
                if isinstance(mileage_node, dict):
                    mileage_val = str(mileage_node.get("value", ""))
                
                location_val = self.config.get("default_location", "UAE")
                if isinstance(offers, dict) and "availableAtOrFrom" in offers:
                    location_val = offers["availableAtOrFrom"].get("name", location_val)

                # Link extraction
                listing_url = current_url
                if isinstance(offers, dict) and offers.get("url"):
                    listing_url = offers["url"]

                listing = {
                    "id": "", # Hard to get exact numerical ID reliably from JSON-LD
                    "title": title,
                    "price": price,
                    "year": str(year_val),
                    "mileage": str(mileage_val),
                    "currency": self.currency,
                    "location": location_val,
                    "listing_url": listing_url,
                    "source": "yallamotor",
                    "make": data.get("manufacturer", ""),
                    "model": data.get("model", ""),
                    "variant": "",
                    "scraped_at": datetime.now().isoformat(),
                    "image": data.get("image", ""),
                    "image_url": data.get("image", "")
                }
                
                # Apply Filters
                year_min = kwargs.get("year_min")
                year_max = kwargs.get("year_max")
                price_min = kwargs.get("price_min")
                price_max = kwargs.get("price_max")
                
                if year_val and str(year_val).isdigit():
                    y = int(year_val)
                    if year_min and y < year_min: continue
                    if year_max and y > year_max: continue
                
                if price:
                    if price_min and price < price_min: continue
                    if price_max and price > price_max: continue
                
                listings.append(listing)
                
            except Exception as e:
                logger.debug(f"YallaMotor parse item skip: {e}")
                continue

        # Find pagination
        nb_pages = current_page
        pagination = soup.find(class_="pagination")
        if pagination:
             page_links = pagination.find_all("a")
             for a in page_links:
                 try:
                     page_num = int(a.text.strip())
                     if page_num > nb_pages:
                         nb_pages = page_num
                 except ValueError:
                     pass

        total_hits = len(listings) * nb_pages if len(listings) > 0 else 0
        return listings, nb_pages, total_hits
