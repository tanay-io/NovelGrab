"""
EPUB builder for NovelGrab.

Produces EPUB 3.0-compliant files that pass epubcheck / Google Play Books
validation. Key compliance measures:
  - mimetype as first ZIP entry with STORED compression and no extra field
  - no duplicate manifest entries (set_cover called once, no separate add_item)
  - unique IDs for every manifest item
  - well-formed XHTML with <?xml?> declaration for all content documents
  - epub:type attributes on nav and chapter sections
"""

import os
import re
import shutil
import zipfile

import httpx
from lxml import etree
from ebooklib import epub
from utils import sanitize_filename

TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# CSS
# ---------------------------------------------------------------------------
EPUB_CSS = """
@namespace epub "http://www.idpf.org/2007/ops";

body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 1.1em;
    line-height: 1.8;
    margin: 1em 1.5em;
    color: #1a1a1a;
    background-color: #fefefe;
}

h1, h2, h3, h4 {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #2c3e50;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    line-height: 1.3;
}

h1 {
    font-size: 1.8em;
    text-align: center;
    border-bottom: 2px solid #3498db;
    padding-bottom: 0.3em;
}

h2 {
    font-size: 1.4em;
}

h3 {
    font-size: 1.2em;
}

p {
    margin: 0.6em 0;
    text-align: justify;
    text-indent: 1.5em;
}

p:first-child {
    text-indent: 0;
}

em, i {
    font-style: italic;
}

strong, b {
    font-weight: bold;
}

blockquote {
    margin: 1em 2em;
    padding: 0.5em 1em;
    border-left: 3px solid #7f8c8d;
    color: #555;
    font-style: italic;
}

hr {
    border: none;
    border-top: 1px solid #bdc3c7;
    margin: 2em 0;
}

.cover-page {
    text-align: center;
    page-break-after: always;
}

.cover-page img {
    max-width: 100%;
    max-height: 100%;
}

.chapter-title {
    text-align: center;
    font-size: 1.5em;
    margin: 2em 0 1em 0;
    color: #2c3e50;
    border-bottom: 1px solid #ecf0f1;
    padding-bottom: 0.5em;
}
"""

# ---------------------------------------------------------------------------
# XHTML templates (include xmlns:epub for epub:type support)
# ---------------------------------------------------------------------------
CHAPTER_TEMPLATE = """\
<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>{title}</title>
    <link rel="stylesheet" type="text/css" href="style/default.css"/>
</head>
<body>
    <section epub:type="chapter" role="doc-chapter">
        <h1 class="chapter-title">{title}</h1>
        {content}
    </section>
</body>
</html>
"""

# ---------------------------------------------------------------------------
# XHTML helpers
# ---------------------------------------------------------------------------

