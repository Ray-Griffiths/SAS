
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

const Navbar = () => {
  const { user, logout } = useAuth(); // Access user and logout from AuthContext

  // Determine the dashboard path based on the user's role
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
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo or Site Title */}
        <Link to="/" className="text-xl font-bold">
          PresencePro
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center">
          {user ? (
            <>
              <Link to="/" className="mr-4">Home</Link>
              <Link to="/contact" className="mr-4">Contact</Link>
              
              {/* --- FIX: Added dynamic dashboard link for all roles --- */}
              <Link to={getDashboardPath()} className="mr-4 font-semibold text-blue-300 hover:text-blue-400">
                {user.username}
              </Link>
              
              <button onClick={logout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/" className="mr-4">Home</Link>
              <Link to="/contact" className="mr-4">Contact</Link>
              <Link to="/login" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Login</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
