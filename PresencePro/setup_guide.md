
# PresencePro Setup Guide

This guide will walk you through the process of setting up the PresencePro application for local development and production.

## 1. Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **Node.js and npm:**  [https://nodejs.org/](https://nodejs.org/)
*   **Python and pip:** [https://www.python.org/](https://www.python.org/)
*   **Git:** [https://git-scm.com/](https://git-scm.com/)

## 2. Clone the Repository

```sh
git clone https://github.com/your_username/PresencePro.git
cd PresencePro
```

## 3. Frontend Setup

```sh
cd frontend
npm install
```

## 4. Backend Setup

```sh
cd ../backend
pip install -r requirements.txt
```

## 5. Database Setup

The application uses SQLAlchemy and Alembic to manage database migrations.

1.  **Initialize the database:**

    ```sh
    # (From the 'backend' directory)
    flask db init
    ```

2.  **Create an initial migration:**

    ```sh
    flask db migrate -m "Initial migration"
    ```

3.  **Apply the migrations to the database:**

    ```sh
    flask db upgrade
    ```

## 6. Environment Variables

Create a `.env` file in the `backend` directory and add the following environment variables:

```
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY='your_secret_key'
JWT_SECRET_KEY='your_jwt_secret_key'
SQLALCHEMY_DATABASE_URI=sqlite:///site.db
```

**Note:** Replace `'your_secret_key'` and `'your_jwt_secret_key'` with strong, unique secret keys.

## 7. Running the Application

### Development

1.  **Start the backend server:**

    ```sh
    # (From the 'backend' directory)
    flask run
    ```

2.  **Start the frontend development server:**

    ```sh
    # (From the 'frontend' directory)
    npm start
    ```

### Production

For production, it is recommended to use a production-ready WSGI server like Gunicorn.

1.  **Start the Gunicorn server:**

    ```sh
    # (From the 'backend' directory)
    gunicorn --bind 0.0.0.0:8000 wsgi:app
    ```

2.  **Build the frontend for production:**

    ```sh
    # (From the 'frontend' directory)
    npm run build
    ```

3.  **Serve the frontend:**

    The `build` command will create a `build` directory in the `frontend` directory. You can serve this directory with a static file server like Nginx or by using a cloud service like Firebase Hosting or Netlify.
