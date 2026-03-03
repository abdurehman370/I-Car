import re
import logging

logger = logging.getLogger(__name__)

MAKE_ALIASES = {
    "porche": "porsche",
    "porsh": "porsche",
    "merc": "mercedes-benz",
    "mercedes": "mercedes-benz",
    "benz": "mercedes-benz",
    "bmw": "bmw",
    "vw": "volkswagen",
    "volks": "volkswagen",
    "rangerover": "land-rover",
    "range-rover": "land-rover",
    "landrover": "land-rover",
    "toyota": "toyota",
    "nissan": "nissan",
    "aston": "aston-martin",
    "astonmartin": "aston-martin",
    "ferrari": "ferrari",
    "lambo": "lamborghini",
    "lamborghini": "lamborghini",
    "audi": "audi",
    "tesla": "tesla",
    "ford": "ford",
    "chevrolet": "chevrolet",
    "chevy": "chevrolet",
    "hyundai": "hyundai",
    "kia": "kia",
    "mazda": "mazda",
    "lexus": "lexus",
    "honda": "honda",
    "jeep": "jeep",
    "dodge": "dodge",
}

def normalize_make(make: str) -> str:
    """Normalizes car make name, handling aliases and common misspellings."""
    if not make:
        return ""
    
    clean_make = make.lower().strip()
    # Remove non-alphanumeric except dashes
    clean_make = re.sub(r'[^a-z0-9-]', '', clean_make.replace(' ', '-'))
    
    # Check aliases
    normalized = MAKE_ALIASES.get(clean_make, clean_make)
    
    if normalized != clean_make:
        logger.info(f"Normalized make: '{make}' -> '{normalized}'")
    
    return normalized

def normalize_model(make: str, model: str) -> str:
    """Normalizes car model name."""
    if not model:
        return ""
    
    clean_model = model.lower().strip()
    # Replace spaces and special chars with dashes
    normalized = re.sub(r'[^a-z0-9]', '-', clean_model)
    # Remove duplicate dashes
    normalized = re.sub(r'-+', '-', normalized).strip('-')
    
    return normalized

def normalize_variant(make: str, model: str, variant: str) -> str:
    """Normalizes car variant name."""
    if not variant:
        return ""
    
    return variant.lower().strip()
