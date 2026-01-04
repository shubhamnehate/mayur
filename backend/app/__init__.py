import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_jwt_extended import JWTManager

from .db import db, init_db

jwt = JWTManager()


def create_app() -> Flask:
    base_dir = Path(__file__).resolve().parent
    env_path = base_dir.parent / ".env"
    load_dotenv(env_path)

    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = (
        os.getenv("DATABASE_URL")
        or os.getenv("BACKEND_DATABASE_URL")
        or "sqlite:///app.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = (
        os.getenv("JWT_SECRET") or os.getenv("BACKEND_JWT_SECRET") or "change-me"
    )
    expires_seconds = (
        os.getenv("JWT_ACCESS_TOKEN_EXPIRES")
        or os.getenv("BACKEND_JWT_EXPIRES")
        or "3600"
    )
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(seconds=int(expires_seconds))

    init_db(app)
    jwt.init_app(app)

    @app.route("/health")
    def healthcheck():
        return jsonify({"status": "ok"})

    from .routes import auth, courses, instructor, lessons, payments, uploads

    app.register_blueprint(auth.bp)
    app.register_blueprint(courses.bp)
    app.register_blueprint(instructor.bp)
    app.register_blueprint(lessons.bp)
    app.register_blueprint(payments.bp)
    app.register_blueprint(uploads.bp)

    with app.app_context():
        db.create_all()

    return app


app = create_app()
