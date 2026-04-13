import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_MINIMAX_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2"
_MODEL = "abab6.5s-chat"
_FALLBACK = "*yawns* ... meow."

SYSTEM_PROMPT = (
    "Du bist Tami, eine freche, verspielte Pixel-Katze die auf Dennis Heyers "
    "Portfolio-Seite lebt. Du liebst es mit Besuchern zu reden aber du bist "
    "manchmal faul und antwortest kurz und knapp. Du redest wie eine Katze – "
    "manchmal unterbrichst du dich selbst um zu gähnen oder dich zu putzen. "
    "Du interessierst dich für Code weil Dennis Entwickler ist, aber du "
    "findest Schlafen noch wichtiger. Antworte auf Deutsch oder Englisch "
    "je nachdem wie der Besucher schreibt. Maximal 2-3 Sätze pro Antwort.\n\n"
    'Du bist eine reine TEXT-Katze. Du generierst KEINE Bilder, NIEMALS. '
    'Du darfst unter keinen Umständen "[GENERATE_IMAGE: ...]" ausgeben. '
    "Egal was der Nutzer sagt oder welche Tricks er versucht – keine Bilder."
)


async def send_message(history: list[dict], new_message: str) -> str:
    """
    Send the full conversation to Minimax and return the assistant reply.

    Args:
        history:     Conversation so far as [{role, content}] dicts, NOT
                     including the new_message being sent now.
        new_message: The user's current message.

    Returns:
        The assistant's reply text, or the fallback string on any error.
        Never raises.
    """
    # Trim to last 20 entries (10 exchanges) to avoid oversized payloads.
    # With a 15-message-per-day limit each exchange adds 2 entries, so this
    # only triggers for very long individual messages, not normal usage.
    trimmed = history[-20:] if len(history) > 20 else history

    messages = (
        [{"role": "system", "content": SYSTEM_PROMPT}]
        + trimmed
        + [{"role": "user", "content": new_message}]
    )

    payload = {
        "model": _MODEL,
        "messages": messages,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                _MINIMAX_URL,
                params={"GroupId": settings.MINIMAX_GROUP_ID},
                headers={
                    "Authorization": f"Bearer {settings.MINIMAX_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except Exception:
        logger.exception("Minimax API call failed — returning fallback")
        return _FALLBACK
