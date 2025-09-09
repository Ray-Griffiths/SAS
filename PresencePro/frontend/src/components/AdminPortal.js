import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

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
          <NavLink to="/admin/courses" className={({ isActive }) => isActive ? "block py-2.5 px-4 rounded transition duration-200 bg-gray-700" : "block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700"}>Manage Courses</NavLink>
          <NavLink to="/admin/sessions" className={({ isActive }) => isActive ? "block py-2.5 px-4 rounded transition duration-200 bg-gray-700" : "block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700"}>Manage Sessions</NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) => isActive ? "block py-2.5 px-4 rounded transition duration-200 bg-gray-700" : "block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700"}>View Reports</NavLink>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-grow p-6 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminPortal;