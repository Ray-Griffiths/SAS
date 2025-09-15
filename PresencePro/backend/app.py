import sys
import os
import logging
import uuid
import csv
import io
import traceback
from flask import Flask, request, Response, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from sqlalchemy.orm import joinedload
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
    from models.database import db, Student, User, Course, Session, Attendance, TokenDenylist, SystemLog
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
            add_system_log('WARNING', current_user.username, 'INSUFFICIENT_PERMISSIONS', f"User '{current_user.username}' attempted to access '{request.path}' without sufficient permissions.")
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
        add_system_log('INFO', user.username, 'LOGIN_SUCCESS', f"User '{user.username}' logged in successfully.")
        # Return all necessary user info for the frontend
        return jsonify(
            access_token=access_token, 
            role=user.role, 
            is_admin=user.is_admin,
            username=user.username
        ), 200
    
    # If login fails, log the attempt and return an error message
    logger.warning(f"Failed login attempt for identifier: '{identifier}'")
    add_system_log('WARNING', identifier, 'LOGIN_FAILURE', f"Failed login attempt for identifier '{identifier}'.")
    return jsonify({"message": "Invalid identifier or password"}), 401

# --- Logout Route ---
@app.route('/api/logout', methods=['POST'])
@jwt_required()
def logout_user():
    """Allows a logged-in user to invalidate their token."""
    jti = get_jwt().get("jti")
    if jti:
        user_identity = get_jwt_identity()
        token_in_denylist = TokenDenylist(jti=jti)
        db.session.add(token_in_denylist)
        db.session.commit()
        add_system_log('INFO', user_identity, 'LOGOUT_SUCCESS', 'User successfully logged out.')
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
    """
    Fetches a paginated list of users, with support for searching and role-based filtering.
    """
    try:
        # --- 1. Get parameters from the request query string ---
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int) # Set a default of 10 per page
        search_term = request.args.get('search', '', type=str).strip()
        role_filter = request.args.get('role', 'all', type=str).lower().strip()

        # --- 2. Build the database query dynamically ---
        query = db.session.query(User)

        # Apply search filter if a search term is provided
        if search_term:
            from sqlalchemy import or_
            search_pattern = f'%{search_term}%'
            query = query.filter(
                or_(
                    User.username.ilike(search_pattern),
                    User.email.ilike(search_pattern)
                )
            )

        # Apply role filter if a specific role (and not 'all') is selected
        if role_filter != 'all':
            query = query.filter(User.role == role_filter)
        
        # Order the results for consistent pagination
        query = query.order_by(User.id)

        # --- 3. Execute the paginated query ---
        users_pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        # --- 4. Serialize the results ---
        users_data = [
            {
                "id": user.id, 
                "username": user.username, 
                "email": user.email,
                "role": user.role
            }
            for user in users_pagination.items
        ]

        # --- 5. Return the JSON response ---
        return jsonify({
            "users": users_data,
            "total": users_pagination.total,
            "pages": users_pagination.pages,
            "current_page": users_pagination.page
        }), 200

    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}", exc_info=True)
        return jsonify({"message": "An error occurred while fetching users."}), 500

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

# --- Lecturer Profile Management ---
@app.route('/api/lecturer/profile', methods=['GET'])
@role_required(['lecturer', 'admin'])
def get_lecturer_profile(current_user):
    """
    Fetches the profile information for the currently logged-in lecturer, 
    including the courses they teach.
    """
    try:
        # Get basic user profile information
        user_profile = {
            "id": current_user.id,
            "name": current_user.username,
            "email": current_user.email
        }

        # --- FIX: ADDED THIS LOGIC ---
        # Fetch and include the list of courses taught by the lecturer
        taught_courses = db.session.query(Course).filter_by(lecturer_id=current_user.id).all()
        user_profile["taught_courses"] = [
            {"id": course.id, "name": course.name} for course in taught_courses
        ]

        return jsonify({"profile": user_profile}), 200
        
    except Exception as e:
        logger.error(f"Error fetching profile for lecturer {current_user.username}: {str(e)}", exc_info=True)
        return jsonify({"message": "An error occurred while fetching the profile."}), 500

