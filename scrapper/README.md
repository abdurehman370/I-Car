# Dubizzle UAE Car Scraper

A robust Python scraper for used car listings on Dubizzle UAE.

## Installation

1. **Clone or Download** the project to your local machine.
2. **Setup Virtual Environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Linux/Mac
   ```
3. **Install Dependencies**:
   ```bash
   pip3 install playwright pandas playwright-stealth
   playwright install chromium
   ```

## Usage

Run the scraper with CLI arguments to filter results:

```bash
python3 scraper.py --make toyota --model camry --year-min 2022 --mileage-max 50000 --output-json data.json
```

### Available Arguments:

- `--make`: Car make (e.g., toyota, honda)
- `--model`: Car model (e.g., camry, civic)
- `--variant`: Optional variant filter (e.g., SE, LE)
- `--year-min`: Minimum year
- `--year-max`: Maximum year
- `--mileage-max`: Maximum mileage in kilometers
- `--max-pages`: Max number of pages to scrape (default: 5)
- `--output-json`: Export to JSON (default: results.json)
- `--output-csv`: Export to CSV (optional)
- `--no-headless`: Run with visible browser window

## Troubleshooting

- **Access Denied (Error 15)**: Dubizzle uses Imperva. If blocked:
  - Run without headless mode: `--no-headless`
  - Use a different network or residential proxy.
  - Wait and try again later.
- **Empty Results**: Check if the selectors have changed or if the filters are too restrictive.
