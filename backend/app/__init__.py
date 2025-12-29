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
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", "sqlite:///app.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(
        seconds=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "3600"))
    )

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
