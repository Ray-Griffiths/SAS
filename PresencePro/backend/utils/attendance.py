from backend.models.database import db, Student, Course, Attendance, Session
import logging

logger = logging.getLogger(__name__)

def calculate_student_attendance(student_id, course_id):
    """Calculates the attendance percentage for a specific student in a specific course."""
    # Initial query for sessions in the course
    session_query = db.session.query(Session).filter(Session.course_id == course_id)

    # Get the total number of sessions for the course
    total_sessions = session_query.count()

    # Get the number of sessions the student attended for the course
    attended_sessions_query = db.session.query(Attendance).filter(
        Attendance.student_id == student_id,
        Attendance.status == 'Present'
    ).count()

    # Calculate attendance percentage
    if total_sessions > 0:
        attendance_percentage = (attended_sessions_query / total_sessions) * 100
    else:
        attendance_percentage = 0

    return attendance_percentage

def calculate_student_attendance(student_id, course_id, start_date=None, end_date=None):
    """
    Calculates the attendance percentage for a specific student in a specific course within a date range.
    """

    # Calculate attendance percentage
    if total_sessions > 0:
        attendance_percentage = (attended_sessions / total_sessions) * 100
    else:
        attendance_percentage = 0

    return attendance_percentage

def calculate_student_attendance(student_id, course_id, start_date=None, end_date=None):
    """
    Calculates the attendance percentage for a specific student in a specific course within a date range.
    """

    # Query for sessions in the course, filtered by date range if provided
    session_query = db.session.query(Session).filter(Session.course_id == course_id)
    if start_date:
        session_query = session_query.filter(Session.date >= start_date)
    if end_date:
        session_query = session_query.filter(Session.date <= end_date)

    # Get the total number of sessions within the date range for the course
    total_sessions = session_query.count()
    session_ids = [session.id for session in session_query.all()]

    # Get the number of sessions the student attended for the course within the date range
    attended_sessions = db.session.query(Attendance).filter(
        Attendance.student_id == student_id,
        Attendance.session_id.in_(session_ids),
        Attendance.status == 'Present'
    ).count()

def calculate_course_attendance(course_id, start_date=None, end_date=None):
    """
    Calculates overall attendance statistics for a specific course.
    """
    students_in_course = db.session.query(Student).join(Course.students).filter(Course.id == course_id).all()

    if not students_in_course:
        return {"course_id": course_id, "average_attendance_percentage": 0, "student_attendance": []}

    total_attendance_percentage = 0
    student_attendance_data = []

    for student in students_in_course:
        attendance_percentage = calculate_student_attendance(student.id, course_id, start_date, end_date)
        total_attendance_percentage += attendance_percentage
        student_attendance_data.append({"student_id": student.id, "attendance_percentage": attendance_percentage})

    average_attendance_percentage = total_attendance_percentage / len(students_in_course)
    return {"course_id": course_id, "average_attendance_percentage": average_attendance_percentage, "student_attendance": student_attendance_data}