import os
import secrets
from datetime import datetime
from decimal import Decimal
from typing import Dict, Optional

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.security import generate_password_hash

from ..db import db
from ..models import (
    Course,
    Enrollment,
    PAYMENT_METHOD_VALUES,
    PAYMENT_ORDER_STATUS_VALUES,
    PAYMENT_STATUS_VALUES,
    Payment,
    PaymentOrder,
    User,
)
from ..routes.auth import require_roles
from ..security import (
    ValidationError,
    generate_secure_token,
    require_json,
    sanitize_string,
    validate_decimal,
)
from ..services.payments import is_valid_signature

bp = Blueprint("payments", __name__, url_prefix="/api/payments")


def _serialize_enrollment(enrollment: Enrollment) -> Dict:
    return {
        "id": enrollment.id,
        "user_id": enrollment.user_id,
        "course_id": enrollment.course_id,
        "status": enrollment.status,
        "enrolled_at": enrollment.enrolled_at.isoformat(),
    }


def _serialize_order(order: PaymentOrder) -> Dict:
    return {
        "id": order.id,
        "order_id": order.provider_order_id,
        "user_id": order.user_id,
        "course_id": order.course_id,
        "amount": float(order.amount),
        "currency": order.currency,
        "status": order.status,
        "created_at": order.created_at.isoformat(),
    }


def _serialize_payment(payment: Payment) -> Dict:
    return {
        "id": payment.id,
        "user_id": payment.user_id,
        "course_id": payment.course_id,
        "amount": float(payment.amount),
        "status": payment.status,
        "provider_payment_id": payment.provider_payment_id,
        "order_id": payment.order_id,
        "method": payment.method,
        "notes": payment.notes,
        "recorded_by_user_id": payment.recorded_by_user_id,
        "created_at": payment.created_at.isoformat(),
    }


def _ensure_enrollment(user_id: int, course_id: int) -> Enrollment:
    enrollment = Enrollment.query.filter_by(
        user_id=user_id, course_id=course_id
    ).first()
    if enrollment:
        return enrollment

    enrollment = Enrollment(
        user_id=user_id,
        course_id=course_id,
        status="active",
        enrolled_at=datetime.utcnow(),
    )
    db.session.add(enrollment)
    return enrollment


def _get_amount(payload_amount: Optional[float], course_price: Decimal) -> Decimal:
    if payload_amount is None:
        return Decimal(course_price)
    return validate_decimal(payload_amount, "amount", min_value=Decimal("0.00"))


def _get_latest_payment(order: PaymentOrder) -> Optional[Payment]:
    return (
        Payment.query.filter_by(order_id=order.id)
        .order_by(Payment.created_at.desc())
        .first()
    )


def _mark_payment_failed(order: PaymentOrder, payment_id: Optional[str]) -> None:
    order.status = PAYMENT_ORDER_STATUS_VALUES[2]
    payment = Payment.query.filter_by(order_id=order.id).first()
    if payment:
        payment.status = "failed"
        if payment_id:
            payment.provider_payment_id = payment_id


def _get_or_create_manual_user(
    *, user_id: Optional[int], email: Optional[str], name: Optional[str]
) -> User:
    if user_id:
        user = User.query.get(user_id)
        if not user:
            raise ValidationError("Invalid input", {"user_id": "User not found"})
        return user

    cleaned_email = sanitize_string(email, "email", required=True, max_length=255).lower()
    cleaned_name = sanitize_string(name, "name", required=True, max_length=120)

    existing = User.query.filter_by(email=cleaned_email).first()
    if existing:
        return existing

    temp_password = generate_password_hash(generate_secure_token("temp-pass"))
    user = User(
        name=cleaned_name,
        email=cleaned_email,
        password_hash=temp_password,
        role="student",
    )
    db.session.add(user)
    db.session.flush()
    return user


