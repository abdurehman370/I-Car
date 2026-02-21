import logging
import json
from carswitch_client import CarSwitchClient
from carabiacars_client import CarAbiaClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_new_sources():
    # 1. Test CarSwitch
    print("\n--- Testing CarSwitch UAE ---")
    cs_client = CarSwitchClient()
    try:
        listings, nb_pages, total = cs_client.get_listings("Mercedes", "")
        print(f"Total found: {total}, Pages: {nb_pages}")
        if listings:
            for idx, item in enumerate(listings[:5]):
                print(f"Listing {idx+1}: {item['title']} | {item['price']} {item['currency']} | {item['mileage']} KM")
                print(f"  URL: {item['listing_url']}")
        else:
            print("No listings found for CarSwitch.")
    except Exception as e:
        print(f"CarSwitch Error: {e}")

    # 2. Test CarAbia
    print("\n--- Testing CarAbia UAE ---")
    ca_client = CarAbiaClient()
    try:
        url = ca_client._build_url("Toyota")
        resp = ca_client.scraper.get(url)
        print(f"Status Code: {resp.status_code}")
        # print first 500 chars of body
        print(f"Body snippet: {resp.text[:500]}")
        # search for 'product'
        import re
        classes = re.findall(r'class="([^"]*product[^"]*)"', resp.text)
        print(f"Found product classes: {set(classes)}")
        
        listings, nb_pages, total = ca_client.get_listings("Toyota", "")
        print(f"Total found: {total} (estimated), Pages: {nb_pages}")
        if listings:
            for idx, item in enumerate(listings[:2]):
                print(f"Listing {idx+1}: {item['title']} | {item['price']} {item['currency']} | {item['mileage']} KM")
                print(f"  URL: {item['listing_url']}")
                print(f"  Image: {item['image']}")
        else:
            print("No listings found for CarAbia.")
    except Exception as e:
        print(f"CarAbia Error: {e}")

if __name__ == "__main__":
    test_new_sources()
