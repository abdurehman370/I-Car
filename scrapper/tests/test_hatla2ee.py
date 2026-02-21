"""
Test for Hatla2eeClient.
Requires cloudscraper and a valid environment.
"""
import sys
import os
import json
import logging

# Add parent directory to sys.path to import client
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from hatla2ee_client import Hatla2eeClient

# Configure logging
logging.basicConfig(level=logging.DEBUG)

def test_hatla2ee():
    client = Hatla2eeClient()
    
    # Test cases: Make, Model
    test_cases = [
        ("Honda", "Civic"),
        ("Toyota", "Camry"),
        ("Mercedes", "")
    ]
    
    for make, model in test_cases:
        print(f"\n--- Testing Hatla2ee for {make} {model} ---")
        try:
            listings, nb_pages, total_hits = client.get_listings(make, model, page=1)
            
            if listings:
                for idx, first in enumerate(listings[:3]):
                    print(f"Sample Listing {idx+1}:")
                    print(f"  ID: {first.get('id')}")
                    print(f"  Title: {first.get('title')}")
                    print(f"  Price: {first.get('price')} {first.get('currency')}")
                    print(f"  Year: {first.get('year')}")
                    print(f"  Mileage: {first.get('mileage')} KM")
                    print(f"  URL: {first.get('listing_url')}")
            else:
                print("  No listings found.")
                
        except Exception as e:
            print(f"  Error: {e}")

if __name__ == "__main__":
    test_hatla2ee()
