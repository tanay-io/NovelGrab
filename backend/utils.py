import re
from bs4 import BeautifulSoup, Comment


def clean_html(raw_html: str) -> str:
    """
    Clean raw HTML content, keeping only safe reading tags.
    Strips ads, scripts, navigation, and other junk.
    """
    if not raw_html:
        return ""

    soup = BeautifulSoup(raw_html, "lxml")

    # Remove unwanted tags entirely
    for tag in soup.find_all(
        ["script", "style", "iframe", "noscript", "ins", "svg", "canvas", "form", "input", "button", "nav", "footer", "header"]
    ):
        tag.decompose()

    # Remove HTML comments
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    # Remove divs with ad-related classes or ids
    ad_patterns = re.compile(
        r"(ads?[-_]|adsbygoogle|banner|sponsor|promo|social|share|comment|disqus|related|sidebar|widget|popup|modal|overlay|cookie|consent|notification|alert)",
        re.IGNORECASE,
    )
    for tag in soup.find_all(True):
        classes = " ".join(tag.get("class", []))
        tag_id = tag.get("id", "")
        if ad_patterns.search(classes) or ad_patterns.search(tag_id):
            tag.decompose()

    # Define allowed tags
    allowed_tags = {"p", "em", "strong", "b", "i", "br", "h1", "h2", "h3", "h4", "blockquote", "hr"}

    # Process all tags
    result_parts = []
    for element in soup.find_all(True):
        if element.name in allowed_tags:
            # Strip all attributes from allowed tags
            element.attrs = {}

    # Get the cleaned HTML
    cleaned = str(soup)

    # Parse again to ensure cleanliness
    soup2 = BeautifulSoup(cleaned, "lxml")

    # Extract text wrapped in paragraphs
    paragraphs = []
    for tag in soup2.find_all(["p", "h1", "h2", "h3", "h4", "blockquote"]):
        text = tag.get_text(strip=True)
        if text:
            # Reconstruct with inner formatting preserved
            inner_html = "".join(str(child) for child in tag.children)
            # Clean attributes from inner tags
            inner_soup = BeautifulSoup(inner_html, "lxml")
            for inner_tag in inner_soup.find_all(True):
                if inner_tag.name not in allowed_tags:
                    inner_tag.unwrap()
                else:
                    inner_tag.attrs = {}
            clean_inner = inner_soup.get_text() if not inner_soup.find(True) else str(inner_soup.body or inner_soup)
            # Remove body wrapper if present
            clean_inner = re.sub(r"^<body>|</body>$", "", clean_inner.strip())
            clean_inner = re.sub(r"^<html>.*?<body>|</body></html>$", "", clean_inner.strip(), flags=re.DOTALL)

            if clean_inner.strip():
                tag_name = tag.name if tag.name != "blockquote" else "p"
                paragraphs.append(f"<{tag_name}>{clean_inner.strip()}</{tag_name}>")

    result = "\n".join(paragraphs)

    # Remove empty paragraphs
    result = re.sub(r"<p>\s*</p>", "", result)
    result = re.sub(r"<h[1-4]>\s*</h[1-4]>", "", result)

    # Fix common encoding issues
    result = result.replace("â€™", "'")
    result = result.replace("â€œ", '"')
    result = result.replace("â€\x9d", '"')
    result = result.replace( "â€", "—")
    result = result.replace("â€", "–")
    result = result.replace("Â", "")
    result = result.replace("\xa0", " ")

    # Clean up multiple newlines
    result = re.sub(r"\n{3,}", "\n\n", result)

    return result.strip()


def sanitize_filename(name: str) -> str:
    """Make a string safe for use as a filename."""
    # Remove or replace unsafe characters
    safe = re.sub(r'[<>:"/\\|?*]', "", name)
    # Replace spaces with underscores
    safe = re.sub(r"\s+", "_", safe)
    # Remove any non-ASCII characters
    safe = re.sub(r"[^\w\-.]", "", safe)
    # Limit length
    safe = safe[:200]
    # Remove leading/trailing dots and spaces
    safe = safe.strip(". ")
    return safe or "novel"
