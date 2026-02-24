import logging
import re
import cloudscraper
from bs4 import BeautifulSoup
from datetime import datetime
from config import REGION_CONFIG, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)

BASE_URL = "https://carabiacars.com"

class CarAbiaClient:
    def __init__(self, proxy=None):
        self.config = REGION_CONFIG["UAE"]
        self.currency = self.config["currency"]
        
        # Initialize cloudscraper to bypass Cloudflare
        self.scraper = cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'linux',
                'desktop': True
            }
        )
        
        if proxy:
            self.scraper.proxies = {"http": proxy, "https": proxy}

    def _build_url(self, make, page=1):
        """
        Builds the CarAbia brand search URL.
        Format: /brand/{make}/page-{number}
        """
        make_slug = make.lower().replace(" ", "-") if make else "certified"
        
        if page > 1:
            return f"{BASE_URL}/brand/{make_slug}/page-{page}"
        else:
            return f"{BASE_URL}/brand/{make_slug}"

    def get_listings(self, make, model, page=1, **kwargs):
        """Fetches listings from CarAbia UAE."""
        url = self._build_url(make, page)
        
        try:
            logger.info(f"Fetching CarAbia UAE: {url}")
            response = self.scraper.get(url, timeout=DEFAULT_TIMEOUT)
            response.raise_for_status()
            
            return self._parse_html(response.text, make, model)
            
        except Exception as e:
            logger.error(f"CarAbia request failed for {url}: {e}")
            return [], 0, 0

    def _parse_html(self, html, query_make, query_model):
        soup = BeautifulSoup(html, 'html.parser')
        listings = []
        
        # CarAbia snippets are usually in div.product-snippet or similar
        items = soup.select('div.product-snippet')
        if not items:
            # Fallback if class changed
            items = soup.select('div[class*="product"]')
            
        for item in items:
            try:
                # Title
                title_elem = item.select_one('.product-snippet__title, h3.product-title, .title')
                if not title_elem: continue
                title = title_elem.get_text(strip=True)
                
                # Link
                link_elem = item.select_one('.product-snippet__link, a')
                if not link_elem: continue
                href = link_elem.get('href', '')
                listing_url = href if href.startswith('http') else f"{BASE_URL}{href}"
                
                # ID
                listing_id = ""
                id_match = re.search(r'/sellings/(\d+)_', href)
                if id_match:
                    listing_id = id_match.group(1)
                
                # Price — use span.price__value (most precise) or fallback to full .price text
                price_value_elem = item.select_one('span.price__value')
                if price_value_elem:
                    price = re.sub(r'[^\d]', '', price_value_elem.get_text(strip=True)) or "0"
                else:
                    price_elem = item.select_one('.product-snippet__price, .price, .product-price')
                    price_text = price_elem.get_text(strip=True) if price_elem else "0"
                    price = re.sub(r'[^\d]', '', price_text) or "0"
                
                # Metadata (Year, Mileage) — in ul.stat-line > li.stat-line__item
                specs = item.select('ul.stat-line.product-snippet__stats li.stat-line__item')
                year = ""
                mileage = "0"
                
                for spec in specs:
                    text = spec.get_text(strip=True)
                    if re.match(r'^\d{4}$', text):
                        year = text
                    elif 'km' in text.lower() or 'mile' in text.lower():
                        mileage = re.sub(r'[^\d]', '', text) or "0"
                
                # Image
                img_elem = item.select_one('img')
                image_url = img_elem.get('src', '') if img_elem else ""
                
                # Prepend base URL if relative
                if image_url and not image_url.startswith('http'):
                    image_url = f"{BASE_URL}{image_url}"
                
                # Extract make/model from title if not already present
                # Very simple heuristic
                m_make = query_make.lower() if query_make else ""
                m_model = query_model.lower() if query_model else ""
                
                listing = {
                    "id": listing_id,
                    "title": title,
                    "price": price,
                    "year": year,
                    "mileage": mileage,
                    "currency": self.currency,
                    "location": "UAE",
                    "listing_url": listing_url,
                    "source": "carabia",
                    "make": m_make,
                    "model": m_model,
                    "image": image_url,
                    "image_url": image_url,
                    "scraped_at": datetime.now().isoformat()
                }
                
                # Optional: Refine model if query_model provided
                if query_model and query_model.lower() not in title.lower():
                    continue # Skip if model mismatch
                
                listings.append(listing)
                
            except Exception as e:
                logger.debug(f"CarAbia item parse error: {e}")
                continue
                
        # Pagination
        nb_pages = 1
        pagination = soup.select('.pagination a')
        for p in pagination:
            p_text = p.get_text(strip=True)
            if p_text.isdigit():
                nb_pages = max(nb_pages, int(p_text))
                
        return listings, nb_pages, len(listings) * nb_pages # Estimated