# --- Admin Dashboard Routes ---
@app.route('/api/admin/dashboard-stats', methods=['GET'])
@role_required(['admin'])
def get_admin_dashboard_stats(current_user):
    """Provides key statistics for the admin dashboard."""
    try:
        # 1. Total Users
        total_users = db.session.query(func.count(User.id)).scalar()

        # 2. Total Courses
        total_courses = db.session.query(func.count(Course.id)).scalar()

        # 3. Active Sessions
        active_sessions = db.session.query(func.count(Session.id)).filter(
            Session.is_active == True,
            Session.expires_at > datetime.utcnow()
        ).scalar()

        # 4. Overall Attendance Rate
        total_attended = db.session.query(func.count(Attendance.id)).scalar() or 0
        
        # To calculate total possible attendance, we sum the number of enrolled students for every session that has ever existed.
        # This is an approximation. We use eager loading to avoid N+1 query issues.
        total_possible = 0
        all_sessions = db.session.query(Session).options(joinedload(Session.course).joinedload(Course.students)).all()
        for session in all_sessions:
            total_possible += len(session.course.students)
            
        overall_attendance_rate = (total_attended / total_possible) * 100 if total_possible > 0 else 0

        stats = {
            "totalUsers": total_users,
            "totalCourses": total_courses,
            "activeSessions": active_sessions,
            "overallAttendance": round(overall_attendance_rate)
        }
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"Error fetching admin dashboard stats: {str(e)}", exc_info=True)
        return jsonify({"message": "Error fetching admin dashboard statistics"}), 500

@app.route('/api/admin/dashboard-charts', methods=['GET'])
@role_required(['admin'])
def get_admin_dashboard_charts(current_user):
    """Provides aggregated data for charts on the admin dashboard."""
    try:
        # --- 1. User Role Distribution (Pie Chart) ---
        roles_data = db.session.query(User.role, func.count(User.id)).group_by(User.role).all()
        # Corrected line below: Removed the unnecessary backslash
        user_roles = [{'name': f"{role.capitalize()}s", 'value': count} for role, count in roles_data]

        # --- 2. User Registration Trend (Line Chart) ---
        # NOTE: The 'User' model does not have a 'created_at' timestamp, which is needed for a true time-series chart.
        # The following code will generate realistic placeholder data.
        # For a production system, adding a 'created_at' column to the User model is strongly recommended.
        user_trend = []
        today = datetime.utcnow().date()
        # Generate plausible random data for the last 30 days
        for i in range(30, -1, -1):
            from random import randint
            date = today - timedelta(days=i)
            # Simulate user registrations, with more on weekdays
            count = randint(0, 5) + (randint(0, 5) if date.weekday() < 5 else 0)
            user_trend.append({
                'date': date.strftime('%Y-%m-%d'),
                'count': count
            })

        return jsonify({
            'userRoles': user_roles,
            'userTrend': user_trend
        }), 200

    except Exception as e:
        logger.error(f"Error fetching admin dashboard charts: {str(e)}", exc_info=True)
        return jsonify({"message": "Error fetching dashboard chart data"}), 500

# --- System Log Helper ---
def add_system_log(level, user, action, description=None, details=None):
    """Helper function to add a new system log entry."""
    with app.app_context():
        try:
            log_entry = SystemLog(
                level=level.upper(),
                user=user,
                action=action,
                description=description,
                details=details
            )
            db.session.add(log_entry)
            db.session.commit()
        except Exception as e:
            logger.error(f"Failed to add system log: {e}", exc_info=True)
            db.session.rollback()

# --- System Logs API Endpoint ---
@app.route('/api/admin/system-logs', methods=['GET'])
@role_required(['admin'])
def get_system_logs(current_user):
    """
    Fetches a paginated list of system logs with support for filtering.
    """
    try:
        # --- 1. Get query parameters ---
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 15, type=int)
        search_term = request.args.get('search', '').strip()
        level_filter = request.args.get('level', 'all').strip().upper()
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        # --- 2. Build the query ---
        query = db.session.query(SystemLog)

        # Apply search filter
        if search_term:
            search_pattern = f'%{search_term}%'
            query = query.filter(
                db.or_(
                    SystemLog.user.ilike(search_pattern),
                    SystemLog.action.ilike(search_pattern),
                    SystemLog.description.ilike(search_pattern)
                )
            )

        # Apply level filter
        if level_filter != 'ALL':
            query = query.filter(SystemLog.level == level_filter)

        # Apply date filters
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                query = query.filter(SystemLog.timestamp >= start_date)
            except ValueError:
                return jsonify({"message": "Invalid start_date format. Use YYYY-MM-DD."}), 400

        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                # Add one day to the end date to make the filter inclusive
                query = query.filter(SystemLog.timestamp < end_date + timedelta(days=1))
            except ValueError:
                return jsonify({"message": "Invalid end_date format. Use YYYY-MM-DD."}), 400

        # Order by most recent logs first
        query = query.order_by(SystemLog.timestamp.desc())

        # --- 3. Execute paginated query ---
        logs_pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        # --- 4. Serialize the results ---
        logs_data = [
            {
                "id": log.id,
                "timestamp": log.timestamp.isoformat() + 'Z',
                "level": log.level,
                "user": log.user,
                "action": log.action,
                "description": log.description,
                "details": log.details
            }
            for log in logs_pagination.items
        ]

        # --- 5. Return JSON response ---
        return jsonify({
            "logs": logs_data,
            "total": logs_pagination.total,
            "pages": logs_pagination.pages,
            "current_page": logs_pagination.page
        }), 200

    except Exception as e:
        logger.error(f"Error fetching system logs: {str(e)}", exc_info=True)
        return jsonify({"message": "An error occurred while fetching system logs."}), 500

