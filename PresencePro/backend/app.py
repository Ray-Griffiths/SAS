import sys
import os
import logging
import uuid
import csv
import traceback
from flask import Flask, request, Response, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import create_access_token, jwt_required, JWTManager, get_jwt_identity
from datetime import datetime, date, time, timedelta, timezone
from sqlalchemy.exc import IntegrityError
from functools import wraps
import re
from uuid import uuid4

# Add parent directory to sys.path for absolute imports
from flask_cors import CORS
from flask import send_from_directory # Import send_from_directory

# Deferred imports for models and utilities
try:
    from models.database import db, Student, User, Course, Session, Attendance, TokenDenylist
    from utils.qr_code import generate_qr_code_data
except ImportError as e:
    logging.error(f"Failed to import models.database or utils.qr_code: {e}")
    traceback.print_exc()
    sys.exit(1)

try:
    from utils.export import export_students_data as get_export_utils_students
except ImportError as e:
    traceback.print_exc()
    sys.exit(1)

print("Imports complete")

#app = Flask(__name__)
app = Flask(
        __name__,
        static_folder='../frontend/build',
        static_url_path=''
    )

# Use os.path.join to create platform-independent paths
frontend_build_dir = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'build')

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", str(uuid4()))
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(BASE_DIR, '..', 'db', 'presencepro.db')}"
    )
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

print("Flask app created")
# Configure Flask to serve static files from the 'build' directory
app.config.from_object(Config)
# --- FIX: Initialize CORS ---
# This will allow the frontend to make requests to the backend.
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})
print(f"App debug mode: {app.debug}")
if app.config["JWT_SECRET_KEY"] == str(uuid4()):
    logger.warning("Using randomly generated JWT_SECRET_KEY. Set JWT_SECRET_KEY in environment for production.")

# Initialize Flask extensions
db.init_app(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)

print("Flask extensions initialized")

# --- Database Initialization Command ---
@app.cli.command("init-db")
def init_db_command():
    """Clears existing data and creates new tables and the default admin user."""
    db.create_all()
    logger.info("Database tables created.")
    
    # Check if the admin user already exists
    admin_user = db.session.query(User).filter_by(username='admin').first()
    if not admin_user:
        admin_password = os.environ.get("ADMIN_PASSWORD", "AdminPass123!")
        new_admin = User(
            username="admin",
            email="admin@example.com",
            password=generate_password_hash(admin_password, method='pbkdf2:sha256'),
            is_admin=True,
            role="admin"
        )
        db.session.add(new_admin)
        db.session.commit()
        logger.info("Default admin user created.")
        if admin_password == "AdminPass123!":
            logger.warning("Using default admin password. Please change it immediately.")
    else:
        logger.info("Admin user already exists.")
    print("Database initialized.")

# Deferred imports for utilities
def get_attendance_utils():
    from utils.attendance import calculate_student_attendance, calculate_course_attendance
    return calculate_student_attendance, calculate_course_attendance

# --- Serve React Frontend ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# --- JWT Token Loader and Denylist ---
@jwt.user_identity_loader
def user_identity_callback(identity):
 user = db.session.query(User).filter_by(username=identity).first()
 return user.username if user else None

@jwt.token_in_blocklist_loader
def check_if_token_is_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    return db.session.query(TokenDenylist).filter_by(jti=jti).first() is not None

# --- Authorization Decorators ---
def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            current_user_identity = get_jwt_identity()
            current_user = db.session.query(User).filter_by(username=current_user_identity).first()
            if not current_user:
                logger.warning(f"Attempted access by unknown user identity: {current_user_identity}")
                return jsonify({"message": "User not found or token invalid"}), 404
            if current_user.is_admin or (current_user.role in allowed_roles):
                return f(current_user, *args, **kwargs)
            logger.warning(f"Unauthorized access attempt by {current_user.username} (role: {current_user.role}) to {request.path}")
            return jsonify({"message": "Insufficient permissions"}), 403
        return decorated_function
    return decorator

# --- Error Handlers ---
@app.errorhandler(400)
def bad_request(error):
    return jsonify({"message": "Bad Request", "error": str(error)}), 400

@app.errorhandler(401)
def unauthorized(error):
    return jsonify({"message": "Unauthorized", "error": str(error)}), 401

@app.errorhandler(403)
def forbidden(error):
    return jsonify({"message": "Forbidden", "error": str(error)}), 403

@app.errorhandler(404)
def not_found(error):
    return jsonify({"message": "Resource Not Found", "error": str(error)}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"message": "Method Not Allowed", "error": str(error)}), 405

@app.errorhandler(500)
def internal_server_error(error):
    db.session.rollback()
    logger.exception("Internal server error occurred")
    return jsonify({"message": "Internal Server Error", "error": "An unexpected error occurred"}), 500

# --- Login Route ---
@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"message": "Request body must be JSON"}), 400

    # The frontend now sends an 'identifier' which can be a username or an email
    identifier = data.get('identifier', '').strip()
    password = data.get('password', '')

    if not identifier or not password:
        return jsonify({"message": "Identifier and password are required"}), 400

    # Import 'or_' to create a query that checks both username and email
    from sqlalchemy import or_
    
    # Find the user by matching the identifier against either the username or the email
    user = db.session.query(User).filter(
        or_(User.username == identifier, User.email == identifier)
    ).first()

    # If a user is found and the password is correct, create an access token
    if user and check_password_hash(user.password, password):
        access_token = create_access_token(identity=user.username)
        logger.info(f"User '{identifier}' logged in successfully as {user.username}")
        # Return all necessary user info for the frontend
        return jsonify(
            access_token=access_token, 
            role=user.role, 
            is_admin=user.is_admin,
            username=user.username
        ), 200
    
    # If login fails, log the attempt and return an error message
    logger.warning(f"Failed login attempt for identifier: '{identifier}'")
    return jsonify({"message": "Invalid identifier or password"}), 401

# --- Logout Route ---
@app.route('/api/logout', methods=['POST'])
@jwt_required()
def logout_user():
    """Allows a logged-in user to invalidate their token."""
    jti = get_jwt().get("jti")
    if jti:
        token_in_denylist = TokenDenylist(jti=jti)
        db.session.add(token_in_denylist)
        db.session.commit()
        return jsonify({"message": "Successfully logged out"}), 200
    return jsonify({"message": "Token missing JTI claim"}), 400

