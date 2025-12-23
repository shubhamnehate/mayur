from flask import Blueprint, jsonify, request

bp = Blueprint("uploads", __name__, url_prefix="/uploads")


@bp.route("/", methods=["POST"])
def upload_file():
    file = request.files.get("file")
    filename = getattr(file, "filename", None)
    return jsonify({"message": "Upload endpoint", "filename": filename}), 201


@bp.route("/<path:filename>", methods=["GET"])
def get_file(filename: str):
    return jsonify({"message": "Fetch upload", "filename": filename})
