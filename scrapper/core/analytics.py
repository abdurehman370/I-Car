import statistics
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

def compute_price_analytics(listings: list) -> dict:
    """
    Computes comprehensive price analytics from aggregated listings.
    Includes mean, median, min/max, distribution buckets, and price trends.
    """
    if not listings:
        return {}

    # Extract valid prices
    valid_prices = []
    for l in listings:
        p = l.get("price")
        if isinstance(p, (int, float)) and p > 1000: # Ignore very low "prices" (placeholders)
            valid_prices.append(float(p))
            
    if not valid_prices:
        return {}

    raw_count = len(valid_prices)
    valid_prices.sort()
    
    # 1. Outlier Detection using IQR
    n = len(valid_prices)
    if n >= 4:
        q1 = valid_prices[int(n * 0.25)]
        q3 = valid_prices[int(n * 0.75)]
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        filtered_prices = [p for p in valid_prices if lower_bound <= p <= upper_bound]
    else:
        filtered_prices = valid_prices
        
    if not filtered_prices:
        filtered_prices = valid_prices

    outliers_removed = raw_count - len(filtered_prices)
    
    # 2. Basic Stats
    avg_price = statistics.mean(filtered_prices)
    median_price = statistics.median(filtered_prices)
    min_price = min(filtered_prices)
    max_price = max(filtered_prices)

    # 3. Price Per Year
    year_data = defaultdict(list)
    for l in listings:
        y = str(l.get("year", ""))
        p = l.get("price")
        if y.isdigit() and isinstance(p, (int, float)) and p > 1000:
            year_data[int(y)].append(float(p))
            
    avg_price_per_year = {
        year: round(statistics.mean(prices), 2) 
        for year, prices in year_data.items()
    }

    # 4. Distribution Buckets
    bucket_count = 5
    price_range = max_price - min_price
    distribution = []
    if price_range > 0:
        bucket_size = price_range / bucket_count
        for i in range(bucket_count):
            start = min_price + (i * bucket_size)
            end = start + bucket_size
            count = sum(1 for p in filtered_prices if start <= p < end or (i == bucket_count-1 and p == end))
            distribution.append({
                "range": f"{int(start/1000)}k-{int(end/1000)}k",
                "count": count
            })

    return {
        "average_price": round(avg_price, 2),
        "median_price": round(median_price, 2),
        "min_price": min_price,
        "max_price": max_price,
        "raw_results_count": len(listings),
        "total_evaluated": len(filtered_prices),
        "outliers_removed": outliers_removed,
        "average_price_per_year": dict(sorted(avg_price_per_year.items())),
        "price_distribution": distribution
    }