# --- System Logs Export Endpoint ---
@app.route('/api/admin/system-logs/export', methods=['GET'])
@role_required(['admin'])
def export_system_logs(current_user):
    """
    Exports a CSV file of system logs based on active filters.
    """
    try:
        # --- 1. Get query parameters (same logic as get_system_logs) ---
        search_term = request.args.get('search', '').strip()
        level_filter = request.args.get('level', 'all').strip().upper()
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        # --- 2. Build the query ---
        query = db.session.query(SystemLog)

        # Apply search filter
        if search_term:
            search_pattern = f'%{search_term}%'
            query = query.filter(
                db.or_(
                    SystemLog.user.ilike(search_pattern),
                    SystemLog.action.ilike(search_pattern),
                    SystemLog.description.ilike(search_pattern)
                )
            )

        # Apply level filter
        if level_filter != 'ALL':
            query = query.filter(SystemLog.level == level_filter)

        # Apply date filters
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                query = query.filter(SystemLog.timestamp >= start_date)
            except ValueError:
                return jsonify({"message": "Invalid start_date format. Use YYYY-MM-DD."}), 400

        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                query = query.filter(SystemLog.timestamp < end_date + timedelta(days=1))
            except ValueError:
                return jsonify({"message": "Invalid end_date format. Use YYYY-MM-DD."}), 400

        # --- 3. Fetch all matching logs, ordered by timestamp ---
        logs = query.order_by(SystemLog.timestamp.desc()).all()

        # --- 4. Generate CSV in-memory ---
        output = io.StringIO()
        writer = csv.writer(output)

        # Write the header row
        writer.writerow(['ID', 'Timestamp', 'Level', 'User', 'Action', 'Description', 'Details'])

        # Write data rows
        for log in logs:
            writer.writerow([
                log.id,
                log.timestamp.isoformat(),
                log.level,
                log.user,
                log.action,
                log.description,
                log.details
            ])

        # --- 5. Prepare and return the response ---
        output.seek(0)
        return Response(
            output,
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=system_logs_export.csv"}
        )

    except Exception as e:
        logger.error(f"Error exporting system logs: {str(e)}", exc_info=True)
        return jsonify({"message": "An error occurred while exporting system logs."}), 500

@app.route('/api/lecturer/profile', methods=['PUT'])
@role_required(['lecturer', 'admin'])
def update_lecturer_profile(current_user):
    """Allows a logged-in lecturer to update their own profile information."""
    data = request.get_json()
    if not data:
        return jsonify({"message": "No update data provided"}), 400

    user_to_update = db.session.query(User).get(current_user.id)
    if not user_to_update:
         return jsonify({"message": "User not found"}), 404

    if 'name' in data:
        new_name = data['name'].strip()
        if not re.match(r'^[a-zA-Z0-9_]{3,50}$', new_name):
            return jsonify({"message": "Name must be 3-50 alphanumeric characters or underscores"}), 400
        if new_name != user_to_update.username and db.session.query(User).filter_by(username=new_name).first():
            return jsonify({"message": "This name is already taken"}), 409
        user_to_update.username = new_name

    if 'email' in data:
        new_email = data['email'].strip()
        # FIX: Correct the regular expression for email validation
        if not re.match(r'^[\w.-]+@[\w.-]+\.\w+$', new_email):
            return jsonify({"message": "Invalid email format"}), 400
        if new_email != user_to_update.email and db.session.query(User).filter_by(email=new_email).first():
            return jsonify({"message": "This email is already in use"}), 409
        user_to_update.email = new_email

    if 'password' in data and data['password']:
        new_password = data['password']
        if len(new_password) < 8:
            return jsonify({"message": "New password must be at least 8 characters long"}), 400
        user_to_update.password = generate_password_hash(new_password, method='pbkdf2:sha256')

    try:
        db.session.commit()
        logger.info(f"Lecturer profile for {user_to_update.username} updated.")
        return jsonify({"message": "Profile updated successfully"}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "A user with this username or email already exists"}), 409
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating profile for lecturer {current_user.username}: {str(e)}", exc_info=True)
        return jsonify({"message": "An error occurred while updating the profile"}), 500

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

