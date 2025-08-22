import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import ScanQrCode from './student/ScanQrCode';
import ViewMyAttendance from './student/ViewMyAttendance';
import UpdateProfile from './student/UpdateProfile';

function StudentPortal() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-4">
        <h2 className="text-2xl font-bold mb-6">Student Portal</h2>
        <nav>
          <ul>
            <li className="mb-2">
              <NavLink
                to="/student/scan-qr"
                className={({ isActive }) =>
                  isActive ? 'text-blue-400' : 'hover:text-blue-300'
                }
              >
                Scan QR Code
              </NavLink>
            </li>
            <li className="mb-2">
              <NavLink
                to="/student/my-attendance"
                className={({ isActive }) =>
                  isActive ? 'text-blue-400' : 'hover:text-blue-300'
                }
              >
                View My Attendance
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
      {/* Main Content */}
      <div className="flex-1 p-6">
        <Routes>
          <Route path="scan-qr" element={<ScanQrCode />} />
          <Route path="my-attendance" element={<ViewMyAttendance />} />
          {/* Add route for UpdateProfile if needed */}
        </Routes>
      </div>
    </div>
  );
}

export default StudentPortal;
