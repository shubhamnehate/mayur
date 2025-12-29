from .auth import bp as auth_bp
from .courses import bp as courses_bp
from .instructor import bp as instructor_bp
from .lessons import bp as lessons_bp
from .payments import bp as payments_bp
from .uploads import bp as uploads_bp

__all__ = [
    "auth_bp",
    "courses_bp",
    "instructor_bp",
    "lessons_bp",
    "payments_bp",
    "uploads_bp",
]
