import React from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';

import CreateSession from './lecturer/CreateSession'; // Import placeholder component
import ViewSessions from './lecturer/ViewSessions'; // Import placeholder component
import ViewAttendance from './lecturer/ViewAttendance'; // Import placeholder component
function LecturerPortal() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="text-xl font-semibold p-4 text-gray-800">Lecturer Portal</div>
        <nav className="mt-4">
          <ul>
            <li>
              <NavLink to="/lecturer/create-session" className={({ isActive }) => `block py-2 px-4 text-gray-700 hover:bg-gray-200 ${isActive ? 'bg-gray-300 font-semibold' : ''}`}>
                Create Session
              </NavLink>
            </li>
            <li>
              <NavLink to="/lecturer/view-sessions" className={({ isActive }) => `block py-2 px-4 text-gray-700 hover:bg-gray-200 ${isActive ? 'bg-gray-300 font-semibold' : ''}`}>
                View Sessions
              </NavLink>
            </li>
            <li>
              <NavLink to="/lecturer/view-attendance" className={({ isActive }) => `block py-2 px-4 text-gray-700 hover:bg-gray-200 ${isActive ? 'bg-gray-300 font-semibold' : ''}`}>
                View Attendance
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <Routes>
          <Route path="create-session" element={<CreateSession />} />
          <Route path="view-sessions" element={<ViewSessions />} />
          <Route path="view-attendance" element={<ViewAttendance />} />
        </Routes>
      </div>
    </div>
  );
}

export default LecturerPortal;