@bp.route("/create-order", methods=["POST"])
@jwt_required(optional=True)
def create_order():
    try:
        payload = require_json()
        course_id = payload.get("course_id")
        currency = sanitize_string(payload.get("currency"), "currency", max_length=10) or "INR"
        user_id = get_jwt_identity() or payload.get("user_id")

        if not course_id:
            raise ValidationError("Invalid input", {"course_id": "course_id is required"})
        if not user_id:
            raise ValidationError("Invalid input", {"user_id": "user_id is required"})

        try:
            course_id = int(course_id)
            user_id = int(user_id)
        except (TypeError, ValueError):
            raise ValidationError(
                "Invalid input", {"course_id": "Must be numeric", "user_id": "Must be numeric"}
            )

        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404

        course = Course.query.get(course_id)
        if not course:
            return jsonify({"message": "Course not found"}), 404

        amount = _get_amount(payload.get("amount"), course.price)

        existing_order = (
            PaymentOrder.query.filter_by(
                user_id=user.id, course_id=course.id, status="created"
            )
            .order_by(PaymentOrder.created_at.desc())
            .first()
        )
        if existing_order:
            return (
                jsonify(
                    {
                        "message": "Existing order in progress",
                        "order": _serialize_order(existing_order),
                        "key": os.getenv("RAZORPAY_KEY_ID", ""),
                    }
                ),
                200,
            )

        provider_order_id = payload.get("provider_order_id") or f"order_{secrets.token_hex(8)}"
        order = PaymentOrder(
            provider_order_id=provider_order_id,
            user_id=user.id,
            course_id=course.id,
            amount=amount,
            currency=currency.upper(),
            status=PAYMENT_ORDER_STATUS_VALUES[0],
        )
        db.session.add(order)
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Order created",
                    "order": _serialize_order(order),
                    "key": os.getenv("RAZORPAY_KEY_ID", ""),
                }
            ),
            201,
        )
    except ValidationError as exc:  # pragma: no cover
        return exc.to_response()


def _complete_payment_flow(
    order: PaymentOrder, payment_id: str, status: str
) -> Enrollment:
    payment = Payment.query.filter_by(order_id=order.id).first()

    if payment and payment.status == PAYMENT_STATUS_VALUES[1]:
        return _ensure_enrollment(order.user_id, order.course_id)

    if not payment:
        payment = Payment(
            user_id=order.user_id,
            course_id=order.course_id,
            amount=order.amount,
            status=status,
            provider_payment_id=payment_id,
            order_id=order.id,
        )
        db.session.add(payment)
    else:
        payment.status = status
        payment.provider_payment_id = payment_id

    order.status = PAYMENT_ORDER_STATUS_VALUES[1]
    enrollment = _ensure_enrollment(order.user_id, order.course_id)
    db.session.commit()
    return enrollment


@bp.route("/verify", methods=["POST"])
@jwt_required(optional=True)
def verify_payment():
    try:
        payload = require_json()
        order_id = payload.get("razorpay_order_id")
        payment_id = payload.get("razorpay_payment_id")
        signature = payload.get("razorpay_signature")
        user_id = get_jwt_identity() or payload.get("user_id")

        if not (order_id and payment_id and signature):
            raise ValidationError(
                "Invalid input",
                {
                    "razorpay_order_id": "required",
                    "razorpay_payment_id": "required",
                    "razorpay_signature": "required",
                },
            )

        order = PaymentOrder.query.filter_by(provider_order_id=order_id).first()
        if not order:
            return jsonify({"message": "Order not found"}), 404

        if user_id and order.user_id != int(user_id):
            return jsonify({"message": "Forbidden"}), 403

        if order.status == PAYMENT_ORDER_STATUS_VALUES[2]:
            return jsonify({"message": "Order has already failed"}), 400

        if order.status == "paid":
            enrollment = _ensure_enrollment(order.user_id, order.course_id)
            payment = _get_latest_payment(order)
            db.session.commit()
            return (
                jsonify(
                    {
                        "message": "Payment already verified",
                        "order": _serialize_order(order),
                        "payment": _serialize_payment(payment) if payment else None,
                        "enrollment": _serialize_enrollment(enrollment),
                    }
                ),
                200,
            )

        secret = os.getenv("RAZORPAY_SECRET", "")
        if not is_valid_signature(order_id, payment_id, signature, secret):
            _mark_payment_failed(order, payment_id)
            db.session.commit()
            return jsonify({"message": "Invalid signature"}), 400

        enrollment = _complete_payment_flow(order, payment_id, PAYMENT_STATUS_VALUES[1])
        payment = _get_latest_payment(order)

        return (
            jsonify(
                {
                    "message": "Payment verified",
                    "order": _serialize_order(order),
                    "payment": _serialize_payment(payment) if payment else None,
                    "enrollment": _serialize_enrollment(enrollment),
                }
            ),
            200,
        )
    except ValidationError as exc:  # pragma: no cover
        return exc.to_response()


