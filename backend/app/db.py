from flask_sqlalchemy import SQLAlchemy

# Shared SQLAlchemy instance for the application.
db = SQLAlchemy()


def init_db(app) -> None:
    """Initialize the database extension with the given Flask app."""
    db.init_app(app)
