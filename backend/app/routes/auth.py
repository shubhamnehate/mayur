import os
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
    generate_secure_token,
    require_json,
    sanitize_string,
    validate_password,
)
from ..services.google_oauth import (
    GoogleTokenVerificationError,
    verify_id_token as verify_google_id_token,
)

bp = Blueprint("auth", __name__, url_prefix="/api")


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "roles": [user.role],
    }


def issue_access_token(user: User) -> str:
    claims = {"roles": [user.role], "user_id": user.id}
    return create_access_token(identity=user.id, additional_claims=claims)


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
        name = sanitize_string(
            payload.get("name")
            or payload.get("fullName")
            or payload.get("full_name"),
            "name",
            required=True,
            max_length=120,
        )
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

        access_token = issue_access_token(user)
        return jsonify({"access_token": access_token, "user": serialize_user(user)}), 201
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

        access_token = issue_access_token(user)
        return jsonify({"access_token": access_token, "user": serialize_user(user)})
    except ValidationError as exc:  # pragma: no cover
        return exc.to_response()


@bp.route("/auth/google", methods=["POST"])
def google_login():
    """Exchange a Google ID token for a local JWT."""

    try:
        payload = require_json()
        id_token_raw = sanitize_string(
            payload.get("id_token") or payload.get("credential"),
            "id_token",
            required=True,
            max_length=4096,
        )
        client_id = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("BACKEND_GOOGLE_CLIENT_ID")
        token_payload = verify_google_id_token(id_token_raw, client_id or "")

        email = sanitize_string(
            token_payload.get("email"), "email", required=True, max_length=255
        ).lower()
        name = sanitize_string(
            payload.get("name")
            or token_payload.get("name")
            or token_payload.get("given_name")
            or email.split("@")[0],
            "name",
            required=True,
            max_length=120,
        )

        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(
                name=name,
                email=email,
                password_hash=generate_password_hash(generate_secure_token("google")),
                role=ROLE_VALUES[0],
            )
            db.session.add(user)
        else:
            if not user.name and name:
                user.name = name

        db.session.commit()

        access_token = issue_access_token(user)
        return jsonify({"access_token": access_token, "user": serialize_user(user)})
    except GoogleTokenVerificationError as exc:  # pragma: no cover
        return jsonify({"message": str(exc)}), 400
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
        access_token = issue_access_token(user)
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