# --- User Self-Registration Route ---
@app.route('/api/register', methods=['POST'])
def register_user_route(): # Renamed to avoid conflict if a function with the same name existed
    data = request.get_json()
    if not data:
        return jsonify({"message": "Request body must be JSON"}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '')
    email = data.get('email', '').strip()
    role = data.get('role', 'student').lower().strip() # Allow role to be provided, default to student

    if not username or not password or not email:
        return jsonify({"message": "Username, password, and email are required"}), 400

    # Basic validation (can be enhanced)
    if not re.match(r'^[a-zA-Z0-9_]{3,50}$', username):
        return jsonify({"message": "Username must be 3-50 alphanumeric characters or underscores"}), 400
    if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
        return jsonify({"message": "Invalid email format"}), 400
    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters long"}), 400

    if role not in ['student', 'lecturer']:
        return jsonify({"message": f"Invalid role '{role}'. For self-registration, allowed roles are: student, lecturer"}), 400


    # Check if username or email already exists
    if db.session.query(User).filter_by(username=username).first():
        return jsonify({"message": "Username already exists"}), 409
    if db.session.query(User).filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 409

    try:
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(
            username=username,
            password=hashed_password,
            email=email,
            role=role,  # Use the provided role or default to student
            is_admin=False
        )
        db.session.add(new_user)
        db.session.commit()
        logger.info(f"New user registered: {username}")
        return jsonify({"message": "User registered successfully", "user_id": new_user.id}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error registering user {username}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error during registration"}), 500

# --- User Management Routes ---
@app.route('/api/my-profile', methods=['GET'])
@jwt_required()
def get_my_profile():
    """Allows a logged-in user to retrieve their linked profile (User + Student if exists)."""
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()

    if not current_user:
        logger.warning(f"User not found for identity: {current_user_identity}")
        return jsonify({"status": "error", "message": "User not found or token invalid"}), 401

    # Add boolean flags for roles to make frontend logic simpler and more robust
    user_profile = {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "is_admin": current_user.is_admin,
        "is_student": current_user.role == 'student',
        "is_lecturer": current_user.role == 'lecturer'
    }

    # If the user is a student, include their linked student profile data
    if current_user.role == 'student':
        student_profile = db.session.query(Student).filter_by(user_id=current_user.id).first()
        if student_profile:
            user_profile["student_profile"] = {
                "id": student_profile.id,
                "student_id": student_profile.student_id,
                "name": student_profile.name,
                "email": student_profile.email,
            }
            user_profile["enrolled_courses"] = [
                {"id": course.id, "name": course.name} for course in student_profile.courses
            ]
        else:
            logger.warning(f"User {current_user.username} has 'student' role but no linked profile.")

    # If the user is a lecturer, include the courses they teach
    if current_user.role == 'lecturer':
        taught_courses = db.session.query(Course).filter_by(lecturer_id=current_user.id).all()
        user_profile["taught_courses"] = [
            {"id": course.id, "name": course.name} for course in taught_courses
        ]

    return jsonify({"status": "success", "profile": user_profile}), 200

@app.route('/api/my-profile', methods=['PUT'])
@jwt_required()
def update_my_profile():
    """Allows a logged-in user (student role) to update their linked student profile."""
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()
    # TODO: Implement update logic here
    if not current_user:
        return jsonify({"status": "error", "message": "User not found or token invalid"}), 401

@app.route('/api/users', methods=['GET'])
@role_required(['admin'])
def get_users(current_user):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    users = db.session.query(User).paginate(page=page, per_page=per_page, error_out=False)
    users_data = [
        {"id": user.id, "username": user.username, "email": user.email,
         "is_admin": user.is_admin, "role": user.role}
        for user in users.items
    ]
    return jsonify({
        "users": users_data,
        "total": users.total,
        "pages": users.pages,
        "current_page": users.page
    }), 200

# --- FIX: ADDED THIS NEW ENDPOINT ---
@app.route('/api/lecturers', methods=['GET'])
@role_required(['admin', 'lecturer'])
def get_lecturers(current_user):
    """Returns a list of all users who are lecturers or admins."""
    try:
        lecturers = db.session.query(User).filter(User.role.in_(['lecturer', 'admin'])).all()
        lecturers_data = [{"id": user.id, "username": user.username} for user in lecturers]
        return jsonify(lecturers_data), 200
    except Exception as e:
        logger.error(f"Error fetching lecturers: {str(e)}", exc_info=True)
        return jsonify({"message": "Error fetching lecturers"}), 500

# --- Lecturer Dashboard Stats ---
@app.route('/api/lecturer/dashboard-stats', methods=['GET'])
@role_required(['lecturer', 'admin'])
def get_lecturer_dashboard_stats(current_user):
    """Provides key statistics for the lecturer dashboard."""
    try:
        # 1. Total courses taught by the lecturer
        courses = db.session.query(Course).filter_by(lecturer_id=current_user.id).all()
        total_courses = len(courses)

        # 2. Total unique students in those courses
        student_ids = set()
        for course in courses:
            for student in course.students:
                student_ids.add(student.id)
        total_students = len(student_ids)

        # 3. Total active sessions
        active_sessions = db.session.query(Session).join(Course).filter(
            Course.lecturer_id == current_user.id,
            Session.is_active == True,
            Session.expires_at > datetime.utcnow()
        ).count()

        # 4. Average attendance rate
        total_attendance = 0
        total_possible_attendance = 0
        
        # --- FIX: Query sessions and courses together to fix the AttributeError ---
        # and prevent an N+1 query problem.
        sessions_with_courses = db.session.query(Session, Course).join(Course).filter(
            Course.lecturer_id == current_user.id
        ).all()

        for session, course in sessions_with_courses:
            enrolled_count = len(course.students)
            if enrolled_count > 0:
                # Count attendance for this specific session
                attendance_count = db.session.query(Attendance).filter_by(session_id=session.id).count()
                total_attendance += attendance_count
                total_possible_attendance += enrolled_count
        
        average_attendance_rate = (total_attendance / total_possible_attendance) * 100 if total_possible_attendance > 0 else 0

        stats = {
            "totalCourses": total_courses,
            "totalStudents": total_students,
            "activeSessions": active_sessions,
            "averageAttendance": f"{average_attendance_rate:.0f}%"
        }
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"Error fetching lecturer dashboard stats for {current_user.username}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error fetching dashboard statistics"}), 500

# --- Lecturer's Course Management ---
@app.route('/api/lecturer/courses', methods=['GET'])
@role_required(['lecturer', 'admin'])
def get_lecturer_courses(current_user):
    """Fetches all courses taught by the current lecturer with student counts."""
    try:
        # Query for courses taught by the current user
        courses = db.session.query(Course).filter_by(lecturer_id=current_user.id).all()
        
        courses_data = []
        for course in courses:
            # For each course, count the number of enrolled students
            enrolled_count = len(course.students)
            courses_data.append({
                'id': course.id,
                'name': course.name,
                'description': course.description,
                'enrolled_students_count': enrolled_count
            })
            
        return jsonify(courses_data), 200
        
    except Exception as e:
        logger.error(f"Error fetching courses for lecturer {current_user.username}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error fetching courses"}), 500

@app.route('/api/users', methods=['POST'])
@role_required(['admin'])
def create_user(current_user):
    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '')
    email = data.get('email', '').strip()
    role = data.get('role', 'student').lower()
    is_admin = data.get('is_admin', False)

    if not username or not password or not email:
        return jsonify({"message": "Username, password, and email are required"}), 400

    if not re.match(r'^[a-zA-Z0-9_]{3,50}$', username):
        return jsonify({"message": "Username must be 3-50 alphanumeric characters or underscores"}), 400
    if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
        return jsonify({"message": "Invalid email format"}), 400
    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters long"}), 400
    if role not in ['student', 'lecturer', 'admin']:
        return jsonify({"message": f"Invalid role '{role}'. Allowed roles are: student, lecturer, admin"}), 400

    if db.session.query(User).filter_by(username=username).first():
        return jsonify({"message": "Username already exists"}), 409
    if db.session.query(User).filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 409

    try:
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(
            username=username,
            password=hashed_password,
            email=email,
            role=role,
            is_admin=is_admin
        )
        db.session.add(new_user)
        db.session.commit()
        logger.info(f"User {username} created by {current_user.username}")
        return jsonify({"message": "User created successfully", "user_id": new_user.id}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "A user with this username or email already exists"}), 409
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating user {username}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error creating user"}), 500

