import unittest
import sys
import os
from datetime import datetime

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from europe_client import EuropeClient

class TestEuropeClient(unittest.TestCase):
    def setUp(self):
        self.client = EuropeClient()
        self.sample_filters = {
            "make": "Volkswagen",
            "model": "Golf",
            "year_min": 2020,
            "mileage_max": 50000
        }

    def test_parse_html_with_sample(self):
        """
        Tests parsing of a saved HTML file to ensure extraction logic is correct.
        """
        sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "autoscout_sample.html")
        if not os.path.exists(sample_path):
            self.skipTest("autoscout_sample.html not found")
            
        with open(sample_path, "r", encoding="utf-8") as f:
            html = f.read()
            
        listings = self.client._parse_html(html, "https://www.autoscout24.de")
        
        self.assertGreater(len(listings), 0)
        first = listings[0]
        print(f"\nSample Listing: {first}")
        
        self.assertIn("Volkswagen Golf", first['title'])
        self.assertGreater(first['price'], 0)
        self.assertEqual(first['currency'], "EUR")
        self.assertNotEqual(first['year'], "N/A")
        self.assertNotEqual(first['mileage'], "N/A")
        self.assertTrue(first['listing_url'].startswith("http"))

    def test_valuation_math(self):
        """
        Tests the mileage penalty and valuation calculation.
        """
        # Mock listings
        listings = [
            {"price": 20000},
            {"price": 22000},
            {"price": 18000},
            {"price": 21000},
            {"price": 19000}
        ]
        # Median is 20000
        
        # Vehicle: 2 years old (expected 30k km), Actual 50k km
        # Penalty: (50000 - 30000) * 0.03 = 20000 * 0.03 = 600
        # Estimated: 20000 - 600 = 19400
        
        current_year = datetime.now().year
        vehicle_input = {
            "year": current_year - 2,
            "mileage": 50000
        }
        
        result = EuropeClient.calculate_valuation(listings, vehicle_input)
        
        print(f"\nValuation Result: {result}")
        self.assertEqual(result['median_price'], 20000)
        self.assertEqual(result['penalty_applied'], 600)
        self.assertEqual(result['estimated_price'], 19400)

if __name__ == "__main__":
    unittest.main()
