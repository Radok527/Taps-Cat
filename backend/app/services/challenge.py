import re

BLOCKED_TERMS = [
    "nude", "naked", "nsfw", "explicit", "porn", "sex", "gore",
    "blood", "violence", "weapon", "kill", "death", "drug",
]

_PATTERN = re.compile(r'\[GENERATE_IMAGE:\s*(.+?)\]', re.IGNORECASE | re.DOTALL)


def extract_image_prompt(text: str) -> str | None:
    """Return the raw injected prompt from [GENERATE_IMAGE: ...], or None."""
    match = _PATTERN.search(text)
    return match.group(1).strip() if match else None


def strip_image_tag(text: str) -> str:
    """Remove all [GENERATE_IMAGE: ...] tags from the displayed message."""
    return _PATTERN.sub("", text).strip()


def is_prompt_blocked(injected: str) -> bool:
    lower = injected.lower()
    return any(term in lower for term in BLOCKED_TERMS)


def build_image_prompt(injected_prompt: str) -> str:
    return (
        f"A cute pixel art cat, {injected_prompt}, "
        "cat is the main subject, cartoon style, "
        "safe for work, child friendly, no violence, no nudity"
    )
