import requests
import json
import time

def test_valuation(region, make, model, year, mileage, country=None):
    print(f"\nTesting {region} Valuation for {year} {make} {model} ({mileage} km)...")
    url = "http://localhost:8000/api/evaluate"
    payload = {
        "region": region,
        "make": make,
        "model": model,
        "year": year,
        "mileage": mileage
    }
    if country:
        payload["country"] = country

    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(json.dumps(data, indent=2))
            if data["status"] == "success":
                val = data["valuation"]
                print(f"✅ ESTIMATED PRICE: {val['estimated_valuation']} {data['currency']}")
                print(f"✅ RANGE: {val['price_range']['min']} - {val['price_range']['max']}")
            else:
                print(f"⚠️ {data.get('message', 'Unknown issue')}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    # Test UAE (Fastest usually)
    test_valuation("UAE", "Toyota", "Camry", 2021, 45000)
    
    # Test Europe (Uses scraper.do, might be slower)
    test_valuation("Europe", "Volkswagen", "Golf", 2020, 60000, country="Germany")
    
    # Test Lebanon
    test_valuation("Lebanon", "Nissan", "Sunny", 2018, 90000)