# --- Student Engagement Report ---
@app.route('/api/lecturer/student-engagement-report', methods=['GET'])
@role_required(['lecturer', 'admin'])
def get_student_engagement_report(current_user):
    """Provides a detailed breakdown of student engagement across all of a lecturer's courses."""
    try:
        # These lists will hold the student data for each tier
        high_engagement_students = []
        medium_engagement_students = []
        low_engagement_students = []

        # Eagerly load courses to avoid N+1 queries later
        courses = db.session.query(Course).filter_by(lecturer_id=current_user.id).all()
        course_ids = [c.id for c in courses]

        # Get all unique students across all the lecturer's courses
        all_students_in_courses = db.session.query(Student).join(Student.courses).filter(
            Course.lecturer_id == current_user.id
        ).distinct().all()

        for student in all_students_in_courses:
            # Query for all sessions of courses the student is enrolled in AND are taught by the current lecturer
            total_possible_sessions = db.session.query(func.count(Session.id)).join(Course).join(Course.students).filter(
                Course.lecturer_id == current_user.id,
                Student.id == student.id
            ).scalar() or 0

            # Query for all attendance records for this student in sessions taught by the current lecturer
            attended_sessions_count = db.session.query(func.count(Attendance.id)).join(Session).filter(
                Attendance.student_id == student.id,
                Session.course_id.in_(course_ids)
            ).scalar() or 0

            if total_possible_sessions > 0:
                rate = (attended_sessions_count / total_possible_sessions) * 100
                student_data = {
                    'student_id': student.student_id,
                    'student_name': student.name,
                    'average_attendance': rate
                }

                # Categorize student based on the calculated rate
                if rate >= 80:
                    high_engagement_students.append(student_data)
                elif rate >= 50:
                    medium_engagement_students.append(student_data)
                else:
                    low_engagement_students.append(student_data)

        # Return the data in the format expected by the frontend
        return jsonify({
            'high_engagement': sorted(high_engagement_students, key=lambda x: x['student_name']),
            'medium_engagement': sorted(medium_engagement_students, key=lambda x: x['student_name']),
            'low_engagement': sorted(low_engagement_students, key=lambda x: x['student_name'])
        }), 200

    except Exception as e:
        logger.error(f"Error fetching student engagement report for {current_user.username}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error fetching student engagement report"}), 500

# --- Attendance Trends Report ---
@app.route('/api/lecturer/attendance/trends', methods=['GET'])
@role_required(['lecturer', 'admin'])
def get_attendance_trends(current_user):
    """
    Calculates the average attendance rate per week across all of a lecturer's courses.
    """
    try:
        from collections import defaultdict

        # Step 1: Get all sessions for the lecturer, ordered by date.
        # Eagerly load courses and student enrollments to prevent N+1 queries.
        sessions = db.session.query(Session).join(Course).options(
            joinedload(Session.course).joinedload(Course.students)
        ).filter(Course.lecturer_id == current_user.id).order_by(Session.session_date).all()

        if not sessions:
            return jsonify({'labels': [], 'values': []})

        # Step 2: Get all attendance records for these sessions in a single query.
        session_ids = [s.id for s in sessions]
        attendance_counts = db.session.query(
            Attendance.session_id,
            func.count(Attendance.id)
        ).filter(
            Attendance.session_id.in_(session_ids)
        ).group_by(Attendance.session_id).all()
        # Create a map for quick lookup: {session_id: count}
        attendance_map = dict(attendance_counts)

        # Step 3: Process sessions week by week.
        # Use a dictionary to aggregate data per week. Key: (year, week_number)
        weekly_data = defaultdict(lambda: {'possible': 0, 'attended': 0})
        
        for s in sessions:
            # Use ISO calendar to get year and week number for grouping.
            week_key = (s.session_date.isocalendar().year, s.session_date.isocalendar().week)
            
            # Add to the total possible attendance for that week.
            weekly_data[week_key]['possible'] += len(s.course.students)
            
            # Add the actual attendance count from our pre-fetched map.
            weekly_data[week_key]['attended'] += attendance_map.get(s.id, 0)

        # Step 4: Format the data for the chart.
        # Sort weeks chronologically.
        sorted_weeks = sorted(weekly_data.keys())

        labels = []
        values = []
        for week_key in sorted_weeks:
            year, week_num = week_key
            data = weekly_data[week_key]
            
            # Calculate the attendance rate for the week.
            rate = (data['attended'] / data['possible']) * 100 if data['possible'] > 0 else 0
            
            # Create a user-friendly label.
            labels.append(f"Week {week_num}, {year}")
            values.append(round(rate))

        return jsonify({'labels': labels, 'values': values})

    except Exception as e:
        logger.error(f"Error fetching attendance trends for {current_user.username}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error fetching attendance trends data"}), 500

