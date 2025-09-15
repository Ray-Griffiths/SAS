
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  HomeIcon, 
  UsersIcon, 
  BookOpenIcon, 
  ClipboardDocumentListIcon, 
  Cog6ToothIcon,
  ChevronLeftIcon, 
  ChevronRightIcon 
} from '@heroicons/react/24/solid';

const menuItems = [
  { path: '/admin', name: 'Dashboard', icon: <HomeIcon className="h-6 w-6" /> },
  { path: '/admin/users', name: 'Users', icon: <UsersIcon className="h-6 w-6" /> },
  { path: '/admin/courses', name: 'Courses', icon: <BookOpenIcon className="h-6 w-6" /> },
  { path: '/admin/system-logs', name: 'System Logs', icon: <ClipboardDocumentListIcon className="h-6 w-6" /> },
  { path: '/admin/settings', name: 'Settings', icon: <Cog6ToothIcon className="h-6 w-6" /> },
];

const AdminMenu = () => {
  const [isOpen, setIsOpen] = useState(true);

  const activeLinkStyle = {
    backgroundColor: '#312E81', // A darker indigo
    color: '#6EE7B7', // Teal accent for active link text
    fontWeight: 'bold',
  };

  return (
    <div className={`bg-indigo-900 text-gray-200 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-20'}`}>
        {/* Toggle Button */}
        <div className="p-4 flex justify-end">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-indigo-800 focus:outline-none">
                {isOpen ? <ChevronLeftIcon className="h-6 w-6 text-white" /> : <ChevronRightIcon className="h-6 w-6 text-white" />}
            </button>
        </div>

      {/* Title */}
      <div className="px-4 pb-4 border-b border-indigo-800">
          <h2 className={`text-2xl font-bold text-white transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 h-0'}`}>Admin Menu</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-grow mt-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.name} className="px-4">
              <NavLink
                to={item.path}
                end={item.path === '/admin'} // Add this to ensure only the exact path is active
                style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
                className="flex items-center p-2 rounded-lg hover:bg-indigo-800 transition-colors duration-200"
              >
                <span className="shrink-0">{item.icon}</span>
                <span className={`ml-3 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default AdminMenu;
