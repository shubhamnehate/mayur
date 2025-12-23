from functools import wraps
from typing import Callable, Iterable

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)
from werkzeug.security import check_password_hash, generate_password_hash

from ..models import ROLE_VALUES, User
from ..db import db

bp = Blueprint("auth", __name__, url_prefix="/api")


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "roles": [user.role],
    }


def require_roles(*roles: str) -> Callable:
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            if not user_has_role(roles):
                return (
                    jsonify(
                        {"message": "Forbidden: insufficient role", "required": roles}
                    ),
                    403,
                )
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def user_has_role(roles: Iterable[str]) -> bool:
    claims = get_jwt()
    user_roles = claims.get("roles", [])
    return bool(set(user_roles).intersection(set(roles)))


@bp.route("/auth/register", methods=["POST"])
def register():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    role = payload.get("role") or ROLE_VALUES[0]

    errors = {}
    if not name:
        errors["name"] = "Name is required."
    if not email:
        errors["email"] = "Email is required."
    if not password:
        errors["password"] = "Password is required."
    if role not in ROLE_VALUES:
        errors["role"] = f"Role must be one of {', '.join(ROLE_VALUES)}."

    if errors:
        return jsonify({"message": "Invalid input", "errors": errors}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "Email already registered."}), 409

    user = User(
        name=name, email=email, password_hash=generate_password_hash(password), role=role
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered successfully", "user": serialize_user(user)}), 201


@bp.route("/auth/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email or not password:
        return (
            jsonify({"message": "Email and password are required."}),
            400,
        )

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"message": "Invalid credentials."}), 401

    claims = {"roles": [user.role], "user_id": user.id}
    access_token = create_access_token(identity=user.id, additional_claims=claims)
    return jsonify({"access_token": access_token, "user": serialize_user(user)})


@bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found."}), 404

    claims = get_jwt()
    return jsonify({"user": serialize_user(user), "claims": claims})
