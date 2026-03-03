import re
import logging

logger = logging.getLogger(__name__)

def clean_text(text: str) -> str:
    """Helper to remove punctuation and extra spaces."""
    if not text:
        return ""
    # Remove punctuation, keep alphanumeric and spaces
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text.lower())
    # Normalize spaces
    return " ".join(text.split())

def match_model(query_model: str, result_title: str) -> bool:
    """
    Checks if the queried model exists in the result title.
    Uses token-based matching for better accuracy.
    """
    if not query_model:
        return True
    
    clean_query = clean_text(query_model)
    clean_title = clean_text(result_title)
    
    query_tokens = clean_query.split()
    title_tokens = clean_title.split()
    
    # Strategy: All tokens from the model query must be in the title
    # or the title must contains the token as a prefix/suffix in a word.
    for token in query_tokens:
        if token in title_tokens:
            continue
            
        # Check for partial matches or concatenated tokens
        # e.g. "cclass" in "c-class" title after space cleanup
        if token in clean_title.replace(" ", ""):
            continue
            
        # Automotive specific: "class" or "series" might be omitted in title
        if token in ["class", "series"]:
            continue
            
        # If token is a single letter (e.g. "c"), it might be part of "c300"
        if len(token) == 1 and any(t.startswith(token) and t[1:].isdigit() for t in title_tokens):
            continue

        return False
                
    return True

def match_variant(query_variant: str, result_title: str, result_variant: str = "") -> bool:
    """
    Checks if the queried variant matches the result.
    Matches against both title and the source-provided variant field.
    """
    if not query_variant:
        return True
        
    clean_query = clean_text(query_variant)
    clean_title = clean_text(result_title)
    clean_res_var = clean_text(result_variant or "")
    
    query_tokens = clean_query.split()
    
    # Strategy: All query tokens must appear in either the title OR the variant field
    for token in query_tokens:
        # Check title
        if token in clean_title or token in clean_title.replace(" ", ""):
            continue
        # Check variant field
        if token in clean_res_var or token in clean_res_var.replace(" ", ""):
            continue
            
        return False
            
    return True