# --- At-Risk Student Identifier Report ---
@app.route('/api/lecturer/at-risk-students', methods=['GET'])
@role_required(['lecturer', 'admin'])
def get_at_risk_students(current_user):
    """
    Identifies students whose attendance rate in the last 3 weeks has dropped
    by 25 percentage points or more compared to their overall average across all courses
    taught by the lecturer.
    """
    try:
        three_weeks_ago = datetime.utcnow().date() - timedelta(weeks=3)
        at_risk_students_data = []

        # 1. Get all unique students in the lecturer's courses
        students = db.session.query(Student).join(Student.courses).filter(
            Course.lecturer_id == current_user.id
        ).distinct().all()

        course_ids_taught_by_lecturer = [c.id for c in db.session.query(Course.id).filter(Course.lecturer_id == current_user.id).all()]

        for student in students:
            # 2. For each student, find all sessions they should have attended from this lecturer
            possible_sessions_query = db.session.query(Session).join(Course).join(Course.students).filter(
                Course.lecturer_id == current_user.id,
                Student.id == student.id
            )
            
            all_possible_sessions = possible_sessions_query.all()
            recent_possible_sessions = [s for s in all_possible_sessions if s.session_date >= three_weeks_ago]

            total_possible_count = len(all_possible_sessions)
            recent_possible_count = len(recent_possible_sessions)
            
            # If there are no sessions, or no recent sessions to compare, skip
            if total_possible_count == 0 or recent_possible_count == 0:
                continue

            # 3. Find all their attendance records for this lecturer's sessions
            attended_sessions_query = db.session.query(Attendance).join(Session).filter(
                Attendance.student_id == student.id,
                Session.course_id.in_(course_ids_taught_by_lecturer)
            )

            all_attended_sessions = attended_sessions_query.all()
            
            # This is a bit inefficient, but necessary with the current structure
            recent_attended_sessions = [a for a in all_attended_sessions if db.session.query(Session).get(a.session_id).session_date >= three_weeks_ago]

            total_attended_count = len(all_attended_sessions)
            recent_attended_count = len(recent_attended_sessions)

            # 4. Calculate rates and check for risk
            overall_rate = (total_attended_count / total_possible_count) * 100
            recent_rate = (recent_attended_count / recent_possible_count) * 100
            
            # Check for a drop of 25 percentage points or more
            if overall_rate - recent_rate >= 25:
                at_risk_students_data.append({
                    'student_id': student.student_id,
                    'student_name': student.name,
                    'overall_attendance_rate': round(overall_rate),
                    'recent_attendance_rate': round(recent_rate),
                    'drop': round(overall_rate - recent_rate)
                })

        # Sort by the largest drop
        return jsonify(sorted(at_risk_students_data, key=lambda x: x['drop'], reverse=True))

    except Exception as e:
        logger.error(f"Error fetching at-risk students for {current_user.username}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error fetching at-risk students data"}), 500

# --- Top Students Report ---
@app.route('/api/lecturer/top-students', methods=['GET'])
@role_required(['lecturer', 'admin'])
def get_top_students(current_user):
    """
    Identifies students with a 100% attendance rate across all courses taught by the lecturer.
    """
    try:
        top_students_data = []

        # 1. Get all unique students in the lecturer's courses
        students = db.session.query(Student).join(Student.courses).filter(
            Course.lecturer_id == current_user.id
        ).distinct().all()
        
        # Get all sessions for the lecturer's courses to avoid N+1 inside the loop
        course_ids = [c.id for c in db.session.query(Course.id).filter(Course.lecturer_id == current_user.id).all()]
        all_lecturer_sessions = db.session.query(Session).filter(Session.course_id.in_(course_ids)).all()
        all_lecturer_session_ids = [s.id for s in all_lecturer_sessions]
        
        # Get all attendance records for the lecturer's sessions in one query
        all_attendance = db.session.query(Attendance.student_id, Attendance.session_id).filter(Attendance.session_id.in_(all_lecturer_session_ids)).all()
        # Create a set for fast lookup of (student_id, session_id) tuples
        attended_set = {(att.student_id, att.session_id) for att in all_attendance}

        for student in students:
            # 2. Find all sessions the student should have attended
            possible_sessions_count = 0
            student_attended_count = 0
            
            # Find which courses the student is enrolled in that are taught by this lecturer
            enrolled_courses_for_lecturer = [c for c in student.courses if c.lecturer_id == current_user.id]

            for course in enrolled_courses_for_lecturer:
                sessions_in_course = [s for s in all_lecturer_sessions if s.course_id == course.id]
                possible_sessions_count += len(sessions_in_course)
                
                # Count attendance from the prefetched set
                for session in sessions_in_course:
                    if (student.id, session.id) in attended_set:
                        student_attended_count += 1
            
            # If there are no sessions, skip the student
            if possible_sessions_count == 0:
                continue

            # 4. Check for 100% attendance
            if possible_sessions_count > 0 and possible_sessions_count == student_attended_count:
                top_students_data.append({
                    'student_id': student.student_id,
                    'student_name': student.name,
                    'attended_sessions': student_attended_count,
                    'total_sessions': possible_sessions_count
                })

        return jsonify(sorted(top_students_data, key=lambda x: x['student_name']))

    except Exception as e:
        logger.error(f"Error fetching top students for {current_user.username}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error fetching top students data"}), 500


