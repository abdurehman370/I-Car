"""
Dubicars UAE (www.dubicars.com) scraper client.
Fetches used car listings via HTML scraping. Uses data-mixpanel-detail JSON payloads for robust data extraction.
"""
import requests
from bs4 import BeautifulSoup
import json
import logging
from datetime import datetime
from config import REGION_CONFIG, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)

BASE_URL = "https://www.dubicars.com"
TIMEOUT = min(20, DEFAULT_TIMEOUT)

class DubicarsClient:
    def __init__(self, proxy=None):
        self.config = REGION_CONFIG["UAE"]
        self.session = requests.Session()
        # Essential headers to avoid blocking
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })
        self.currency = self.config["currency"]
        
        if proxy:
            self.session.proxies = {"http": proxy, "https": proxy}
            logger.info(f"DubicarsClient initialized with proxy: {proxy}")

    def _build_candidate_urls(self, make, model, **kwargs):
        """
        Builds URL(s) to try based on the make, model, and other filters.
        Dubicars uses /uae/used/make-slug/model-slug
        """
        # Mapping for makes if needed, but lowercasing and replacing spaces with dashes usually works
        make_slug = make.lower().replace(" ", "-") if make else ""
        model_slug = model.lower().replace(" ", "-") if model else ""
        
        # Base Path configuration
        base_paths = []
        if make_slug and model_slug:
             base_paths.append(f"{BASE_URL}/uae/used/{make_slug}/{model_slug}")
        if make_slug:
             base_paths.append(f"{BASE_URL}/uae/used/{make_slug}")
        
        # Fallback to general UAE used search if neither make nor model is provided (unlikely in this context, but safe)
        if not base_paths:
             base_paths.append(f"{BASE_URL}/uae/used")

        # Query Parameters Setup
        params = []
        year_min = kwargs.get('year_min')
        year_max = kwargs.get('year_max')
        
        if year_min:
            params.append(f"yf={year_min}")
        if year_max:
            params.append(f"yt={year_max}")

        query_string = "&".join(params)

        urls = []
        for path in base_paths:
            if query_string:
                urls.append(f"{path}?{query_string}")
            else:
                urls.append(path)
                
        return urls

    def get_listings(self, make, model, page=1, **kwargs):
        """Fetches listings from Dubicars."""
        urls_to_try = self._build_candidate_urls(make, model, **kwargs)
        
        last_error = None
        for base_url in urls_to_try:
            # Handle pagination
            # Dubicars uses direct page path? (No, wait - Dubicars pagination: ?page=2 or /page-2)
            # Actually, let's just append `page=X` to query params or check if `?` is already there
            if page > 1:
                if '?' in base_url:
                    url = f"{base_url}&page={page}"
                else:
                    url = f"{base_url}?page={page}"
            else:
                url = base_url
                
            try:
                logger.info(f"Fetching Dubicars UAE: {url}")
                response = self.session.get(url, timeout=TIMEOUT)
                if response.status_code == 404:
                    logger.warning(f"Dubicars 404 for {url}, trying next fallback...")
                    continue
                response.raise_for_status()
                return self._parse_html(response.text, page)
            except requests.exceptions.RequestException as e:
                last_error = e
                logger.warning(f"Dubicars request failed for {url}: {e}")
                continue
                
        if last_error:
             logger.error(f"Dubicars all fallbacks failed. Last error: {last_error}")
        return [], 0, 0

    def _parse_html(self, html, current_page):
        """Parse HTML to extract listings."""
        soup = BeautifulSoup(html, "html.parser")
        listings = []
        
        # Select the item blocks
        items = soup.select("li.serp-list-item")
        
        for item in items:
            try:
                # Extract URL from anchor tag
                link_el = item.select_one("a.image-container") or item.select_one("a.title")
                listing_url = link_el.get("href") if link_el else ""
                
                # Extract Mixpanel JSON payload
                mixpanel_data_raw = item.get("data-mixpanel-detail")
                if not mixpanel_data_raw:
                    continue
                    
                import html
                try:
                    mixpanel_data = json.loads(html.unescape(mixpanel_data_raw))
                except json.JSONDecodeError:
                    mixpanel_data = {}
                
                # Safe mapping
                if mixpanel_data:
                    listing = {
                        "id": str(mixpanel_data.get("item_id", "")),
                        "title": f"Used {mixpanel_data.get('item_make', '')} {mixpanel_data.get('item_model', '')} {mixpanel_data.get('item_year', '')}".strip(),
                        "price": mixpanel_data.get("item_local_price", mixpanel_data.get("item_discounted_price")),
                        "year": str(mixpanel_data.get("item_year", "")),
                        "mileage": str(mixpanel_data.get("item_mileage", "")),
                        "currency": self.currency,
                        "location": mixpanel_data.get("item_location", self.config.get("default_location", "UAE")),
                        "listing_url": listing_url,
                        "source": "dubicars",
                        "make": mixpanel_data.get("item_make", ""),
                        "model": mixpanel_data.get("item_model", ""),
                        "variant": mixpanel_data.get("trim", ""),
                        "scraped_at": datetime.now().isoformat()
                    }
                    
                    # Extract image
                    image_url = mixpanel_data.get("image_url")
                    if not image_url:
                        # Fallback to parsing image from HTML
                        img_el = item.select_one("img.object-cover")
                        image_url = img_el.get("src") or img_el.get("data-src") if img_el else ""
                    
                    listing["image"] = image_url
                    listing["image_url"] = image_url
                    listings.append(listing)
            except Exception as e:
                logger.debug(f"Dubicars parse item skip: {e}")
                continue

        # Try to find pagination to determine nbPages
        nb_pages = current_page
        pagination = soup.select_one(".pagination")
        if pagination:
             page_links = pagination.select("a.page-link")
             for a in page_links:
                 try:
                     page_num = int(a.text.strip())
                     if page_num > nb_pages:
                         nb_pages = page_num
                 except ValueError:
                     pass

        # Since we don't strictly have a total count from HTML directly accessible, we estimate total_hits
        total_hits = len(listings) * nb_pages if len(listings) > 0 else 0
        
        return listings, nb_pages, total_hits
