
import React from 'react';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { path: '/lecturer/dashboard', name: 'Dashboard' },
  { path: '/lecturer/courses', name: 'Courses' },
  { path: '/lecturer/sessions', name: 'Sessions' },
  { path: '/lecturer/attendance', name: 'Attendance' },
];

const LecturerMenu = () => {
  const activeLinkStyle = {
    backgroundColor: '#1D4ED8', // A darker blue for the active link
    color: 'white',
  };

  return (
    <div className="bg-gray-800 text-white w-64 p-4 space-y-2 flex flex-col">
      <h2 className="text-2xl font-bold mb-4">Lecturer Menu</h2>
      <nav className="flex-grow">
        <ul>
          {menuItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
                className="block py-2.5 px-4 rounded-lg hover:bg-gray-700 transition duration-200"
              >
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default LecturerMenu;
