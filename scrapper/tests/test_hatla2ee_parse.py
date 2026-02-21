import sys
import json
import re
from bs4 import BeautifulSoup

def parse_hatla2ee(file_path):
    with open(file_path, "r") as f:
        html = f.read()
    
    # Try finding __next_f.push scripts
    #self.__next_f.push([1,"..."])
    # We need to extract the string part and unescape it.
    
    rsc_payloads = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', html)
    combined_rsc = "".join(rsc_payloads).replace('\\"', '"').replace('\\\\', '\\')
    
    # Save combined RSC for inspection
    with open("/tmp/hatla2ee_rsc.txt", "w") as f:
        f.write(combined_rsc)
    
    print(f"Extracted {len(rsc_payloads)} RSC blocks. Combined length: {len(combined_rsc)}")
    
    # Often the data is in JSON-like structures within the RSC string
    # Let's look for "title", "price", "year"
    
    # Alternatively, check if there are any <a> tags with car URLs
    soup = BeautifulSoup(html, "html.parser")
    listings = []
    
    # In my experience with Next.js App Router, the initial HTML often has skeletons
    # but the full data might be in the RSC string which is then hydrated.
    # However, for SEO, there might be a pre-rendered list.
    
    # Let's look for all links that match car patterns
    links = soup.find_all("a", href=re.compile(r"/en/car/.*?/\d+"))
    print(f"Found {len(links)} links matching car pattern.")
    
    for link in links:
        # Each link might be inside a card
        # Let's try to find parent with price and year
        card = link.find_parent("div", class_=re.compile(r"rounded|card|listing"))
        if not card:
            # Maybe the card is far up
            continue
            
        title = link.get_text(strip=True)
        url = "https://uae.hatla2ee.com" + link.get("href")
        
        # Look for price
        price_text = card.get_text(strip=True)
        # Price usually like 123,456 AED
        price_match = re.search(r"(\d{1,3}(,\d{3})*)\s*AED", price_text)
        price = price_match.group(1).replace(",", "") if price_match else None
        
        # Look for year and mileage
        # These are often in <span> or just text
        year_match = re.search(r"(19|20)\d{2}", title) # Year in title
        if not year_match:
            year_match = re.search(r"(19|20)\d{2}", card.get_text())
        year = year_match.group(0) if year_match else None
        
        mileage_match = re.search(r"(\d{1,3}(,\d{3})*)\s*KM", card.get_text())
        mileage = mileage_match.group(1).replace(",", "") if mileage_match else None
        
        listings.append({
            "title": title,
            "url": url,
            "price": price,
            "year": year,
            "mileage": mileage,
            "source": "hatla2ee"
        })
        
    return listings

if __name__ == "__main__":
    results = parse_hatla2ee("/tmp/hatla2ee_test.html")
    print(json.dumps(results[:5], indent=2))
    print(f"Total listings found: {len(results)}")
