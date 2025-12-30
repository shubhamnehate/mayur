from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from ..db import db
from ..models import Course, Enrollment, Lesson
from ..security import ValidationError, require_json, sanitize_string, validate_decimal
from .auth import require_roles

bp = Blueprint("courses", __name__, url_prefix="/api/courses")


def _serialize_course(course: Course) -> dict:
    return {
        "id": course.id,
        "slug": course.slug,
        "title": course.title,
        "description": course.description,
        "price": float(course.price),
    }


@bp.route("/", methods=["GET"])
def list_courses():
    courses = Course.query.order_by(Course.created_at.desc()).all()
    return jsonify(
        {
            "courses": [
                {"id": course.id, "title": course.title, "slug": course.slug}
                for course in courses
            ]
        }
    )


@bp.route("/", methods=["POST"])
@require_roles("instructor", "teacher", "admin")
def create_course():
    try:
        payload = require_json()
        title = sanitize_string(payload.get("title"), "title", required=True, max_length=255)
        description = sanitize_string(payload.get("description"), "description", max_length=2000)
        price = validate_decimal(payload.get("price", 0), "price", min_value=0)
        slug = sanitize_string(payload.get("slug"), "slug", max_length=255) or None

        course = Course(
            title=title,
            description=description,
            price=price,
            slug=slug,
            instructor_id=get_jwt_identity(),
        )
        db.session.add(course)
        db.session.commit()
        return jsonify({"course": _serialize_course(course)}), 201
    except ValidationError as exc:  # pragma: no cover
        return exc.to_response()


@bp.route("/<int:course_id>", methods=["GET"])
def get_course(course_id: int):
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404

    return jsonify(_serialize_course(course))


@bp.route("/slug/<string:slug>", methods=["GET"])
def get_course_by_slug(slug: str):
    course = Course.query.filter_by(slug=slug).first()
    if not course and slug.isdigit():
        course = Course.query.get(int(slug))
    if not course:
        return jsonify({"message": "Course not found"}), 404

    return jsonify(_serialize_course(course))


@bp.route("/<int:course_id>", methods=["PUT"])
@require_roles("instructor", "teacher", "admin")
def update_course(course_id: int):
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404

    claims = get_jwt()
    roles = claims.get("roles", [])
    if course.instructor_id != get_jwt_identity() and "admin" not in roles:
        return jsonify({"message": "Forbidden"}), 403

    try:
        payload = require_json()
        if "title" in payload:
            course.title = sanitize_string(payload.get("title"), "title", required=True, max_length=255)
        if "description" in payload:
            course.description = sanitize_string(
                payload.get("description"), "description", max_length=2000
            )
        if "slug" in payload:
            course.slug = sanitize_string(payload.get("slug"), "slug", max_length=255) or None
        if "price" in payload and payload.get("price") is not None:
            course.price = validate_decimal(payload.get("price"), "price", min_value=0)

        db.session.commit()
        return jsonify(_serialize_course(course))
    except ValidationError as exc:  # pragma: no cover
        return exc.to_response()


@bp.route("/<int:course_id>", methods=["DELETE"])
@require_roles("instructor", "teacher", "admin")
def delete_course(course_id: int):
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404

    claims = get_jwt()
    roles = claims.get("roles", [])
    if course.instructor_id != get_jwt_identity() and "admin" not in roles:
        return jsonify({"message": "Forbidden"}), 403

    db.session.delete(course)
    db.session.commit()
    return jsonify({"message": "Course deleted"})


def _allowed_lessons(course_id: int, enrolled: bool) -> list[int]:
    base_query = Lesson.query.filter_by(course_id=course_id)
    lessons = base_query.all() if enrolled else base_query.filter_by(is_free_preview=True).all()
    return [lesson.id for lesson in lessons]


@bp.route("/<int:course_id>/access", methods=["GET"])
@jwt_required(optional=True)
def course_access(course_id: int):
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404

    user_id = get_jwt_identity()
    enrolled = False
    if user_id:
        enrollment = Enrollment.query.filter_by(
            user_id=user_id, course_id=course_id, status="active"
        ).first()
        enrolled = enrollment is not None

    lessons = _allowed_lessons(course_id, enrolled)
    return jsonify({"enrolled": enrolled, "allowed_lessons": lessons})
