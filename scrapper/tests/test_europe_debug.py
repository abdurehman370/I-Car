import logging
import json
from europe_client import EuropeClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_europe_debug():
    client = EuropeClient()
    
    # Test Case 1: BMW i8 Road (previously 404)
    print("\n--- Testing BMW i8 Road (Synonym Check) ---")
    filters = {
        "make": "BMW",
        "model": "i8",
        "variant": "Road",
        "year_min": 2018
    }
    try:
        url = client.config["base_url_template"].format(tld="de") + "/lst/bmw/i8?body=2&fregfrom=2018"
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = client.session.get(url, headers=headers)
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, "html.parser")
        articles = soup.find_all("article", {"data-testid": "list-item"})
        if articles:
            print("\n--- RAW ARTICLE DUMP (First 1000 chars) ---")
            print(str(articles[0])[:1000])
            print("\n--- LINK TAGS IN ARTICLE ---")
            for a in articles[0].find_all("a", href=True):
                print(f"A Tag: {a.get('class')} | Href: {a.get('href')}")
        
        listings, nb_pages, total = client.get_listings(filters, country_name="Germany")
        print(f"Total results: {len(listings)}")
        if listings:
            for idx, item in enumerate(listings[:3]):
                print(f"Listing {idx+1}: {item['title']} | {item['price']} EUR")
                print(f"  URL: {item['listing_url']}")
                assert item['listing_url'] != "N/A", "Listing URL is N/A!"
        else:
            print("No listings found (but check if it was a 404).")
    except Exception as e:
        print(f"Test failed: {e}")

    # Test Case 2: Organic vs Sponsored card check
    print("\n--- Testing URL Extraction Robustness ---")
    filters = {
        "make": "Volkswagen",
        "model": "Golf",
        "year_min": 2020
    }
    try:
        listings, _, _ = client.get_listings(filters, country_name="Germany")
        print(f"Total results: {len(listings)}")
        na_count = sum(1 for l in listings if l['listing_url'] == "N/A")
        print(f"N/A URLs found: {na_count}")
        if na_count > 0:
            print("FAIL: Some URLs are still N/A")
        else:
            print("PASS: No N/A URLs found")
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    test_europe_debug()
