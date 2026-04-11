"""Load .env before routes read os.environ.

Order matters with override=True (last file wins for each variable):

1. Project root .env — shared defaults.
2. backend/.env — **wins** over root for the same key.

Previously backend was loaded first and root second, so a stale or placeholder
GROQ_API_KEY in project root .env overwrote a valid backend/.env key (recurring 401s).

Uses override=True so .env files win over stale exports in the shell.

Special rule:
- GROQ_API_KEY is sourced ONLY from backend/.env.
- Project root .env is ignored for GROQ_API_KEY to avoid accidental regressions.
"""
import os
from pathlib import Path

from dotenv import dotenv_values, load_dotenv

_backend = Path(__file__).resolve().parent.parent
_repo_root = _backend.parent
_backend_env = _backend / ".env"

load_dotenv(_repo_root / ".env", override=True)
load_dotenv(_backend_env, override=True)

_backend_key = dotenv_values(_backend_env).get("GROQ_API_KEY")
if isinstance(_backend_key, str) and _backend_key.strip():
    os.environ["GROQ_API_KEY"] = _backend_key
else:
    os.environ.pop("GROQ_API_KEY", None)
