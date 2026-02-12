# Car Valuation API Documentation

This document explains how to use the Car Valuation API and provides `curl` commands to test its functionality across different regions.

## Server Address
The API runs by default on:
`http://localhost:8000`

## Endpoint: Evaluate Car Valuation
**Route:** `POST /api/evaluate`

This endpoint provides a car's estimated market value, price range, and market statistics based on real-time data from localized scrapers.

### Request Body Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `region` | string | Yes | The region to search in (`UAE`, `Lebanon`, or `Europe`). |
| `make` | string | Yes | Car manufacturer (e.g., `Toyota`, `Audi`). |
| `model` | string | Yes | Car model (e.g., `Camry`, `A5`). |
| `year` | integer | Yes | Manufacturing year (e.g., `2021`). |
| `mileage` | integer | Yes | Car mileage in kilometers (e.g., `45000`). |
| `variant` | string | No | Specific trim or variant (e.g., `SE`). |
| `country` | string | No | Specific country for `Europe` region (e.g., `Germany`, `France`). |

---

## Example Curl Commands

### 1. UAE (Dubizzle)
```bash
curl -X POST http://localhost:8000/api/evaluate \
     -H "Content-Type: application/json" \
     -d '{
       "region": "UAE",
       "make": "Toyota",
       "model": "Camry",
       "year": 2021,
       "mileage": 45000
     }'
```

### 2. Lebanon (OLX)
```bash
curl -X POST http://localhost:8000/api/evaluate \
     -H "Content-Type: application/json" \
     -d '{
       "region": "Lebanon",
       "make": "Nissan",
       "model": "Sunny",
       "year": 2018,
       "mileage": 90000
     }'
```

### 3. Europe (AutoScout24)
*Note: This usually uses Scrape.do proxy if configured.*
```bash
curl -X POST http://localhost:8000/api/evaluate \
     -H "Content-Type: application/json" \
     -d '{
       "region": "Europe",
       "country": "Germany",
       "make": "Volkswagen",
       "model": "Golf",
       "year": 2020,
       "mileage": 60000
     }'
```

---

## Response Structure

A successful response returns a `valuation` object:

```json
{
  "status": "success",
  "region": "UAE",
  "currency": "AED",
  "valuation": {
    "estimated_valuation": 62000.0,
    "price_range": {
      "min": 55000.0,
      "max": 69000.0
    },
    "market_average": 62000.0,
    "market_median": 62000.0,
    "listings_count": 4
  }
}
```

- **estimated_valuation**: The recommended price based on market median and mileage adjustment.
- **price_range**: The minimum and maximum prices found in the market for similar cars (excluding outliers).
- **listings_count**: Number of active listings used to calculate these statistics.