@bp.route("/webhook", methods=["POST"])
def webhook():
    payload = request.get_json(silent=True) or {}
    order_id = payload.get("razorpay_order_id") or payload.get("order_id")
    payment_id = payload.get("razorpay_payment_id") or payload.get("payment_id")
    signature = payload.get("razorpay_signature") or request.headers.get("X-Razorpay-Signature")

    if not (order_id and payment_id):
        return jsonify({"message": "Missing order or payment information"}), 400

    order = PaymentOrder.query.filter_by(provider_order_id=order_id).first()
    if not order:
        return jsonify({"message": "Order not found"}), 404

    if order.status == PAYMENT_ORDER_STATUS_VALUES[2]:
        return jsonify({"message": "Order has already failed"}), 400

    if order.status == "paid":
        enrollment = _ensure_enrollment(order.user_id, order.course_id)
        payment = _get_latest_payment(order)
        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Webhook already processed",
                    "order": _serialize_order(order),
                    "payment": _serialize_payment(payment) if payment else None,
                    "enrollment": _serialize_enrollment(enrollment),
                }
            ),
            200,
        )

    secret = os.getenv("RAZORPAY_SECRET", "")
    if signature and not is_valid_signature(order_id, payment_id, signature, secret):
        _mark_payment_failed(order, payment_id)
        db.session.commit()
        return jsonify({"message": "Invalid signature"}), 400

    enrollment = _complete_payment_flow(
        order, payment_id, PAYMENT_STATUS_VALUES[1]
    )
    payment = _get_latest_payment(order)

    return (
        jsonify(
            {
                "message": "Webhook processed",
                "order": _serialize_order(order),
                "payment": _serialize_payment(payment) if payment else None,
                "enrollment": _serialize_enrollment(enrollment),
            }
        ),
        200,
    )


@bp.route("/manual-record", methods=["POST"])
@require_roles("admin")
def manual_record_payment():
    try:
        payload = require_json()
        user_id = payload.get("user_id")
        course_id = payload.get("course_id")
        if not course_id:
            raise ValidationError("Invalid input", {"course_id": "course_id is required"})

        try:
            course_id_int = int(course_id)
        except (TypeError, ValueError):
            raise ValidationError("Invalid input", {"course_id": "Must be numeric"})

        course = Course.query.get(course_id_int)
        if not course:
            return jsonify({"message": "Course not found"}), 404

        user = _get_or_create_manual_user(
            user_id=int(user_id) if user_id else None,
            email=payload.get("email"),
            name=payload.get("name"),
        )

        amount = _get_amount(payload.get("amount"), course.price)
        currency = sanitize_string(payload.get("currency"), "currency", max_length=10) or "INR"
        provider_payment_id = sanitize_string(
            payload.get("provider_payment_id"), "provider_payment_id", max_length=255
        ) or generate_secure_token("manual-payment")
        provider_order_id = sanitize_string(
            payload.get("provider_order_id"), "provider_order_id", max_length=255
        ) or generate_secure_token("manual-order")
        notes = sanitize_string(payload.get("notes"), "notes", max_length=500)

        order = PaymentOrder(
            provider_order_id=provider_order_id,
            user_id=user.id,
            course_id=course.id,
            amount=amount,
            currency=currency.upper(),
            status=PAYMENT_ORDER_STATUS_VALUES[1],
        )
        db.session.add(order)
        db.session.flush()

        payment = Payment(
            user_id=user.id,
            course_id=course.id,
            amount=amount,
            status=PAYMENT_STATUS_VALUES[1],
            provider_payment_id=provider_payment_id,
            order_id=order.id,
            method=PAYMENT_METHOD_VALUES[1],
            notes=notes,
            recorded_by_user_id=get_jwt_identity(),
        )
        db.session.add(payment)

        enrollment = _ensure_enrollment(user.id, course.id)
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Manual payment recorded",
                    "order": _serialize_order(order),
                    "payment": _serialize_payment(payment),
                    "enrollment": _serialize_enrollment(enrollment),
                }
            ),
            201,
        )
    except ValidationError as exc:  # pragma: no cover
        db.session.rollback()
        return exc.to_response()


@bp.route("/checkout", methods=["POST"])
@jwt_required(optional=True)
def checkout():
    """Backward compatible endpoint to initiate an order creation."""
    return create_order()


@bp.route("/", methods=["GET"])
def list_payments():
    payments = Payment.query.order_by(Payment.created_at.desc()).all()
    return jsonify({"payments": [_serialize_payment(p) for p in payments]})
