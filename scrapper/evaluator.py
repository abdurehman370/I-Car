import statistics
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class PriceEvaluator:
    @staticmethod
    def calculate_stats(results):
        """
        Calculates robust price statistics from a list of car results.
        Uses IQR (Interquartile Range) to filter out outliers.
        """
        if not results:
            return None

        raw_count = len(results)
        # Extract prices and filter out invalid or placeholder values
        prices = []
        invalid_count = 0
        for res in results:
            price = res.get('price')
            if isinstance(price, (int, float)) and price > 500:
                prices.append(float(price))
            else:
                invalid_count += 1
        
        if len(prices) < 3:
            # Not enough data for robust stats
            if not prices:
                return None
            return {
                "average_price": round(statistics.mean(prices), 2),
                "median_price": round(statistics.median(prices), 2),
                "min_price": min(prices),
                "max_price": max(prices),
                "total_evaluated": len(prices),
                "raw_count": raw_count,
                "invalid_count": invalid_count,
                "is_robust": False
            }

        prices.sort()
        
        # Calculate IQR
        n = len(prices)
        q1 = prices[int(n * 0.25)]
        q3 = prices[int(n * 0.75)]
        iqr = q3 - q1
        
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        # Filter outliers
        filtered_prices = [p for p in prices if lower_bound <= p <= upper_bound]
        
        if not filtered_prices:
            filtered_prices = prices # Fallback if everything is an "outlier" (unlikely)

        stats = {
            "average_price": round(statistics.mean(filtered_prices), 2),
            "median_price": round(statistics.median(filtered_prices), 2),
            "min_price": min(filtered_prices),
            "max_price": max(filtered_prices),
            "total_evaluated": len(filtered_prices),
            "raw_count": raw_count,
            "outlier_count": len(prices) - len(filtered_prices),
            "invalid_count": invalid_count,
            "is_robust": True
        }
        
        return stats

    @staticmethod
    def calculate_valuation(results, vehicle_input):
        """
        Calculates an estimated valuation based on market results and vehicle-specific details (year, mileage).
        """
        stats = PriceEvaluator.calculate_stats(results)
        if not stats:
            return None

        median_price = stats['median_price']
        current_year = datetime.now().year
        
        try:
            vehicle_year = int(vehicle_input.get('year') or current_year)
            actual_km = int(vehicle_input.get('mileage') or 0)
        except (ValueError, TypeError):
            vehicle_year = current_year
            actual_km = 0
            
        years_old = max(0, current_year - vehicle_year)
        # Assuming 15k km per year as standard
        expected_km = years_old * 15000
        
        # Simple penalty for over-mileage (can be refined per region)
        # Using 0.05 AED/SAR/USD per km as a baseline
        penalty_per_km = 0.05 
        over_mileage = max(0, actual_km - expected_km)
        penalty = over_mileage * penalty_per_km
        
        estimated_price = max(0, median_price - penalty)
        
        # Add to stats
        stats["estimated_price"] = round(estimated_price, 2)
        stats["penalty_applied"] = round(penalty, 2)
        stats["expected_mileage"] = expected_km
        
        return stats

    @staticmethod
    def evaluate_deal(price, stats):
        """
        Evaluates a specific price against market stats.
        """
        if not stats or stats.get('average_price') == 0:
            return "Unknown"
        
        avg = stats['average_price']
        diff_pct = (price - avg) / avg
        
        if diff_pct < -0.15:
            return "Great Deal"
        elif diff_pct < -0.05:
            return "Good Price"
        elif diff_pct < 0.05:
            return "Fair Price"
        elif diff_pct < 0.15:
            return "High Price"
        else:
            return "Overpriced"
