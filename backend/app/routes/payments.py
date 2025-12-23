from flask import Blueprint, jsonify, request

bp = Blueprint("payments", __name__, url_prefix="/payments")


@bp.route("/checkout", methods=["POST"])
def checkout():
    payload = request.get_json(silent=True) or {}
    return jsonify({"message": "Initiate payment", "data": payload}), 201


@bp.route("/webhook", methods=["POST"])
def webhook():
    payload = request.get_json(silent=True) or {}
    return jsonify({"message": "Handle payment webhook", "data": payload})


@bp.route("/", methods=["GET"])
def list_payments():
    return jsonify({"message": "List payments"})
