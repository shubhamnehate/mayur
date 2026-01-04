from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..db import db
from ..models import Attachment
from ..security import ValidationError, require_json, sanitize_string

bp = Blueprint("uploads", __name__, url_prefix="/api/uploads")


def _serialize_attachment(attachment: Attachment) -> dict:
    return {
        "id": attachment.id,
        "filename": attachment.filename,
        "url": attachment.url,
        "storage_provider": attachment.storage_provider,
        "content_type": attachment.content_type,
        "size_bytes": attachment.size_bytes,
    }


def _build_upload_url(storage: str, filename: str) -> str:
    storage = storage.lower()
    if storage == "s3":
        return f"https://example-s3.local/{filename}?signature=dummy"
    if storage == "gcs":
        return f"https://example-gcs.local/{filename}?signature=dummy"
    return f"/uploads/{filename}"


@bp.route("/sign", methods=["POST"])
@jwt_required()
def sign_upload():
    try:
        payload = require_json(max_bytes=32 * 1024)
        filename = sanitize_string(payload.get("filename"), "filename", required=True, max_length=255)
        storage = sanitize_string(payload.get("storage"), "storage", max_length=20) or "local"
        content_type = sanitize_string(payload.get("content_type"), "content_type", max_length=255)
        size_bytes = payload.get("size_bytes")
        if size_bytes is not None:
            try:
                size_bytes = int(size_bytes)
            except (TypeError, ValueError):
                raise ValidationError("Invalid input", {"size_bytes": "Must be numeric"})

        upload_url = _build_upload_url(storage, filename)
        attachment = Attachment(
            filename=filename,
            url=upload_url.split("?")[0],
            storage_provider=storage,
            content_type=content_type,
            size_bytes=size_bytes,
            created_by_user_id=get_jwt_identity(),
        )
        db.session.add(attachment)
        db.session.commit()

        response_payload = {
            "upload_url": upload_url,
            "attachment": _serialize_attachment(attachment),
            "storage": storage,
        }
        return jsonify(response_payload), 201
    except ValidationError as exc:  # pragma: no cover
        return exc.to_response()
