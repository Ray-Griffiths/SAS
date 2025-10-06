
# PresencePro

PresencePro is a web-based application designed to streamline attendance tracking for educational institutions and businesses. It utilizes QR code technology to provide a fast, efficient, and reliable way to record and manage attendance.

## Features

*   **User Roles:**  The application supports three user roles: Admin, Lecturer, and Student.
*   **QR Code Attendance:** Lecturers can generate unique QR codes for each session, and students can mark their attendance by scanning the QR code.
*   **Real-time Dashboards:**  Interactive dashboards for each user role provide real-time insights into attendance data.
*   **Reporting and Analytics:**  Generate detailed attendance reports, identify at-risk students, and analyze attendance trends.
*   **User Management:** Admins can easily add, edit, and manage users.
*   **Course and Session Management:**  Create and manage courses and sessions.

## Technologies Used

### Frontend

*   React
*   React Router
*   Tailwind CSS
*   Chart.js
*   Axios

### Backend

*   Flask
*   SQLAlchemy
*   Flask-JWT-Extended
*   Gunicorn

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   Node.js and npm
*   Python and pip

### Installation

1.  **Clone the repo**
    ```sh
    git clone https://github.com/your_username/PresencePro.git
    ```
2.  **Install NPM packages**
    ```sh
    cd PresencePro/frontend
    npm install
    ```
3.  **Install Python packages**
    ```sh
    cd ../backend
    pip install -r requirements.txt
    ```

## Usage

1.  **Start the backend server**
    ```sh
    cd PresencePro/backend
    gunicorn --bind 127.0.0.1:5000 wsgi:app
    ```
2.  **Start the frontend development server**
    ```sh
    cd ../frontend
    npm start
    ```

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
