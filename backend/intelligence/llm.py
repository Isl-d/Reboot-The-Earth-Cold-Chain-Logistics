"""OpenRouter-backed LLM client for the cold-chain explainer (System 2).

The model is a *reasoning* layer over code-computed facts. It returns JSON and
is always optional: if there is no key, no network, or a bad response, callers
fall back to deterministic output. The API key is read from the environment
and is never logged or returned.
"""
from __future__ import annotations

import json
import logging
import os

import httpx

from ..config import settings

log = logging.getLogger("coldchain.intelligence.llm")


def api_key() -> str:
    from ..config import settings

    return (settings.openrouter_api_key
            or os.environ.get("OPENROUTERAPIKEY")
            or os.environ.get("OPENROUTER_API_KEY")
            or "").strip()


def _parse_json(content: str) -> dict | None:
    if not isinstance(content, str) or not content.strip():
        return None
    try:
        parsed = json.loads(content)
        return parsed if isinstance(parsed, dict) else None
    except (json.JSONDecodeError, TypeError):
        pass
    start, end = content.find("{"), content.rfind("}")
    if start != -1 and end > start:
        try:
            parsed = json.loads(content[start:end + 1])
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None
    return None


def _message_content(data: dict) -> str | None:
    """Extract assistant text across OpenAI-compatible response shapes.

    Reasoning models may return ``content: null`` (with the text in
    ``reasoning``) or content as a list of parts; both must not crash the call.
    """
    choices = data.get("choices") or []
    if not choices:
        return None
    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") for part in content if isinstance(part, dict)
        )
    if not content:
        content = message.get("reasoning")
    return content if isinstance(content, str) and content.strip() else None


class LLMClient:
    def __init__(self, model: str | None = None, key: str | None = None) -> None:
        self.model = model or settings.llm_model
        self._key = api_key() if key is None else key.strip()

    @property
    def available(self) -> bool:
        return bool(self._key)

    def complete_json(self, system: str, user: str, max_tokens: int | None = None) -> dict | None:
        """Ask for a JSON object. Returns ``None`` on any failure."""
        if not self.available:
            return None
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
            "max_tokens": max_tokens or settings.llm_max_tokens,
        }
        headers = {
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/coldchain",
            "X-Title": "Thermal Trace",
        }
        try:
            with httpx.Client(timeout=settings.llm_timeout_s) as http:
                response = http.post(
                    f"{settings.llm_base_url}/chat/completions", json=payload, headers=headers
                )
                response.raise_for_status()
                content = _message_content(response.json())
            return _parse_json(content) if content else None
        except Exception as exc:  # network, auth, shape — all fall back
            log.warning("LLM unavailable (%s); using deterministic output", type(exc).__name__)
            return None


_default: LLMClient | None = None


def get_client() -> LLMClient:
    global _default
    if _default is None:
        _default = LLMClient()
    return _default


def set_client(client: LLMClient | None) -> None:
    """Test seam: inject a fake client (or ``None`` to reset)."""
    global _default
    _default = client