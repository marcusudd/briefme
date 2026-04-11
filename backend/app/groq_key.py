"""Groq API key from the environment (after env_loader runs).

Normalization catches BOM, quotes, and README-style placeholders so we fail fast with a
clear error instead of a generic Groq 401.
"""
from __future__ import annotations

import os


def normalize_groq_api_key(raw: str) -> str:
    key = raw.replace("\ufeff", "").strip()
    if len(key) >= 2 and key[0] == key[-1] and key[0] in "\"'":
        key = key[1:-1].strip()
    key = key.replace("\ufeff", "").strip()
    if not key:
        raise ValueError(
            "GROQ_API_KEY is empty after trimming. Remove extra quotes or whitespace in .env."
        )
    lower = key.lower()
    if "your_groq" in lower or lower.endswith("api_key_here") or lower == "gsk_your_groq_api_key_here":
        raise ValueError(
            "GROQ_API_KEY still looks like a placeholder from a template. "
            "Replace it with a real key from https://console.groq.com/keys in backend/.env "
            "(recommended) or project root .env."
        )
    return key


def load_groq_api_key_required() -> str:
    raw = os.getenv("GROQ_API_KEY")
    if not raw:
        raise ValueError(
            "Missing GROQ_API_KEY. Add it to backend/.env (recommended) or project root .env."
        )
    return normalize_groq_api_key(raw)


def groq_key_env_status() -> dict[str, bool | str | None]:
    """Non-secret diagnostics for /health (no network call to Groq)."""
    raw = os.getenv("GROQ_API_KEY")
    if raw is None or not str(raw).strip():
        return {
            "groq_api_key_present": False,
            "groq_api_key_format_ok": False,
            "groq_api_key_hint": (
                "No key in process env after .env load. "
                "Use backend/.env so it overrides an old key in project root .env."
            ),
        }
    try:
        key = normalize_groq_api_key(raw)
    except ValueError as err:
        return {
            "groq_api_key_present": True,
            "groq_api_key_format_ok": False,
            "groq_api_key_hint": str(err),
        }
    looks_groq = key.startswith("gsk_") and len(key) >= 20
    if not looks_groq:
        return {
            "groq_api_key_present": True,
            "groq_api_key_format_ok": False,
            "groq_api_key_hint": (
                "Value does not match a typical Groq secret (expected gsk_ followed by alphanumeric). "
                "You may have the wrong provider's key or a truncated copy-paste."
            ),
        }
    return {
        "groq_api_key_present": True,
        "groq_api_key_format_ok": True,
        "groq_api_key_hint": None,
    }