def _escape_xml(text: str) -> str:
    """Escape special XML characters in text content."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def _sanitize_xhtml_fragment(html: str) -> str:
    """
    Clean an HTML *fragment* (chapter body) so it is valid inside XHTML.

    Fixes the most common issues produced by upstream scrapers:
      - <br> / <hr> not self-closed
      - bare & not entity-escaped
      - invalid XML control characters
    """
    if not html or not html.strip():
        return "<p>&#160;</p>"

    # Self-close void elements
    html = re.sub(r"<br\s*/?>", "<br/>", html)
    html = re.sub(r"<hr\s*/?>", "<hr/>", html)
    html = re.sub(r"<img([^>]*?)(?<!/)\s*>", r"<img\1/>", html)

    # Escape bare ampersands (but not valid entity/char references)
    html = re.sub(
        r"&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)",
        "&amp;",
        html,
    )

    # Strip XML-illegal control characters (keep \t \n \r)
    html = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", html)

    return html


def _validate_xhtml_document(xhtml: str) -> str:
    """
    Validate a *complete* XHTML document string.
    If it parses cleanly, return it unchanged.
    Otherwise, attempt to repair via lxml's HTML parser and re-serialise as XML.
    """
    try:
        etree.fromstring(xhtml.encode("utf-8"))
        return xhtml                    # already well-formed
    except etree.XMLSyntaxError:
        pass

    # Attempt repair
    try:
        from lxml.html import document_fromstring, tostring as html_tostring

        doc = document_fromstring(xhtml)
        repaired = html_tostring(doc, encoding="unicode", method="xml")
        if not repaired.startswith("<?xml"):
            repaired = "<?xml version='1.0' encoding='utf-8'?>\n" + repaired
        # Verify the repair
        try:
            etree.fromstring(repaired.encode("utf-8"))
            return repaired
        except etree.XMLSyntaxError:
            pass
    except Exception:
        pass

    # Last resort – return original and let ebooklib cope
    return xhtml


def _detect_image_type(
    data: bytes,
    content_type_header: str | None,
) -> tuple[str, str] | None:
    """
    Detect image extension and media type from byte signature.

    This avoids EPUBCheck media-type mismatches when servers lie about
    Content-Type (e.g. webp served as image/jpeg).
    """

    header = (content_type_header or "").split(";")[0].strip().lower()

    # Guard: HTML or empty responses are not valid images
    if not data or data.lstrip().startswith(b"<"):
        return None

    def _match(sig: bytes, offset: int = 0) -> bool:
        return data.startswith(sig, offset)

    if _match(b"\xFF\xD8\xFF"):
        return "jpg", "image/jpeg"
    if _match(b"\x89PNG\r\n\x1a\n"):
        return "png", "image/png"
    if _match(b"GIF87a") or _match(b"GIF89a"):
        return "gif", "image/gif"
    if _match(b"RIFF") and _match(b"WEBP", offset=8):
        # WebP is not universally accepted by EPUB validators/readers.
        return None

    # Fallback to header if known image type
    if header in {"image/jpeg", "image/jpg", "image/pjpeg"}:
        return "jpg", "image/jpeg"
    if header == "image/png":
        return "png", "image/png"
    if header == "image/gif":
        return "gif", "image/gif"
    if header == "image/webp":
        return None

    # Unknown type – skip cover to avoid invalid manifest/media-type errors
    return None


# ---------------------------------------------------------------------------
# Post-process ZIP for strict EPUB compliance
# ---------------------------------------------------------------------------

def _fix_epub_zip(filepath: str) -> None:
    """
    Re-pack the EPUB ZIP so that:
      1. ``mimetype`` is the **first** entry
      2. ``mimetype`` uses ``ZIP_STORED`` (no compression)
      3. ``mimetype`` entry has **no** extra-field bytes
      4. All other entries use ``ZIP_DEFLATED``
    """
    tmp = filepath + ".tmp"

    with zipfile.ZipFile(filepath, "r") as zin:
        with zipfile.ZipFile(tmp, "w") as zout:
            # mimetype – must be first, stored, no extras
            mi = zipfile.ZipInfo("mimetype")
            mi.compress_type = zipfile.ZIP_STORED
            mi.extra = b""
            zout.writestr(mi, "application/epub+zip")

            for item in zin.infolist():
                if item.filename == "mimetype":
                    continue
                data = zin.read(item.filename)
                info = zipfile.ZipInfo(item.filename)
                info.compress_type = zipfile.ZIP_DEFLATED
                zout.writestr(info, data)

    shutil.move(tmp, filepath)


# ---------------------------------------------------------------------------
# Main builder
# ---------------------------------------------------------------------------

async def build_epub(
    title: str,
    author: str,
    cover_url: str,
    chapters_content: list,
    job_id: str,
) -> str:
    """
    Build an EPUB 3 file from novel data.

    Args:
        title: Novel title
        author: Author name
        cover_url: URL to the cover image
        chapters_content: List of ``{title, content}`` dicts
        job_id: Unique job identifier

    Returns:
        Path to the generated EPUB file
    """
    book = epub.EpubBook()

    # ── metadata ──────────────────────────────────────────────────────────
    book.set_identifier(f"novelgrab-{job_id}")
    book.set_title(title)
    book.set_language("en")
    book.add_author(author or "Unknown Author")

    # ── stylesheet (added once) ───────────────────────────────────────────
    style = epub.EpubItem(
        uid="style_default",
        file_name="style/default.css",
        media_type="text/css",
        content=EPUB_CSS.encode("utf-8"),
    )
    book.add_item(style)

    # ── cover image ───────────────────────────────────────────────────────
    # Use *only* book.set_cover() – it creates both the image item and the
    # cover XHTML page internally.  Do NOT call book.add_item() separately
    # for the cover image, as that would create a duplicate manifest entry.
    try:
        if cover_url:
            async with httpx.AsyncClient(
                follow_redirects=True, timeout=15.0
            ) as client:
                resp = await client.get(
                    cover_url,
                    headers={
                        "User-Agent": (
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                            "AppleWebKit/537.36"
                        ),
                        "Referer": "https://novelbin.com/",
                        "Accept": "image/jpeg,image/png,image/*;q=0.8,*/*;q=0.5",
                    },
                )
                if resp.status_code == 200 and resp.content:
                    detected = _detect_image_type(
                        resp.content,
                        resp.headers.get("content-type"),
                    )
                    if detected:
                        ext, _media_type = detected

                        # Ensure extension/media-type alignment to satisfy EPUBCheck
                        file_name = f"images/cover.{ext}"
                        # ebooklib infers media-type from extension; ext is already accurate
                        book.set_cover(
                            file_name,
                            resp.content,
                            create_page=True,
                        )
    except Exception as e:
        print(f"Failed to download cover image: {e}")

    # ── chapters ──────────────────────────────────────────────────────────
    epub_chapters: list[epub.EpubHtml] = []
    spine: list = ["nav"]

    for idx, ch in enumerate(chapters_content):
        chapter_title = ch.get("title", f"Chapter {idx + 1}")
        chapter_content = ch.get("content", "<p>No content available.</p>")

        # Sanitise fragment → valid XHTML body content
        chapter_content = _sanitize_xhtml_fragment(chapter_content)

        chapter_filename = f"chapter_{idx + 1:04d}.xhtml"
        chapter_uid = f"chapter_{idx + 1:04d}"

        epub_chapter = epub.EpubHtml(
            uid=chapter_uid,
            title=chapter_title,
            file_name=chapter_filename,
            lang="en",
        )

        # Build full XHTML document
        chapter_html = CHAPTER_TEMPLATE.format(
            title=_escape_xml(chapter_title),
            content=chapter_content,
        )
        chapter_html = _validate_xhtml_document(chapter_html)

        epub_chapter.content = chapter_html.encode("utf-8")
        epub_chapter.add_item(style)

        book.add_item(epub_chapter)
        epub_chapters.append(epub_chapter)
        spine.append(epub_chapter)

    # ── table of contents ─────────────────────────────────────────────────
    book.toc = [
        epub.Link(ch.file_name, ch.title, f"toc_ch_{i}")
        for i, ch in enumerate(epub_chapters)
    ]

    # ── navigation files ──────────────────────────────────────────────────
    book.add_item(epub.EpubNcx())

    nav = epub.EpubNav()
    nav.uid = "epub_nav"
    book.add_item(nav)

    # ── spine ─────────────────────────────────────────────────────────────
    book.spine = spine

    # ── write ─────────────────────────────────────────────────────────────
    safe_title = sanitize_filename(title)
    filename = f"{safe_title}_{job_id}.epub"
    filepath = os.path.join(TEMP_DIR, filename)

    epub.write_epub(filepath, book, {})

    # Post-process: guarantee mimetype is STORED and first in the ZIP
    _fix_epub_zip(filepath)

    return filepath
