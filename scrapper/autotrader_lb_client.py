"""
Autotrader Lebanon (www.autotrader.com.lb) scraper client.
Fetches car listings via HTML scraping. Site may be JS-heavy; returns [] on failure.
"""
import requests
from bs4 import BeautifulSoup
import re
import logging
from datetime import datetime
from config import REGION_CONFIG, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)

BASE_URL = "https://www.autotrader.com.lb"
# Correct path is /cars/ (not /items/cars)
CARS_PATH = "/cars"
TIMEOUT = min(20, DEFAULT_TIMEOUT)


class AutotraderLbClient:
    def __init__(self, proxy=None):
        self.config = REGION_CONFIG.get("Lebanon", {})
        self.currency = self.config.get("currency", "$")
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })
        if proxy:
            self.session.proxies = {"http": proxy, "https": proxy}
            logger.info(f"Autotrader LB using proxy: {proxy}")

    def get_listings(self, filters, page=1):
        """Fetch car listings from Autotrader Lebanon. Returns (listings, nb_pages, total_hits)."""
        make_raw = (filters.get("make") or "").strip().title()
        
        # AutoTrader Lebanon Brand Mapping
        SLUG_MAP = {
            "Mercedes": "mercedes-benz",
            "Bmw": "bmw",
            "Vw": "volkswagen",
            "Range Rover": "land-rover",
        }
        
        make = SLUG_MAP.get(make_raw, make_raw.lower().replace(" ", "-"))
        
        # Model to Series/Class mapping for AutoTrader
        # This helps avoid 404s for specific model numbers
        MODEL_SERIES_MAP = {
            "320": "3-series", "325": "3-series", "328": "3-series", "330": "3-series", "335": "3-series",
            "520": "5-series", "525": "5-series", "530": "5-series", "535": "5-series",
            "730": "7-series", "740": "7-series", "750": "7-series",
            "c300": "c-class", "c250": "c-class", "c200": "c-class",
            "e300": "e-class", "e350": "e-class", "e250": "e-class", "e200": "e-class",
            "s500": "s-class", "s550": "s-class", "s600": "s-class",
        }
        
        model_raw = (filters.get("model") or "").strip().lower()
        model_query_clean = re.sub(r'\s+', '', model_raw)
        
        # Try mapped series, otherwise clean the model slug
        model_slug = MODEL_SERIES_MAP.get(model_query_clean)
        
        if not model_slug:
            stop_words = {"benz", "series", "model", "cars", "car"}
            model_parts = [p for p in re.split(r'[^a-zA-Z0-9]', model_raw) if p and p not in stop_words]
            model_slug = "-".join(model_parts)
        
        # Autotrader usually uses /cars/{make}/{model}
        urls_to_try = []
        if make and model_slug:
            urls_to_try.append(f"{BASE_URL}/cars/{make}/{model_slug}")
        
        if make:
            urls_to_try.append(f"{BASE_URL}/cars/{make}")
        
        urls_to_try.append(f"{BASE_URL}/cars")
            
        last_error = None
        for base_url in urls_to_try:
            url = f"{base_url}?page={page}" if page > 1 else base_url
            try:
                logger.info(f"Fetching Autotrader LB: {url}")
                response = self.session.get(url, timeout=TIMEOUT)
                if response.status_code == 404:
                    logger.warning(f"Autotrader LB 404 for {url}, trying next fallback...")
                    continue
                response.raise_for_status()
                return self._parse_html(response.text, page)
            except requests.exceptions.RequestException as e:
                last_error = e
                logger.warning(f"Autotrader LB request failed for {url}: {e}")
                continue
        
        if last_error:
             logger.error(f"Autotrader LB all fallbacks failed. Last error: {last_error}")
        return [], 0, 0

    def _parse_html(self, html, current_page):
        soup = BeautifulSoup(html, "html.parser")
        listings = []

        # Use the specific listing-item class identified via browser
        for item in soup.select(".listing-item"):
            try:
                # Link is usually in .tricky-link
                link_el = item.select_one(".tricky-link")
                href = link_el.get("href", "") if link_el else ""
                if not href:
                    # Fallback to any link
                    link_el = item.find("a", href=True)
                    href = link_el.get("href", "") if link_el else ""
                
                if not href:
                    continue

                listing = self._parse_listing_block(item, href)
                if listing and (listing.get("price") or listing.get("title") != "N/A"):
                    listing["currency"] = self.currency
                    listing["scraped_at"] = datetime.now().isoformat()
                    listing["source"] = "autotrader_lb"
                    listings.append(listing)
            except Exception as e:
                logger.debug(f"Autotrader parse item skip: {e}")
                continue

        seen = set()
        unique = []
        for L in listings:
            u = L.get("listing_url", "") or L.get("title", "")
            if u not in seen:
                seen.add(u)
                unique.append(L)

        nb_pages = max(current_page, 1)
        return unique, nb_pages, len(unique)

    def _parse_listing_block(self, item_el, href):
        listing_url = href if href.startswith("http") else f"{BASE_URL}{href}" if href.startswith("/") else f"{BASE_URL}/{href}"

        # Try specific title selectors
        title = "N/A"
        title_el = item_el.select_one(".item-custom-title") or item_el.select_one(".item-title")
        if title_el:
            title = title_el.get_text(strip=True)
        else:
            # Fallback to general text
            text = item_el.get_text(separator=" ").strip()
            title = text[:200].strip() or "N/A"

        if len(title) < 5 or title.isdigit() or re.search(r"\(\d+\)$", title) or title.startswith("All "):
            return None

        # Price
        price = None
        price_el = item_el.select_one(".price")
        price_text = price_el.get_text(strip=True) if price_el else item_el.get_text(separator=" ")
        usd_match = re.search(r"\$\s*([\d,]+)|([\d,]+)\s*\$", price_text)
        if usd_match:
            g = usd_match.group(1) or usd_match.group(2)
            price = int(re.sub(r"\D", "", g)) if g else None

        # Year
        year = "N/A"
        year_m = re.search(r"\b(19\d{2}|20\d{2})\b", item_el.get_text(separator=" "))
        if year_m:
            year = year_m.group(1)

        # Mileage and other details
        mileage = "N/A"
        content_text = item_el.get_text(separator=" ")
        km_m = re.search(r"(\d[\d,]*)\s*km|(\d[\d,]+)\s*miles", content_text, re.I)
        if km_m:
            mileage = (km_m.group(1) or km_m.group(2) or "").replace(",", "") or "N/A"

        location = "N/A"
        for loc_word in ["Beirut", "Mount Lebanon", "Tripoli", "Sidon", "Zahle", "Governorate"]:
            if loc_word.lower() in content_text.lower():
                location = loc_word
                break

        image_url = "N/A"
        img = item_el.select_one(".list-item-image img") or item_el.find("img")
        if img and img.get("src"):
            image_url = img["src"] if img["src"].startswith("http") else f"{BASE_URL}{img['src']}"

        return {
            "title": title,
            "price": price,
            "year": year,
            "mileage": mileage,
            "location": location,
            "listing_url": listing_url,
            "image": image_url,
            "image_url": image_url,
        }
