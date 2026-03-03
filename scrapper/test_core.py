import sys
import os
import json

# Add current dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.normalization import normalize_make, normalize_model
from core.matching import match_model, match_variant
from core.deduplication import deduplicate_listings
from core.analytics import compute_price_analytics

def test_normalization():
    print("Testing Normalization...")
    assert normalize_make("Porche") == "porsche"
    assert normalize_make("Merc") == "mercedes-benz"
    assert normalize_make("BMW ") == "bmw"
    assert normalize_model("BMW", "3 Series") == "3-series"
    assert normalize_model("Mercedes", "E Class") == "e-class"
    print("✓ Normalization passed")

def test_matching():
    print("Testing Matching...")
    assert match_model("3 series", "BMW 3-Series 2020") == True, "Failed 3 series matching"
    assert match_model("c class", "Mercedes C300 2021") == True, "Failed C class matching"
    assert match_model("911", "Porsche Carrera 911") == True, "Failed 911 matching"
    assert match_model("911", "Porsche Cayenne") == False, "Failed negative matching 911 vs Cayenne"
    
    assert match_variant("c300", "Mercedes C-Class AMG", "C 300") == True, "Failed variant C300"
    assert match_variant("turbo s", "Porsche 911 Turbo S", "") == True, "Failed variant Turbo S"
    assert match_variant("base", "BMW 330i", "Base") == True, "Failed variant Base"
    print("✓ Matching passed")

def test_deduplication():
    print("Testing Deduplication...")
    listings = [
        {"title": "BMW 3 Series", "year": "2020", "price": 120000, "mileage": "45000", "source": "dubizzle"},
        {"title": "BMW 3 Series", "year": "2020", "price": 120000, "mileage": "45000", "source": "dubicars"}, # Duplicate
        {"title": "Porsche 911", "year": "2021", "price": 450000, "mileage": "12000", "source": "dubizzle"}
    ]
    unique = deduplicate_listings(listings)
    assert len(unique) == 2
    print("✓ Deduplication passed")

def test_analytics():
    print("Testing Analytics...")
    listings = [
        {"title": "Car", "year": "2020", "price": 100000},
        {"title": "Car", "year": "2020", "price": 110000},
        {"title": "Car", "year": "2020", "price": 120000},
        {"title": "Car", "year": "2020", "price": 90000},
        {"title": "Car", "year": "2020", "price": 500000}, # Outlier
    ]
    stats = compute_price_analytics(listings)
    assert stats["total_evaluated"] == 4
    assert stats["outliers_removed"] == 1
    assert stats["median_price"] == 105000
    print("✓ Analytics passed")

if __name__ == "__main__":
    try:
        test_normalization()
        test_matching()
        test_deduplication()
        test_analytics()
        print("\nALL CORE TESTS PASSED!")
    except AssertionError as e:
        print(f"\nTEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nERROR DURING TESTING: {e}")
        sys.exit(1)
