import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import ManageUsers from './ManageUsers';
import ManageCourses from './ManageCourses';
import AttendanceReports from './AttendanceReports';
import ManageSessions from './ManageSessions';

const AdminDashboard = () => {
  console.log("AdminDashboard component is rendering");
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 text-2xl font-semibold border-b border-gray-700">
          Admin Menu
        </div>
        <nav className="flex flex-col flex-grow p-4">
          <NavLink to="/admin" end className={({ isActive }) =>
            isActive ? "bg-gray-700 py-2.5 px-4 rounded" : "hover:bg-gray-700 py-2.5 px-4 rounded"
          }>
            Dashboard
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) =>
            isActive ? "bg-gray-700 py-2.5 px-4 rounded" : "hover:bg-gray-700 py-2.5 px-4 rounded"
          }>
            Manage Users
          </NavLink>
          <NavLink to="/admin/courses" className={({ isActive }) =>
            isActive ? "bg-gray-700 py-2.5 px-4 rounded" : "hover:bg-gray-700 py-2.5 px-4 rounded"
          }>
            Manage Courses
          </NavLink>
          <NavLink to="/admin/sessions" className={({ isActive }) =>
            isActive ? "bg-gray-700 py-2.5 px-4 rounded" : "hover:bg-gray-700 py-2.5 px-4 rounded"
          }>
            Manage Sessions
          </NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) =>
            isActive ? "bg-gray-700 py-2.5 px-4 rounded" : "hover:bg-gray-700 py-2.5 px-4 rounded"
          }>
            Reports
          </NavLink>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-grow p-6 overflow-y-auto">
        <Routes>
          <Route path="/" element={<h1 className="text-3xl font-bold">Admin Dashboard</h1>} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="courses" element={<ManageCourses />} />
          <Route path="sessions" element={<ManageSessions />} />
          <Route path="reports" element={<AttendanceReports />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminDashboard;