@app.route('/api/users/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()
    requested_user = db.session.query(User).get(user_id)

    if not requested_user:
        return jsonify({"message": "User not found"}), 404
    if not current_user.is_admin and current_user.id != user_id:
        return jsonify({"message": "Unauthorized to access this user's information"}), 403

    return jsonify({
        "id": requested_user.id,
        "username": requested_user.username,
        "email": requested_user.email,
        "is_admin": requested_user.is_admin,
        "role": requested_user.role
    }), 200

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@role_required(['admin']) # Ensure only admins can update other users
def update_user(current_user, user_id):
    user_to_update = db.session.query(User).get(user_id)

    if not user_to_update:
        return jsonify({"message": "User not found"}), 404
    if not current_user.is_admin and current_user.id != user_id:
        return jsonify({"message": "Unauthorized to update this user's information"}), 403
        
    # If a non-admin user is trying to update their own profile, redirect to the /api/my-profile endpoint
    if not current_user.is_admin and current_user.id == user_id:
         return update_my_profile() # Redirect or call the update_my_profile logic

    data = request.get_json()
    if not data:
        return jsonify({"message": "No update data provided"}), 400
    
    if 'username' in data:
        username = data['username'].strip()
        if not re.match(r'^[a-zA-Z0-9_]{3,50}$', username):
            return jsonify({"message": "Username must be 3-50 alphanumeric characters or underscores"}), 400
        if username != user_to_update.username and db.session.query(User).filter_by(username=username).first():
            return jsonify({"message": "Username already exists"}), 409
        user_to_update.username = username

    if 'password' in data:
        if len(data['password']) < 8:
            return jsonify({"message": "New password must be at least 8 characters long"}), 400
        user_to_update.password = generate_password_hash(data['password'], method='pbkdf2:sha256')

    if 'email' in data:
        email = data['email'].strip()
        if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
            return jsonify({"message": "Invalid email format"}), 400
        if email != user_to_update.email and db.session.query(User).filter_by(email=email).first():
            return jsonify({"message": "Email already exists"}), 409
        user_to_update.email = email

    if 'role' in data:
        role = data['role'].lower()
        if role not in ['student', 'lecturer', 'admin']:
            return jsonify({"message": f"Invalid role '{role}'. Allowed roles are: student, lecturer, admin"}), 400
        if not current_user.is_admin:
            return jsonify({"message": "Unauthorized to change user role"}), 403
        user_to_update.role = role

    if 'is_admin' in data:
        if not current_user.is_admin:
            return jsonify({"message": "Unauthorized to change admin status"}), 403
        user_to_update.is_admin = data['is_admin']

    try:
        db.session.commit()
        logger.info(f"User {user_id} updated by {current_user.username}")
        return jsonify({"message": "User updated successfully"}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "A user with this username or email already exists"}), 409
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating user {user_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error updating user"}), 500

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()
    user_to_delete = db.session.query(User).get(user_id)

    if not user_to_delete:
        return jsonify({"message": "User not found"}), 404
    if not current_user.is_admin and current_user.id != user_id:
        return jsonify({"message": "Unauthorized to delete this user"}), 403
    if current_user.is_admin and current_user.id == user_id:
        return jsonify({"message": "Administrators cannot delete their own account"}), 403

    try:
        db.session.delete(user_to_delete)
        db.session.commit()
        logger.info(f"User {user_id} deleted by {current_user.username}")
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting user {user_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error deleting user"}), 500

# --- Lecturer Student Creation Route ---
@app.route('/api/lecturer/students', methods=['POST'])
@role_required(['lecturer', 'admin'])
def create_student_by_lecturer(current_user):
    """Allows lecturers and admins to create student profiles."""
    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400
    
    # Extract and validate required fields
    student_id = data.get('student_id', '').strip()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()

    if not student_id or not name:
        return jsonify({"message": "Student ID and name are required"}), 400

    # Basic email validation if email is provided
    if email and not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
        return jsonify({"message": "Invalid email format"}), 400

    # Check for existing student ID or email
    if db.session.query(Student).filter_by(student_id=student_id).first():
        return jsonify({"message": f"Student with ID {student_id} already exists"}), 409
    if email and db.session.query(Student).filter_by(email=email).first():
        # Return conflict if email exists only if the provided email is not empty
        if email:
            return jsonify({"message": "Email already exists"}), 409

    try:
        # We are only creating the Student profile here, not linking to a User yet.
        # Linking a Student profile to a User account would be a separate step.
        new_student = Student(student_id=student_id, name=name, email=email, user_id=None) # Initialize user_id to None
        db.session.add(new_student)
        db.session.commit()
        logger.info(f"Student profile {student_id} created by {current_user.username}")
        return jsonify({
            "message": "Student profile created successfully",
            "id": new_student.id,
            "student_id": new_student.student_id
            }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating student profile {student_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "An error occurred while creating the student profile"}), 500

# --- Course Management Routes ---
@app.route('/api/courses', methods=['POST'])
@role_required(['lecturer', 'admin'])
def create_course(current_user):
    """Allows administrators and lecturers to create new courses."""
    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400

    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    lecturer_id = data.get('lecturer_id')

    if not name:
        return jsonify({"message": "Course name is required"}), 400

    if lecturer_id in [None, '']:
        lecturer_id = None
    else:
        try:
            lecturer_id = int(lecturer_id)
        except (ValueError, TypeError):
            return jsonify({"message": "Invalid lecturer_id format"}), 400

    if lecturer_id is not None:
        if not current_user.is_admin and lecturer_id != current_user.id:
            return jsonify({"message": "Unauthorized to assign a lecturer other than yourself"}), 403
        
        lecturer = db.session.query(User).get(lecturer_id)
        if not lecturer or lecturer.role not in ['lecturer', 'admin']:
            return jsonify({"message": "Invalid lecturer_id provided"}), 400

    if current_user.role == 'lecturer' and lecturer_id is None:
        lecturer_id = current_user.id

    if db.session.query(Course).filter_by(name=name).first():
        return jsonify({"message": f"Course with name '{name}' already exists"}), 409

    try:
        new_course = Course(name=name, description=description, lecturer_id=lecturer_id)
        db.session.add(new_course)
        db.session.commit()
        logger.info(f"Course '{name}' created by {current_user.username}")
        
        return jsonify({
            "message": "Course created successfully", 
            "course": {
                "id": new_course.id,
                "name": new_course.name,
                "description": new_course.description,
                "lecturer_id": new_course.lecturer_id,
                "total_sessions": 0,
                "total_attendance_marks": 0
            }
        }), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": f"A course with this name already exists"}), 409
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating course '{name}': {str(e)}", exc_info=True)
        return jsonify({"message": "An error occurred while creating the course"}), 500

@app.route('/api/courses/<int:course_id>', methods=['DELETE'])
@role_required(['lecturer', 'admin'])
def delete_course(current_user, course_id):
    """Allows admins to delete any course, and lecturers to delete courses they teach."""
    course_to_delete = db.session.query(Course).get(course_id)

    if not course_to_delete:
        return jsonify({"message": "Course not found"}), 404

    # Authorization: Admin can delete any course. Lecturer can delete courses they teach.
    if not current_user.is_admin and (current_user.role != 'lecturer' or course_to_delete.lecturer_id != current_user.id):
        return jsonify({"message": "Unauthorized to delete this course"}), 403

    try:
        # Before deleting the course, potentially handle related data like sessions and attendance.
        # Depending on the desired behavior (cascade delete in DB or application logic),
        # you might need to explicitly delete related sessions and attendance records first.
        db.session.delete(course_to_delete)
        db.session.commit()
        logger.info(f"Course {course_id} deleted by {current_user.username}")
        return jsonify({"message": "Course deleted successfully"}), 200
    except Exception as e:
        db.session.rollback() # Corrected indentation
        logger.error(f"Error deleting course {course_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error deleting course"}), 500

# --- FIX: CORRECTED THE get_courses FUNCTION ---
@app.route('/api/courses', methods=['GET'])
@jwt_required()
def get_courses():
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()

    query = db.session.query(Course)
    if not current_user.is_admin and current_user.role == 'lecturer':
        query = query.filter(Course.lecturer_id == current_user.id)
    elif current_user.role == 'student':
        query = query.join(Course.students).filter(Student.user_id == current_user.id).distinct()
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    courses_pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    courses_data = []
    for course in courses_pagination.items:
        total_sessions = db.session.query(Session).filter_by(course_id=course.id).count()
        total_attendance_marks = db.session.query(Attendance).join(Session).filter(Session.course_id == course.id).count()
        
        courses_data.append({
            'id': course.id, 
            'name': course.name, 
            'description': course.description, 
            'lecturer_id': course.lecturer_id,
            'total_sessions': total_sessions,
            'total_attendance_marks': total_attendance_marks
        })

    return jsonify({
        "courses": courses_data,
        "total": courses_pagination.total,
        "pages": courses_pagination.pages,
        "current_page": courses_pagination.page
    }), 200

@app.route('/api/courses/<int:course_id>', methods=['GET'])
@jwt_required()
def get_course(course_id):
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()
    
    course = db.session.query(Course).get(course_id)

    if not course:
        return jsonify({"message": "Course not found"}), 404

    # Authorization logic
    is_authorized = current_user.is_admin or (current_user.role == 'lecturer' and course.lecturer_id == current_user.id)

    if current_user.role == 'student':
        student = db.session.query(Student).filter_by(user_id=current_user.id).first()
        if student and course in student.courses:
            is_authorized = True

    if not is_authorized:
        return jsonify({"message": "Unauthorized to access this course"}), 403

    # Dynamically calculate total sessions for the course
    total_sessions = db.session.query(Session).filter_by(course_id=course_id).count()

    # Calculate total attendance marks (assuming each attendance record is 1 mark)
    total_attendance_marks = db.session.query(Attendance).join(Session).filter(Session.course_id == course_id).count()

    return jsonify({
        'id': course.id,
        'name': course.name,
        'description': course.description,
        'lecturer_id': course.lecturer_id,
        'total_sessions': total_sessions,
        'total_attendance_marks': total_attendance_marks
    }), 200

@app.route('/api/courses/<int:course_id>', methods=['PUT'])
@jwt_required()
def update_course(course_id):
    current_user_identity = get_jwt_identity()
    # Fetch both the current user and the course to be updated
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()
    course_to_update = db.session.query(Course).get(course_id)

    if not course_to_update:
        return jsonify({"message": "Course not found"}), 404
    if not current_user.is_admin and (current_user.role != 'lecturer' or course_to_update.lecturer_id != current_user.id):
        return jsonify({"message": "Unauthorized to update this course"}), 403

    data = request.get_json()
    # Check if any update data is provided
    if not data:
        return jsonify({"message": "No update data provided"}), 400

    if 'name' in data:
        name = data['name'].strip()
        if name != course_to_update.name and db.session.query(Course).filter_by(name=name).first():
            return jsonify({"message": f"Course with name '{name}' already exists"}), 409
        course_to_update.name = name

    if 'description' in data:
        course_to_update.description = data['description'].strip()

    if 'lecturer_id' in data:
        # Only admins can change the lecturer of a course
        if not current_user.is_admin:
            return jsonify({"message": "Unauthorized to change course lecturer"}), 403
        lecturer_id = data['lecturer_id']
        if lecturer_id is not None:
            lecturer = db.session.query(User).get(lecturer_id)
            if not lecturer or lecturer.role not in ['lecturer', 'admin']:
                return jsonify({"message": "Invalid lecturer_id provided"}), 400
        course_to_update.lecturer_id = lecturer_id

    try:
        db.session.commit()
        logger.info(f"Course {course_id} updated by {current_user.username}")
        return jsonify({"message": "Course updated successfully"}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "A course with this name already exists"}), 409
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating course {course_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error updating course"}), 500

# --- Student Management Routes ---
@app.route('/api/students', methods=['POST'])
@role_required(['admin'])
def create_student(current_user):
    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400

    student_id = data.get('student_id', '').strip()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    user_id = data.get('user_id')

    if not student_id or not name:
        return jsonify({"message": "Student ID and name are required"}), 400
    if email and not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
        return jsonify({"message": "Invalid email format"}), 400

    if db.session.query(Student).filter_by(student_id=student_id).first():
        return jsonify({"message": f"Student with ID {student_id} already exists"}), 409
    if email and db.session.query(Student).filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 409

    if user_id:
        user = db.session.query(User).get(user_id)
        if not user:
            return jsonify({"message": f"User with ID {user_id} not found"}), 400
        if user.is_admin:
            return jsonify({"message": "Cannot link student to an administrator account"}), 400
        if db.session.query(Student).filter_by(user_id=user_id).first():
            return jsonify({"message": f"User ID {user_id} is already linked to another student"}), 409

    try:
        new_student = Student(student_id=student_id, name=name, email=email, user_id=user_id)
        db.session.add(new_student)
        db.session.commit()
        logger.info(f"Student {student_id} created by {current_user.username}")
        return jsonify({"message": "Student created successfully", "id": new_student.id, "student_id": new_student.student_id}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "A student with this ID or email already exists"}), 409
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating student {student_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error creating student"}), 500

@app.route('/api/students/<int:student_db_id>', methods=['PUT'])
@jwt_required()
def update_student(student_db_id):
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()
    student_to_update = db.session.query(Student).get(student_db_id)

    if not student_to_update:
        return jsonify({"message": "Student not found"}), 404

    # Authorization Logic: Admins get any student, lecturers get students in their courses, students get their own
    is_authorized = current_user.is_admin or \
                     (current_user.role == 'lecturer' and db.session.query(Course).join(Course.students).filter(
                         Course.lecturer_id == current_user.id,  # Filter by the current lecturer's ID
                         Student.id == student_db_id # Filter by the student's ID
                     ).first() is not None) or \
                     (current_user.role == 'student' and current_user.student_profile and student_to_update.user_id == current_user.id) # Students can update their own student profile if they have a linked profile
    if not is_authorized:
        return jsonify({"message": "Unauthorized to update this student's information"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"message": "No update data provided"}), 400

    if 'student_id' in data:
        if not current_user.is_admin:
            return jsonify({"message": "Unauthorized to change student_id"}), 403
        student_id_new = data['student_id'].strip()
        if student_id_new != student_to_update.student_id:
            if db.session.query(Student).filter_by(student_id=student_id_new).first():
                return jsonify({"message": f"Student with ID {student_id_new} already exists"}), 409
        student_to_update.student_id = student_id_new

    if 'name' in data:
        student_to_update.name = data['name'].strip()

    if 'email' in data:
        email = data['email'].strip()
        if email and not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
            return jsonify({"message": "Invalid email format"}), 400
        if email and email != student_to_update.email and db.session.query(Student).filter_by(email=email).first():
            return jsonify({"message": "Email already exists"}), 409
        student_to_update.email = email

    if 'user_id' in data:
        if not current_user.is_admin:
            return jsonify({"message": "Unauthorized to change user linkage for student"}), 403
        user_id_new = data['user_id']
        linked_user = None
        if user_id_new is not None: # Allow unlinking by passing null/None
            linked_user = db.session.query(User).get(user_id_new)
            if not linked_user:
                return jsonify({"message": f"User with ID {user_id_new} not found"}), 400
            if linked_user.is_admin:
                return jsonify({"message": "Cannot link student to an administrator account"}), 400
            # Check if the new user_id is already linked to another student, excluding the student being updated
            if db.session.query(Student).filter(Student.user_id == user_id_new, Student.id != student_db_id).first():
                return jsonify({"message": f"User ID {user_id_new} is already linked to another student"}), 409

        student_to_update.user_id = user_id_new

    try:
        db.session.commit()
        logger.info(f"Student {student_db_id} updated by {current_user.username}")
        return jsonify({"message": "Student updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating student {student_db_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error updating student"}), 500

@app.route('/api/students/<int:student_db_id>', methods=['GET'])
@jwt_required()
def get_student(student_db_id):
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()
    student = db.session.query(Student).get(student_db_id)

    if not student:
        return jsonify({"message": "Student not found"}), 404

    is_authorized = False
    if current_user.is_admin:
        is_authorized = True # Admins can see any student
    elif current_user.role == 'lecturer':
        # Lecturers can see students in their courses
        # Check if the student is enrolled in any course taught by the current lecturer
        # Use the relationships: check if there's a course taught by the lecturer that this student is in
        is_authorized = db.session.query(Course).join(Course.students).filter(Course.lecturer_id == current_user.id, Student.id == student_db_id).first()
    elif current_user.role == 'student' and student.user_id == current_user.id:
        is_authorized = True
    if not is_authorized:
        return jsonify({"message": "Unauthorized to access this student's information"}), 403

    return jsonify({
        'id': student.id,
        'student_id': student.student_id,
        'name': student.name,
        'user_id': student.user_id,
        'email': student.email
    }), 200

@app.route('/api/students', methods=['GET'])
@jwt_required()
def get_students():
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()
    query = db.session.query(Student)

    if current_user.is_admin:
        pass
    elif current_user.role == 'lecturer':
        # Lecturers see only students in their courses
        # Use the relationships to filter students
        # Join Student with the association table and Course, then filter by lecturer_id
        query = query.join(Student.courses).filter(Course.lecturer_id == current_user.id).distinct() # Use distinct to avoid duplicate students if they are in multiple courses taught by the same lecturer
    else:
        return jsonify({"message": "Unauthorized to access student list"}), 403

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    students = query.paginate(page=page, per_page=per_page, error_out=False)
    students_data = [
        {'id': student.id, 'student_id': student.student_id, 'name': student.name, 'email': student.email, 'user_id': student.user_id}
        for student in students.items
    ]
    return jsonify({
        "students": students_data,
        "total": students.total,
        "pages": students.pages,
        "current_page": students.page
    }), 200

@app.route('/api/students/<int:student_id>', methods=['DELETE'])
@role_required(['admin'])
def delete_student(current_user, student_id):
    student_to_delete = db.session.query(Student).get(student_id)

    if not student_to_delete:
        return jsonify({"message": "Student not found"}), 404

    try:
        db.session.delete(student_to_delete)
        db.session.commit()
        logger.info(f"Student {student_id} deleted by {current_user.username}")
        return jsonify({"message": "Student deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting student {student_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error deleting student"}), 500

# --- Enroll Students in a Course ---

@app.route('/api/courses/<int:course_id>/students', methods=['POST'])
@role_required(['lecturer', 'admin'])
def enroll_students(current_user, course_id):
    course = db.session.query(Course).get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404
    if not current_user.is_admin and course.lecturer_id != current_user.id:
        return jsonify({"message": "Unauthorized to enroll students in this course"}), 403

    data = request.get_json()
    if not data or 'student_ids' not in data:
        return jsonify({"message": "Request body must contain 'student_ids' list"}), 400

    student_identifiers = data['student_ids']
    if not isinstance(student_identifiers, list):
        return jsonify({"message": "'student_ids' must be a list of student ID strings"}), 400

    # Sanitize the list to remove empty strings and duplicates
    processed_identifiers = list(set([s_id.strip() for s_id in student_identifiers if isinstance(s_id, str) and s_id.strip()]))
    
    # Get all existing students matching the provided identifiers
    existing_students = db.session.query(Student).filter(Student.student_id.in_(processed_identifiers)).all()
    existing_student_map = {s.student_id: s for s in existing_students}

    newly_created_students_count = 0
    students_to_process = list(existing_students) # Start with the list of existing students

    # Identify which students need to be created
    for s_id in processed_identifiers:
        if s_id not in existing_student_map:
            # This student does not exist, so create a new one
            try:
                # Create the new student with a placeholder name
                new_student = Student(student_id=s_id, name=f"Student {s_id}")
                db.session.add(new_student)
                students_to_process.append(new_student)
                newly_created_students_count += 1
            except IntegrityError:
                # This can happen in a race condition or if the ID was just added.
                db.session.rollback()
                student = db.session.query(Student).filter_by(student_id=s_id).first()
                if student:
                    students_to_process.append(student) # Add the found student
                else:
                    # This case is unlikely but handled for safety.
                    logger.error(f"Failed to create or find student {s_id} after IntegrityError.")
                    continue # Skip this problematic ID
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error creating student {s_id}: {str(e)}", exc_info=True)
                continue # Skip this problematic ID

    # Enroll all found or created students
    enrolled_count = 0
    already_enrolled_count = 0
    # Use a set to ensure each student is processed for enrollment only once
    unique_students_to_process = list(set(students_to_process))

    for student in unique_students_to_process:
        if student not in course.students:
            course.students.append(student)
            enrolled_count += 1
        else:
            already_enrolled_count += 1

    try:
        db.session.commit()
        
        # Build a descriptive success message for the frontend
        message_parts = []
        if enrolled_count > 0:
            message_parts.append(f"Successfully enrolled {enrolled_count} students.")
        if newly_created_students_count > 0:
            # This message assumes placeholder names were used.
            message_parts.append(f"Created {newly_created_students_count} new student profiles. Please update their names.")
        if already_enrolled_count > 0:
            message_parts.append(f"{already_enrolled_count} students were already enrolled.")
        
        if not message_parts:
            message = "No new students were enrolled or created."
        else:
            message = " ".join(message_parts)

        logger.info(f"{enrolled_count} students enrolled, {newly_created_students_count} created in course {course_id} by {current_user.username}")
        
        return jsonify({
            "message": message,
            "newly_enrolled_count": enrolled_count,
            "newly_created_count": newly_created_students_count,
            "already_enrolled_count": already_enrolled_count
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error committing enrollments for course {course_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "An unexpected error occurred while enrolling students"}), 500

# --- Unenroll Students from a Course ---

@app.route('/api/courses/<int:course_id>/students', methods=['DELETE'])
@role_required(['lecturer', 'admin'])
def unenroll_students(current_user, course_id):
    course = db.session.query(Course).get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404
    if not current_user.is_admin and course.lecturer_id != current_user.id:
        return jsonify({"message": "Unauthorized to unenroll students from this course"}), 403

    data = request.get_json()
    if not data or 'student_ids' not in data:
        return jsonify({"message": "Request body must contain 'student_ids' list"}), 400

    student_db_ids = data['student_ids']
    if not isinstance(student_db_ids, list):
        return jsonify({"message": "'student_ids' must be a list"}), 400

    students_to_unenroll = db.session.query(Student).filter(Student.id.in_(student_db_ids)).all()
    if len(students_to_unenroll) != len(student_db_ids):
        # Find which IDs were not found among the provided IDs
        found_ids = {s.id for s in students_to_unenroll}
        not_found_ids = [s_id for s_id in student_db_ids if s_id not in found_ids]
        return jsonify({"message": f"Students with IDs {not_found_ids} not found"}), 404

    unenrolled_count = 0
    not_enrolled_count = 0
    for student in students_to_unenroll:
        if student in course.students:
            course.students.remove(student)
            unenrolled_count += 1
        else:
            not_enrolled_count += 1

    try:
        db.session.commit()
        logger.info(f"{unenrolled_count} students unenrolled from course {course_id} by {current_user.username}")
        return jsonify({"message": f"Successfully unenrolled {unenrolled_count} students. {not_enrolled_count} students were not enrolled in this course.", "unenrolled_count": unenrolled_count, "not_enrolled_count": not_enrolled_count}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error unenrolling students from course {course_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error unenrolling students"}), 500

@app.route('/api/courses/<int:course_id>/students', methods=['GET'])
@jwt_required() # Keep JWT required for authorization logic
def get_enrolled_students(course_id):
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()
    course = db.session.query(Course).get(course_id)
    
    if not course:
        return jsonify({"message": "Course not found"}), 404
    
    # Authorization: Admin or the course's lecturer can view students.
    # An enrolled student can also view the list.
    is_authorized = current_user.is_admin or (current_user.role == 'lecturer' and course.lecturer_id == current_user.id)
    
    if current_user.role == 'student':
        student = db.session.query(Student).filter_by(user_id=current_user.id).first() # Assuming user_id linkage
        # Only authorize if the student is actually enrolled in this course
        if student and course in student.courses:
            is_authorized = True

    if not is_authorized:
        return jsonify({"message": "Unauthorized to access students in this course"}), 403

    students_data = [{'id': s.id, 'student_id': s.student_id, 'name': s.name, 'email': s.email} for s in course.students]
    return jsonify({"students": students_data}), 200

# --- Session Management Routes ---
@app.route('/api/courses/<int:course_id>/sessions', methods=['GET', 'POST'])
@jwt_required()
def handle_course_sessions(course_id):
    """
    Handles GET requests to retrieve all sessions for a course (with attendance rates)
    and POST requests to create a new session.
    """
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()
    course = db.session.query(Course).get(course_id)

    if not course:
        return jsonify({"message": "Course not found"}), 404

    # Authorization check
    is_authorized = current_user.is_admin or (current_user.role == 'lecturer' and course.lecturer_id == current_user.id)
    if not is_authorized and current_user.role == 'student':
        student = db.session.query(Student).filter_by(user_id=current_user.id).first()
        if student and course in student.courses:
            is_authorized = True

    if not is_authorized:
        return jsonify({"message": "Unauthorized action for this course"}), 403

    # --- HANDLE POST REQUEST (CREATE SESSION) ---
    if request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({"message": "No input data provided"}), 400

        session_date_str = data.get('session_date')
        start_time_str = data.get('start_time')
        end_time_str = data.get('end_time')
        topic = data.get('topic', 'No Topic Provided').strip()

        if not session_date_str or not start_time_str or not end_time_str:
            return jsonify({"message": "session_date, start_time, and end_time are required"}), 400

        try:
            session_date = datetime.strptime(session_date_str, '%Y-%m-%d').date()
            start_time = datetime.strptime(start_time_str, '%H:%M').time()
            end_time = datetime.strptime(end_time_str, '%H:%M').time()
        except ValueError:
            return jsonify({"message": "Invalid date or time format. Use YYYY-MM-DD and HH:MM."}), 400

        try:
            new_session = Session(
                course_id=course_id,
                session_date=session_date,
                start_time=start_time,
                end_time=end_time,
                topic=topic
            )
            db.session.add(new_session)
            db.session.commit()
            logger.info(f"Session {new_session.id} created for course {course_id} by {current_user.username}")
            
            # *** FIX: Return the full session object ***
            session_data = {
                'id': new_session.id,
                'course_id': new_session.course_id,
                'session_date': str(new_session.session_date),
                'start_time': new_session.start_time.strftime('%H:%M'),
                'end_time': new_session.end_time.strftime('%H:%M'),
                'is_active': new_session.is_active,
                'topic': new_session.topic,
                'attendanceRate': 0  # A new session has 0% attendance
            }
            
            return jsonify({
                "message": "Session created successfully",
                "session": session_data,
            }), 201
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating session for course {course_id}: {str(e)}", exc_info=True)
            return jsonify({"message": "Error creating session"}), 500

    # --- HANDLE GET REQUEST (LIST SESSIONS) ---
    if request.method == 'GET':
        sessions = db.session.query(Session).filter_by(course_id=course_id).order_by(Session.session_date.desc(), Session.start_time.desc()).all()
        enrolled_count = db.session.query(Student).join(Student.courses).filter(Course.id == course_id).count()
        
        sessions_data = []
        for session in sessions:
            attendance_count = db.session.query(Attendance).filter_by(session_id=session.id).count()
            attendance_rate = (attendance_count / enrolled_count) * 100 if enrolled_count > 0 else 0
            
            sessions_data.append({
                'id': session.id,
                'course_id': session.course_id,
                'session_date': str(session.session_date),
                'start_time': session.start_time.strftime('%H:%M'),
                'end_time': session.end_time.strftime('%H:%M'),
                'is_active': session.is_active,
                'topic': session.topic,
                'attendanceRate': round(attendance_rate)
            })
        return jsonify({"sessions": sessions_data}), 200

@app.route('/api/courses/<int:course_id>/sessions/<int:session_id>', methods=['GET'])
@role_required(['lecturer', 'admin', 'student'])
def get_session_details(current_user, course_id, session_id):
    """Fetches details for a single session within a course."""
    session = db.session.query(Session).filter_by(id=session_id, course_id=course_id).first()
    
    if not session:
        return jsonify({"message": "Session not found within this course"}), 404

    # Authorization: Ensure the user is an admin, the course lecturer, or an enrolled student.
    course = session.course
    is_authorized = current_user.is_admin or \
                    (current_user.role == 'lecturer' and course.lecturer_id == current_user.id)
    
    if not is_authorized and current_user.role == 'student':
        student_profile = db.session.query(Student).filter_by(user_id=current_user.id).first()
        if student_profile and student_profile in course.students:
            is_authorized = True

    if not is_authorized:
        return jsonify({"message": "Unauthorized to view this session's details"}), 403

    # The frontend expects a 'session' object.
    session_data = {
        'id': session.id,
        'course_id': session.course_id,
        'session_date': str(session.session_date),
        'start_time': str(session.start_time.strftime('%H:%M')),
        'end_time': str(session.end_time.strftime('%H:%M')),
        'topic': session.topic,
        'is_active': session.is_active,
    }

    return jsonify({"session": session_data}), 200

# --- Attendance Routes ---
# Removed `/attendance/<int:attendance_id>` as it's not present in the code.
@app.route('/api/sessions/<int:session_id>/qr', methods=['POST'])
@role_required(['lecturer', 'admin'])
def create_qr_code(current_user, session_id):
    """Generates a unique QR code for a session, making it active and deactivating others for the same course."""
    session = db.session.query(Session).get(session_id)
    if not session:
        return jsonify({"message": "Session not found"}), 404
    if not current_user.is_admin and session.course.lecturer_id != current_user.id:
        return jsonify({"message": "Unauthorized to create QR code for this session"}), 403

    data = request.get_json() or {}
    duration_minutes = data.get('duration', 10)

    try:
        # Deactivate other active sessions for the same course
        Session.query.filter(
            Session.course_id == session.course_id,
            Session.is_active == True
        ).update({"is_active": False})

        # Activate the current session and set its properties
        session.is_active = True
        session.expires_at = datetime.utcnow() + timedelta(minutes=duration_minutes)
        session.qr_code_uuid = str(uuid4())

        # --- FIX: Construct the full URL for the QR code ---
        # This URL points to your frontend's scanning page.
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        full_scan_url = f"{frontend_url}/student/scan-qr?session_id={session_id}&uuid={session.qr_code_uuid}"
        
        # --- FIX: Generate the QR code from the full URL ---
        session.qr_code_data = generate_qr_code_data(full_scan_url)

        db.session.commit()
        logger.info(f"QR code generated for session {session_id} by {current_user.username}")
        
        return jsonify({
            "message": "QR code generated successfully",
            "qr_code_data": session.qr_code_data,
            "expires_at": session.expires_at.isoformat()
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error generating QR code for session {session_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error generating QR code"}), 500

@app.route('/api/sessions/<int:session_id>/qr', methods=['DELETE']) # Corrected indentation
@role_required(['lecturer', 'admin'])
def deactivate_qr_code(current_user, session_id):
    session = db.session.query(Session).get(session_id)
    if not session:
        return jsonify({"message": "Session not found"}), 404
    if not current_user.is_admin and session.course.lecturer_id != current_user.id:
        return jsonify({"message": "Unauthorized to deactivate QR code for this session"}), 403
    
    if not session.is_active:
        return jsonify({"message": "QR code is not currently active for this session"}), 409

    try:
        session.is_active = False
        session.qr_code_uuid = None
        session.expires_at = None
        db.session.commit() # Corrected indentation
        logger.info(f"QR code deactivated for session {session_id} by {current_user.username}")
        return jsonify({"message": "QR code deactivated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deactivating QR code for session {session_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error deactivating QR code"}), 500

@app.route('/api/sessions/<int:session_id>/qr', methods=['GET']) # Corrected indentation
@jwt_required()
def get_qr_code_status(session_id):
    session = db.session.query(Session).get(session_id)
    if not session:
        return jsonify({"message": "Session not found"}), 404

    # Authorization: Admins and the course's lecturer can check the status
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()
    if not current_user.is_admin and (current_user.role != 'lecturer' or session.course.lecturer_id != current_user.id):
        return jsonify({"message": "Unauthorized to view this QR code status"}), 403

    if session.is_active and session.expires_at > datetime.utcnow():
        return jsonify({
            "message": "QR code is currently active",
            "is_active": True,
            "qr_code_data": session.qr_code_data,
            "expires_at": session.expires_at.isoformat()
        }), 200
    else:
        return jsonify({
            "message": "QR code is not currently active or has expired",
            "is_active": False
        }), 200

@app.route('/api/sessions/<int:session_id>/attendance', methods=['POST'])
def mark_attendance(session_id):
    session = db.session.query(Session).get(session_id)
    if not session:
        return jsonify({"status": "error", "message": "Session not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Request body must be JSON"}), 400

    student_index_number = data.get('student_index_number', '').strip()
    qr_code_uuid = data.get('qr_code_uuid', '').strip()

    if not student_index_number or not qr_code_uuid:
        return jsonify({"status": "error", "message": "Student index number and QR code data are required"}), 400

    student = db.session.query(Student).filter_by(student_id=student_index_number).first()
    if not student:
        return jsonify({"status": "error", "message": f"Student with index number {student_index_number} not found"}), 404

    if student not in session.course.students:
        logger.warning(f"Attendance attempt for non-enrolled student {student_index_number} in session {session_id}")
        return jsonify({"status": "error", "message": "You are not enrolled in this course"}), 403

    if not session.is_active or session.expires_at <= datetime.utcnow() or session.qr_code_uuid != qr_code_uuid:
         if not session.is_active:
              return jsonify({"status": "error", "message": "Attendance is not currently being taken for this session."}), 403
         elif session.expires_at <= datetime.utcnow():
             return jsonify({"status": "error", "message": "QR code has expired. Please get the latest QR code."}), 403
         else:
              return jsonify({"status": "error", "message": "Invalid QR code. Please scan the correct QR code for this session."}), 400

    existing_attendance = db.session.query(Attendance).filter_by(session_id=session_id, student_id=student.id).first()
    if existing_attendance:
        return jsonify({"status": "error", "message": "Attendance already marked for this session"}), 409
    
    try:
        # --- THIS IS THE FIX ---
        # We must provide a 'status' when creating the attendance record.
        new_attendance = Attendance(
            session_id=session_id,
            student_id=student.id,
            status='present',  # Set the status explicitly
            timestamp=datetime.utcnow()
        )
        db.session.add(new_attendance)
        db.session.commit()
        logger.info(f"Attendance marked for student {student.id} (index: {student_index_number}) in session {session_id}")
        return jsonify({"status": "success", "message": "Attendance marked successfully"}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error marking attendance for student {student.id} in session {session_id}: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": "An error occurred while marking attendance."}), 500

@app.route('/api/my-attendance', methods=['GET'])
@jwt_required()
def get_my_attendance():
    """Allows a logged-in student to retrieve their attendance records."""
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()

    if not current_user:
        return jsonify({"status": "error", "message": "User not found or token invalid"}), 401

    # Ensure the user has the student role
    if current_user.role != 'student':
        logger.warning(f"Unauthorized access attempt to '/my-attendance' by user {current_user.username} (role: {current_user.role})")
        return jsonify({"status": "error", "message": "Insufficient permissions"}), 403

    # Find the linked student profile
    student = db.session.query(Student).filter_by(user_id=current_user.id).first()
    if not student:
        logger.warning(f"User {current_user.username} (ID: {current_user.id}) has role 'student' but no linked student profile.")
        return jsonify({"status": "error", "message": "No linked student profile found for this user."}), 404


    # Get optional course_id filter from query parameters
    course_id_filter = request.args.get('course_id', type=int)

    try:
        # Query attendance records for the student, joining related tables
        query = db.session.query(Attendance).filter_by(student_id=student.id)

        # Apply course filter if provided
        if course_id_filter:
            query = query.join(Attendance.session).filter(Session.course_id == course_id_filter)

        # Join Session and Course to get session and course details
        query = query.join(Attendance.session).join(Session.course)

        # Order by session date and time
        query = query.order_by(Session.session_date.desc(), Session.start_time.desc())

        attendance_records = query.all()

        # Format the data for the frontend
        attendance_data = []
        for record in attendance_records:
            # Join with User table to get lecturer name from Course.lecturer_id
            lecturer = db.session.query(User).get(record.session.course.lecturer_id) if record.session.course.lecturer_id else None
            lecturer_name = lecturer.username if lecturer else 'N/A'

            attendance_data.append({
                'attendance_id': record.id,
                'session_id': record.session_id,
                'course_id': record.session.course.id,
                'course_name': record.session.course.name,
                'session_date': str(record.session.session_date),
                'session_start_time': str(record.session.start_time),
                'session_end_time': str(record.session.end_time),
                'lecturer_name': lecturer_name,
                'timestamp': record.timestamp.isoformat(),
                'attendance_status': 'Present' # For this endpoint, all records mean 'Present'
            })
    except Exception as e:
        logger.error(f"Error retrieving attendance for student {student.id}: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": "An error occurred while retrieving attendance records."}), 500

@app.route('/api/students/<int:student_id>/attendance', methods=['GET']) # Corrected indentation
@jwt_required() # Add JWT requirement
def get_student_attendance(student_id): # Corrected the function definition to include student_id parameter
    current_user_identity = get_jwt_identity()
    student = db.session.query(Student).get(student_id)
    if not student:
        return jsonify({"message": "Student not found"}), 404

    # Authorization: Admin, the student themselves, or a lecturer teaching a course the student is in
    is_authorized = current_user.is_admin or \
                    (current_user.role == 'student' and student.user_id == current_user.id) or \
                    (current_user.role == 'lecturer' and db.session.query(Course).join(Course.students).filter(Course.lecturer_id == current_user.id, Student.id == student_id).first())
    if not is_authorized:
        return jsonify({"message": "Unauthorized to view this student's attendance"}), 403

    course_id = request.args.get('course_id', type=int)
    
    # Deferred import
    from utils.attendance import calculate_student_attendance
    try:
        attendance_summary, attendance_details = calculate_student_attendance(student_id, course_id)
        return jsonify({
            "student_id": student_id,
            "summary": attendance_summary,
            "details": attendance_details
        }), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 404
    except Exception as e:
        logger.error(f"Error calculating student attendance for {student_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error calculating attendance"}), 500

@app.route('/api/courses/<int:course_id>/attendance_summary', methods=['GET']) # Corrected indentation
@jwt_required()
def get_course_attendance_summary(course_id):
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()
    course = db.session.query(Course).get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404
    if not current_user.is_admin and (current_user.role != 'lecturer' or course.lecturer_id != current_user.id):
        return jsonify({"message": "Unauthorized to view attendance summary for this course"}), 403

    # Deferred import
    from utils.attendance import calculate_course_attendance
    
    try:
        attendance_summary = calculate_course_attendance(course_id)
        return jsonify(attendance_summary), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 404
    except Exception as e:
        logger.error(f"Error calculating course attendance for {course_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error calculating attendance"}), 500

# --- Report Generation Route --- # Corrected indentation
@app.route('/api/reports/attendance', methods=['GET'])
@role_required(['lecturer', 'admin'])
def get_attendance_report(current_user):
    course_id = request.args.get('course_id', type=int)
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    if not course_id:
        return jsonify({"message": "course_id is required"}), 400

    course = db.session.query(Course).get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404
    if not current_user.is_admin and course.lecturer_id != current_user.id:
        return jsonify({"message": "Unauthorized to generate a report for this course"}), 403

    start_date = None
    end_date = None
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"message": "Invalid start_date format. Use YYYY-MM-DD"}), 400
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"message": "Invalid end_date format. Use YYYY-MM-DD"}), 400

    # Deferred import
    from utils.attendance import get_filtered_attendance_records
    
    try:
        attendance_data = get_filtered_attendance_records(course_id, start_date, end_date)
        return jsonify(attendance_data), 200
    except Exception as e:
        logger.error(f"Error generating attendance report for course {course_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error generating report"}), 500

