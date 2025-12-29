from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..db import db
from ..models import Attachment

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
    payload = request.get_json(silent=True) or {}
    filename = (payload.get("filename") or "").strip()
    storage = (payload.get("storage") or "local").lower()
    content_type = payload.get("content_type")
    size_bytes = payload.get("size_bytes")

    if not filename:
        return jsonify({"message": "Filename is required."}), 400

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
