import sys
from bs4 import BeautifulSoup

try:
    with open("/tmp/yallamotor_scraped.html", "r", encoding="utf-8") as f:
        html = f.read()
    
    soup = BeautifulSoup(html, "html.parser")
    print(f"Title: {soup.title.string if soup.title else 'No Title'}")
    
    # Try to find common car listing container classes
    print("\n-- Popular div classes --")
    from collections import Counter
    classes = []
    for el in soup.find_all(True):
        if el.get("class"):
            classes.extend(el.get("class"))
    for c, count in Counter(classes).most_common(20):
        print(f"{c}: {count}")

    # Try to find JSON-LD
    print("\n-- JSON-LD Scripts --")
    for script in soup.find_all("script", type="application/ld+json"):
        print(script.string[:200].strip())

except Exception as e:
    print(f"Error: {e}")
