"""Define relationships and add constraints

Revision ID: e4779af9c308
Revises: 773d5c3aa149
Create Date: 2025-07-14 14:48:45.584922

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text # Import text

# revision identifiers, used by Alembic.
revision = 'e4779af9c308'
down_revision = '773d5c3aa149'
branch_labels = None
depends_on = None


def upgrade():
    # Check if student_course_association table already exists
    if not op.get_bind().dialect.has_table(op.get_bind(), 'student_course_association'):
        op.create_table('student_course_association',
            sa.Column('student_id', sa.Integer(), nullable=False),
            sa.Column('course_id', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['course_id'], ['courses.id'], name='fk_student_course_course_id'),
            sa.ForeignKeyConstraint(['student_id'], ['students.id'], name='fk_student_course_student_id'),
            sa.PrimaryKeyConstraint('student_id', 'course_id')
        )

    with op.batch_alter_table('attendance', schema=None) as batch_op:
        # Check if timestamp column exists
        # Wrap PRAGMA in text()
        attendance_table_info = op.get_bind().execute(text("PRAGMA table_info(attendance)")).fetchall()
        if not op.get_bind().dialect.has_table(op.get_bind(), 'attendance') or \
           not any(col[1] == 'timestamp' for col in attendance_table_info): # Change col['name'] to col[1]
            batch_op.add_column(sa.Column('timestamp', sa.DateTime(), nullable=True))
        # Check if unique constraint exists
        # Wrap PRAGMA in text()
        if not op.get_bind().execute(text("PRAGMA index_list(attendance)")).fetchall():
            batch_op.create_unique_constraint('_session_student_uc', ['session_id', 'student_id'])

    with op.batch_alter_table('courses', schema=None) as batch_op:
        # Check if description column exists
        # Wrap PRAGMA in text()
        courses_table_info = op.get_bind().execute(text("PRAGMA table_info(courses)")).fetchall()
        if not op.get_bind().dialect.has_table(op.get_bind(), 'courses') or \
           not any(col[1] == 'description' for col in courses_table_info): # Change col['name'] to col[1]
            batch_op.add_column(sa.Column('description', sa.String(length=255), nullable=True))
        # Check if unique constraint exists
        # Wrap PRAGMA in text()
        if not op.get_bind().execute(text("PRAGMA index_list(courses)")).fetchall():
            batch_op.create_unique_constraint('uq_courses_name', ['name']) # Corrected constraint name based on models.database.py
        # Check if course_id column exists
        # Wrap PRAGMA in text()
        if any(col[1] == 'course_id' for col in courses_table_info): # Change col['name'] to col[1]
            batch_op.drop_column('course_id')

    with op.batch_alter_table('sessions', schema=None) as batch_op:
        # Check if lecturer_id column exists
        # Wrap PRAGMA in text()
        sessions_table_info = op.get_bind().execute(text("PRAGMA table_info(sessions)")).fetchall()
        if not op.get_bind().dialect.has_table(op.get_bind(), 'sessions') or \
           not any(col[1] == 'lecturer_id' for col in sessions_table_info): # Change col['name'] to col[1]
            batch_op.add_column(sa.Column('lecturer_id', sa.Integer(), nullable=True))
        # Check if foreign key exists
        # Wrap PRAGMA in text()
        if not op.get_bind().execute(text("PRAGMA foreign_key_list(sessions)")).fetchall():
            batch_op.create_foreign_key('fk_sessions_lecturer_id_users', 'users', ['lecturer_id'], ['id'])
        # Check if session_id column exists
        # Wrap PRAGMA in text()
        if any(col[1] == 'session_id' for col in sessions_table_info): # Change col['name'] to col[1]
            batch_op.drop_column('session_id')

    with op.batch_alter_table('students', schema=None) as batch_op:
        # Check if email column exists
        # Wrap PRAGMA in text()
        students_table_info = op.get_bind().execute(text("PRAGMA table_info(students)")).fetchall()
        if not op.get_bind().dialect.has_table(op.get_bind(), 'students') or \
           not any(col[1] == 'email' for col in students_table_info): # Change col['name'] to col[1]
            batch_op.add_column(sa.Column('email', sa.String(length=120), nullable=True))
        # Check if unique constraints exist
        # Wrap PRAGMA in text()
        if not op.get_bind().execute(text("PRAGMA index_list(students)")).fetchall():
            batch_op.create_unique_constraint('uq_students_user_id', ['user_id'])
            batch_op.create_unique_constraint('uq_students_email', ['email'])

    with op.batch_alter_table('users', schema=None) as batch_op:
        # Check if email or is_admin columns exist
        # Wrap PRAGMA in text()
        users_table_info = op.get_bind().execute(text("PRAGMA table_info(users)")).fetchall() # Use a different variable name
        if not op.get_bind().dialect.has_table(op.get_bind(), 'users') or \
           not any(col[1] == 'email' for col in users_table_info): # Change col['name'] to col[1]
            batch_op.add_column(sa.Column('email', sa.String(length=120), nullable=True))
        if not any(col[1] == 'is_admin' for col in users_table_info): # Change col['name'] to col[1]
            batch_op.add_column(sa.Column('is_admin', sa.Boolean(), nullable=True))
        # Check if unique constraint exists
        # Wrap PRAGMA in text()
        if not op.get_bind().execute(text("PRAGMA index_list(users)")).fetchall():
            batch_op.create_unique_constraint('uq_users_email', ['email'])


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        # Wrap PRAGMA in text() if needed for checks in downgrade (less common)
        batch_op.drop_constraint('uq_users_email', type_='unique')
        batch_op.drop_column('is_admin')
        batch_op.drop_column('email')

    with op.batch_alter_table('students', schema=None) as batch_op:
        # Wrap PRAGMA in text() if needed for checks in downgrade
        batch_op.drop_constraint('uq_students_email', type_='unique')
        batch_op.drop_constraint('uq_students_user_id', type_='unique')
        batch_op.drop_column('email')

    with op.batch_alter_table('sessions', schema=None) as batch_op:
        # Wrap PRAGMA in text() if needed for checks in downgrade
        batch_op.add_column(sa.Column('session_id', sa.VARCHAR(length=80), nullable=False))
        batch_op.drop_constraint('fk_sessions_lecturer_id_users', type_='foreignkey')
        batch_op.drop_column('lecturer_id')

    with op.batch_alter_table('courses', schema=None) as batch_op:
        # Wrap PRAGMA in text() if needed for checks in downgrade
        batch_op.add_column(sa.Column('course_id', sa.VARCHAR(length=80), nullable=False))
        batch_op.drop_constraint('uq_courses_name', type_='unique') # Corrected constraint name
        batch_op.drop_column('description')

    with op.batch_alter_table('attendance', schema=None) as batch_op:
        # Wrap PRAGMA in text() if needed for checks in downgrade
        batch_op.drop_constraint('_session_student_uc', type_='unique')
        batch_op.drop_column('timestamp')

    # Wrap PRAGMA in text() for the table existence check
    if op.get_bind().dialect.has_table(op.get_bind(), 'student_course_association'):
        op.drop_table('student_course_association')
