"""Security and validation helpers to keep request handling consistent."""

from __future__ import annotations

import secrets
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Optional

from flask import jsonify, request


@dataclass
class ValidationError(Exception):
    """Raised when request payload validation fails."""

    message: str
    errors: Dict[str, str] | None = None

    def to_response(self, status_code: int = 400):
        payload: Dict[str, Any] = {"message": self.message}
        if self.errors:
            payload["errors"] = self.errors
        return jsonify(payload), status_code


def require_json(max_bytes: int = 64 * 1024) -> Dict[str, Any]:
    """Ensure the request is JSON and below the configured size limit."""

    content_length = request.content_length or 0
    if content_length > max_bytes:
        raise ValidationError(
            f"Payload too large; limit is {max_bytes} bytes", {"size": "Payload too large"}
        )

    if not request.is_json:
        raise ValidationError("Expected JSON body", {"content_type": "application/json required"})

    payload = request.get_json(silent=True) or {}
    if not isinstance(payload, dict):
        raise ValidationError("Invalid JSON payload", {"body": "Must be a JSON object"})
    return payload


def sanitize_string(
    value: Optional[str], field: str, *, max_length: int = 255, required: bool = False
) -> str:
    cleaned = (value or "").strip()
    if required and not cleaned:
        raise ValidationError("Invalid input", {field: "This field is required."})
    if len(cleaned) > max_length:
        raise ValidationError(
            "Invalid input",
            {field: f"Must be at most {max_length} characters."},
        )
    return cleaned


def validate_password(password: str, field: str = "password", min_length: int = 8) -> None:
    if len(password) < min_length:
        raise ValidationError(
            "Invalid input", {field: f"Must be at least {min_length} characters."}
        )


def validate_decimal(
    value: Any, field: str, *, min_value: Decimal | None = Decimal("0")
) -> Decimal:
    try:
        amount = Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError):
        raise ValidationError("Invalid input", {field: "Must be a valid decimal."})

    if min_value is not None and amount < min_value:
        raise ValidationError(
            "Invalid input",
            {field: f"Must be greater than or equal to {min_value}."},
        )
    return amount


def generate_secure_token(prefix: str = "manual") -> str:
    return f"{prefix}-{secrets.token_hex(8)}"
