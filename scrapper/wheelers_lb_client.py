"""
Refactored Wheelers.me Lebanon scraper client.
Production-ready with robust URL building, parsing, and retry logic.
"""
import requests
from bs4 import BeautifulSoup
import re
import logging
import time
from datetime import datetime
from config import REGION_CONFIG, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)

BASE_URL = "https://www.wheelers.me"
# Explicitly set a reasonable timeout
TIMEOUT = min(30, DEFAULT_TIMEOUT)
MAX_RETRIES = 3
RETRY_DELAY = 1.0


class WheelersLbClient:
    def __init__(self, proxy=None):
        self.config = REGION_CONFIG.get("Lebanon", {})
        self.currency = self.config.get("currency", "$")
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.wheelers.me/en/lebanon/cars/",
        })
        if proxy:
            self.session.proxies = {"http": proxy, "https": proxy}
            logger.info(f"Wheelers LB using proxy: {proxy}")

    def get_listings(self, filters, page=1):
        """
        Fetch car listings from Wheelers.me Lebanon.
        Returns (listings, nb_pages, total_hits).
        """
        urls_to_try = self._build_candidate_urls(filters, page)
        
        last_error = None
        for url in urls_to_try:
            try:
                html = self._fetch_with_retry(url)
                if not html:
                    continue
                
                listings, nb_pages, total = self._parse_html(html, page, filters)
                # If we found listings, or if this is the generic finder/brand page and we have a valid response, return it.
                # However, for brand pages, 0 listings might mean we should try the next fallback (finder).
                if listings:
                    return listings, nb_pages, total
                
                # If no listings found on a specific/brand page, logging it and continuing could be good
                logger.info(f"Wheelers LB: 0 results at {url}, trying next fallback...")
                
            except Exception as e:
                logger.error(f"Wheelers LB failed processing {url}: {e}")
                last_error = e
                continue
        
        return [], 0, 0

    def _build_candidate_urls(self, filters, page):
        """
        Constructs a list of candidate URLs to try in order.
        1. Specific Brand+Model
        2. Brand Page
        3. Global Search (for model)
        4. Generic Finder
        """
        make_raw = (filters.get("make") or "").strip().lower()
        model_raw = (filters.get("model") or "").strip().lower()
        year_min = filters.get("year_min")
        year_max = filters.get("year_max")

        # Normalize slugs
        make_slug = self._slugify(make_raw)
        model_slug = self._slugify(model_raw)
        
        candidates = []
        
        # Helper to attach query params
        def with_params(base_path):
            params = []
            if page > 1:
                params.append(f"page={page}")
            
            # Add year range as multiple year[] parameters
            if year_min and year_max and year_min <= year_max:
                for y in range(year_min, year_max + 1):
                    params.append(f"year[]={y}")
            elif year_min:
                params.append(f"year={year_min}")
            elif year_max:
                params.append(f"year={year_max}")
            
            qs = "&".join(params)
            return f"{BASE_URL}{base_path}?{qs}" if qs else f"{BASE_URL}{base_path}"

        # 1. Specific Brand + Model
        if make_slug and model_slug:
             candidates.append(with_params(f"/en/lebanon/cars/brands/{make_slug}/{model_slug}/"))

        # 2. Brand Page
        if make_slug:
             candidates.append(with_params(f"/en/lebanon/cars/brands/{make_slug}/"))

        # 3. Global Search for Model
        if model_raw:
             # Browser investigation shows /search?q=... fails, but /finder/?q=... works.
             # We use the finder endpoint with the query param for the model.
             search_path = "/en/lebanon/cars/finder/"
             params = [f"q={model_raw}"]
             if page > 1:
                 params.append(f"page={page}")
             
             # Add year range as multiple year[] parameters
             if year_min and year_max and year_min <= year_max:
                 for y in range(year_min, year_max + 1):
                     params.append(f"year[]={y}")
             elif year_min:
                 params.append(f"year={year_min}")
             elif year_max:
                 params.append(f"year={year_max}")
                  
             qs = "&".join(params)
             candidates.append(f"{BASE_URL}{search_path}?{qs}")

        # 4. Generic Finder
        candidates.append(with_params("/en/lebanon/cars/finder/"))
            
        return candidates

    def _fetch_with_retry(self, url):
        """Fetch URL with retries and error handling."""
        for attempt in range(MAX_RETRIES):
            try:
                logger.info(f"Fetching Wheelers LB: {url} (Attempt {attempt+1}/{MAX_RETRIES})")
                response = self.session.get(url, timeout=TIMEOUT)
                
                if response.status_code == 404:
                    logger.warning(f"Wheelers LB 404 at {url}")
                    return None
                
                response.raise_for_status()
                return response.text
            except requests.RequestException as e:
                logger.warning(f"Wheelers LB request error: {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY * (attempt + 1)) # Exponential backoff
                else:
                    logger.error(f"Wheelers LB failed after {MAX_RETRIES} attempts.")
                    return None
        return None

    def _parse_html(self, html, current_page, filters):
        soup = BeautifulSoup(html, "html.parser")
        listings = []

        # Parse Listings
        # Selector: .result-grid-item
        items = soup.select(".result-grid-item")
        
        for item in items:
            try:
                listing = self._parse_card(item)
                if not listing:
                    continue
                
                # Filter Logic
                if not self._passes_filters(listing, filters):
                    continue
                
                listing["currency"] = self.currency
                listing["scraped_at"] = datetime.now().isoformat()
                listing["source"] = "wheelers_lb"
                listings.append(listing)
            except Exception as e:
                logger.debug(f"Wheelers LB item parse error: {e}")
                continue

        # Deduplicate
        unique = []
        seen = set()
        for l in listings:
            # Use URL or Title+Price as generic key
            key = l.get("listing_url") or (l.get("title") + str(l.get("price")))
            if key not in seen:
                seen.add(key)
                unique.append(l)

        # Pagination detection
        nb_pages = self._extract_max_page(soup, current_page)
        
        # If we have results but detected pages < current, assume at least current
        if unique and nb_pages < current_page:
            nb_pages = current_page

        return unique, nb_pages, len(unique)

    def _parse_card(self, item):
        """Robust parsing of a single card element."""
        
        # --- Title ---
        # h3.result-grid-brand
        brand_el = item.select_one("h3.result-grid-brand")
        brand_text = brand_el.get_text(strip=True) if brand_el else ""
        
        # --- Variant ---
        # h3.result-grid-model
        model_el = item.select_one("h3.result-grid-model")
        model_text = model_el.get_text(strip=True) if model_el else ""
        
        full_title = f"{brand_text} {model_text}".strip()
        if not full_title:
            return None

        # --- Year ---
        # Extract from title safely
        year = "N/A"
        year_match = re.search(r"\b(20\d{2}|19\d{2})\b", full_title)
        if year_match:
            year = year_match.group(1)

        # --- Price ---
        # h3.car-price
        price = None
        price_el = item.select_one("h3.car-price")
        if price_el:
            raw_price = price_el.get_text(strip=True)
            # Remove non-numeric chars except digits
            # Handle "USD 57,000" -> 57000
            digits = re.sub(r"[^\d]", "", raw_price)
            if digits:
                price = int(digits)

        # --- Listing URL ---
        # .btn-price-more-details or any link in .result-grid-thumbnails
        listing_url = "N/A"
        link_el = item.select_one(".btn-price-more-details")
        if not link_el:
             link_el = item.select_one(".result-grid-thumbnails a")
        
        if link_el:
            href = link_el.get("href", "")
            listing_url = self._make_absolute_url(href)

        # --- Image ---
        # .result-grid-thumbnails img
        image_url = "N/A"
        img_el = item.select_one(".result-grid-thumbnails img")
        if img_el:
            # Prefer data-src (lazy load) over src
            src = img_el.get("data-src") or img_el.get("src") or ""
            # Filter out grey placeholders if possible
            if src and "grey" not in src.lower():
                image_url = self._make_absolute_url(src)

        # --- Dealer / Location ---
        # .dealer-info a
        location = "Lebanon"
        dealer_el = item.select_one(".dealer-info a")
        if dealer_el:
            location = dealer_el.get_text(strip=True)

        return {
            "title": full_title,
            "price": price,
            "year": year,
            "mileage": "N/A", # Wheelers is new cars usually
            "location": location,
            "listing_url": listing_url,
            "image": image_url,
            "image_url": image_url,
        }

    def _extract_max_page(self, soup, current_page):
        """Extract highest page number from .pagination."""
        pagination = soup.select(".pagination a")
        if not pagination:
            return 1
        
        max_p = 1
        for a in pagination:
            href = a.get("href", "")
            # Look for page=N
            m = re.search(r"[?&]page=(\d+)", href)
            if m:
                p = int(m.group(1))
                if p > max_p:
                    max_p = p
        return max_p

    def _passes_filters(self, listing, filters):
        """Client-side filtering for robust matching."""
        
        # Title handling
        title_lower = listing["title"].lower()
        if not title_lower:
            return False

        # Make is usually handled by URL, but double check title
        make_query = (filters.get("make") or "").lower()
        if make_query and make_query not in title_lower:
             return False

        # Strict Model Token Matching
        model_query = (filters.get("model") or "").lower()
        if model_query:
            # Normalize query: "Land Rover" -> ["land", "rover"]
            query_tokens = set(re.findall(r"\w+", model_query))
            
            # Normalize title: "Land Rover Defender 110" -> ["land", "rover", "defender", "110"]
            title_tokens = set(re.findall(r"\w+", title_lower))
            
            # All query tokens must be present in title
            # e.g. Query "Civic" -> Title "Honda Civic" (Match)
            # e.g. Query "CT4" -> Title "Cadillac CT4" (Match)
            # e.g. Query "CT" -> Title "Cadillac CT4" (No Match, "ct" is not in title_tokens)
            if not query_tokens.issubset(title_tokens):
                return False

        # Year
        year_min = filters.get("year_min")
        year_max = filters.get("year_max")
        listing_year = listing.get("year")
        
        if listing_year and str(listing_year).isdigit():
            y = int(listing_year)
            if year_min and y < year_min:
                return False
            if year_max and y > year_max:
                return False

        # Price
        price_min = filters.get("price_min")
        price_max = filters.get("price_max")
        price = listing.get("price")
        
        if price is not None:
             if price_min and price < price_min:
                 return False
             if price_max and price > price_max:
                 return False
                 
        return True

    def _slugify(self, text):
        """Turn text into url-safe slug (hyphenated)."""
        if not text:
            return ""
        # Generic slugify: "Land Rover" -> "land-rover"
        # "Mercedes-Benz" -> "mercedes-benz"
        s = text.lower()
        s = re.sub(r"[^a-z0-9]+", "-", s)
        return s.strip("-")

    def _make_absolute_url(self, href):
        """Ensure URL is absolute."""
        if not href:
            return ""
        if href.startswith("http"):
            return href
        if href.startswith("/"):
            return f"{BASE_URL}{href}"
        return f"{BASE_URL}/{href}"
