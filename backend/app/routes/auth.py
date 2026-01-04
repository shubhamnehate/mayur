from functools import wraps
from typing import Callable, Iterable

from flask import Blueprint, jsonify
from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)
from werkzeug.security import check_password_hash, generate_password_hash

from ..db import db
from ..models import ROLE_VALUES, User
from ..security import (
    ValidationError,
    require_json,
    sanitize_string,
    validate_password,
)

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


def _admin_only_response():
    return (
        jsonify({"message": "Forbidden: admin role required"}),
        403,
    )


@bp.route("/auth/register", methods=["POST"])
def register():
    try:
        payload = require_json()
        name = sanitize_string(payload.get("name"), "name", required=True, max_length=120)
        email = sanitize_string(payload.get("email"), "email", required=True, max_length=255).lower()
        password = payload.get("password") or ""
        role = payload.get("role") or ROLE_VALUES[0]

        validate_password(password)

        if role not in ROLE_VALUES:
            raise ValidationError(
                "Invalid input", {"role": f"Role must be one of {', '.join(ROLE_VALUES)}."}
            )

        if role == "admin":
            raise ValidationError(
                "Invalid input",
                {"role": "Admin accounts can only be created by an administrator."},
            )

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({"message": "Email already registered."}), 409

        user = User(
            name=name,
            email=email,
            password_hash=generate_password_hash(password),
            role=role,
        )
        db.session.add(user)
        db.session.commit()

        return (
            jsonify({"message": "User registered successfully", "user": serialize_user(user)}),
            201,
        )
    except ValidationError as exc:  # pragma: no cover - safety net for prod readiness
        return exc.to_response()


@bp.route("/auth/login", methods=["POST"])
def login():
    try:
        payload = require_json()
        email = sanitize_string(payload.get("email"), "email", required=True, max_length=255).lower()
        password = payload.get("password") or ""

        if not password:
            raise ValidationError("Invalid input", {"password": "Password is required."})

        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"message": "Invalid credentials."}), 401

        claims = {"roles": [user.role], "user_id": user.id}
        access_token = create_access_token(identity=user.id, additional_claims=claims)
        return jsonify({"access_token": access_token, "user": serialize_user(user)})
    except ValidationError as exc:  # pragma: no cover
        return exc.to_response()


@bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found."}), 404

    claims = get_jwt()
    return jsonify({"user": serialize_user(user), "claims": claims})


@bp.route("/auth/admin/create-teacher", methods=["POST"])
@jwt_required()
def create_teacher():
    if not user_has_role(["admin"]):
        return _admin_only_response()

    try:
        payload = require_json()
        name = sanitize_string(payload.get("name"), "name", required=True, max_length=120)
        email = sanitize_string(payload.get("email"), "email", required=True, max_length=255).lower()
        password = payload.get("password") or ""
        validate_password(password)

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({"message": "Email already registered."}), 409

        user = User(
            name=name,
            email=email,
            password_hash=generate_password_hash(password),
            role="teacher",
        )
        db.session.add(user)
        db.session.commit()

        claims = {"roles": [user.role], "user_id": user.id}
        access_token = create_access_token(identity=user.id, additional_claims=claims)
        return (
            jsonify(
                {
                    "message": "Teacher account created",
                    "user": serialize_user(user),
                    "access_token": access_token,
                }
            ),
            201,
        )
    except ValidationError as exc:  # pragma: no cover
        return exc.to_response()