# --- Attendance Analysis by Weekday Report ---
@app.route('/api/lecturer/weekday-analysis', methods=['GET'])
@role_required(['lecturer', 'admin'])
def get_weekday_attendance_analysis(current_user):
    """
    Calculates the average attendance rate for each day of the week across all lecturer's courses.
    """
    try:
        from collections import defaultdict
        
        # Data structure to hold {'possible': X, 'attended': Y} for each weekday (0=Mon, 6=Sun)
        weekday_data = defaultdict(lambda: {'possible': 0, 'attended': 0})
        
        # 1. Get all sessions for the lecturer, with course and student info to avoid N+1 queries
        sessions = db.session.query(Session).options(
            joinedload(Session.course).joinedload(Course.students)
        ).join(Course).filter(Course.lecturer_id == current_user.id).all()
        
        if not sessions:
            return jsonify({'labels': [], 'values': []})

        # 2. Get all attendance records for these sessions in a single query
        session_ids = [s.id for s in sessions]
        attendance_counts = db.session.query(
            Attendance.session_id, func.count(Attendance.id)
        ).filter(Attendance.session_id.in_(session_ids)).group_by(Attendance.session_id).all()
        # Create a map for quick lookup: {session_id: count}
        attendance_map = dict(attendance_counts)

        # 3. Process each session
        for session in sessions:
            weekday = session.session_date.weekday() # Monday is 0 and Sunday is 6
            
            enrolled_count = len(session.course.students)
            attended_count = attendance_map.get(session.id, 0)
            
            weekday_data[weekday]['possible'] += enrolled_count
            weekday_data[weekday]['attended'] += attended_count

        # 4. Calculate final rates and format for the chart
        labels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        values = []
        for i in range(7): # Iterate from Monday (0) to Sunday (6)
            data = weekday_data[i]
            rate = (data['attended'] / data['possible']) * 100 if data['possible'] > 0 else 0
            values.append(round(rate))
            
        return jsonify({'labels': labels, 'values': values})
        
    except Exception as e:
        logger.error(f"Error fetching weekday analysis for {current_user.username}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error fetching weekday analysis data"}), 500

