import requests
import random
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (AppleMessenger/7.0; OS X 10.15.7; Build 19H2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

def get_request_session(proxy: Optional[str] = None) -> requests.Session:
    """ Creates a requests Session with randomized User-Agent and optional proxy. """
    session = requests.Session()
    session.headers.update({
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    })
    
    if proxy:
        session.proxies = {"http": proxy, "https": proxy}
        logger.info(f"Session initialized with proxy: {proxy}")
        
    return session

def random_delay(min_sec: float = 1.5, max_sec: float = 3.0):
    """ Adds a randomized sleep delay to avoid anti-bot detection. """
    sleep_time = random.uniform(min_sec, max_sec)
    time.sleep(sleep_time)
