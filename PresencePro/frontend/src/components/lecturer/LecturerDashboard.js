import React, { useState } from 'react';
import { Link, Routes, Route } from 'react-router-dom';

// Assume these states are managed elsewhere or passed down as props
// const [successMessage, setSuccessMessage] = useState('');
// const [error, setError] = useState('');

const LecturerDashboard = () => {
  return (
    <div>
      <h2>Lecturer Dashboard</h2>
      <nav>
        <ul>
          <li><Link to="/lecturer/courses">Manage Courses</Link></li>
          <li><Link to="/lecturer/sessions">Manage Sessions</Link></li>
          <li><Link to="/lecturer/attendance">View Attendance</Link></li>
          <li><Link to="/lecturer/generate-qr">Generate QR Code</Link></li> {/* Added Link for QR Code Generation */}
        </ul>
      </nav>
      {/* Content will be rendered here based on navigation */}
      <div>
        <Routes>
          {/* Nested routes defined in App.js will render here */}
          {/* This <Routes> is necessary for the nested routes to be matched */}
        </Routes>

        {/* Message Area */}
        {(successMessage || error) && (
          <div className="message-area">
            {successMessage && <div className="success-message">{successMessage}</div>}
            {error && <div className="error-message">{error}</div>}
          </div>
        )}
      </div>

    </div>
  );
};

export default LecturerDashboard;