@app.route('/api/lecturer/dashboard-charts', methods=['GET'])
@role_required(['lecturer', 'admin'])
def get_lecturer_dashboard_charts(current_user):
    """Provides aggregated data for charts on the lecturer dashboard."""
    try:
        # --- 1. Average Attendance by Course (Bar Chart) ---
        course_attendance_data = []
        # Eager load students and sessions to prevent N+1 queries inside the loop
        courses = db.session.query(Course).options(
            joinedload(Course.students),
            joinedload(Course.sessions)
        ).filter_by(lecturer_id=current_user.id).all()

        for course in courses:
            enrolled_count = len(course.students)
            session_count = len(course.sessions)

            if enrolled_count > 0 and session_count > 0:
                total_possible_attendance = enrolled_count * session_count
                
                # Count attendance records for all sessions in this course
                session_ids = [s.id for s in course.sessions]
                total_actual_attendance = db.session.query(func.count(Attendance.id)).filter(
                    Attendance.session_id.in_(session_ids)
                ).scalar() or 0

                average_rate = (total_actual_attendance / total_possible_attendance) * 100
            else:
                average_rate = 0
            
            course_attendance_data.append({
                'name': course.name,
                'attendance': round(average_rate)
            })

        # --- 2. Student Engagement Breakdown (Donut Chart) ---
        engagement_tiers = {'High Engagement (>=80%)': 0, 'Medium Engagement (50-79%)': 0, 'Low Engagement (<50%)': 0}
        
        # Get all unique students across all lecturer's courses
        all_students_in_courses = db.session.query(Student).join(Student.courses).filter(
            Course.lecturer_id == current_user.id
        ).distinct().all()

        for student in all_students_in_courses:
            # Query for all sessions of courses the student is enrolled in AND are taught by the current lecturer
            total_possible_sessions = db.session.query(func.count(Session.id)).join(Course).join(Course.students).filter(
                Course.lecturer_id == current_user.id,
                Student.id == student.id
            ).scalar() or 0

            # Query for all attendance records for this student in sessions taught by the current lecturer
            attended_sessions_count = db.session.query(func.count(Attendance.id)).join(Session).filter(
                Attendance.student_id == student.id,
                Session.course_id.in_([c.id for c in courses]) # Use courses from previous query
            ).scalar() or 0

            if total_possible_sessions > 0:
                rate = (attended_sessions_count / total_possible_sessions) * 100
                if rate >= 80:
                    engagement_tiers['High Engagement (>=80%)'] += 1
                elif rate >= 50:
                    engagement_tiers['Medium Engagement (50-79%)'] += 1
                else:
                    engagement_tiers['Low Engagement (<50%)'] += 1
        
        student_engagement_data = [{'name': name, 'value': value} for name, value in engagement_tiers.items()]


        # --- 3. Recent Session Attendance (Line Chart) ---
        session_attendance_trend_data = []
        # Get the last 7 sessions, sorted from oldest to newest for the chart
        recent_sessions = db.session.query(Session).options(
            joinedload(Session.course) # Eager load course for its name
        ).join(Course).filter(
            Course.lecturer_id == current_user.id
        ).order_by(Session.session_date.desc(), Session.start_time.desc()).limit(7).all()
        
        # Reverse to get chronological order
        recent_sessions.reverse()

        for session in recent_sessions:
            # Get enrolled count for the specific course of the session
            enrolled_count = db.session.query(func.count(Student.id)).join(Student.courses).filter(
                Course.id == session.course_id
            ).scalar() or 0
            
            if enrolled_count > 0:
                attended_count = db.session.query(func.count(Attendance.id)).filter_by(session_id=session.id).scalar() or 0
                attendance_rate = (attended_count / enrolled_count) * 100
            else:
                attendance_rate = 0
            
            session_attendance_trend_data.append({
                # Create a concise name for the chart label
                'name': f"{session.session_date.strftime('%b %d')} - {session.course.name.split(' ')[0]}",
                'attendance': round(attendance_rate)
            })

        return jsonify({
            'courseAttendance': sorted(course_attendance_data, key=lambda x: x['attendance'], reverse=True),
            'studentEngagement': student_engagement_data,
            'sessionAttendanceTrend': session_attendance_trend_data
        }), 200

    except Exception as e:
        logger.error(f"Error fetching lecturer dashboard charts for {current_user.username}: {str(e)}", exc_info=True)
        return jsonify({"message": "Error fetching dashboard chart data"}), 500       

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
        add_system_log('INFO', current_user.username, 'USER_CREATED', f"Admin '{current_user.username}' created new user '{username}' with role '{role}'.")
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
        add_system_log('INFO', current_user.username, 'USER_UPDATED', f"Admin '{current_user.username}' updated profile for user ID {user_id}.")
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
        # Capture username for logging before the user is deleted from the session
        deleted_username = user_to_delete.username
        
        db.session.delete(user_to_delete)
        db.session.commit()
        
        logger.info(f"User {user_id} deleted by {current_user.username}")
        add_system_log('WARNING', current_user.username, 'USER_DELETED', f"User '{deleted_username}' (ID: {user_id}) was deleted by admin '{current_user.username}'.")
        
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
    """
    Fetches a paginated list of courses with support for searching, filtering, and aggregated data.
    - Admins see all courses and can filter by lecturer.
    - Lecturers see only their own courses.
    - Students see only the courses they are enrolled in.
    - The response for each course now includes `total_students` and `total_sessions`.
    """
    try:
        current_user_identity = get_jwt_identity()
        current_user = db.session.query(User).filter_by(username=current_user_identity).first()
        if not current_user:
            return jsonify({"message": "User not found or token invalid"}), 404

        # 1. Get query parameters from the request
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search_term = request.args.get('search', '', type=str).strip()
        lecturer_filter = request.args.get('lecturer_id', 'all', type=str).strip()

        # 2. Build the base query with aggregated data using efficient subqueries
        # This approach avoids the "N+1 query problem" and is much more performant.

        # Subquery to count students per course
        student_count_subquery = db.session.query(
            Course.id.label("course_id"),
            func.count(Student.id).label("total_students")
        ).join(Course.students).group_by(Course.id).subquery()

        # Subquery to count sessions per course
        session_count_subquery = db.session.query(
            Session.course_id,
            func.count(Session.id).label("total_sessions")
        ).group_by(Session.course_id).subquery()

        # Base query joining the Course model with the aggregated data from our subqueries
        query = db.session.query(
            Course,
            func.coalesce(student_count_subquery.c.total_students, 0).label('total_students'),
            func.coalesce(session_count_subquery.c.total_sessions, 0).label('total_sessions')
        ).outerjoin(
            student_count_subquery, Course.id == student_count_subquery.c.course_id
        ).outerjoin(
            session_count_subquery, Course.id == session_count_subquery.c.course_id
        )

        # 3. Apply role-based filtering to the query
        if current_user.role == 'lecturer':
            query = query.filter(Course.lecturer_id == current_user.id)
        elif current_user.role == 'student':
            query = query.join(Course.students).filter(Student.user_id == current_user.id)

        # 4. Apply search and lecturer filters (primarily used by admins)
        if search_term:
            query = query.filter(Course.name.ilike(f'%{search_term}%'))

        if lecturer_filter != 'all':
            try:
                lecturer_id_int = int(lecturer_filter)
                # Only admins can filter by any lecturer; this check ensures it.
                if current_user.is_admin:
                    query = query.filter(Course.lecturer_id == lecturer_id_int)
            except (ValueError, TypeError):
                logger.warning(f"Invalid lecturer_id filter value received: '{lecturer_filter}'")

        # 5. Order the results for consistent pagination and execute the paginated query
        paginated_results = query.order_by(Course.id.desc()).paginate(page=page, per_page=per_page, error_out=False)

        # 6. Serialize the paginated data into the final format for the frontend
        courses_data = []
        for course, total_students, total_sessions in paginated_results.items:
            courses_data.append({
                'id': course.id,
                'name': course.name,
                'description': course.description,
                'lecturer_id': course.lecturer_id,
                'total_students': total_students,
                'total_sessions': total_sessions
            })

        # 7. Return the final JSON response
        return jsonify({
            "courses": courses_data,
            "total": paginated_results.total,
            "pages": paginated_results.pages,
            "current_page": paginated_results.page
        }), 200

    except Exception as e:
        logger.error(f"Error fetching courses: {str(e)}", exc_info=True)
        return jsonify({"message": "An error occurred while fetching courses."}), 500
       
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

    # Role-based filtering
    if current_user.is_admin:
        pass  # Admin can see all students
    elif current_user.role == 'lecturer':
        # Lecturers see only students in courses they teach
        query = query.join(Student.courses).filter(Course.lecturer_id == current_user.id).distinct()
    else:
        # Other roles (like 'student') are not authorized to see the full list
        return jsonify({"message": "Unauthorized to access student list"}), 403

    # --- NEW: Search functionality ---
    search_term = request.args.get('name', '').strip()
    if search_term:
        query = query.filter(Student.name.ilike(f'%{search_term}%'))

    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 15, type=int)
    students_pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    students_data = [
        {'id': student.id, 'student_id': student.student_id, 'name': student.name, 'email': student.email, 'user_id': student.user_id}
        for student in students_pagination.items
    ]
    return jsonify({
        "students": students_data,
        "total": students_pagination.total,
        "pages": students_pagination.pages,
        "current_page": students_pagination.page
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

@app.route('/api/courses/<int:course_id>/attendance/summary', methods=['GET'])
@role_required(['lecturer', 'admin'])
def get_course_attendance_summary(current_user, course_id):
    """
    Provides a detailed attendance summary for all students in a given course.
    Accessible by admins or the course's assigned lecturer.
    """
    try:
        course = db.session.query(Course).get(course_id)
        if not course:
            return jsonify({"message": "Course not found"}), 404

        # Authorization check is handled by the role_required decorator, but we add a specific check for the lecturer
        if not current_user.is_admin and course.lecturer_id != current_user.id:
            return jsonify({"message": "Unauthorized to view attendance summary for this course"}), 403

        # Get all students enrolled in the course
        enrolled_students = course.students
        
        # Get all sessions for the course
        total_sessions = db.session.query(Session).filter_by(course_id=course_id).count()

        # Prepare summary list
        students_summary = []
        total_attendance_rate_sum = 0

        if total_sessions > 0 and enrolled_students:
            for student in enrolled_students:
                # Count the number of sessions the student has attended for this course
                attended_sessions_count = db.session.query(Attendance).join(Session).filter(
                    Attendance.student_id == student.id,
                    Session.course_id == course_id
                ).count()
                
                # Calculate the attendance rate for the student
                attendance_rate = (attended_sessions_count / total_sessions) * 100
                
                students_summary.append({
                    'student_id': student.student_id,
                    'student_name': student.name,
                    'attended_sessions': attended_sessions_count,
                    'attendance_rate': round(attendance_rate)
                })
                total_attendance_rate_sum += attendance_rate
        
            # Calculate the overall average attendance for the course
            average_attendance = (total_attendance_rate_sum / len(enrolled_students))
        else:
            average_attendance = 0


        return jsonify({
            'course_name': course.name,
            'average_attendance': round(average_attendance),
            'students_summary': sorted(students_summary, key=lambda x: x['student_name']), # Sort by name
            'total_sessions': total_sessions
        })

    except Exception as e:
        logger.error(f"Error generating attendance summary for course {course_id}: {str(e)}", exc_info=True)
        return jsonify({"message": "An error occurred while generating the summary"}), 500

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

