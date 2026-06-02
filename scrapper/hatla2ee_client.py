"""
Hatla2ee UAE (uae.hatla2ee.com) scraper client.
Uses cloudscraper with a browser profile to bypass Cloudflare.
Parses Next.js React Server Components (RSC) payloads for structured data extraction.
"""
import json
import re
import logging
import cloudscraper
from bs4 import BeautifulSoup
from datetime import datetime
from config import REGION_CONFIG, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)

BASE_URL = "https://uae.hatla2ee.com"
TIMEOUT = min(30, DEFAULT_TIMEOUT) # Hatla2ee can be slow via cloudscraper

class Hatla2eeClient:
    def __init__(self, proxy=None):
        self.config = REGION_CONFIG["UAE"]
        self.currency = self.config["currency"]
        
        # Initialize cloudscraper with a browser profile to bypass Cloudflare
        self.scraper = cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'linux',
                'desktop': True
            }
        )
        
        if proxy:
            self.scraper.proxies = {"http": proxy, "https": proxy}
            logger.info(f"Hatla2eeClient initialized with proxy: {proxy}")

    def _build_url(self, make, model, page=1, **kwargs):
        """
        Builds the Hatla2ee search URL.
        Slug format: /en/car/[make]/[model]/page/[number]
        """
        make_slug = make.lower().replace(" ", "-") if make else ""
        model_slug = model.lower().replace(" ", "-") if model else ""
        
        path = "/en/car"
        if make_slug:
            path += f"/{make_slug}"
            if model_slug:
                path += f"/{model_slug}"
        
        if page > 1:
            path += f"/page/{page}"
            
        params = []
        if kwargs.get('year_min'):
            params.append(f"yf={kwargs['year_min']}")
        if kwargs.get('year_max'):
            params.append(f"yt={kwargs['year_max']}")
        if kwargs.get('price_min'):
            params.append(f"pf={kwargs['price_min']}")
        if kwargs.get('price_max'):
            params.append(f"pt={kwargs['price_max']}")
        if kwargs.get('mileage_max'):
            params.append(f"kmt={kwargs['mileage_max']}")
            
        url = f"{BASE_URL}{path}"
        if params:
            url += "?" + "&".join(params)
            
        return url

    def get_listings(self, make, model, page=1, **kwargs):
        """Fetches and parses listings from Hatla2ee UAE."""
        url = self._build_url(make, model, page, **kwargs)
        
        try:
            logger.info(f"Fetching Hatla2ee UAE: {url}")
            response = self.scraper.get(url, timeout=TIMEOUT)
            response.raise_for_status()
            
            return self._parse_rsc_and_html(response.text, page, make)
            
        except Exception as e:
            logger.error(f"Hatla2ee request/parse failed for {url}: {e}")
            return [], 0, 0

    def _parse_rsc_and_html(self, html, current_page, make=None):
        """
        Extracts listings from Next.js RSC payloads and fallback HTML.
        """
        listings = []
        
        # 1. Try extracting from RSC payloads (most structured)
        # self.__next_f.push([1,"..."])
        rsc_payloads = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', html)
        combined_rsc = "".join(rsc_payloads).replace('\\"', '"').replace('\\\\', '\\')
        
        # Look for the listing objects: {"gaEvent":"classifieds_listing_click", ...}
        # These are usually buried in the RSC string.
        # Use DOTALL because RSC payloads can span multiple lines
        pattern = r'\{"gaEvent":"classifieds_listing_click".*?"id":(\d+)\}'
        matches = re.finditer(pattern, combined_rsc, re.DOTALL)
        
        listing_objs = []
        seen_ids = set()
        for match in matches:
            try:
                # To find the full object, we need to balance braces or just try to parse a larger chunk
                # Heuristic: Find the end of this object by checking braces
                start_idx = match.start()
                brace_count = 0
                end_idx = start_idx
                for i in range(start_idx, len(combined_rsc)):
                    if combined_rsc[i] == '{':
                        brace_count += 1
                    elif combined_rsc[i] == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_idx = i + 1
                            break
                
                if end_idx > start_idx:
                    obj_str = combined_rsc[start_idx:end_idx]
                    obj = json.loads(obj_str)
                    item = obj.get("item", {})
                    listing_id = str(item.get("id"))
                    
                    if listing_id and listing_id not in seen_ids:
                        seen_ids.add(listing_id)
                        listing_objs.append(obj)
            except:
                continue

        for obj in listing_objs:
            try:
                item = obj.get("item", {})
                listing_id = str(item.get("id"))
                
                # Now find the detail block which has title, images, href
                # There can be multiple blocks for the same ID (one skeleton with references, one with data)
                # We'll search for all blocks containing the ID and "href"
                detail_matches = re.finditer(rf'\{{"href":"/[^"]*/{listing_id}".*?\}}', combined_rsc, re.DOTALL)
                detail = {}
                for dm in detail_matches:
                    try:
                        d_start = dm.start()
                        d_brace = 0
                        d_end = d_start
                        for i in range(d_start, len(combined_rsc)):
                            if combined_rsc[i] == '{':
                                d_brace += 1
                            elif combined_rsc[i] == '}':
                                d_brace -= 1
                                if d_brace == 0:
                                    d_end = i + 1
                                    break
                        if d_end > d_start:
                            d_obj = json.loads(combined_rsc[d_start:d_end])
                            # If this block has 'km' or a non-reference 'specificationList', it's the data block
                            if d_obj.get("km") is not None or (isinstance(d_obj.get("specificationList"), list) and d_obj.get("specificationList")):
                                detail = d_obj
                                break
                            # Otherwise, keep it as a fallback if it has more keys than what we currently have
                            if len(d_obj.keys()) > len(detail.keys()):
                                detail = d_obj
                    except:
                        continue
                
                # If we still don't have a title, refine the search
                title = detail.get("title")
                if not title or "View All" in title:
                     # Attempt to find another block for this ID that might have the title
                     title_pattern = rf'"title":\s*"([^"]*?{item.get("year", "")}[^"]*?)".*?"listing_id":\s*{listing_id}'
                     tm = re.search(title_pattern, combined_rsc, re.DOTALL)
                     if tm:
                         title = tm.group(1)
                
                if not title:
                     title = f"{item.get('make', {}).get('slug', '').capitalize()} {item.get('model', {}).get('slug', '').capitalize()} {item.get('year', '')}".strip()

                item_make = item.get("make", {}).get("slug", "").lower()
                expected_make = make.lower().replace(" ", "-") if make else ""
                
                # Check for Mercedes shorthand (sometimes 'mercedes' instead of 'mercedes-benz')
                if expected_make == "mercedes-benz":
                     expected_make = "mercedes"
                     
                if expected_make and expected_make not in item_make:
                    continue

                # Construct the listing dictionary
                listing = {
                    "id": listing_id,
                    "title": title,
                    "price": str(item.get("price", "")),
                    "year": str(item.get("year", "")),
                    "mileage": str(detail.get("km", "")) if detail.get("km") is not None else "0",
                    "currency": self.currency,
                    "location": item.get("location", {}).get("breadcrumbs", [{}])[0].get("title", "UAE"),
                    "listing_url": f"{BASE_URL}{detail.get('href', f'/en/car/listing/{listing_id}')}" if detail.get("href") else f"{BASE_URL}/en/car/listing/{listing_id}",
                    "source": "hatla2ee",
                    "make": item.get("make", {}).get("slug", ""),
                    "model": item.get("model", {}).get("slug", ""),
                    "image": detail.get("images", [""])[0] if detail.get("images") else "",
                    "image_url": detail.get("images", [""])[0] if detail.get("images") else "", # Added for compatibility
                    "scraped_at": datetime.now().isoformat()
                }

                # If we still don't have km, try a direct regex search in the RSC for km near the ID
                if listing.get("mileage") == "0":
                    # Look for "km":123 followed by the listing ID in a URL or ID field
                    # or listing ID followed by "km":123
                    km_patterns = [
                        rf'"km":\s*(\d+).*?/{listing_id}"', # km followed by URL with ID
                        rf'/{listing_id}".*?"km":\s*(\d+)', # URL with ID followed by km
                        rf'"id":\s*{listing_id}.*?"km":\s*(\d+)', # ID field followed by km
                        rf'"km":\s*(\d+).*?"id":\s*{listing_id}'  # km followed by ID field
                    ]
                    for kp in km_patterns:
                        km_m = re.search(kp, combined_rsc, re.DOTALL)
                        if km_m:
                            listing["mileage"] = km_m.group(1)
                            break
                
                # If we still don't have km, check for specificationList in raw text matching the ID
                if listing.get("mileage") == "0":
                     spec_km_pattern = rf'/{listing_id}".*?"specificationList":\[.*?"label":"(\d+)","slug":"km"'
                     skm_m = re.search(spec_km_pattern, combined_rsc, re.DOTALL)
                     if skm_m:
                         listing["mileage"] = skm_m.group(1)
                
                # Double check top-level item for km
                if listing.get("mileage") == "0" and item.get("km"):
                    listing["mileage"] = str(item.get("km"))
                
                # Cleanup mileage
                m_str = str(listing.get("mileage", "0")).replace(",", "")
                m_digits = re.sub(r"[^\d]", "", m_str)
                listing["mileage"] = m_digits if m_digits else "0"
                
                # Debug logging if mileage is 0
                if listing["mileage"] == "0":
                    logger.debug(f"Mileage 0 for {listing_id}. Detail keys: {list(detail.keys()) if detail else 'None'}")
                
                listings.append(listing)
            except Exception as e:
                logger.debug(f"Hatla2ee item parse skip: {e}")
                continue

        # 2. Extract total pages from RSC
        nb_pages = current_page
        pagination_match = re.search(r'"totalPages":(\d+)', combined_rsc)
        if pagination_match:
            nb_pages = int(pagination_match.group(1))
            
        total_hits = len(listings) * nb_pages # Estimated
        
        logger.info(f"Hatla2ee parsed {len(listings)} listings from Page {current_page} (Total Pages: {nb_pages})")
        return listings, nb_pages, total_hits
