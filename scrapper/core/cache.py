import redis
import json
import hashlib
import logging
import os
from typing import Optional, Any

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CACHE_ENABLED = os.getenv("CACHE_ENABLED", "true").lower() == "true"
CACHE_TTL = 600  # 10 minutes

class CacheManager:
    def __init__(self):
        self.client = None
        if CACHE_ENABLED:
            try:
                self.client = redis.from_url(REDIS_URL, decode_responses=True)
                self.client.ping()
                logger.info("Connected to Redis for caching.")
            except Exception as e:
                logger.warning(f"Redis connection failed, caching disabled: {e}")
                self.client = None

    def _generate_key(self, params: dict) -> str:
        """Generates a stable cache key from query parameters."""
        # Sort keys for consistency
        sorted_params = sorted(params.items())
        param_string = json.dumps(sorted_params)
        return "icar:scrape:" + hashlib.md5(param_string.encode()).hexdigest()

    def get(self, params: dict) -> Optional[Any]:
        """Retrieves cached result if exists."""
        if not self.client:
            return None
            
        key = self._generate_key(params)
        try:
            cached_data = self.client.get(key)
            if cached_data:
                logger.info(f"Cache hit for key: {key}")
                return json.loads(cached_data)
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            
        return None

    def set(self, params: dict, data: Any):
        """Stores result in cache with TTL."""
        if not self.client:
            return
            
        key = self._generate_key(params)
        try:
            self.client.setex(key, CACHE_TTL, json.dumps(data))
            logger.info(f"Cached result for key: {key}")
        except Exception as e:
            logger.error(f"Cache set error: {e}")

# Singleton instance
cache = CacheManager()
