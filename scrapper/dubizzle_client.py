import requests
import json
import logging
import time
import random
import os
from config import (
    ALGOLIA_BASE_URL, DEFAULT_HEADERS, DEFAULT_TIMEOUT,
    MIN_DELAY, MAX_DELAY, COOKIES_FILE
)

logger = logging.getLogger(__name__)

class DubizzleClient:
    def __init__(self, proxy=None):
        self.session = requests.Session()
        self.session.headers.update(DEFAULT_HEADERS)
        self.proxy = proxy
        if proxy:
            self.session.proxies = {
                "http": proxy,
                "https": proxy
            }
            logger.info(f"Using proxy: {proxy}")
        
        self.load_cookies()

    def load_cookies(self):
        """Loads cookies from a JSON file if it exists."""
        if os.path.exists(COOKIES_FILE):
            try:
                with open(COOKIES_FILE, 'r') as f:
                    cookies_list = json.load(f)
                    for cookie in cookies_list:
                        self.session.cookies.set(
                            cookie['name'], 
                            cookie['value'], 
                            domain=cookie.get('domain', '.dubizzle.com')
                        )
                logger.info(f"Successfully loaded cookies from {COOKIES_FILE}")
            except Exception as e:
                logger.warning(f"Failed to load cookies from {COOKIES_FILE}: {e}")
        else:
            logger.info("No cookies.json found. Proceeding without custom cookies.")

    def search(self, payload):
        """Executes a search request to Algolia."""
        try:
            # Respect rate limits with a small random delay
            time.sleep(random.uniform(MIN_DELAY, MAX_DELAY))
            
            response = self.session.post(
                ALGOLIA_BASE_URL,
                json=payload,
                timeout=DEFAULT_TIMEOUT
            )
            
            if response.status_code == 403:
                logger.error("403 Forbidden - Request blocked by security service.")
                return None
            elif response.status_code == 429:
                logger.warning("429 Too Many Requests - Rate limited. Consider increasing delays.")
                return None
                
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API Request failed: {e}")
            return None

    def get_listings(self, payload):
        """Extracts hits from the Algolia response."""
        data = self.search(payload)
        if not data or 'results' not in data:
            return [], 0, 0
            
        results = data['results'][0]
        hits = results.get('hits', [])
        nb_pages = results.get('nbPages', 0)
        total_hits = results.get('nbHits', 0)
        
        return hits, nb_pages, total_hits
