from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, Table, Time, Boolean, JSON
from sqlalchemy.orm import relationship
import os
from datetime import datetime

db = SQLAlchemy()

student_course_association = Table(
    'student_course_association',
    db.Model.metadata,
    Column('student_id', Integer, ForeignKey('students.id'), primary_key=True),
    Column('course_id', Integer, ForeignKey('courses.id'), primary_key=True)
)

class User(db.Model):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(80), nullable=False)
    password = Column(String(120), nullable=False)
    role = Column(String(50), nullable=False, default='student')
    email = Column(String(120), nullable=True)
    is_admin = Column(Boolean, default=False)
    
    student_profile = relationship('Student', uselist=False, backref='user_account')
    courses_taught = relationship('Course', backref='lecturer_user')
    
    __table_args__ = (
        db.UniqueConstraint('username', name='_user_username_uc'),
        db.UniqueConstraint('email', name='_user_email_uc'),
    )

class Student(db.Model):
    __tablename__ = 'students'
    id = Column(Integer, primary_key=True)
    student_id = Column(String(80), nullable=False)
    name = Column(String(120), nullable=False)
    class_name = Column(String(80), nullable=True)
    major = Column(String(80), nullable=True)
    email = Column(String(120), nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)

    courses = relationship('Course', secondary=student_course_association, backref='students')
    attendance_records = relationship('Attendance', backref='student')

    __table_args__ = (
        db.UniqueConstraint('student_id', name='_student_student_id_uc'),
        db.UniqueConstraint('email', name='_student_email_uc'),
        db.UniqueConstraint('user_id', name='_student_user_id_uc'),
    )

class Course(db.Model):
    __tablename__ = 'courses'
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    description = Column(String(255), nullable=True)
    lecturer_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    total_sessions = Column(Integer, default=0)
    total_attendance_marks = Column(Integer, default=0)

    sessions = relationship('Session', back_populates='course', cascade="all, delete-orphan")
    
    __table_args__ = (
        db.UniqueConstraint('name', name='_course_name_uc'),
    )

class Session(db.Model):
    __tablename__ = 'sessions'
    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False)
    session_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    topic = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    qr_code_uuid = Column(String(36), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    qr_code_data = Column(String, nullable=True)

    course = relationship('Course', back_populates='sessions')
    attendance_records = relationship('Attendance', backref='session_details', cascade="all, delete-orphan")

class Attendance(db.Model):
    __tablename__ = 'attendance'
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey('sessions.id'), nullable=False)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    status = Column(String(50), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('session_id', 'student_id', name='_session_student_uc'),)

class TokenDenylist(db.Model):
    id = Column(Integer, primary_key=True)
    jti = Column(String(36), unique=True, nullable=False)

class SystemLog(db.Model):
    __tablename__ = 'system_logs'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    level = Column(String(50), nullable=False)
    user = Column(String(80), nullable=True)
    action = Column(String(255), nullable=False)
    description = Column(String(1024), nullable=True)
    details = Column(JSON, nullable=True)
