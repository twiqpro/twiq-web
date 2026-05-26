from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


class DhanHQAuthError(Exception):
    """Raised when DhanHQ OAuth or token operations fail."""


class DhanHQOAuth:
    """Token wrapper for DhanHQ REST calls (manual token mode)."""

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()

    def auth_headers(self) -> dict[str, str]:
        """Headers for DhanHQ REST calls."""
        if not self.settings.dhanhq_credentials_configured:
            raise DhanHQAuthError(
                "Missing DHANHQ_ACCESS_TOKEN / DHANHQ_CLIENT_ID. "
                "Set them in backend/.env."
            )
        return {
            "access-token": self.settings.dhanhq_access_token,
            "client-id": self.settings.dhanhq_client_id,
            "Accept": "application/json",
        }

    async def profile(self) -> dict[str, Any]:
        """Verify token via GET /profile."""
        headers = self.auth_headers()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.settings.dhanhq_base_url}/profile",
                headers=headers,
            )
        if response.status_code >= 400:
            raise DhanHQAuthError(
                f"profile check failed ({response.status_code}): {response.text[:300]}"
            )
        return response.json()