# --- Data Export Routes ---
@app.route('/api/export_students', methods=['GET'])
@role_required(['admin']) # Corrected indentation
def export_students(current_user):
    """
    Exports student data, optionally filtered by student_id, name, course_name, and format.
    Requires admin role.
    """
    # Get query parameters for filtering and format
    student_id_filter = request.args.get('student_id')
    name_filter = request.args.get('name')
    course_name_filter = request.args.get('course_name')
    export_format = request.args.get('format', 'csv').lower() # Default to csv

    try:
        # Pass filter parameters and format to the export function
        # Correct the function call to use the imported name `get_export_utils_students`
        file_buffer, filename, mimetype = get_export_utils_students(
            student_id=student_id_filter,
            name=name_filter,
            course_name=course_name_filter,
            export_format=export_format
        )
        response = Response(
            file_buffer.getvalue(),
            mimetype=mimetype,
            headers={'Content-Disposition': f'attachment;filename={filename}'}
        )
        return response
    except Exception as e:
        logger.error(f"Error exporting students data: {str(e)}", exc_info=True)
        return jsonify({"message": "Error exporting data"}), 500

# --- Data Import Routes ---
@app.route('/api/import-students', methods=['POST'])
@role_required(['lecturer', 'admin'])
def import_students(current_user):
    """Allows lecturers and admins to import student data via CSV."""
    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400

    imported_students = []
    updated_students = []
    failed_students = []

    for student_data in data:
        student_id = student_data.get('student_id', '').strip()
        name = student_data.get('name', '').strip()
        email = student_data.get('email', '').strip()

        # Validation
        if not student_id or not name:
            failed_students.append({"data": student_data, "error": "Student ID and name are required"})
            continue
        if email and not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
            failed_students.append({"data": student_data, "error": "Invalid email format"})
            continue

        try:
            # Check if student exists by student_id or email
            existing_student = db.session.query(Student).filter(
                (Student.student_id == student_id) | (Student.email == email if email else False)
            ).first()

            if existing_student:
                # Check for conflicts (e.g., different student_id with same email)
                if existing_student.student_id != student_id and (email and existing_student.email == email):
                     failed_students.append({"data": student_data, "error": f"Conflict: Email '{email}' is already associated with Student ID '{existing_student.student_id}'"})
                     continue # Don't process this student further if there's a conflict
                
                # Update existing student
                if name and existing_student.name != name:
                    existing_student.name = name
                if email and existing_student.email != email:
                     # Ensure the email isn't already taken by another student with a different ID
                    if db.session.query(Student).filter(Student.email == email, Student.id != existing_student.id).first():
                         failed_students.append({"data": student_data, "error": f"Email '{email}' is already taken by another student."})
                         continue
                    existing_student.email = email
                updated_students.append(student_data)
            else:
                # Create new student
                new_student = Student(student_id=student_id, name=name, email=email)
                db.session.add(new_student)
                imported_students.append(student_data)

        except Exception as e:
            db.session.rollback()
            failed_students.append({"data": student_data, "error": f"Database error: {str(e)}"})
            logger.error(f"Error processing student {student_id}: {str(e)}", exc_info=True)

    db.session.commit()
    return jsonify({
        "message": "Student import process completed",
        "imported_count": len(imported_students),
        "updated_count": len(updated_students),
        "failed_count": len(failed_students),
        "failed_students": failed_students
    }), 200

