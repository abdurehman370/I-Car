import hashlib
import re
import logging

logger = logging.getLogger(__name__)

def generate_listing_id(listing: dict) -> str:
    """
    Generates a unique ID for a listing based on key attributes.
    Helps detect the same car listed on different platforms.
    """
    # Normalize title: lowercase, alphanumeric only
    title = str(listing.get("title", "")).lower()
    title_clean = re.sub(r'[^a-z0-9]', '', title)
    
    # Year
    year = str(listing.get("year", ""))
    
    # Price - rounded to handle minor site-specific variations
    price = str(listing.get("price", "0"))
    
    # Combine key identifiers
    # We don't include source or listing_url because they will differ
    # We include mileage if available for better accuracy
    mileage = str(listing.get("mileage", "")).strip().lower()
    mileage_clean = re.sub(r'[^0-9]', '', mileage)
    
    unique_string = f"{title_clean}|{year}|{price}|{mileage_clean}"
    return hashlib.sha256(unique_string.encode()).hexdigest()

def deduplicate_listings(listings: list) -> list:
    """Removes duplicate listings from a list based on generated cross-source IDs."""
    if not listings:
        return []
        
    seen_ids = set()
    unique_listings = []
    
    duplicate_count = 0
    for listing in listings:
        listing_id = generate_listing_id(listing)
        if listing_id not in seen_ids:
            seen_ids.add(listing_id)
            unique_listings.append(listing)
        else:
            duplicate_count += 1
            
    if duplicate_count > 0:
        logger.info(f"Deduplication removed {duplicate_count} duplicate listings.")
        
    return unique_listings
