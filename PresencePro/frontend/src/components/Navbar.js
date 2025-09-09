import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth
 // Import useNavigate
 import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth(); // Access user and logout from AuthContext
  return (
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo or Site Title */}
        <Link to="/" className="text-xl font-bold">
          PresencePro
        </Link>

        {/* Navigation Links */}
        <div>
          {user ? (
            <>
              <Link to="/" className="mr-4">Home</Link>
              <Link to="/contact" className="mr-4">Contact</Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="mr-4">Admin</Link>
              )}
              {/* Add links for lecturer and student portals here if needed */}
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