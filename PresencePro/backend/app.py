import sys
import os
import logging
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
        static_url_path='/static',  # The URL path for static files
        static_folder='../frontend/build/static'  # The actual folder containing static files
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
print(f"App debug mode: {app.debug}")
if app.config["JWT_SECRET_KEY"] == str(uuid4()):
    logger.warning("Using randomly generated JWT_SECRET_KEY. Set JWT_SECRET_KEY in environment for production.")

# Initialize Flask extensions
db.init_app(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)

print("Flask extensions initialized")

# Deferred imports for utilities
def get_attendance_utils():
    from utils.attendance import calculate_student_attendance, calculate_course_attendance
    return calculate_student_attendance, calculate_course_attendance

# --- Serve React Frontend ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
        if path != "" and os.path.exists(os.path.join(app.root_path, '../frontend/build', path)):
            return send_from_directory(os.path.join(app.root_path, '../frontend/build'), path)
        else:
            return send_from_directory(os.path.join(app.root_path, '../frontend/build'), 'index.html')


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
    data = request.get_json(silent=True) # Use silent=True to avoid error if body is empty
    if not data:
        return jsonify({"message": "Request body must be JSON"}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400

    if not re.match(r'^[a-zA-Z0-9_]{3,50}$', username):
        return jsonify({"message": "Username must be 3-50 alphanumeric characters or underscores"}), 400

    user = db.session.query(User).filter_by(username=username).first()
    if user and check_password_hash(user.password, password):
        access_token = create_access_token(identity=user.username)
        logger.info(f"User {username} logged in successfully")
        return jsonify(access_token=access_token, role=user.role, is_admin=user.is_admin), 200
    logger.warning(f"Failed login attempt for username: {username}")
    return jsonify({"message": "Invalid username or password"}), 401

# --- Logout Route ---
@app.route('/logout', methods=['POST'])
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
@app.route('/register', methods=['POST'])
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
        hashed_password = generate_password_hash(password)
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
    logger.info(f"Accessing /api/my-profile. Request headers: {request.headers}") # Log headers
    current_user_identity = get_jwt_identity()
    logger.info(f"Current user identity from JWT: {current_user_identity}") # Log identity

    current_user = db.session.query(User).filter_by(username=current_user_identity).first()

    if not current_user:
        logger.warning(f"User not found for identity: {current_user_identity}") # Log if user not found
        return jsonify({"status": "error", "message": "User not found or token invalid"}), 401

    user_profile = {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "is_admin": current_user.is_admin
    }

    # If the user is a student, attempt to include their student profile data
    student_profile_data = None
    logger.info(f"Fetching profile details for user: {current_user_identity}, role: {current_user.role}")
    if current_user.role == 'student':
        try:
            student_profile = db.session.query(Student).filter_by(user_id=current_user.id).first()
            if student_profile:
                student_profile_data = {
                    "id": student_profile.id,
                    "student_id": student_profile.student_id,
                    "name": student_profile.name,
                    "email": student_profile.email, # Student table also has email
                    # Add other student fields as needed
                }
                # Include courses the student is enrolled in (optional, can be a separate endpoint if too verbose)
                user_profile["enrolled_courses"] = [{"id": course.id, "name": course.name} for course in student_profile.courses]
            else:
                # Log if a user with role student doesn't have a linked profile
                logger.warning(f"User {current_user.username} (ID: {current_user.id}) has role 'student' but no linked student profile.")
        except Exception as e:
            # Log the error during student profile fetch
            logger.error(f"Error fetching student profile for user {current_user.username} (ID: {current_user.id}): {str(e)}", exc_info=True)
            # Continue without student profile data
            student_profile_data = None
            
    # If the user is a lecturer, include courses they teach
    # This is not directly on the user profile but linked via Course table
    # Can be added here or a separate endpoint for clarity/performance
    if current_user.role == 'lecturer':
        taught_courses = db.session.query(Course).filter_by(lecturer_id=current_user.id).all()
        user_profile["taught_courses"] = [
            {"id": course.id, "name": course.name} for course in taught_courses
        ]

    # Add student_profile data if it was successfully retrieved
    if student_profile_data:
        user_profile["student_profile"] = student_profile_data

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
@app.route('/users', methods=['GET'])
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
        hashed_password = generate_password_hash(password)
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

@app.route('/users/<int:user_id>', methods=['PUT'])
@role_required(['admin']) # Ensure only admins can update other users
def update_user(user_id):
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()
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
        user_to_update.password = generate_password_hash(data['password'])

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
    """Allows administrators to create new courses."""
    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400

    # Extract and validate required fields
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    
    # Optional field with validation
    lecturer_id = data.get('lecturer_id')

    if not name: # Corrected indentation
        return jsonify({"message": "Course name is required"}), 400

    # If a lecturer_id is provided, validate it.
    # If no lecturer_id is provided by a lecturer, assign the current lecturer user as the lecturer.
    if lecturer_id is None and current_user.role == 'lecturer' and not current_user.is_admin:
        # If a lecturer is creating the course and doesn't specify a lecturer_id, assign themselves
        lecturer_id = current_user.id
    elif lecturer_id is not None:
        # If a lecturer_id is provided, ensure only admins can assign it,
        # or if a lecturer provides their own ID, allow that.
        if not current_user.is_admin and lecturer_id != current_user.id:
             return jsonify({"message": "Unauthorized to assign a lecturer other than yourself"}), 403
        lecturer = db.session.query(User).get(lecturer_id)
        if not lecturer or lecturer.role not in ['lecturer', 'admin']:
            return jsonify({"message": "Invalid lecturer_id provided"}), 400

    # Check for existing course name
    if db.session.query(Course).filter_by(name=name).first():
        return jsonify({"message": f"Course with name '{name}' already exists"}), 409

    try:
        new_course = Course(name=name, description=description, lecturer_id=lecturer_id)
        db.session.add(new_course)
        db.session.commit()
        logger.info(f"Course '{name}' created by {current_user.username}")
        return jsonify({"message": "Course created successfully", "id": new_course.id, "name": new_course.name}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": f"Course with name '{name}' already exists"}), 409
        
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

@app.route('/api/courses', methods=['GET'])
@jwt_required()
def get_courses():
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()

    # Filter courses based on user role
    query = db.session.query(Course)
    if not current_user.is_admin and current_user.role == 'lecturer':
        query = query.filter(Course.lecturer_id == current_user.id)
    elif current_user.role == 'student': # Students can see courses they are enrolled in
        query = query.join(Course.students).filter(Student.user_id == current_user.id).distinct()
    elif not current_user.is_admin: # As a safeguard for other roles
        return jsonify({"message": "Unauthorized to access course list"}), 403

    page = request.args.get('page', 1, type=int)
    # Ensure per_page is within a reasonable range, e.g., 1 to 100
    per_page = request.args.get('per_page', 20, type=int)
    courses = query.paginate(page=page, per_page=per_page, error_out=False)
    courses_data = [
        {'id': course.id, 'name': course.name, 'description': course.description, 'lecturer_id': course.lecturer_id}
        for course in courses.items
    ]

    # Dynamically calculate total sessions and total attendance marks for each course
    for course_data in courses_data:
        course_id = course_data['id']
        # Count total sessions for the course
        total_sessions = db.session.query(Session).filter_by(course_id=course_id).count()

        # Calculate total attendance marks (assuming each attendance record is 1 mark)
        total_attendance_marks = db.session.query(Attendance).join(Attendance.session).filter(Session.course_id == course_id).count()

        course_data['total_sessions'] = total_sessions
        course_data['total_attendance_marks'] = total_attendance_marks
    return jsonify({

        "courses": courses_data,
        "total": courses.total,
        "pages": courses.pages,
        "current_page": courses.page
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
    total_attendance_marks = db.session.query(Attendance).join(Attendance.session).filter(Session.course_id == course_id).count()

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

    student_db_ids = data['student_ids']
    if not isinstance(student_db_ids, list):
        return jsonify({"message": "'student_ids' must be a list"}), 400

    students_to_enroll = db.session.query(Student).filter(Student.id.in_(student_db_ids)).all()
    if len(students_to_enroll) != len(student_db_ids):
        # Find which IDs were not found
        found_ids = {s.id for s in students_to_enroll}
        not_found_ids = [s_id for s_id in student_db_ids if s_id not in found_ids]
        return jsonify({"message": f"Students with IDs {not_found_ids} not found"}), 404

    enrolled_count = 0
    already_enrolled_count = 0
    for student in students_to_enroll:
        if student not in course.students:
            course.students.append(student)
            enrolled_count += 1
        else:
            already_enrolled_count += 1

    try:
        db.session.commit()
        logger.info(f"{enrolled_count} students enrolled in course {course_id} by {current_user.username}")
        return jsonify({
            "message": f"Successfully enrolled {enrolled_count} new students. {already_enrolled_count} students were already enrolled.",
            "newly_enrolled_count": enrolled_count,
            "already_enrolled_count": already_enrolled_count
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error enrolling students in course {course_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error enrolling students"}), 500

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

@app.route('/courses/<int:course_id>/students', methods=['GET'])
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
@app.route('/api/sessions', methods=['POST'])
@role_required(['lecturer', 'admin'])
def create_session(current_user):
    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400

    course_id = data.get('course_id')
    session_date_str = data.get('session_date')
    start_time_str = data.get('start_time')
    end_time_str = data.get('end_time')

    if not course_id or not session_date_str or not start_time_str or not end_time_str:
        return jsonify({"message": "course_id, session_date, start_time, and end_time are required"}), 400

    course = db.session.query(Course).get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404
    if not current_user.is_admin and course.lecturer_id != current_user.id:
        return jsonify({"message": "Unauthorized to create a session for this course"}), 403

    try:
        session_date = datetime.strptime(session_date_str, '%Y-%m-%d').date()
        start_time = datetime.strptime(start_time_str, '%H:%M').time()
        end_time = datetime.strptime(end_time_str, '%H:%M').time()
        
        # Check if a session already exists for this course on this date
        if db.session.query(Session).filter_by(course_id=course_id, session_date=session_date).first():
            return jsonify({"message": f"A session for course {course_id} on {session_date_str} already exists"}), 409
    except ValueError:
        return jsonify({"message": "Invalid date or time format. Use YYYY-MM-DD and HH:MM."}), 400

    try:
        new_session = Session(
            course_id=course_id,
            session_date=session_date,
            start_time=start_time,
            end_time=end_time
        )
        db.session.add(new_session)
        db.session.commit()
        logger.info(f"Session {new_session.id} created for course {course_id} by {current_user.username}")
        return jsonify({
            "message": "Session created successfully",
            "session_id": new_session.id,
            "session_date": str(new_session.session_date),
            "start_time": str(new_session.start_time),
            "end_time": str(new_session.end_time)
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating session for course {course_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error creating session"}), 500

@app.route('/api/courses/<int:course_id>/sessions', methods=['GET'])
@jwt_required()
def get_sessions_for_course(course_id):
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()
    course = db.session.query(Course).get(course_id)
    
    if not course:
        return jsonify({"message": "Course not found"}), 404

    # Authorization: Admin, the course's lecturer, or an enrolled student
    is_authorized = current_user.is_admin or (current_user.role == 'lecturer' and course.lecturer_id == current_user.id)
    
    if not is_authorized and current_user.role == 'student':
        student = db.session.query(Student).filter_by(user_id=current_user.id).first()
        if student and course in student.courses:
            is_authorized = True

    if not is_authorized:
        return jsonify({"message": "Unauthorized to access sessions for this course"}), 403

    sessions = db.session.query(Session).filter_by(course_id=course_id).order_by(Session.session_date.desc(), Session.start_time.desc()).all()
    sessions_data = [
        {
            'id': session.id,
            'course_id': session.course_id,
            'session_date': str(session.session_date),
            'start_time': str(session.start_time),
            'end_time': str(session.end_time),
            'is_active': session.is_active
        } for session in sessions
    ]
    return jsonify({"sessions": sessions_data}), 200

# --- Attendance Routes ---
# Removed `/attendance/<int:attendance_id>` as it's not present in the code.
@app.route('/api/sessions/<int:session_id>/qr', methods=['POST']) # Corrected indentation
@role_required(['lecturer', 'admin'])
def create_qr_code(current_user, session_id):
    session = db.session.query(Session).get(session_id)
    if not session:
        return jsonify({"message": "Session not found"}), 404
    if not current_user.is_admin and session.course.lecturer_id != current_user.id:
        return jsonify({"message": "Unauthorized to create QR code for this session"}), 403

    data = request.get_json() or {}
    duration_minutes = data.get('duration', 5) # Default to 5 minutes
    if not isinstance(duration_minutes, int) or duration_minutes <= 0:
        return jsonify({"message": "Duration must be a positive integer"}), 400

    try:
        # Check if a QR code is already active for this session
        if session.is_active:
            return jsonify({
                "message": "QR code is already active for this session.",
                "qr_code_data": session.qr_code_data,
                "expires_at": session.expires_at.isoformat()
            }), 409

        session.is_active = True
        session.expires_at = datetime.utcnow() + timedelta(minutes=duration_minutes)
        # We need a stable identifier for the QR code. Let's use a UUID.
        # This prevents students from just re-using the same session ID.
        # Let's generate a new UUID for each QR code generation.
        session.qr_code_uuid = str(uuid4())
        session.qr_code_data = generate_qr_code_data(session.qr_code_uuid)
        db.session.commit() # Corrected indentation
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

@app.route('/api/sessions/<int:session_id>/attendance', methods=['POST']) # Corrected indentation
@jwt_required()
def mark_attendance(session_id):
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first() # Keep for logging/context
    if not current_user:
         return jsonify({"status": "error", "message": "Invalid token or user not found"}), 401

    session = db.session.query(Session).get(session_id)
    if not session:
        return jsonify({"status": "error", "message": "Session not found"}), 404

    data = request.get_json()
    # Ensure data is not None before accessing keys
    if not data:
        return jsonify({"status": "error", "message": "Request body must be JSON"}), 400
    student_index_number = data.get('student_index_number', '').strip()
    qr_code_uuid = data.get('qr_code_uuid', '').strip()

    if not student_index_number or not qr_code_uuid: # Both are required for this flow
        return jsonify({"status": "error", "message": "Student index number and QR code data are required"}), 400

    student = db.session.query(Student).filter_by(student_id=student_index_number).first()
    if not student:
        return jsonify({"status": "error", "message": f"Student with index number {student_index_number} not found"}), 404

    # Check if the student is enrolled in the course for this session
    if student not in session.course.students:
        # Log enrollment failure attempt
        logger.warning(f"Attendance attempt for non-enrolled student {student_index_number} in session {session_id}")
        return jsonify({"status": "error", "message": "You are not enrolled in this course"}), 403 # Use 403 Forbidden

    # Check if QR code is active, not expired, and matches the provided UUID
    if not session.is_active or session.expires_at <= datetime.utcnow() or session.qr_code_uuid != qr_code_uuid:
         # Provide more specific messages for different failure reasons
         if not session.is_active:
              return jsonify({"status": "error", "message": "Attendance is not currently being taken for this session."}), 403 # Use 403 Forbidden
         elif session.expires_at <= datetime.utcnow(): # Use elif to avoid combining messages
             return jsonify({"status": "error", "message": "QR code has expired. Please get the latest QR code."}), 403 # Use 403 Forbidden
         else: # This means session is active and not expired, but QR UUID doesn't match
              return jsonify({"status": "error", "message": "Invalid QR code. Please scan the correct QR code for this session."}), 400 # Use 400 Bad Request
    # Check for duplicate attendance
    existing_attendance = db.session.query(Attendance).filter_by(session_id=session_id, student_id=student.id).first()
    if existing_attendance:
        return jsonify({"status": "error", "message": "Attendance already marked for this session"}), 409
    
    try:
        new_attendance = Attendance(
            session_id=session_id,
            student_id=student.id,
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

@app.route('/api/sessions/<int:session_id>/attendance', methods=['GET']) # Corrected indentation
@jwt_required()
def get_session_attendance(session_id):
    current_user_identity = get_jwt_identity()
    current_user = db.session.query(User).filter_by(username=current_user_identity).first()
    session = db.session.query(Session).get(session_id)

    if not session:
        return jsonify({"message": "Session not found"}), 404
    if not current_user.is_admin and (current_user.role != 'lecturer' or session.course.lecturer_id != current_user.id):
        return jsonify({"message": "Unauthorized to view attendance for this session"}), 403

    attendance_records = db.session.query(Attendance).filter_by(session_id=session_id).all()
    attendance_data = [
        {
            'attendance_id': record.id,
            'student_id': record.student_id,
            'student_name': record.student.name if record.student else 'N/A',
            'timestamp': record.timestamp.isoformat()
        } for record in attendance_records
    ]
    return jsonify({"session_id": session_id, "attendance": attendance_data}), 200

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


if __name__ == '__main__':
    print("Inside __main__ block")
    # This block is for local development and might be different in production
    if not os.path.exists(os.path.join(BASE_DIR, '..', 'db')):
        os.makedirs(os.path.join(BASE_DIR, '..', 'db'), exist_ok=True)
    
    with app.app_context():
        try:
            db.create_all()
            logger.info("Database tables created.")
            
            # Optional: Create a default admin user if one doesn't exist
            admin_user = db.session.query(User).filter_by(is_admin=True).first()
            if not admin_user:
                admin_password = os.environ.get("ADMIN_PASSWORD", "AdminPass123!")
                new_admin = User(
                    username="admin",
                    email="admin@example.com",
                    password=generate_password_hash(admin_password),
                    is_admin=True,
                    role="admin"
                )
                db.session.add(new_admin)
                db.session.commit()
                logger.info("Default admin user created.")
                if admin_password == "AdminPass123!":
                    logger.warning("Using default admin password. Please change it immediately in production.")
        except Exception as e:
            logger.error(f"Error creating database tables or default user: {e}")
            sys.exit(1)