from yallamotor_client import YallaMotorClient
import json

client = YallaMotorClient()

print("Testing YallaMotor Client URL Builder")
print("Make: Toyota, Model: Camry =>", client._build_candidate_url("Toyota", "Camry", page=1))

print("\nTesting Listing Extraction...")
hits, pages, total = client.get_listings(make="Toyota", model="Camry", page=1)

print(f"Results: {len(hits)} hits, {pages} pages, {total} total estimated.")
if hits:
    print(json.dumps(hits[0], indent=2))
else:
    print("No hits found!")
