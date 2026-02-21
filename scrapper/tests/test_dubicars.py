import json
from dubicars_client import DubicarsClient

client = DubicarsClient()

# Test URL building
urls = client._build_candidate_urls(make="Cadillac", model="Escalade", year_min=2021, year_max=2025)
print("Candidate URLs:", urls)

# Test getting listings
hits, nb_pages, total_hits = client.get_listings(make="Cadillac", model="Escalade", page=1, year_min=2021, year_max=2025)
print(f"Hits: {len(hits)}, Pages: {nb_pages}, Total: {total_hits}")

if hits:
    print(json.dumps(hits[0], indent=2))
