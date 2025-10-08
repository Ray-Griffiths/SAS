
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavLink = ({ to, children }) => (
    <Link to={to} className="text-gray-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded-md text-sm font-medium">
        {children}
    </Link>
);

const Navbar = () => {
  const { user, logout } = useAuth();

  const getDashboardPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'admin':
        return '/admin';
      case 'lecturer':
        return '/lecturer/dashboard';
      case 'student':
        return '/student';
      default:
        return '/';
    }
  };

  return (
    <nav className="bg-indigo-900 p-4 text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo on the left */}
        <Link to="/" className="text-xl font-bold tracking-wider">
          PresencePro
        </Link>

        {/* Links and Buttons on the right */}
        <div className="flex items-center space-x-2 flex-wrap justify-end">
          {user ? (
            <>
              <NavLink to="/">Home</NavLink>
              <NavLink to="/contact">Contact</NavLink>
              <Link to={getDashboardPath()} className="font-semibold text-teal-300 hover:text-teal-200 transition-colors px-3 py-2 rounded-md text-sm">
                Dashboard
              </Link>
              <button onClick={logout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/">Home</NavLink>
              <NavLink to="/contact">Contact</NavLink>
              <Link to="/login" className="bg-teal-400 hover:bg-teal-300 text-gray-900 font-bold py-2 px-4 rounded-md transition-all duration-300 text-sm">
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
