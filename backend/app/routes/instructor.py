from datetime import datetime

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity

from ..db import db
from ..models import Classwork, Course, Lesson
from ..security import ValidationError, require_json, sanitize_string, validate_decimal
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
@require_roles("instructor", "teacher", "admin")
def my_courses():
    user_id = get_jwt_identity()
    courses = (
        Course.query.filter_by(instructor_id=user_id)
        .order_by(Course.created_at.desc())
        .all()
    )
    return jsonify({"courses": [_serialize_course(course) for course in courses]})


@bp.route("/courses", methods=["POST"])
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


@bp.route("/courses/<int:course_id>", methods=["PUT"])
@require_roles("instructor", "teacher", "admin")
def update_course(course_id: int):
    course = _course_for_instructor(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404

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

        if "price" in payload and payload["price"] is not None:
            course.price = validate_decimal(payload.get("price"), "price", min_value=0)

        db.session.commit()
        return jsonify({"course": _serialize_course(course)})
    except ValidationError as exc:  # pragma: no cover
        return exc.to_response()


@bp.route("/courses/<int:course_id>", methods=["DELETE"])
@require_roles("instructor", "teacher", "admin")
def delete_course(course_id: int):
    course = _course_for_instructor(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404

    db.session.delete(course)
    db.session.commit()
    return jsonify({"message": "Course deleted"})


@bp.route("/courses/<int:course_id>/lessons", methods=["POST"])
@require_roles("instructor", "teacher", "admin")
def create_lesson(course_id: int):
    course = _course_for_instructor(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404

    try:
        payload = require_json()
        title = sanitize_string(payload.get("title"), "title", required=True, max_length=255)
        description = sanitize_string(payload.get("description"), "description", max_length=2000)
        video_url = sanitize_string(payload.get("video_url"), "video_url", max_length=1024)
        colab_notebook_url = sanitize_string(
            payload.get("colab_notebook_url"), "colab_notebook_url", max_length=1024
        )
        notes_content = sanitize_string(payload.get("notes_content"), "notes_content", max_length=5000)
        order_index = payload.get("order_index") or 0
        try:
            order_index = int(order_index)
        except (TypeError, ValueError):
            raise ValidationError("Invalid input", {"order_index": "Must be numeric"})

        lesson = Lesson(
            course_id=course.id,
            title=title,
            description=description,
            video_url=video_url,
            colab_notebook_url=colab_notebook_url,
            notes_content=notes_content,
            order_index=order_index,
            is_free_preview=bool(payload.get("is_free_preview")),
        )
        db.session.add(lesson)
        db.session.commit()

        return jsonify({"lesson": _serialize_lesson(lesson)}), 201
    except ValidationError as exc:  # pragma: no cover
        return exc.to_response()


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
@require_roles("instructor", "teacher", "admin")
def update_lesson(course_id: int, lesson_id: int):
    lesson = _lesson_for_instructor(course_id, lesson_id)
    if not lesson:
        return jsonify({"message": "Lesson not found"}), 404

    try:
        payload = require_json()
        for field in (
            "title",
            "description",
            "video_url",
            "colab_notebook_url",
            "notes_content",
        ):
            if field in payload and payload[field] is not None:
                setattr(
                    lesson,
                    field,
                    sanitize_string(payload.get(field), field, max_length=5000),
                )

        if "order_index" in payload and payload["order_index"] is not None:
            try:
                lesson.order_index = int(payload["order_index"])
            except (TypeError, ValueError):
                raise ValidationError("Invalid input", {"order_index": "Must be numeric"})
        if "is_free_preview" in payload:
            lesson.is_free_preview = bool(payload["is_free_preview"])

        db.session.commit()
        return jsonify({"lesson": _serialize_lesson(lesson)})
    except ValidationError as exc:  # pragma: no cover
        return exc.to_response()


@bp.route("/courses/<int:course_id>/lessons/<int:lesson_id>", methods=["DELETE"])
@require_roles("instructor", "teacher", "admin")
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
@require_roles("instructor", "teacher", "admin")
def create_classwork(course_id: int):
    course = _course_for_instructor(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404

    try:
        payload = require_json()
        title = sanitize_string(payload.get("title"), "title", required=True, max_length=255)
        description = sanitize_string(payload.get("description"), "description", max_length=2000)
        due_at = _parse_due_at(payload.get("due_at"))
        classwork = Classwork(
            course_id=course.id,
            title=title,
            description=description,
            due_at=due_at,
        )
        db.session.add(classwork)
        db.session.commit()

        return jsonify({"classwork": _serialize_classwork(classwork)}), 201
    except ValidationError as exc:  # pragma: no cover
        return exc.to_response()


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
@require_roles("instructor", "teacher", "admin")
def update_classwork(course_id: int, classwork_id: int):
    classwork = _classwork_for_instructor(course_id, classwork_id)
    if not classwork:
        return jsonify({"message": "Classwork not found"}), 404

    try:
        payload = require_json()
        if "title" in payload and payload["title"] is not None:
            classwork.title = sanitize_string(payload.get("title"), "title", required=True, max_length=255)
        if "description" in payload:
            classwork.description = sanitize_string(
                payload.get("description"), "description", max_length=2000
            )
        if "due_at" in payload:
            parsed_due_at = _parse_due_at(payload.get("due_at"))
            classwork.due_at = parsed_due_at

        db.session.commit()
        return jsonify({"classwork": _serialize_classwork(classwork)})
    except ValidationError as exc:  # pragma: no cover
        return exc.to_response()


@bp.route("/courses/<int:course_id>/classwork/<int:classwork_id>", methods=["DELETE"])
@require_roles("instructor", "teacher", "admin")
def delete_classwork(course_id: int, classwork_id: int):
    classwork = _classwork_for_instructor(course_id, classwork_id)
    if not classwork:
        return jsonify({"message": "Classwork not found"}), 404

    db.session.delete(classwork)
    db.session.commit()
    return jsonify({"message": "Classwork deleted"})
