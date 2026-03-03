"""
Refactored Wheelers.me Lebanon scraper client.
Production-ready with robust URL building, parsing, and retry logic.
"""
import re
import logging
from datetime import datetime
from bs4 import BeautifulSoup

from config import REGION_CONFIG, DEFAULT_TIMEOUT
from core.network import get_request_session, random_delay
from core.matching import match_model, match_variant

logger = logging.getLogger(__name__)

BASE_URL = "https://www.wheelers.me"
TIMEOUT = min(30, DEFAULT_TIMEOUT)
MAX_RETRIES = 3

class WheelersLbClient:
    def __init__(self, proxy=None):
        self.config = REGION_CONFIG.get("Lebanon", {})
        self.currency = self.config.get("currency", "$")
        self.session = get_request_session(proxy=proxy)

    def get_listings(self, filters, page=1):
        """Fetch car listings from Wheelers.me Lebanon with post-scrape validation."""
        urls_to_try = self._build_candidate_urls(filters, page)
        model_query = filters.get("model")
        variant_query = filters.get("variant")
        
        last_error = None
        for url in urls_to_try:
            try:
                random_delay()
                html = self._fetch_with_retry(url)
                if not html:
                    continue
                
                raw_listings, nb_pages, total = self._parse_html(html, page)
                
                # Strict Model/Variant Validation
                valid_listings = []
                for item in raw_listings:
                    if not match_model(model_query, item.get("title", "")):
                        continue
                    if variant_query and not match_variant(variant_query, item.get("title", ""), item.get("variant", "")):
                        continue
                    valid_listings.append(item)
                
                if valid_listings:
                    return valid_listings, nb_pages, total
                
                logger.info(f"Wheelers LB: 0 valid results at {url}, trying next fallback...")
                
            except Exception as e:
                logger.error(f"Wheelers LB failed processing {url}: {e}")
                last_error = e
                continue
        
        return [], 0, 0

    def _build_candidate_urls(self, filters, page):
        """Constructs a list of candidate URLs to try in order."""
        make_raw = (filters.get("make") or "").strip().lower()
        model_raw = (filters.get("model") or "").strip().lower()
        year_min = filters.get("year_min")
        year_max = filters.get("year_max")

        make_slug = self._slugify(make_raw)
        model_slug = self._slugify(model_raw)
        
        candidates = []
        
        def with_params(base_path):
            params = []
            if page > 1:
                params.append(f"page={page}")
            
            if year_min and year_max and year_min <= year_max:
                for y in range(year_min, year_max + 1):
                    params.append(f"year[]={y}")
            elif year_min:
                params.append(f"year={year_min}")
            elif year_max:
                params.append(f"year={year_max}")
            
            qs = "&".join(params)
            return f"{BASE_URL}{base_path}?{qs}" if qs else f"{BASE_URL}{base_path}"

        if make_slug and model_slug:
             candidates.append(with_params(f"/en/lebanon/cars/brands/{make_slug}/{model_slug}/"))

        if make_slug:
             candidates.append(with_params(f"/en/lebanon/cars/brands/{make_slug}/"))

        if model_raw:
             search_path = "/en/lebanon/cars/finder/"
             params = [f"q={model_raw}"]
             if page > 1:
                 params.append(f"page={page}")
             
             if year_min and year_max and year_min <= year_max:
                 for y in range(year_min, year_max + 1):
                     params.append(f"year[]={y}")
             elif year_min:
                 params.append(f"year={year_min}")
             elif year_max:
                 params.append(f"year={year_max}")
                  
             qs = "&".join(params)
             candidates.append(f"{BASE_URL}{search_path}?{qs}")

        candidates.append(with_params("/en/lebanon/cars/finder/"))
        return candidates

    def _fetch_with_retry(self, url):
        """Fetch URL with retries."""
        for attempt in range(MAX_RETRIES):
            try:
                logger.info(f"Fetching Wheelers LB: {url} (Attempt {attempt+1}/{MAX_RETRIES})")
                response = self.session.get(url, timeout=TIMEOUT)
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                return response.text
            except Exception as e:
                logger.warning(f"Wheelers LB request error: {e}")
                if attempt < MAX_RETRIES - 1:
                    random_delay(2.0, 4.0)
                else:
                    return None
        return None

    def _parse_html(self, html_content, current_page):
        soup = BeautifulSoup(html_content, "html.parser")
        listings = []
        items = soup.select(".result-grid-item")
        
        for item in items:
            try:
                listing = self._parse_card(item)
                if not listing:
                    continue
                
                listing["currency"] = self.currency
                listing["scraped_at"] = datetime.now().isoformat()
                listing["source"] = "wheelers_lb"
                listings.append(listing)
            except Exception as e:
                logger.debug(f"Wheelers LB item parse error: {e}")
                continue

        nb_pages = self._extract_max_page(soup, current_page)
        return listings, nb_pages, len(listings)

    def _parse_card(self, item):
        brand_el = item.select_one("h3.result-grid-brand")
        brand_text = brand_el.get_text(strip=True) if brand_el else ""
        
        model_el = item.select_one("h3.result-grid-model")
        model_text = model_el.get_text(strip=True) if model_el else ""
        
        full_title = f"{brand_text} {model_text}".strip()
        if not full_title:
            return None

        year = "N/A"
        year_match = re.search(r"\b(20\d{2}|19\d{2})\b", full_title)
        if year_match:
            year = year_match.group(1)

        price = None
        price_el = item.select_one("h3.car-price")
        if price_el:
            digits = re.sub(r"[^\d]", "", price_el.get_text(strip=True))
            if digits:
                price = int(digits)

        listing_url = "N/A"
        link_el = item.select_one(".btn-price-more-details") or item.select_one(".result-grid-thumbnails a")
        if link_el:
            listing_url = self._make_absolute_url(link_el.get("href", ""))

        image_url = "N/A"
        img_el = item.select_one(".result-grid-thumbnails img")
        if img_el:
            src = img_el.get("data-src") or img_el.get("src") or ""
            if src and "grey" not in src.lower():
                image_url = self._make_absolute_url(src)

        location = "Lebanon"
        dealer_el = item.select_one(".dealer-info a")
        if dealer_el:
            location = dealer_el.get_text(strip=True)

        return {
            "title": full_title,
            "price": price,
            "year": year,
            "mileage": "N/A",
            "location": location,
            "listing_url": listing_url,
            "image": image_url,
            "image_url": image_url,
        }

    def _extract_max_page(self, soup, current_page):
        pagination = soup.select(".pagination a")
        max_p = current_page
        for a in pagination:
            m = re.search(r"[?&]page=(\d+)", a.get("href", ""))
            if m and int(m.group(1)) > max_p:
                max_p = int(m.group(1))
        return max_p

    def _slugify(self, text):
        if not text:
            return ""
        return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")

    def _make_absolute_url(self, href):
        if not href or href.startswith("http"):
            return href or ""
        return f"{BASE_URL}{href}" if href.startswith("/") else f"{BASE_URL}/{href}"