# --- Session Management (Update and Delete) ---

@app.route('/api/sessions/<int:session_id>', methods=['PUT'])
@role_required(['lecturer', 'admin'])
def update_session(current_user, session_id):
    """Allows a lecturer or admin to update a session's details, including topic."""
    session_to_update = db.session.query(Session).get(session_id)
    if not session_to_update:
        return jsonify({"message": "Session not found"}), 404

    # Authorization: Ensure the user is an admin or the lecturer for this session's course
    if not current_user.is_admin and session_to_update.course.lecturer_id != current_user.id:
        return jsonify({"message": "Unauthorized to update this session"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"message": "No update data provided"}), 400

    try:
        if 'session_date' in data:
            session_to_update.session_date = datetime.strptime(data['session_date'], '%Y-%m-%d').date()
        if 'start_time' in data:
            session_to_update.start_time = datetime.strptime(data['start_time'], '%H:%M').time()
        if 'end_time' in data:
            session_to_update.end_time = datetime.strptime(data['end_time'], '%H:%M').time()
        if 'topic' in data:
            session_to_update.topic = data['topic'].strip()
        
        db.session.commit()
        logger.info(f"Session {session_id} updated by {current_user.username}")
        return jsonify({"message": "Session updated successfully"}), 200

    except ValueError:
        db.session.rollback()
        return jsonify({"message": "Invalid date or time format. Use YYYY-MM-DD and HH:MM."}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating session {session_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "An error occurred while updating the session"}), 500


