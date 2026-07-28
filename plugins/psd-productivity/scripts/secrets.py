#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
PSD Productivity Secrets Manager

Loads secrets using a priority chain:
  1. Environment variables (from shell profile — safest)
  2. ~/.config/psd-productivity/.env file
  3. 1Password CLI (if installed and authenticated)

Setup: See SECRETS-SETUP.md in this plugin for instructions.
"""

import os
import subprocess
import sys
from functools import lru_cache
from pathlib import Path
from typing import Optional

# Environment variable names that skills may request
KNOWN_SECRETS = [
    "FRESHSERVICE_DOMAIN",
    "FRESHSERVICE_API_KEY",
    "OPENAI_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "PERPLEXITY_API_KEY",
    "XAI_API_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "ELEVENLABS_API_KEY",
    "RED_ROVER_API_KEY",
    "RED_ROVER_USERNAME",
    "RED_ROVER_PASSWORD",
    "N8N_HOST",
    "N8N_API_KEY",
    "N8N_MCP_TOKEN",
    "DOCUMENSO_HOST",
    "DOCUMENSO_API_KEY",
    "ATRIUM_HOST",
    "ATRIUM_API_KEY",
]

# Optional: 1Password vault references (fallback only)
VAULT_MAP = {
    "FRESHSERVICE_DOMAIN": "op://PSD/Freshservice/domain",
    "FRESHSERVICE_API_KEY": "op://PSD/Freshservice/api-key",
    "OPENAI_API_KEY": "op://PSD/OpenAI/api-key",
    "GEMINI_API_KEY": "op://PSD/Gemini/api-key",
    "GOOGLE_API_KEY": "op://PSD/Gemini/api-key",
    "PERPLEXITY_API_KEY": "op://PSD/Perplexity/api-key",
    "XAI_API_KEY": "op://PSD/XAI/api-key",
    "GOOGLE_CLIENT_ID": "op://PSD/Google-Workspace/client-id",
    "GOOGLE_CLIENT_SECRET": "op://PSD/Google-Workspace/client-secret",
    "ELEVENLABS_API_KEY": "op://PSD/ElevenLabs/api-key",
    "RED_ROVER_API_KEY": "op://PSD/RedRover/api-key",
    "RED_ROVER_USERNAME": "op://PSD/RedRover/username",
    "RED_ROVER_PASSWORD": "op://PSD/RedRover/password",
    "N8N_HOST": "op://PSD/n8n/host",
    "N8N_API_KEY": "op://PSD/n8n/api-key",
    "N8N_MCP_TOKEN": "op://PSD/n8n/mcp-token",
    "DOCUMENSO_HOST": "op://PSD/Documenso/host",
    "DOCUMENSO_API_KEY": "op://PSD/Documenso/api-key",
    "ATRIUM_HOST": "op://PSD/AIStudio/atrium-host",
    "ATRIUM_API_KEY": "op://PSD/AIStudio/atrium-api-key",
}

# Where the .env file lives (Geoffrey's iCloud secrets directory)
ENV_FILE = Path.home() / "Library" / "Mobile Documents" / "com~apple~CloudDocs" / "Geoffrey" / "secrets" / ".env"

# Cache
_secrets_cache: dict[str, str] = {}
_env_file_loaded = False


def _load_env_file() -> None:
    """Load secrets from ~/.config/psd-productivity/.env into cache."""
    global _env_file_loaded
    if _env_file_loaded:
        return
    _env_file_loaded = True

    if not ENV_FILE.exists():
        return

    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip("'\"")
        if key and value:
            _secrets_cache[key] = value


@lru_cache(maxsize=1)
def _is_1password_available() -> bool:
    """Check if 1Password CLI is available and authenticated."""
    try:
        subprocess.run(
            ["op", "account", "list"],
            capture_output=True,
            check=True,
            timeout=5,
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return False


def _load_from_1password(secret_ref: str) -> Optional[str]:
    """Load a secret from 1Password."""
    try:
        result = subprocess.run(
            ["op", "read", secret_ref],
            capture_output=True,
            text=True,
            check=True,
            timeout=10,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return None


def get_secret(name: str) -> Optional[str]:
    """
    Get a secret by name. Checks in order:
      1. Environment variable (set in shell profile)
      2. ~/.config/psd-productivity/.env file
      3. 1Password CLI (if available)

    Returns None if not found anywhere.
    """
    # 1. Check environment variable
    env_val = os.environ.get(name)
    if env_val:
        return env_val

    # 2. Check .env file cache
    _load_env_file()
    if name in _secrets_cache:
        return _secrets_cache[name]

    # 3. Try 1Password as fallback
    if _is_1password_available():
        secret_ref = VAULT_MAP.get(name)
        if secret_ref:
            value = _load_from_1password(secret_ref)
            if value:
                _secrets_cache[name] = value
                return value

    return None


def require_secret(name: str) -> str:
    """
    Require a secret — raises with setup instructions if not found.
    """
    value = get_secret(name)
    if not value:
        raise ValueError(
            f"Missing required secret: {name}\n\n"
            f"Set it using ONE of these methods:\n\n"
            f"  Option A (safest) — Add to your shell profile (~/.zshrc):\n"
            f"    export {name}=\"your-key-here\"\n"
            f"    Then restart your terminal.\n\n"
            f"  Option B — Add to {ENV_FILE}:\n"
            f"    {name}=your-key-here\n\n"
            f"See SECRETS-SETUP.md in the psd-productivity plugin for full instructions."
        )
    return value


def load_secrets(names: list[str]) -> dict[str, Optional[str]]:
    """Load multiple secrets at once."""
    return {name: get_secret(name) for name in names}


def list_available_secrets() -> list[str]:
    """Get all known secret names."""
    return list(KNOWN_SECRETS)


class SecretsAccessor:
    """Property-based access to common secrets."""

    @property
    def freshservice_domain(self) -> str:
        return require_secret("FRESHSERVICE_DOMAIN")

    @property
    def freshservice_api_key(self) -> str:
        return require_secret("FRESHSERVICE_API_KEY")

    @property
    def openai(self) -> str:
        return require_secret("OPENAI_API_KEY")

    @property
    def gemini(self) -> str:
        return require_secret("GEMINI_API_KEY")

    @property
    def perplexity(self) -> str:
        return require_secret("PERPLEXITY_API_KEY")

    @property
    def xai(self) -> str:
        return require_secret("XAI_API_KEY")

    @property
    def google_client_id(self) -> str:
        return require_secret("GOOGLE_CLIENT_ID")

    @property
    def google_client_secret(self) -> str:
        return require_secret("GOOGLE_CLIENT_SECRET")

    @property
    def elevenlabs(self) -> str:
        return require_secret("ELEVENLABS_API_KEY")


SECRETS = SecretsAccessor()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="PSD Productivity Secrets Manager")
    parser.add_argument("--list", action="store_true", help="List known secrets")
    parser.add_argument("--get", metavar="NAME", help="Get a specific secret")
    parser.add_argument("--check", action="store_true", help="Check which secrets are available")

    args = parser.parse_args()

    if args.list:
        print("Known secrets:")
        for name in KNOWN_SECRETS:
            print(f"  {name}")
    elif args.get:
        try:
            value = require_secret(args.get)
            masked = value[:4] + "..." + value[-4:] if len(value) > 8 else "***"
            print(f"{args.get}: {masked}")
        except ValueError as e:
            print(str(e), file=sys.stderr)
            sys.exit(1)
    elif args.check:
        print("Secret availability:")
        for name in KNOWN_SECRETS:
            val = get_secret(name)
            status = "SET" if val else "NOT SET"
            print(f"  {name}: {status}")
    else:
        parser.print_help()
