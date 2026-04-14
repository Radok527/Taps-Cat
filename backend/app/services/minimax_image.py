import base64
import logging
import uuid
from pathlib import Path

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_IMAGE_URL = "https://api.minimax.io/v1/image_generation"
_MODEL = "image-01"


async def generate_image(prompt: str) -> str:
    """
    Call the Minimax Image API with a pre-wrapped (safe) prompt.

    Saves the result as <uuid4>.png under settings.IMAGES_DIR.
    Returns the filename (basename only, not the full path).

    Raises on any error — the caller (chat router) catches and logs silently.

    Args:
        prompt: The fully-wrapped, safety-hardened prompt from build_image_prompt().
                Never passes raw user input here.
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            _IMAGE_URL,
            headers={
                "Authorization": f"Bearer {settings.MINIMAX_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": _MODEL,
                "prompt": prompt,
                "n": 1,
                "response_format": "base64",
            },
        )
        response.raise_for_status()
        data = response.json()

    # Surface API-level errors before trying to parse
    base = data.get("base_resp", {})
    if base.get("status_code", 0) != 0:
        raise RuntimeError(
            f"Minimax image API error {base.get('status_code')}: {base.get('status_msg')}"
        )

    # Response shape: {"data": {"image_base64": ["<base64>", ...]}, "metadata": {...}}
    image_bytes = base64.b64decode(data["data"]["image_base64"][0])

    filename = f"{uuid.uuid4()}.png"
    dest = Path(settings.IMAGES_DIR) / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(image_bytes)

    logger.info("Generated image saved: %s", filename)
    return filename
