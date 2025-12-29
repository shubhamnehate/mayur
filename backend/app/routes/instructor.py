from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity

from ..db import db
from ..models import Classwork, Course, Lesson
from .auth import require_roles

bp = Blueprint("instructor", __name__, url_prefix="/api/instructor")


def _serialize_course(course: Course) -> dict:
    return {
        "id": course.id,
        "title": course.title,
        "slug": course.slug,
        "price": float(course.price),
        "description": course.description,
    }


def _serialize_lesson(lesson: Lesson) -> dict:
    return {
        "id": lesson.id,
        "title": lesson.title,
        "description": lesson.description,
        "video_url": lesson.video_url,
        "colab_notebook_url": lesson.colab_notebook_url,
        "notes_content": lesson.notes_content,
        "order_index": lesson.order_index,
        "is_free_preview": lesson.is_free_preview,
    }


def _serialize_classwork(item: Classwork) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "due_at": item.due_at.isoformat() if item.due_at else None,
        "course_id": item.course_id,
    }


def _course_for_instructor(course_id: int) -> Course | None:
    user_id = get_jwt_identity()
    return Course.query.filter_by(id=course_id, instructor_id=user_id).first()


@bp.route("/courses", methods=["GET"])
@require_roles("instructor")
def my_courses():
    user_id = get_jwt_identity()
    courses = (
        Course.query.filter_by(instructor_id=user_id)
        .order_by(Course.created_at.desc())
        .all()
    )
    return jsonify({"courses": [_serialize_course(course) for course in courses]})


@bp.route("/courses", methods=["POST"])
@require_roles("instructor")
def create_course():
    payload = request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    description = payload.get("description")
    price = payload.get("price") or 0
    slug = (payload.get("slug") or "").strip() or None

    if not title:
        return jsonify({"message": "Title is required."}), 400

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


@bp.route("/courses/<int:course_id>", methods=["PUT"])
@require_roles("instructor")
def update_course(course_id: int):
    course = _course_for_instructor(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404

    payload = request.get_json(silent=True) or {}
    for field in ("title", "description", "slug"):
        if field in payload and payload[field] is not None:
            setattr(course, field, payload[field])

    if "price" in payload and payload["price"] is not None:
        course.price = payload["price"]

    db.session.commit()
    return jsonify({"course": _serialize_course(course)})


@bp.route("/courses/<int:course_id>", methods=["DELETE"])
@require_roles("instructor")
def delete_course(course_id: int):
    course = _course_for_instructor(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404

    db.session.delete(course)
    db.session.commit()
    return jsonify({"message": "Course deleted"})


@bp.route("/courses/<int:course_id>/lessons", methods=["POST"])
@require_roles("instructor")
def create_lesson(course_id: int):
    course = _course_for_instructor(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404

    payload = request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    if not title:
        return jsonify({"message": "Title is required."}), 400

    lesson = Lesson(
        course_id=course.id,
        title=title,
        description=payload.get("description"),
        video_url=payload.get("video_url"),
        colab_notebook_url=payload.get("colab_notebook_url"),
        notes_content=payload.get("notes_content"),
        order_index=payload.get("order_index") or 0,
        is_free_preview=bool(payload.get("is_free_preview")),
    )
    db.session.add(lesson)
    db.session.commit()

    return jsonify({"lesson": _serialize_lesson(lesson)}), 201


def _lesson_for_instructor(course_id: int, lesson_id: int) -> Lesson | None:
    user_id = get_jwt_identity()
    return (
        Lesson.query.join(Course, Lesson.course_id == Course.id)
        .filter(
            Lesson.id == lesson_id,
            Lesson.course_id == course_id,
            Course.instructor_id == user_id,
        )
        .first()
    )


@bp.route("/courses/<int:course_id>/lessons/<int:lesson_id>", methods=["PUT"])
@require_roles("instructor")
def update_lesson(course_id: int, lesson_id: int):
    lesson = _lesson_for_instructor(course_id, lesson_id)
    if not lesson:
        return jsonify({"message": "Lesson not found"}), 404

    payload = request.get_json(silent=True) or {}
    for field in (
        "title",
        "description",
        "video_url",
        "colab_notebook_url",
        "notes_content",
    ):
        if field in payload and payload[field] is not None:
            setattr(lesson, field, payload[field])

    if "order_index" in payload and payload["order_index"] is not None:
        lesson.order_index = payload["order_index"]
    if "is_free_preview" in payload:
        lesson.is_free_preview = bool(payload["is_free_preview"])

    db.session.commit()
    return jsonify({"lesson": _serialize_lesson(lesson)})


@bp.route("/courses/<int:course_id>/lessons/<int:lesson_id>", methods=["DELETE"])
@require_roles("instructor")
def delete_lesson(course_id: int, lesson_id: int):
    lesson = _lesson_for_instructor(course_id, lesson_id)
    if not lesson:
        return jsonify({"message": "Lesson not found"}), 404

    db.session.delete(lesson)
    db.session.commit()
    return jsonify({"message": "Lesson deleted"})


def _parse_due_at(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


@bp.route("/courses/<int:course_id>/classwork", methods=["POST"])
@require_roles("instructor")
def create_classwork(course_id: int):
    course = _course_for_instructor(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404

    payload = request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    if not title:
        return jsonify({"message": "Title is required."}), 400

    due_at = _parse_due_at(payload.get("due_at"))
    classwork = Classwork(
        course_id=course.id,
        title=title,
        description=payload.get("description"),
        due_at=due_at,
    )
    db.session.add(classwork)
    db.session.commit()

    return jsonify({"classwork": _serialize_classwork(classwork)}), 201


def _classwork_for_instructor(course_id: int, classwork_id: int) -> Classwork | None:
    user_id = get_jwt_identity()
    return (
        Classwork.query.join(Course, Classwork.course_id == Course.id)
        .filter(
            Classwork.id == classwork_id,
            Classwork.course_id == course_id,
            Course.instructor_id == user_id,
        )
        .first()
    )


@bp.route("/courses/<int:course_id>/classwork/<int:classwork_id>", methods=["PUT"])
@require_roles("instructor")
def update_classwork(course_id: int, classwork_id: int):
    classwork = _classwork_for_instructor(course_id, classwork_id)
    if not classwork:
        return jsonify({"message": "Classwork not found"}), 404

    payload = request.get_json(silent=True) or {}
    if "title" in payload and payload["title"] is not None:
        classwork.title = payload["title"]
    if "description" in payload:
        classwork.description = payload.get("description")
    if "due_at" in payload:
        parsed_due_at = _parse_due_at(payload.get("due_at"))
        classwork.due_at = parsed_due_at

    db.session.commit()
    return jsonify({"classwork": _serialize_classwork(classwork)})


@bp.route("/courses/<int:course_id>/classwork/<int:classwork_id>", methods=["DELETE"])
@require_roles("instructor")
def delete_classwork(course_id: int, classwork_id: int):
    classwork = _classwork_for_instructor(course_id, classwork_id)
    if not classwork:
        return jsonify({"message": "Classwork not found"}), 404

    db.session.delete(classwork)
    db.session.commit()
    return jsonify({"message": "Classwork deleted"})
