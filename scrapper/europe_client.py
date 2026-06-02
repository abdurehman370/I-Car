import requests
from bs4 import BeautifulSoup
import re
import logging
from datetime import datetime
import statistics
from config import REGION_CONFIG, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)

class EuropeClient:
    def __init__(self, proxy=None):
        self.config = REGION_CONFIG["Europe"]
        self.proxy_token = self.config.get("proxy_token")
        self.session = requests.Session()
        
        if proxy:
            self.session.proxies = {
                "http": proxy,
                "https": proxy
            }
            logger.info(f"Using proxy: {proxy}")

    def get_listings(self, filters, country_name="Germany", page=1):
        """
        Fetches listings from AutoScout24 for the specified country and filters.
        """
        tld = self.config["countries"].get(country_name, "de")
        base_url = self.config["base_url_template"].format(tld=tld)
        
        make = (filters.get('make') or '').lower().replace(' ', '-')
        model_input = (filters.get('model') or '').lower()
        variant_input = (filters.get('variant') or '').lower()
        
        # AutoScout24 normalization for Mercedes classes (e.g. c class -> c klasse)
        if make == "mercedes-benz" or make == "mercedes":
            model_input = model_input.replace("class", "klasse").replace(" ", "-")
        
        
        # Combine model and variant words for body style detection and slugification
        search_words = (model_input + " " + variant_input).split()
        
        # Body Style Detection
        body_id = None
        body_map = {
            "avant": 5, "touring": 5, "estate": 5, "kombi": 5, "station": 5, "variant": 5,
            "coupe": 3,
            "cabrio": 2, "convertible": 2, "spider": 2, "roadster": 2, "road": 2,
            "suv": 6, "offroad": 6, "pickup": 6
        }
        
        other_words = []
        for word in search_words:
            if word in body_map:
                body_id = body_map[word]
            else:
                other_words.append(word)
        
        # Refined Slugification
        # If it's a code-like model (A5, Q7, X5), remove hyphens
        # If it's a name (Golf GTI), keep hyphens
        model_clean = "".join(other_words)
        if len(model_clean) <= 3 and any(c.isdigit() for c in model_clean):
            # Short codes like A5, i8, M3
            model = model_clean.replace('-', '')
        else:
            # Descriptive names like Golf GTI
            # Use only model words for the slug if possible, or include variant if not body style
            model = "-".join(other_words).replace('--', '-')

        year = filters.get('year_min')
        mileage = filters.get('mileage_max')
        
        # Build AutoScout24 URL
        if make and model:
            search_path = f"/lst/{make}/{model}"
        elif make:
            search_path = f"/lst/{make}"
        else:
            search_path = "/lst"
            
        url = f"{base_url}{search_path}"
        
        params = {}
        if body_id: params['body'] = body_id
        if year: params['fregfrom'] = year
        if mileage: params['kmto'] = mileage
        if page > 1: params['page'] = page
        
        import urllib.parse
        target_url = url
        if params:
            # Sort params for consistency
            sorted_params = dict(sorted(params.items()))
            target_url += "?" + urllib.parse.urlencode(sorted_params)

        if self.proxy_token:
            final_url = f"https://api.scrape.do?token={self.proxy_token}&url={target_url}"
            logger.info(f"Using Scrape.do proxy for: {target_url}")
        else:
            final_url = target_url
            logger.info(f"Fetching directly: {final_url}")

        try:
            # Use specific User-Agent for Direct fetches to avoid blocks
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
            }
            response = self.session.get(final_url, headers=headers, timeout=DEFAULT_TIMEOUT)
            response.raise_for_status()
            return self._parse_html(response.text, base_url), 1, 20
        except Exception as e:
            logger.error(f"Europe Scraper failed for {target_url}: {e}")
            return [], 0, 0

    def _parse_html(self, html, base_url):
        soup = BeautifulSoup(html, "html.parser")
        # Support both regular and 'decluttered'/sponsored listings
        articles = soup.find_all("article", {"data-testid": "list-item"})
        if not articles:
            articles = soup.find_all("article")
            
        listings = []
        
        for article in articles:
            try:
                # 1. Primary data extraction via data- attributes (Strongly robust)
                guid_val = article.get("data-guid")
                guid = guid_val[0] if isinstance(guid_val, list) else (guid_val or "")
                d_price_val = article.get("data-price")
                d_price = d_price_val[0] if isinstance(d_price_val, list) else (d_price_val or "")
                d_mileage_val = article.get("data-mileage")
                d_mileage = d_mileage_val[0] if isinstance(d_mileage_val, list) else (d_mileage_val or "")
                d_year_raw_val = article.get("data-first-registration")
                d_year_raw = d_year_raw_val[0] if isinstance(d_year_raw_val, list) else (d_year_raw_val or "")
                
                # Title + Subtitle
                title_base = article.find(class_=re.compile("ListItemTitle_title", re.I))
                subtitle = article.find(class_=re.compile("ListItemTitle_subtitle", re.I))
                title = title_base.get_text(strip=True) if title_base else "N/A"
                if subtitle:
                    title += " " + subtitle.get_text(strip=True)
                
                # If title is still N/A, build from components
                d_make_val = article.get("data-make")
                d_make = d_make_val[0] if isinstance(d_make_val, list) else (d_make_val or "")
                d_model_val = article.get("data-model")
                d_model = d_model_val[0] if isinstance(d_model_val, list) else (d_model_val or "")
                if title == "N/A" and d_make:
                    title = f"{d_make.capitalize()} {d_model.capitalize()}"

                # Price extraction
                price = 0
                if d_price and d_price.isdigit():
                    price = float(d_price)
                else:
                    price_tag = article.find(class_=lambda x: x and "Price_price" in x)
                    if price_tag:
                        price_tag_copy = BeautifulSoup(str(price_tag), "html.parser")
                        for sup in price_tag_copy.find_all(class_=re.compile("superscript", re.I)):
                            sup.decompose()
                        price_text = price_tag_copy.get_text(strip=True)
                        price_clean = price_text.split(',')[0].split('-')[0]
                        price_val = re.sub(r'[^\d]', '', price_clean)
                        price = float(price_val) if price_val else 0

                # Image
                img = article.find("img")
                image_url = "N/A"
                if img:
                    src_val = img.get("src") or img.get("data-src") or "N/A"
                    image_url = src_val[0] if isinstance(src_val, list) else (src_val or "N/A")
                if isinstance(image_url, str) and image_url.startswith("/"):
                    image_url = base_url + image_url

                # Link - Prioritize building from data-guid for robustness
                if guid:
                    listing_url = f"{base_url}/angebote/-{guid}"
                else:
                    link = article.select_one('a[class*="overlay_anchor"], a[class*="ListItemTitle_anchor"], a[class*="ListItem_title"], a[href*="/angebote/"]')
                    href_val = link.get('href') if link else None
                    listing_url = href_val[0] if isinstance(href_val, list) else (href_val or "N/A")
                    if isinstance(listing_url, str) and listing_url.startswith("/"):
                        listing_url = base_url + listing_url

                # Skip if no valid URL found
                if listing_url == "N/A":
                    continue

                # Year / Mileage
                year = "N/A"
                if isinstance(d_year_raw, str) and len(d_year_raw) >= 4:
                    year = d_year_raw.split("-")[-1]
                
                mileage = "N/A"
                if isinstance(d_mileage, str) and d_mileage.isdigit():
                    mileage = d_mileage
                
                # Fallback for Year/Mileage via Pills
                if year == "N/A" or mileage == "N/A":
                    pills = article.find_all(class_=re.compile("ListItemPill_text", re.I))
                    for pill in pills:
                        text = pill.get_text(strip=True)
                        if "km" in text and mileage == "N/A":
                            mileage = re.sub(r'[^\d]', '', text)
                        elif year == "N/A" and re.search(r"(\d{4})", text):
                            year_match = re.search(r"(\d{4})", text)
                            if year_match:
                                year = year_match.group(1)

                # Location parsing - ListItemSeller_address
                location_tag = article.find(class_=re.compile("ListItemSeller_address", re.I))
                location = location_tag.get_text(strip=True) if location_tag else "N/A"
                
                listings.append({
                    "title": title,
                    "price": price,
                    "year": year,
                    "mileage": mileage,
                    "location": location,
                    "listing_url": listing_url,
                    "image": image_url, # Added for consistency
                    "image_url": image_url,
                    "currency": "EUR",
                    "scraped_at": datetime.now().isoformat()
                })
            except Exception as e:
                logger.warning(f"Failed to parse article: {e}")
                continue
                
        return listings

    @staticmethod
    def calculate_valuation(listings, vehicle_input):
        if not listings: return None
        prices = [l['price'] for l in listings if l['price'] > 100] # Ignore outlier/placeholder prices
        if not prices: return None
            
        median_price = statistics.median(prices)
        current_year = datetime.now().year
        
        try:
            vehicle_year = int(vehicle_input.get('year') or current_year)
            actual_km = int(vehicle_input.get('mileage') or 0)
        except (ValueError, TypeError):
            vehicle_year = current_year
            actual_km = 0
            
        years_old = max(0, current_year - vehicle_year)
        expected_km = years_old * 15000
        
        penalty_per_km = 0.03
        over_mileage = max(0, actual_km - expected_km)
        penalty = over_mileage * penalty_per_km
        
        estimated_price = max(0, median_price - penalty)
        
        return {
            "average_price": statistics.mean(prices),
            "median_price": median_price,
            "min_price": min(prices),
            "max_price": max(prices),
            "estimated_price": estimated_price,
            "penalty_applied": penalty,
            "listings_used": len(prices)
        }
