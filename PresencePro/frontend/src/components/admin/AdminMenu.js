import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // 1. Import useAuth

// 2. Define the navigation links in the new format
const adminNavLinks = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/courses', label: 'Courses' },
  { to: '/admin/system-logs', label: 'System Logs' },
  { to: '/admin/settings', label: 'Settings' },
];

const AdminMenu = () => {
  const { user, logout } = useAuth(); // 3. Get user and logout function

  // 4. Define the link styling to match the blue theme
  const getLinkClass = ({ isActive }) => {
    return isActive
      ? 'block py-2.5 px-4 rounded transition duration-200 bg-blue-700 text-white'
      : 'block py-2.5 px-4 rounded transition duration-200 text-blue-100 hover:bg-blue-700 hover:text-white';
  };

  return (
    // 5. Use the same blue-themed layout as the other portals
    <div className="w-64 bg-blue-800 text-white flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-blue-700">
        <h2 className="text-2xl font-bold">Admin Portal</h2>
        {user && <span className='text-sm text-blue-200'>Welcome, {user.username}</span>}
      </div>
      <nav className="flex-grow p-4">
        <ul className="space-y-2">
          {adminNavLinks.map((link, index) => (
            <li key={index}>
              <NavLink to={link.to} className={getLinkClass} end={link.to === '/admin'}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-blue-700">
        <button
          onClick={logout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-300">
          Logout
        </button>
      </div>
    </div>
  );
};

export default AdminMenu;
