from flask import Blueprint, jsonify, request

bp = Blueprint("courses", __name__, url_prefix="/courses")


@bp.route("/", methods=["GET"])
def list_courses():
    return jsonify({"message": "List courses"})


@bp.route("/", methods=["POST"])
def create_course():
    payload = request.get_json(silent=True) or {}
    return jsonify({"message": "Create course", "data": payload}), 201


@bp.route("/<int:course_id>", methods=["GET"])
def get_course(course_id: int):
    return jsonify({"message": f"Get course {course_id}"})


@bp.route("/<int:course_id>", methods=["PUT"])
def update_course(course_id: int):
    payload = request.get_json(silent=True) or {}
    return jsonify(
        {"message": f"Update course {course_id}", "data": payload}
    )


@bp.route("/<int:course_id>", methods=["DELETE"])
def delete_course(course_id: int):
    return jsonify({"message": f"Delete course {course_id}"})
