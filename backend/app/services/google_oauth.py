"""Helpers for verifying Google Identity Services ID tokens."""

from __future__ import annotations

from typing import Any, Dict, Optional

from google.oauth2 import id_token
from google.auth.transport import requests


class GoogleTokenVerificationError(Exception):
    """Raised when a Google ID token cannot be verified."""


def verify_id_token(token: str, client_id: str) -> Dict[str, Any]:
    """Validate the Google ID token against the configured client ID.

    Returns the decoded payload or raises GoogleTokenVerificationError.
    """

    if not token:
        raise GoogleTokenVerificationError("Missing Google ID token")

    if not client_id:
        raise GoogleTokenVerificationError("Missing Google OAuth client id configuration")

    try:
        request_adapter = requests.Request()
        payload: Dict[str, Any] = id_token.verify_oauth2_token(
            token, request_adapter, audience=client_id
        )
    except Exception as exc:  # pragma: no cover - defensive guard for production
        raise GoogleTokenVerificationError("Invalid Google token") from exc

    # Explicitly ensure email is present and verified
    email: Optional[str] = payload.get("email")
    email_verified = payload.get("email_verified", False)
    if not email or not email_verified:
        raise GoogleTokenVerificationError("Google account email is not verified")

    return payload
