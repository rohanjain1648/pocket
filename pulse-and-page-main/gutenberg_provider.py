"""
Finds a REAL book (not LLM-generated) matching the mood for a given stress
state, using the Gutendex API — a free, keyless JSON index over Project
Gutenberg's ~75,000 public-domain ebooks (gutendex.com). We search by a real
title, then download the actual plain-text file straight from Gutenberg's
own file host. This is real, legally-reusable published text (all Project
Gutenberg titles are public domain), not something an LLM made up.

No API key, no signup — the only reason this could fail is no internet.
"""
import random
import re

import requests

GUTENDEX_BASE = "https://gutendex.com/books"

# Real, well-known public-domain titles that fit each mood. Add more freely —
# anything findable on Project Gutenberg works. Keep titles specific enough
# that the search returns the right book as the first result.
THEME_TITLES = {
    "high_stress": ["The Wind in the Willows", "Walden", "A Room with a View"],
    "elevated": ["Cranford", "Anne of Green Gables"],
    "normal": ["The Adventures of Sherlock Holmes", "The Moonstone"],
    "calm": ["Alice's Adventures in Wonderland", "The Prisoner of Zenda"],
    "active": ["Treasure Island", "The Count of Monte Cristo"],
}

# A listening mode is more useful than a binary "stress/not stress" label:
# it lets the agent choose both subject matter and delivery for the moment.
MODE_TITLES = {
    "restore": ["The Wind in the Willows", "Walden", "Cranford"],
    "settle": ["Anne of Green Gables", "A Room with a View", "Cranford"],
    "focus": ["The Adventures of Sherlock Holmes", "The Moonstone", "Twenty Thousand Leagues under the Seas"],
    "everyday": ["The Adventures of Sherlock Holmes", "Alice's Adventures in Wonderland", "The Prisoner of Zenda"],
    "workout": ["Treasure Island", "The Count of Monte Cristo", "The Thirty-Nine Steps"],
}

_START_RE = re.compile(
    r"\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*",
    re.IGNORECASE | re.DOTALL,
)
_END_RE = re.compile(r"\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK", re.IGNORECASE)


def _get_with_retry(url, params=None, timeout=25, attempts=2):
    last_error = None
    for _ in range(attempts):
        try:
            resp = requests.get(url, params=params, timeout=timeout)
            resp.raise_for_status()
            return resp
        except requests.exceptions.RequestException as e:
            last_error = e
    raise last_error


def _fetch_story(title: str, excerpt_chars: int) -> dict:
    resp = _get_with_retry(GUTENDEX_BASE, params={"search": title}, timeout=25)
    results = resp.json().get("results", [])
    if not results:
        raise RuntimeError(f"No Gutenberg match found for '{title}'")

    book = results[0]
    text_url = _find_text_url(book.get("formats", {}))
    if not text_url:
        raise RuntimeError(f"No plain-text format available for '{book.get('title')}'")

    raw_text = _get_with_retry(text_url, timeout=25).text
    excerpt = _extract_excerpt(raw_text, excerpt_chars)

    authors = book.get("authors", [])
    author = authors[0]["name"] if authors else "Unknown"

    return {"title": book.get("title", title), "author": author, "text": excerpt}


def get_story_for_state(state: str, excerpt_chars: int = 1800) -> dict:
    """Single random pick — kept for the CLI (main.py)."""
    title = random.choice(THEME_TITLES.get(state, THEME_TITLES["normal"]))
    return _fetch_story(title, excerpt_chars)


def get_stories_for_state(state: str, excerpt_chars: int = 1800, max_stories: int = 3) -> list:
    """
    Multiple candidates for the same state, so the person can pick which one
    to listen to instead of getting a single forced recommendation. Skips
    any individual title that fails to fetch rather than failing the whole
    request over one bad lookup.
    """
    titles = THEME_TITLES.get(state, THEME_TITLES["normal"])[:max_stories]
    stories = []
    for title in titles:
        try:
            stories.append(_fetch_story(title, excerpt_chars))
        except Exception:
            continue
    if not stories:
        raise RuntimeError(f"Couldn't fetch any stories for state '{state}'")
    return stories


def get_stories_for_mode(mode: str, excerpt_chars: int = 1800, max_stories: int = 3) -> list:
    """Return public-domain candidates that fit the agent's listening mode."""
    titles = MODE_TITLES.get(mode, MODE_TITLES["everyday"])[:max_stories]
    stories = []
    for title in titles:
        try:
            stories.append(_fetch_story(title, excerpt_chars))
        except Exception:
            continue
    if not stories:
        raise RuntimeError(f"Couldn't fetch any stories for listening mode '{mode}'")
    return stories


def _find_text_url(formats: dict):
    for mime, url in formats.items():
        if mime.startswith("text/plain"):
            return url
    return None


def _extract_excerpt(raw_text: str, max_chars: int) -> str:
    start_match = _START_RE.search(raw_text)
    body = raw_text[start_match.end():] if start_match else raw_text

    end_match = _END_RE.search(body)
    if end_match:
        body = body[:end_match.start()]

    body = body.strip()
    excerpt = body[:max_chars]

    # Trim back to the last full sentence so narration doesn't cut off mid-word.
    last_period = excerpt.rfind(".")
    if last_period > 200:
        excerpt = excerpt[:last_period + 1]
    return excerpt
