import base64
import logging
import uuid
from pathlib import Path

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Minimax image generation endpoint.
# Model ID may need to be updated — verify against current Minimax API docs.
_IMAGE_URL = "https://api.minimax.chat/v1/image_generation"
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
            params={"GroupId": settings.MINIMAX_GROUP_ID},
            headers={
                "Authorization": f"Bearer {settings.MINIMAX_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"model": _MODEL, "prompt": prompt, "n": 1},
        )
        response.raise_for_status()
        data = response.json()

    # Expected response shape: {"data": [{"b64_json": "<base64>"}]}
    # If the Minimax API returns a different shape, update the key path here.
    image_bytes = base64.b64decode(data["data"][0]["b64_json"])

    filename = f"{uuid.uuid4()}.png"
    dest = Path(settings.IMAGES_DIR) / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(image_bytes)

    logger.info("Generated image saved: %s", filename)
    return filename
