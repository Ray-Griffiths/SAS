import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';

// You will need to create and import these components
import ScanQrCode from './ScanQrCode';
import ViewMyAttendance from './ViewMyAttendance';
import UpdateProfile from './UpdateProfile';

const StudentDashboard = () => {
  // State for messages (assuming these will be set by child components or context)
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  return (

    <div className="flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-blue-800 text-white p-4">
        <h2 className="text-2xl font-bold mb-6">Student Dashboard</h2>
        <ul>
          <li className="mb-2">
            <Link to="/student/scan-qr" className="hover:text-blue-300">Scan QR Code</Link>
          </li>
          <li className="mb-2">
            <Link to="/student/my-attendance" className="hover:text-blue-300">My Attendance</Link>
          </li>
          <li className="mb-2">
            <Link to="/student/update-profile" className="hover:text-blue-300">Update Profile</Link>
          </li>
        </ul>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6">
        {/* Message Area */}
        {(successMessage || error) && (
          <div className="message-area mb-4 p-3 rounded">
            {successMessage && (
              <div className="success-message text-green-700 bg-green-100 p-2 rounded mb-2">{successMessage}</div>
            )}
            {error && (
              <div className="error-message text-red-700 bg-red-100 p-2 rounded">{error}</div>
            )}
          </div>
        )}
        <Routes>
          {/* Nested routes */}
          <Route path="scan-qr" element={<ScanQrCode />} />
          <Route path="my-attendance" element={<ViewMyAttendance />} />
          <Route path="update-profile" element={<UpdateProfile />} />
        </Routes>
      </div>
    </div>
  );
};

export default StudentDashboard;