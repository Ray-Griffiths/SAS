import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';

const LecturerDashboard = () => {
  // State for displaying success or error messages to the user
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <div>
      <h2>Lecturer Dashboard</h2>
      <nav>
        <ul>
          <li><Link to="courses">Manage Courses</Link></li>
          <li><Link to="sessions">Manage Sessions</Link></li>
          <li><Link to="attendance">View Attendance</Link></li>
        </ul>
      </nav>

      {/* Message Area */}
      {(successMessage || error) && (
        <div className="message-area">
          {successMessage && <div className="success-message">{successMessage}</div>}
          {error && <div className="error-message">{error}</div>}
        </div>
      )}

      <hr />

      {/* Nested route components will be rendered here */}
      {/* We can pass the message setters to child components via the Outlet's context */}
      <Outlet context={{ setSuccessMessage, setError }} />

    </div>
  );
};

export default LecturerDashboard;
