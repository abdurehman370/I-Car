import sys
import cloudscraper
from bs4 import BeautifulSoup
import json

scraper = cloudscraper.create_scraper()

# Test page 2
url = "https://uae.yallamotor.com/used-cars/toyota/camry?page=2"
print(f"Fetching {url}")
r = scraper.get(url)
print(f"Status: {r.status_code}")

soup = BeautifulSoup(r.text, "html.parser")

cars = []
for script in soup.find_all("script", type="application/ld+json"):
    try:
        data = json.loads(script.string)
        if isinstance(data, dict):
            t = data.get("@type", [])
            if "Car" in t or t == "Car":
                cars.append(data)
    except Exception:
        pass

print(f"Found {len(cars)} cars on page 2")
if cars:
    print(f"First car: {cars[0].get('name')} - {cars[0].get('offers', {}).get('price')}")

# Identify pagination structure in HTML to find max pages
pagination = soup.find(class_="pagination")
if pagination:
    links = pagination.find_all("a")
    print("Pagination links:", [link.text.strip() for link in links])
else:
    print("No pagination found")