@app.route('/api/sessions/<int:session_id>', methods=['DELETE'])
@role_required(['lecturer', 'admin'])
def delete_session(current_user, session_id):
    """Allows a lecturer or admin to delete a session."""
    session_to_delete = db.session.query(Session).get(session_id)
    if not session_to_delete:
        return jsonify({"message": "Session not found"}), 404

    # Authorization check
    if not current_user.is_admin and session_to_delete.course.lecturer_id != current_user.id:
        return jsonify({"message": "Unauthorized to delete this session"}), 403

    try:
        # The database is set to cascade deletes, so attendance records for this session will also be removed.
        db.session.delete(session_to_delete)
        db.session.commit()
        logger.info(f"Session {session_id} deleted by {current_user.username}")
        return jsonify({"message": "Session deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting session {session_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error deleting session"}), 500

@app.route('/api/sessions/<int:session_id>/attendance', methods=['GET'])
@role_required(['lecturer', 'admin'])
def get_session_attendance_list(current_user, session_id):
    """Fetches all attendance records for a specific session."""
    session = db.session.query(Session).get(session_id)
    if not session:
        return jsonify({"message": "Session not found"}), 404

    # Authorization: Ensure the current user is the lecturer for this course or an admin
    if not current_user.is_admin and session.course.lecturer_id != current_user.id:
        return jsonify({"message": "You are not authorized to view this session's attendance"}), 403

    # Corrected Query: This joins the two tables and returns tuples of (Attendance, Student)
    attendance_records = db.session.query(Attendance, Student).join(
        Student, Attendance.student_id == Student.id
    ).filter(Attendance.session_id == session_id).all()

    attendance_data = []
    # Corrected Loop: This correctly unpacks the tuple into 'attendance' and 'student'
    for attendance, student in attendance_records:
        attendance_data.append({
            "student_id": student.student_id,
            "student_name": student.name,
            "timestamp": attendance.timestamp.isoformat() + 'Z',
            "status": attendance.status
        })

    return jsonify(attendance_data), 200

    # --- New Endpoints for Enhanced Session Management ---

