from datetime import datetime

from .db import db


ROLE_VALUES = ("student", "instructor", "admin")
ENROLLMENT_STATUS_VALUES = ("active", "completed", "cancelled")
PAYMENT_STATUS_VALUES = ("pending", "completed", "failed", "refunded")


class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __repr__(self) -> str:
        return f"<Role {self.name}>"


class User(db.Model):
    __tablename__ = "users"
    __table_args__ = (
        db.CheckConstraint(
            db.text(
                f"role IN ({', '.join([f'\\'{value}\\'' for value in ROLE_VALUES])})"
            ),
            name="ck_users_role_valid",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.String(50), nullable=False, default=ROLE_VALUES[0], index=True
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    courses = db.relationship(
        "Course", back_populates="instructor", cascade="all, delete-orphan"
    )
    enrollments = db.relationship("Enrollment", back_populates="user")
    payments = db.relationship("Payment", back_populates="user")

    def __repr__(self) -> str:
        return f"<User {self.email}>"


class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    instructor_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    instructor = db.relationship("User", back_populates="courses")
    enrollments = db.relationship("Enrollment", back_populates="course")
    payments = db.relationship("Payment", back_populates="course")

    def __repr__(self) -> str:
        return f"<Course {self.title}>"


class Enrollment(db.Model):
    __tablename__ = "enrollments"
    __table_args__ = (
        db.UniqueConstraint("user_id", "course_id", name="uq_enrollments_user_course"),
        db.CheckConstraint(
            db.text(
                f"status IN ({', '.join([f'\\'{value}\\'' for value in ENROLLMENT_STATUS_VALUES])})"
            ),
            name="ck_enrollments_status_valid",
        ),
        db.Index("ix_enrollments_user_id", "user_id"),
        db.Index("ix_enrollments_course_id", "course_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    status = db.Column(db.String(50), nullable=False, default=ENROLLMENT_STATUS_VALUES[0])
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User", back_populates="enrollments")
    course = db.relationship("Course", back_populates="enrollments")

    def __repr__(self) -> str:
        return f"<Enrollment user={self.user_id} course={self.course_id}>"


class Payment(db.Model):
    __tablename__ = "payments"
    __table_args__ = (
        db.CheckConstraint(
            db.text(
                f"status IN ({', '.join([f'\\'{value}\\'' for value in PAYMENT_STATUS_VALUES])})"
            ),
            name="ck_payments_status_valid",
        ),
        db.Index("ix_payments_user_id", "user_id"),
        db.Index("ix_payments_course_id", "course_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(50), nullable=False, default=PAYMENT_STATUS_VALUES[0])
    provider_payment_id = db.Column(db.String(255), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User", back_populates="payments")
    course = db.relationship("Course", back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment {self.id} status={self.status}>"
