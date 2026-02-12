import argparse
import logging
import sys
import os
from datetime import datetime

from config import (
    DEFAULT_HITS_PER_PAGE, PRIMARY_INDEX, 
    DEFAULT_OUTPUT_JSON, DEFAULT_OUTPUT_CSV
)
from dubizzle_client import DubizzleClient
from filters import QueryBuilder
from exporter import Exporter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('scraper.log')
    ]
)
logger = logging.getLogger(__name__)

class DubizzleScraper:
    def __init__(self, args):
        self.args = args
        self.client = DubizzleClient(proxy=args.proxy if args.use_proxy else None)
        self.results = []

    def run(self):
        """Main execution loop for scraping."""
        logger.info(f"Starting scrape for make: {self.args.make}, model: {self.args.model}")
        
        current_page = 0
        while True:
            logger.info(f"Fetching page {current_page + 1}...")
            
            # Build payload
            payload = QueryBuilder.build_payload(
                self.args, 
                page=current_page, 
                hits_per_page=DEFAULT_HITS_PER_PAGE,
                index_name=PRIMARY_INDEX
            )
            
            # Get listings
            hits, nb_pages, total_hits = self.client.get_listings(payload)
            
            if not hits:
                if current_page == 0:
                    logger.warning("No results found for the given filters.")
                break
                
            logger.info(f"Found {len(hits)} listings on page {current_page + 1}")
            
            # Format and store results
            for hit in hits:
                formatted = Exporter.format_listing(hit)
                self.results.append(formatted)
            
            # Check for termination
            current_page += 1
            if current_page >= nb_pages or current_page >= self.args.max_pages:
                break
                
        logger.info(f"Scrape completed. Total results: {len(self.results)}")
        self.export_results()

    def export_results(self):
        """Exports results based on user preference."""
        if not self.results:
            logger.warning("No results to export.")
            return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if self.args.output in ['json', 'both']:
            json_file = f"results_{timestamp}.json"
            Exporter.save_to_json(self.results, json_file)
        
        if self.args.output in ['csv', 'both']:
            csv_file = f"results_{timestamp}.csv"
            Exporter.save_to_csv(self.results, csv_file)

def main():
    parser = argparse.ArgumentParser(description='Dubizzle API-based Used Car Scraper')
    
    # Filters
    parser.add_argument('--make', type=str, help='Car make (e.g., toyota)')
    parser.add_argument('--model', type=str, help='Car model (e.g., camry)')
    parser.add_argument('--year-min', type=int, help='Minimum year')
    parser.add_argument('--year-max', type=int, help='Maximum year')
    parser.add_argument('--year', type=int, help='Specific year (sets both min and max)')
    parser.add_argument('--mileage-max', type=int, help='Maximum mileage (kms)')
    parser.add_argument('--max-mileage', type=int, help='Maximum mileage (alias for --mileage-max)')
    parser.add_argument('--price-min', type=int, help='Minimum price')
    parser.add_argument('--price-max', type=int, help='Maximum price')

    # Execution settings
    parser.add_argument('--max-pages', type=int, default=5, help='Maximum pages to scrape')
    parser.add_argument('--output', type=str, choices=['json', 'csv', 'both'], default='json', help='Output format')
    
    # Proxy settings
    parser.add_argument('--use-proxy', action='store_true', help='Use a proxy for requests')
    parser.add_argument('--proxy', type=str, help='Proxy URL (e.g., http://user:pass@host:port)')

    args = parser.parse_args()

    # Handle aliases and compound filters
    if args.year:
        args.year_min = args.year
        args.year_max = args.year
    if args.max_mileage:
        args.mileage_max = args.max_mileage

    scraper = DubizzleScraper(args)
    scraper.run()

if __name__ == "__main__":
    main()
