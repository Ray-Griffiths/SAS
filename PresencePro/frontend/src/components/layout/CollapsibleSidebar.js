import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/solid';

const CollapsibleSidebar = ({ title, navLinks, isMobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const [isDesktopExpanded, setDesktopExpanded] = useState(true);
  
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setMobileOpen(false);
      }
    };
    if (isMobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileOpen, setMobileOpen]);

  const getLinkClass = ({ isActive }) =>
    `flex items-center p-2 rounded-lg transition-colors duration-200 ${
      isActive 
        ? 'bg-teal-400 text-gray-900 font-bold' 
        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
    }`;
  
  const desktopWidthClass = isDesktopExpanded ? 'w-64' : 'w-20';

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity md:hidden ${
          isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      ></div>

      <div
        ref={sidebarRef}
        className={
          `fixed top-0 left-0 bg-blue-800 text-white flex flex-col z-50 transition-transform duration-300 ease-in-out
          h-screen /* FIX: Use h-screen for reliable full-height on fixed elements */
          md:relative md:translate-x-0 md:z-auto
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${desktopWidthClass}`
        }
      >
        <div className={`px-4 py-4 flex items-center border-b border-blue-700 ${isDesktopExpanded ? 'justify-between' : 'justify-center'}`}>
          <h2 className={`text-2xl font-bold whitespace-nowrap ${isDesktopExpanded ? 'block' : 'hidden'}`}>
            {title}
          </h2>
          <button 
            onClick={() => setDesktopExpanded(!isDesktopExpanded)} 
            className="p-2 rounded-full hover:bg-blue-700 focus:outline-none hidden md:block"
          >
            {isDesktopExpanded ? <ChevronLeftIcon className="h-6 w-6" /> : <ChevronRightIcon className="h-6 w-6" />}
          </button>
        </div>
        
        {user && (
            <span className={`text-sm text-blue-200 px-4 pt-2 whitespace-nowrap ${isDesktopExpanded ? 'block' : 'hidden'}`}>
                Welcome, {user.username}
            </span>
        )}

        <nav className="flex-grow p-4 mt-2">
          <ul className="space-y-2">
            {navLinks.map((link, index) => (
              <li key={index}>
                <NavLink 
                  to={link.to} 
                  className={getLinkClass} 
                  end={link.end || false}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="shrink-0">{link.icon}</span>
                  <span className={`ml-3 whitespace-nowrap ${isDesktopExpanded ? 'block' : 'hidden'}`}>{link.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* FIX: Improved Logout Button for consistent responsive behavior */}
        <div className="p-4 border-t border-blue-700">
          <button
            onClick={logout}
            className={`w-full p-2 rounded-lg transition-colors duration-200 flex items-center font-bold text-white bg-red-600 hover:bg-red-700 ${
              !isDesktopExpanded ? 'justify-center' : ''
            }`}
          >
            <span className="shrink-0">
              <ArrowRightOnRectangleIcon className="h-6 w-6" />
            </span>
            <span className={`ml-3 whitespace-nowrap ${isDesktopExpanded ? 'block' : 'hidden'}`}>
              Logout
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

export default CollapsibleSidebar;
