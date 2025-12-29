from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..models import Course, Enrollment, Lesson

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
    return jsonify({"courses": [{"id": course.id, "title": course.title, "slug": course.slug} for course in courses]})


@bp.route("/", methods=["POST"])
def create_course():
    payload = request.get_json(silent=True) or {}
    return jsonify({"message": "Create course", "data": payload}), 201


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
def update_course(course_id: int):
    payload = request.get_json(silent=True) or {}
    return jsonify(
        {"message": f"Update course {course_id}", "data": payload}
    )


@bp.route("/<int:course_id>", methods=["DELETE"])
def delete_course(course_id: int):
    return jsonify({"message": f"Delete course {course_id}"})


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
