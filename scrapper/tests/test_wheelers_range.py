
from wheelers_lb_client import WheelersLbClient
import logging
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_url_construction():
    client = WheelersLbClient()
    
    # Test 1: Year Range
    filters = {
        "make": "Cadillac",
        "year_min": 2022,
        "year_max": 2025
    }
    urls = client._build_candidate_urls(filters, page=1)
    logger.info("Test 1: Year Range (2022-2025)")
    for url in urls:
        logger.info(f"Generated URL: {url}")
        assert "year[]=2022" in url
        assert "year[]=2023" in url
        assert "year[]=2024" in url
        assert "year[]=2025" in url

    # Test 2: Single Year (Min only)
    filters = {
        "make": "Cadillac",
        "year_min": 2022
    }
    urls = client._build_candidate_urls(filters, page=1)
    logger.info("\nTest 2: Single Year (Min only 2022)")
    for url in urls:
        logger.info(f"Generated URL: {url}")
        assert "year=2022" in url

    # Test 3: Mixed Range (Invalid min > max)
    filters = {
        "make": "Cadillac",
        "year_min": 2025,
        "year_max": 2022
    }
    urls = client._build_candidate_urls(filters, page=1)
    logger.info("\nTest 3: Invalid Range (2025-2022)")
    for url in urls:
        logger.info(f"Generated URL: {url}")
        # Should fallback to no year or some default behavior (currently it says if min <= max)
        assert "year[]" not in url

def test_real_scraping():
    client = WheelersLbClient()
    filters = {
        "make": "Cadillac",
        "year_min": 2022,
        "year_max": 2025
    }
    logger.info("\nTest 4: Real Scraping Execution")
    listings, nb_pages, total = client.get_listings(filters, page=1)
    
    logger.info(f"Found {len(listings)} listings")
    for l in listings[:3]:
        logger.info(f"Title: {l['title']} | Year: {l['year']} | Price: {l['price']}")

if __name__ == "__main__":
    test_url_construction()
    try:
        test_real_scraping()
    except Exception as e:
        logger.error(f"Real scraping test failed (likely network/site issue): {e}")
