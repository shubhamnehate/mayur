from flask import Blueprint, jsonify, request

bp = Blueprint("instructor", __name__, url_prefix="/instructor")


@bp.route("/courses", methods=["GET"])
def my_courses():
    return jsonify({"message": "Instructor courses"})


@bp.route("/courses/<int:course_id>/students", methods=["GET"])
def course_students(course_id: int):
    return jsonify({"message": f"Students for course {course_id}"})


@bp.route("/courses/<int:course_id>/publish", methods=["POST"])
def publish_course(course_id: int):
    payload = request.get_json(silent=True) or {}
    return jsonify(
        {"message": f"Publish course {course_id}", "data": payload}
    )
