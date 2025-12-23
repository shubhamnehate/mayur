from flask import Blueprint, jsonify, request

bp = Blueprint("auth", __name__, url_prefix="/auth")


@bp.route("/register", methods=["POST"])
def register():
    payload = request.get_json(silent=True) or {}
    return jsonify({"message": "User registration endpoint", "data": payload}), 201


@bp.route("/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    return jsonify({"message": "User login endpoint", "data": payload})


@bp.route("/me", methods=["GET"])
def me():
    return jsonify({"message": "Current user endpoint"})
