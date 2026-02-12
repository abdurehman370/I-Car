import json
import csv
import logging
import pandas as pd
from datetime import datetime

logger = logging.getLogger(__name__)

class Exporter:
    @staticmethod
    def format_listing(hit):
        """Formats an Algolia hit into the requested structure."""
        # Extract name
        name_obj = hit.get('name', {})
        title = name_obj.get('en') if isinstance(name_obj, dict) else hit.get('name', 'N/A')
        
        # Extract price
        price_obj = hit.get('price', {})
        price = price_obj.get('value') if isinstance(price_obj, dict) else hit.get('price', 'N/A')
        
        # Extract details
        details = hit.get('details', {})
        year = details.get('Year', {}).get('en', {}).get('value', 'N/A')
        mileage = details.get('Kilometers', {}).get('en', {}).get('value', 'N/A')
        variant = details.get('Variant', {}).get('en', {}).get('value', 'N/A')
        
        # Extract location
        loc_list = hit.get('location_list', {}).get('en', [])
        location = " -> ".join(loc_list) if loc_list else "N/A"
        
        # Absolute URL
        abs_url_obj = hit.get('absolute_url', {})
        listing_url = abs_url_obj.get('en') if isinstance(abs_url_obj, dict) else hit.get('absolute_url', 'N/A')
        
        # Image URL with fallback
        image_url = hit.get('photo')
        if not image_url and isinstance(hit.get('photos'), dict):
            image_url = hit.get('photos', {}).get('main')
            
        if not image_url:
            image_url = 'N/A'
        
        return {
            "title": title,
            "price": price,
            "year": year,
            "mileage": mileage,
            "variant": variant,
            "location": location,
            "listing_url": listing_url,
            "image_url": image_url,
            "scraped_at": datetime.now().isoformat()
        }

    @staticmethod
    def save_to_json(data, filename):
        """Saves data to a JSON file."""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
            logger.info(f"Successfully saved {len(data)} results to {filename}")
        except Exception as e:
            logger.error(f"Failed to save JSON: {e}")

    @staticmethod
    def save_to_csv(data, filename):
        """Saves data to a CSV file."""
        try:
            df = pd.DataFrame(data)
            df.to_csv(filename, index=False, encoding='utf-8')
            logger.info(f"Successfully saved {len(data)} results to {filename}")
        except Exception as e:
            logger.error(f"Failed to save CSV: {e}")