@app.route('/api/sessions/<int:session_id>/duplicate', methods=['POST'])
@role_required(['lecturer', 'admin'])
def duplicate_session(current_user, session_id):
    """Duplicates an existing session, setting its date for one week in the future."""
    session_to_duplicate = db.session.query(Session).get(session_id)
    if not session_to_duplicate:
        return jsonify({"message": "Session to duplicate not found"}), 404

    # Authorization check
    if not current_user.is_admin and session_to_duplicate.course.lecturer_id != current_user.id:
        return jsonify({"message": "Unauthorized to duplicate this session"}), 403

    try:
        # Calculate the date for the new session, one week from the original
        new_date = session_to_duplicate.session_date + timedelta(days=7)

        # Create the new session
        duplicated_session = Session(
            course_id=session_to_duplicate.course_id,
            session_date=new_date,
            start_time=session_to_duplicate.start_time,
            end_time=session_to_duplicate.end_time,
            topic=session_to_duplicate.topic,
            is_active=False # Duplicated sessions are not active by default
        )
        db.session.add(duplicated_session)
        db.session.commit()
        logger.info(f"Session {session_id} duplicated to new session {duplicated_session.id} by {current_user.username}")
        
        return jsonify({
            "message": "Session duplicated successfully",
            "new_session": {
                'id': duplicated_session.id,
                'course_id': duplicated_session.course_id,
                'session_date': str(duplicated_session.session_date),
                'start_time': str(duplicated_session.start_time),
                'end_time': str(duplicated_session.end_time),
                'topic': duplicated_session.topic,
                'is_active': False,
                'attendanceRate': 0
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error duplicating session {session_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "An error occurred while duplicating the session"}), 500


@app.route('/api/courses/<int:course_id>/sessions/impromptu', methods=['POST'])
@role_required(['lecturer', 'admin'])
def create_impromptu_session(current_user, course_id):
    """Creates and activates a new 15-minute session for the given course."""
    course = db.session.query(Course).get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404

    # Authorization check
    if not current_user.is_admin and course.lecturer_id != current_user.id:
        return jsonify({"message": "Unauthorized to create a session for this course"}), 403
    
    # Prevent creating a new active session if one already exists for this course
    if db.session.query(Session).filter_by(course_id=course_id, is_active=True).first():
        return jsonify({"message": "An active session for this course is already running"}), 409

    try:
        now = datetime.now(timezone.utc)
        fifteen_minutes_later = now + timedelta(minutes=15)

        impromptu_session = Session(
            course_id=course_id,
            session_date=now.date(),
            start_time=now.time(),
            end_time=fifteen_minutes_later.time(),
            topic="Impromptu Session",
            is_active=True,
            expires_at=fifteen_minutes_later,
            qr_code_uuid=str(uuid4())
        )

        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        full_scan_url = f"{frontend_url}/student/scan-qr?session_id={impromptu_session.id}&uuid={impromptu_session.qr_code_uuid}"
        impromptu_session.qr_code_data = generate_qr_code_data(full_scan_url)

        db.session.add(impromptu_session)
        db.session.commit()
        
        logger.info(f"Impromptu session {impromptu_session.id} created for course {course_id} by {current_user.username}")

        return jsonify({
            "message": "Impromptu session started successfully",
            "session": {
                'id': impromptu_session.id,
                'course_id': impromptu_session.course_id,
                'session_date': str(impromptu_session.session_date),
                'start_time': str(impromptu_session.start_time),
                'end_time': str(impromptu_session.end_time),
                'topic': impromptu_session.topic,
                'is_active': True,
                'attendanceRate': 0,
                'qr_code_data': impromptu_session.qr_code_data,
                'expires_at': impromptu_session.expires_at.isoformat()
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating impromptu session for course {course_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "An error occurred while creating the impromptu session"}), 500


@app.route('/api/courses/<int:course_id>/summary', methods=['GET'])
@role_required(['lecturer', 'admin'])
def get_course_summary(current_user, course_id):
    """Provides key statistics for a specific course dashboard."""
    course = db.session.query(Course).get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404
        
    # Authorization check
    if not current_user.is_admin and course.lecturer_id != current_user.id:
        return jsonify({"message": "Unauthorized to view this course summary"}), 403

    try:
        total_sessions = db.session.query(Session).filter_by(course_id=course.id).count()
        student_count = db.session.query(Student).join(Student.courses).filter(Course.id == course.id).count()
        
        total_attendance = 0
        total_possible_attendance = 0
        
        sessions_in_course = db.session.query(Session).filter_by(course_id=course.id).all()

        if student_count > 0:
            for session in sessions_in_course:
                attendance_count = db.session.query(Attendance).filter_by(session_id=session.id).count()
                total_attendance += attendance_count
                total_possible_attendance += student_count

        average_attendance_rate = (total_attendance / total_possible_attendance) * 100 if total_possible_attendance > 0 else 0

        summary = {
            "averageAttendance": round(average_attendance_rate),
            "totalSessions": total_sessions,
            "studentCount": student_count
        }
        return jsonify(summary), 200
        
    except Exception as e:
        logger.error(f"Error fetching course summary for {course.name}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error fetching course summary"}), 500

