import logging

logger = logging.getLogger(__name__)

class QueryBuilder:
    def __init__(self):
        pass

    @staticmethod
    def build_params(args, page=0, hits_per_page=25):
        """
        Builds the params string for Algolia.
        """
        params_list = [
            f"hitsPerPage={hits_per_page}",
            f"page={page}",
            "clickAnalytics=false"
        ]

        # Base category filter
        category_path = "motors/used-cars"
        query_text = ""
        
        if args.make:
            category_path += f"/{args.make.lower()}"
        
        if args.model:
            model_lower = (args.model or "").lower()
            model_parts = model_lower.split()
            # Use the first word for the category path (e.g. "a5" from "a5 sportback")
            if model_parts:
                category_path += f"/{model_parts[0]}"
            
            # Combine model and variant for the search query
            variant_text = (getattr(args, 'variant', '') or '').lower()
            query_text = f"{model_lower} {variant_text}".strip()
        elif getattr(args, 'variant', None):
            query_text = (args.variant or "").lower()
        
        filter_str = f'("category_v2.slug_paths":"{category_path}")'
        params_list.append(f"query={query_text}")

        # Additional filters
        numeric_filters = []
        if hasattr(args, 'year_min') and args.year_min:
            numeric_filters.append(f"year >= {args.year_min}")
        if hasattr(args, 'year_max') and args.year_max:
            numeric_filters.append(f"year <= {args.year_max}")
        if hasattr(args, 'mileage_max') and args.mileage_max:
            numeric_filters.append(f"kilometers <= {args.mileage_max}")
        if hasattr(args, 'price_min') and args.price_min:
            numeric_filters.append(f"price.value >= {args.price_min}")
        if hasattr(args, 'price_max') and args.price_max:
            numeric_filters.append(f"price.value <= {args.price_max}")

        if numeric_filters:
            filter_str += " AND " + " AND ".join(numeric_filters)

        params_list.append(f"filters={filter_str}")
        
        return "&".join(params_list)

    @staticmethod
    def build_payload(args, page=0, hits_per_page=25, index_name="motors.com"):
        """
        Builds the full JSON payload for the Algolia POST request.
        """
        params = QueryBuilder.build_params(args, page, hits_per_page)
        return {
            "requests": [
                {
                    "indexName": index_name,
                    "params": params
                }
            ]
        }
