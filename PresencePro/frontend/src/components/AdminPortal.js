import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import ManageUsers from './admin/ManageUsers';
import AttendanceReports from './admin/AttendanceReports';
import ManageSessions from './admin/ManageSessions';

const AdminPortal = () => {
 return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 text-2xl font-semibold border-b border-gray-700">
          Admin Menu
        </div>
        <nav className="flex flex-col flex-grow p-4">
          {/* Use NavLink for navigation */}
          <NavLink to="/admin" end className={({ isActive }) => isActive ? "block py-2.5 px-4 rounded transition duration-200 bg-gray-700" : "block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700"}>Dashboard</NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => isActive ? "block py-2.5 px-4 rounded transition duration-200 bg-gray-700" : "block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700"}>Manage Users</NavLink>
          <NavLink to="/admin/sessions" className={({ isActive }) => isActive ? "block py-2.5 px-4 rounded transition duration-200 bg-gray-700" : "block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700"}>Manage Sessions</NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) => isActive ? "block py-2.5 px-4 rounded transition duration-200 bg-gray-700" : "block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700"}>View Reports</NavLink>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-grow p-6 overflow-y-auto">
        {/* Nested Routes for Admin Features */}
        <Routes>
          <Route path="/" element={<h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="sessions" element={<ManageSessions />} />
          <Route path="reports" element={<AttendanceReports />} />
        </Routes>
      </div>
    </div>
 );
};

export default AdminPortal;
