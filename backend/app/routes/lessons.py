from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..models import Enrollment, Lesson, VideoClip

bp = Blueprint("lessons", __name__, url_prefix="/api/lessons")


def _is_enrolled(user_id: int | None, course_id: int) -> bool:
    if not user_id:
        return False
    enrollment = Enrollment.query.filter_by(
        user_id=user_id, course_id=course_id, status="active"
    ).first()
    return enrollment is not None


def _serialize_clip(clip: VideoClip) -> dict:
    return {
        "id": clip.id,
        "title": clip.title,
        "start_seconds": clip.start_seconds,
        "end_seconds": clip.end_seconds,
        "notes": clip.notes,
        "order_index": clip.order_index,
    }


@bp.route("/<int:lesson_id>/clips", methods=["GET"])
@jwt_required(optional=True)
def get_video_clips(lesson_id: int):
    lesson = Lesson.query.get(lesson_id)
    if not lesson:
        return jsonify({"message": "Lesson not found"}), 404

    user_id = get_jwt_identity()
    if not (lesson.is_free_preview or _is_enrolled(user_id, lesson.course_id)):
        return jsonify({"message": "Access denied"}), 403

    clips = (
        VideoClip.query.filter_by(lesson_id=lesson.id)
        .order_by(VideoClip.order_index.asc())
        .all()
    )
    return jsonify({"clips": [_serialize_clip(clip) for clip in clips]})
