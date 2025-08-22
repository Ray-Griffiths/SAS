from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, Table
from sqlalchemy.orm import relationship
import os
from datetime import datetime # Import datetime if you're using DateTime columns

# Initialize SQLAlchemy instance
db = SQLAlchemy()

# Association table for many-to-many relationship between Student and Course (Enrollment)
student_course_association = Table(
    'student_course_association',
    db.Model.metadata,
    Column('student_id', Integer, ForeignKey('students.id'), primary_key=True),
    Column('course_id', Integer, ForeignKey('courses.id'), primary_key=True)
)

# Define database models
class User(db.Model):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False)
    password = Column(String(120), nullable=False)
    role = Column(String(50), nullable=False, default='student')  # e.g., 'admin', 'lecturer', 'student'
    email = Column(String(120), unique=True, nullable=True) # Added email field and made it unique
    is_admin = Column(db.Boolean, default=False) # Added is_admin field

    # One-to-one relationship with Student (a user can have one student profile)
    student_profile = relationship('Student', uselist=False, backref='user_account') # Renamed backref to avoid conflict

    # One-to-many relationship with Course (a user can teach multiple courses if they are a lecturer)
    courses_taught = relationship('Course', backref='lecturer_user') # Renamed backref for clarity


class Student(db.Model):
    __tablename__ = 'students'
    id = Column(Integer, primary_key=True)
    student_id = Column(String(80), unique=True, nullable=False)
    name = Column(String(120), nullable=False)
    class_name = Column(String(80), nullable=True)  # Made nullable
    major = Column(String(80), nullable=True)  # Made nullable
    email = Column(String(120), unique=True, nullable=True) # Added email and made it unique
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=True)  # Added unique=True and nullable=True
    # 'user_account' backref is defined in User model

    # Many-to-many relationship with Course (Student enrollment)
    courses = relationship(
        'Course',
        secondary=student_course_association,
        backref='students' # Backref in Course to easily access enrolled students
    )

    # One-to-many relationship with Attendance records
    attendance_records = relationship('Attendance', backref='student_details') # Added relationship to Attendance


class Course(db.Model):
    __tablename__ = 'courses'
    id = Column(Integer, primary_key=True)
    # course_id = Column(String(80), unique=True, nullable=False) # Consider if still needed with unique name
    name = Column(String(120), unique=True, nullable=False) # Made name unique
    description = Column(String(255), nullable=True) # Added description field and made nullable
    lecturer_id = Column(Integer, ForeignKey('users.id'), nullable=True) # Made lecturer_id nullable
    # 'lecturer_user' backref is defined in User model
    total_sessions = Column(Integer, default=0) # Consider if these aggregation fields are best in the database or calculated dynamically
    total_attendance_marks = Column(Integer, default=0) # Consider if these aggregation fields are best in the database or calculated dynamically

    # One-to-many relationship with Session (a course can have multiple sessions)
    sessions = relationship('Session', backref='course_details') # Renamed backref for clarity

    # 'students' backref for many-to-many with Student (Enrollment) is defined in Student model


class Session(db.Model):
    __tablename__ = 'sessions'
    id = Column(Integer, primary_key=True)
    # session_id = Column(String(80), unique=True, nullable=False) # Consider if still needed with unique primary key 'id'
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False)
    # 'course_details' backref is defined in Course model
    date = Column(Date, nullable=True) # Made nullable
    start_time = Column(DateTime, nullable=True) # Keeping as DateTime for now, but consider if time object is better, Made nullable
    end_time = Column(DateTime, nullable=True)   # Keeping as DateTime for now, but consider if time object is better, Made nullable
    qr_code_data = Column(String, nullable=True) # Made nullable
    lecturer_id = Column(Integer, ForeignKey('users.id'), nullable=True) # Added lecturer_id to Session for easier filtering, Made nullable

    # One-to-many relationship with Attendance records
    attendance_records = relationship('Attendance', backref='session_details')


class Attendance(db.Model):
    __tablename__ = 'attendance'
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey('sessions.id'), nullable=False)
    # 'session_details' backref is defined in Session model
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    # 'student_details' backref is defined in Student model
    status = Column(String(50), nullable=False)  # e.g., 'Present', 'Absent', 'Late'
    timestamp = Column(DateTime, default=datetime.utcnow) # Added timestamp for attendance record

    # Added a unique constraint for session_id and student_id to prevent duplicate attendance records
    __table_args__ = (db.UniqueConstraint('session_id', 'student_id', name='_session_student_uc'),)

# Model to store blocklisted JWT tokens
class TokenDenylist(db.Model):
    id = Column(Integer, primary_key=True)
    jti = Column(String(36), unique=True, nullable=False)
