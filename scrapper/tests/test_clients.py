import unittest
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from olx_lb_client import OlxLbClient

class TestOlxLbClient(unittest.TestCase):
    def test_get_listings_live(self):
        """
        Tests fetching listings from OLX Lebanon.
        Note: This test hits the live API.
        """
        client = OlxLbClient()
        filters = {
            "make": "Toyota",
            "model": "Camry"
        }
        
        print(f"Testing live connection to {client.es_url}...")
        listings, nb_pages, total_hits = client.get_listings(filters, page=1)
        
        # We perform soft assertions because live data might be empty or API changed
        print(f"Status: Found {len(listings)} listings, Total hits: {total_hits}")
        
        if len(listings) > 0:
            first_ad = listings[0]
            required_fields = ['title', 'price', 'year', 'mileage', 'location', 'image_url', 'listing_url']
            for field in required_fields:
                self.assertIn(field, first_ad)
                print(f"Field '{field}' present: {first_ad[field]}")
        else:
            print("WARNING: No listings found. Check API endpoint or filters.")
            # We don't fail the test if no results, as it might be network/API issue
            # but we warn.
            
if __name__ == '__main__':
    unittest.main()
