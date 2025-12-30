from datetime import datetime

from sqlalchemy import CheckConstraint, Index, UniqueConstraint

from .db import db


ROLE_VALUES = ("student", "teacher", "instructor", "admin")
ENROLLMENT_STATUS_VALUES = ("active", "completed", "cancelled")
PAYMENT_STATUS_VALUES = ("pending", "completed", "failed", "refunded")
PAYMENT_ORDER_STATUS_VALUES = ("created", "paid", "failed")
PAYMENT_METHOD_VALUES = ("razorpay", "manual")


def _enum_values(values: tuple[str, ...]) -> str:
    return ", ".join(f"'{value}'" for value in values)


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
            db.text(f"role IN ({_enum_values(ROLE_VALUES)})"),
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
    __table_args__ = (Index("ix_courses_slug", "slug"),)

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(255), unique=True, nullable=True)
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
    lessons = db.relationship(
        "Lesson", back_populates="course", cascade="all, delete-orphan"
    )
    classwork_items = db.relationship(
        "Classwork", back_populates="course", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Course {self.title}>"


class Enrollment(db.Model):
    __tablename__ = "enrollments"
    __table_args__ = (
        db.UniqueConstraint("user_id", "course_id", name="uq_enrollments_user_course"),
        db.CheckConstraint(
            db.text(f"status IN ({_enum_values(ENROLLMENT_STATUS_VALUES)})"),
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
            db.text(f"status IN ({_enum_values(PAYMENT_STATUS_VALUES)})"),
            name="ck_payments_status_valid",
        ),
        db.CheckConstraint(
            db.text(f"method IN ({_enum_values(PAYMENT_METHOD_VALUES)})"),
            name="ck_payments_method_valid",
        ),
        db.Index("ix_payments_user_id", "user_id"),
        db.Index("ix_payments_course_id", "course_id"),
        db.Index("ix_payments_order_id", "order_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(50), nullable=False, default=PAYMENT_STATUS_VALUES[0])
    provider_payment_id = db.Column(db.String(255), nullable=True, index=True)
    method = db.Column(db.String(50), nullable=False, default=PAYMENT_METHOD_VALUES[0])
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey("payment_orders.id"), nullable=True)
    recorded_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    user = db.relationship("User", back_populates="payments")
    course = db.relationship("Course", back_populates="payments")
    order = db.relationship("PaymentOrder", back_populates="payments")
    recorded_by = db.relationship("User", foreign_keys=[recorded_by_user_id])

    def __repr__(self) -> str:
        return f"<Payment {self.id} status={self.status}>"


class PaymentOrder(db.Model):
    __tablename__ = "payment_orders"
    __table_args__ = (
        UniqueConstraint("provider_order_id", name="uq_payment_orders_provider_order"),
        CheckConstraint(
            db.text(f"status IN ({_enum_values(PAYMENT_ORDER_STATUS_VALUES)})"),
            name="ck_payment_orders_status_valid",
        ),
        Index("ix_payment_orders_user_id", "user_id"),
        Index("ix_payment_orders_course_id", "course_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    provider_order_id = db.Column(db.String(255), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(10), nullable=False, default="INR")
    status = db.Column(db.String(50), nullable=False, default=PAYMENT_ORDER_STATUS_VALUES[0])
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    payments = db.relationship("Payment", back_populates="order")

    def __repr__(self) -> str:
        return f"<PaymentOrder {self.provider_order_id} status={self.status}>"


class Lesson(db.Model):
    __tablename__ = "lessons"
    __table_args__ = (
        Index("ix_lessons_course_id", "course_id"),
        Index("ix_lessons_is_free_preview", "is_free_preview"),
    )

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(
        db.Integer, db.ForeignKey("courses.id"), nullable=False, index=True
    )
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    video_url = db.Column(db.String(1024), nullable=True)
    colab_notebook_url = db.Column(db.String(1024), nullable=True)
    notes_content = db.Column(db.Text, nullable=True)
    order_index = db.Column(db.Integer, nullable=False, default=0)
    is_free_preview = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    course = db.relationship("Course", back_populates="lessons")
    clips = db.relationship(
        "VideoClip", back_populates="lesson", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Lesson {self.id} course={self.course_id}>"


class VideoClip(db.Model):
    __tablename__ = "video_clips"
    __table_args__ = (
        Index("ix_video_clips_lesson_id", "lesson_id"),
        Index("ix_video_clips_order_index", "order_index"),
    )

    id = db.Column(db.Integer, primary_key=True)
    lesson_id = db.Column(
        db.Integer, db.ForeignKey("lessons.id"), nullable=False, index=True
    )
    title = db.Column(db.String(255), nullable=False)
    start_seconds = db.Column(db.Integer, nullable=False, default=0)
    end_seconds = db.Column(db.Integer, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    order_index = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    lesson = db.relationship("Lesson", back_populates="clips")

    def __repr__(self) -> str:
        return f"<VideoClip {self.id} lesson={self.lesson_id}>"


class Classwork(db.Model):
    __tablename__ = "classwork"
    __table_args__ = (Index("ix_classwork_course_id", "course_id"),)

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    due_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    course = db.relationship("Course", back_populates="classwork_items")

    def __repr__(self) -> str:
        return f"<Classwork {self.id} course={self.course_id}>"


class Attachment(db.Model):
    __tablename__ = "attachments"
    __table_args__ = (
        Index("ix_attachments_created_by", "created_by_user_id"),
        Index("ix_attachments_storage_provider", "storage_provider"),
    )

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(1024), nullable=False)
    storage_provider = db.Column(db.String(50), nullable=False, default="local")
    content_type = db.Column(db.String(255), nullable=True)
    size_bytes = db.Column(db.Integer, nullable=True)
    created_by_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True, index=True
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<Attachment {self.filename} storage={self.storage_provider}>"
