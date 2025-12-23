import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify

from .db import init_db


def create_app() -> Flask:
    base_dir = Path(__file__).resolve().parent
    env_path = base_dir.parent / ".env"
    load_dotenv(env_path)

    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", "sqlite:///app.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET"] = os.getenv("JWT_SECRET", "change-me")

    init_db(app)

    @app.route("/health")
    def healthcheck():
        return jsonify({"status": "ok"})

    from .routes import auth, courses, instructor, payments, uploads

    app.register_blueprint(auth.bp)
    app.register_blueprint(courses.bp)
    app.register_blueprint(instructor.bp)
    app.register_blueprint(payments.bp)
    app.register_blueprint(uploads.bp)

    return app


app = create_app()
