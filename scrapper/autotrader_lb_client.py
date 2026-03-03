"""
Autotrader Lebanon (www.autotrader.com.lb) scraper client.
Fetches car listings via HTML scraping.
"""
import re
import logging
from datetime import datetime
from bs4 import BeautifulSoup

from config import REGION_CONFIG, DEFAULT_TIMEOUT
from core.network import get_request_session, random_delay
from core.matching import match_model, match_variant

logger = logging.getLogger(__name__)

BASE_URL = "https://www.autotrader.com.lb"
TIMEOUT = min(20, DEFAULT_TIMEOUT)


class AutotraderLbClient:
    def __init__(self, proxy=None):
        self.config = REGION_CONFIG.get("Lebanon", {})
        self.currency = self.config.get("currency", "$")
        self.session = get_request_session(proxy=proxy)

    def get_listings(self, filters, page=1):
        """Fetch car listings from Autotrader Lebanon with post-scrape validation."""
        make_query = filters.get("make")
        model_query = filters.get("model")
        variant_query = filters.get("variant")
        
        # AutoTrader Lebanon Brand Mapping for URL slug construction
        SLUG_MAP = {
            "mercedes-benz": "mercedes-benz",
            "bmw": "bmw",
            "volkswagen": "volkswagen",
            "land-rover": "land-rover",
        }
        
        make_slug = SLUG_MAP.get(str(make_query).lower(), str(make_query).lower().replace(" ", "-"))
        
        # Build candidate URLs
        urls_to_try = []
        if make_slug and model_query:
            clean_model_slug = str(model_query).lower().replace(" ", "-")
            urls_to_try.append(f"{BASE_URL}/cars/{make_slug}/{clean_model_slug}")
        
        if make_slug:
            urls_to_try.append(f"{BASE_URL}/cars/{make_slug}")
        
        urls_to_try.append(f"{BASE_URL}/cars")
            
        last_error = None
        for base_url in urls_to_try:
            url = f"{base_url}?page={page}" if page > 1 else base_url
            try:
                random_delay()
                logger.info(f"Fetching Autotrader LB: {url}")
                response = self.session.get(url, timeout=TIMEOUT)
                if response.status_code == 404:
                    logger.warning(f"Autotrader LB 404 for {url}, trying next fallback...")
                    continue
                response.raise_for_status()
                
                raw_listings, nb_pages, total_hits = self._parse_html(response.text, page)
                
                # Strict Model/Variant Validation
                valid_listings = []
                for item in raw_listings:
                    if not match_model(model_query, item.get("title", "")):
                        continue
                    if variant_query and not match_variant(variant_query, item.get("title", ""), item.get("variant", "")):
                        continue
                    valid_listings.append(item)
                
                return valid_listings, nb_pages, total_hits
                
            except Exception as e:
                last_error = e
                logger.warning(f"Autotrader LB request failed for {url}: {e}")
                continue
        
        if last_error:
             logger.error(f"Autotrader LB all fallbacks failed. Last error: {last_error}")
        return [], 0, 0

    def _parse_html(self, html_content, current_page):
        soup = BeautifulSoup(html_content, "html.parser")
        listings = []
        
        for item in soup.select(".listing-item"):
            try:
                link_el = item.select_one(".tricky-link")
                href = link_el.get("href", "") if link_el else ""
                if not href:
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

        nb_pages = max(current_page, 1) # Simplified pagination detection for now
        return listings, nb_pages, len(listings)

    def _parse_listing_block(self, item_el, href):
        listing_url = href if href.startswith("http") else f"{BASE_URL}{href}" if href.startswith("/") else f"{BASE_URL}/{href}"

        title = "N/A"
        title_el = item_el.select_one(".item-custom-title") or item_el.select_one(".item-title")
        if title_el:
            title = title_el.get_text(strip=True)
        else:
            text = item_el.get_text(separator=" ").strip()
            title = text[:200].strip() or "N/A"

        if len(title) < 5 or title.isdigit() or re.search(r"\(\d+\)$", title) or title.startswith("All "):
            return None

        price = None
        price_el = item_el.select_one(".price")
        price_text = price_el.get_text(strip=True) if price_el else item_el.get_text(separator=" ")
        usd_match = re.search(r"\$\s*([\d,]+)|([\d,]+)\s*\$", price_text)
        if usd_match:
            g = usd_match.group(1) or usd_match.group(2)
            price = int(re.sub(r"\D", "", g)) if g else None

        year = "N/A"
        year_m = re.search(r"\b(19\d{2}|20\d{2})\b", item_el.get_text(separator=" "))
        if year_m:
            year = year_m.group(1)

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
