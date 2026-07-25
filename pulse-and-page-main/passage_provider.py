"""Retrieves a clean, approximately two-minute public-domain passage.

Books are not bundled into the repository.  At narration time we retrieve the
selected public-domain text from Project Gutenberg and remove its front matter
and table-of-contents material.  This keeps the project small and avoids
shipping copyrighted audiobooks.
"""
import re
import requests

START = re.compile(r"\*\*\*\s*START OF.*?\*\*\*", re.I | re.S)
END = re.compile(r"\*\*\*\s*END OF", re.I)
CHAPTER_ONE = re.compile(r"(?im)^\s*(?:chapter\s+i\b|i\.\s+[A-Z])[^\n]*")


def get_two_minute_passage(gutenberg_id: int, fallback: str, target_words: int = 290) -> str:
    """Return a readable chapter opening of about 290 words (roughly 2 min)."""
    try:
        url = f"https://www.gutenberg.org/cache/epub/{gutenberg_id}/pg{gutenberg_id}.txt"
        response = requests.get(url, timeout=20)
        response.raise_for_status()
        text = response.text
        start = START.search(text)
        if start:
            text = text[start.end():]
        end = END.search(text)
        if end:
            text = text[:end.start()]
        # The final Chapter I match avoids a table-of-contents entry in most
        # Gutenberg files. If no heading exists, start after the first 1,500
        # characters to avoid title pages and publication information.
        matches = list(CHAPTER_ONE.finditer(text))
        text = text[matches[-1].end():] if matches else text[1500:]
        text = re.sub(r"\s+", " ", text).strip()
        words = text.split()
        if len(words) >= 100:
            return " ".join(words[:target_words])
    except requests.RequestException:
        pass
    return fallback
