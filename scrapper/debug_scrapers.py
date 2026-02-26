import sys
import logging
import json
from yallamotor_client import YallaMotorClient
from hatla2ee_client import Hatla2eeClient
from europe_client import EuropeClient
from autotrader_lb_client import AutotraderLbClient
from wheelers_lb_client import WheelersLbClient

logging.basicConfig(level=logging.INFO)

def test_yallamotor():
    print("--- Testing YallaMotor ---")
    client = YallaMotorClient()
    hits, nb_pages, count = client.get_listings(make="mercedes-benz", model="c-class", page=1, year_min=2025, year_max=2025)
    print(f"Found {len(hits)} hits. {count} total over {nb_pages} pages.")
    for h in hits[:2]:
        print(h.get('title'), h.get('price'))
    print()

def test_hatla2ee():
    print("--- Testing Hatla2ee ---")
    client = Hatla2eeClient()
    hits, nb_pages, count = client.get_listings(make="mercedes-benz", model="c-class", page=1, year_min=2025, year_max=2025)
    print(f"Found {len(hits)} hits. {count} total over {nb_pages} pages.")
    for h in hits[:2]:
        print(h.get('title'), h.get('price'))
    print()

def test_europe():
    print("--- Testing Europe ---")
    client = EuropeClient()
    filters = {"make": "mercedes-benz", "model": "s class", "year_min": 2020, "mileage_max": 20000}
    hits, nb_pages, count = client.get_listings(filters, country_name="Germany", page=1)
    print(f"Found {len(hits)} hits. {count} total over {nb_pages} pages.")
    for h in hits[:2]:
        print(h.get('title'), h.get('price'))
    print()

def test_wheelers():
    print("--- Testing Wheelers ---")
    client = WheelersLbClient()
    filters = {"make": "mercedes-benz", "model": "s class", "year_min": 2025, "year_max": 2025}
    hits, nb_pages, count = client.get_listings(filters, page=1)
    print(f"Found {len(hits)} hits. {count} total over {nb_pages} pages.")
    for h in hits[:2]:
        print(h.get('title'), h.get('price'))
    print()

def test_autotrader():
    print("--- Testing Autotrader ---")
    client = AutotraderLbClient()
    filters = {"make": "mercedes-benz", "model": "s class", "year_min": 2025, "year_max": 2025}
    hits, nb_pages, count = client.get_listings(filters, page=1)
    print(f"Found {len(hits)} hits. {count} total over {nb_pages} pages.")
    for h in hits[:2]:
        print(h.get('title'), h.get('price'))
    print()

if __name__ == "__main__":
    test_yallamotor()
    test_hatla2ee()
    test_europe()
    test_wheelers()
    test_autotrader()
