import json
from bs4 import BeautifulSoup
import sys

try:
    with open("/tmp/yallamotor_scraped.html", "r", encoding="utf-8") as f:
        html = f.read()

    soup = BeautifulSoup(html, "html.parser")
    cars = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
            if isinstance(data, dict):
                # The @type can be a string "Product" or list ["Product", "Car"]
                t = data.get("@type", [])
                if "Car" in t or t == "Car":
                    cars.append(data)
        except Exception as e:
            pass
            
    if cars:
        print(f"Found {len(cars)} cars")
        print(json.dumps(cars[0], indent=2))
    else:
        print("No cars found in JSON-LD")
except Exception as e:
    print(f"Error: {e}")
