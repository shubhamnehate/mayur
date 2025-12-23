"""Payment-related helpers."""

import hmac
from hashlib import sha256
from typing import Optional


def compute_signature(order_id: str, payment_id: str, secret: str) -> str:
    """Compute a Razorpay-style signature for the given order and payment IDs."""
    message = f"{order_id}|{payment_id}".encode()
    return hmac.new(secret.encode(), message, sha256).hexdigest()


def is_valid_signature(
    order_id: str, payment_id: str, provided_signature: Optional[str], secret: str
) -> bool:
    """Compare a computed signature with the provider supplied one."""
    if not provided_signature:
        return False
    expected_signature = compute_signature(order_id, payment_id, secret)
    return hmac.compare_digest(expected_signature, provided_signature)
