import io
import csv
import json
import logging
import pandas as pd
from models.database import db, Student, Course, Attendance  # Assuming these models are available

logger = logging.getLogger(__name__)

def export_students_data(student_id_filter=None, name_filter=None, course_filter=None, class_name_filter=None, attendance_mark_gt=None, attendance_mark_lt=None, attendance_mark_eq=None, format='csv'):
    """
    Exports student records from the database with optional filtering and format selection.
    """
    try:
        query = db.session.query(Student)

        if student_id_filter:
            query = query.filter(Student.student_id.ilike(f"%{student_id_filter}%"))
        if name_filter:
            query = query.filter(Student.name.ilike(f"%{name_filter}%"))
        if class_name_filter:
            query = query.filter(Student.class_name.ilike(f"%{class_name_filter}%"))

        students = query.all()

        students_data = []
        if course_filter:
            try:
                course_info = db.session.query(Course).filter(Course.name == course_filter).first()
                if course_info:
                    total_sessions = course_info.total_sessions
                    total_attendance_marks = course_info.total_attendance_marks

                    for student in students:
                        attended_sessions_count = db.session.query(Attendance).filter(
                            Attendance.student_id == student.student_id,
                            Attendance.course_id == course_info.id,
                            Attendance.status == 'Present'
                        ).count()
                        attendance_mark = (attended_sessions_count / total_sessions) * total_attendance_marks if total_sessions > 0 else 0
                        students_data.append({"student_id": student.student_id, "name": student.name, "attendance_mark": attendance_mark})
                else:
                    students_data = [{"student_id": student.student_id, "name": student.name} for student in students]
                    logger.warning(f"Course '{course_filter}' not found. Cannot calculate attendance marks.")
            except Exception as e:
                logger.error(f"Error calculating attendance marks for course '{course_filter}': {str(e)}")
                students_data = [{"student_id": student.student_id, "name": student.name} for student in students]
        else:
            students_data = [{"student_id": student.student_id, "name": student.name} for student in students]

        # Apply attendance mark filtering
        if attendance_mark_gt is not None:
            students_data = [s for s in students_data if 'attendance_mark' in s and s['attendance_mark'] > attendance_mark_gt]
        if attendance_mark_lt is not None:
            students_data = [s for s in students_data if 'attendance_mark' in s and s['attendance_mark'] < attendance_mark_lt]
        if attendance_mark_eq is not None:
            students_data = [s for s in students_data if 'attendance_mark' in s and s['attendance_mark'] == attendance_mark_eq]

        if format.lower() == 'json':
            return json.dumps(students_data), 'application/json', 'students.json'
        elif format.lower() == 'excel':
            df = pd.DataFrame(students_data)
            output = io.BytesIO()
            df.to_excel(output, index=False)
            output.seek(0)
            return output.getvalue(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'students.xlsx'
        else:  # Default to csv
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(['student_id', 'name', 'attendance_mark'] if course_filter else ['student_id', 'name'])  # Include attendance_mark in header if calculated
            for student_data in students_data:
                row = [student_data.get('student_id', ''), student_data.get('name', '')]
                if course_filter:
                    row.append(student_data.get('attendance_mark', ''))
                writer.writerow(row)
            return output.getvalue(), 'text/csv', 'students.csv'
    except Exception as e:
        logger.error(f"An error occurred during student export: {str(e)}")
        raise  # Re-raise the exception to be handled by the calling route
