import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api'; // Corrected import path
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [isAdministratorLogin, setIsAdministratorLogin] = useState(true); // State to toggle login forms

  const handleLogin = async () => {
    console.log('handleLogin called');
    try {
      // Placeholder for the actual API call
      // Use the directly imported login function
      const user = await login(username, password); // Corrected function call

      // Store the JWT in localStorage
      localStorage.setItem('jwt_token', user.access_token);

      // Simulate a successful login with a placeholder user object
      // NOTE: In a real application, the user object and role would come from the API response
      // The following line is for demonstration purposes based on the toggle state
      // const user = { role: isAdministratorLogin ? 'admin' : 'student' }; // Simulate role based on toggle

      // Placeholder: Set user authentication status and role (e.g., in context or local storage)
      console.log('User authenticated:', user);

      // Navigate based on role
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'lecturer') {
        navigate('/lecturer');
      } else if (user.role === 'student') {
        navigate('/student');
      } else {
        // Handle unknown roles or default navigation
        console.warn('Unknown user role:', user.role);
        // Optionally navigate to a default page or show an error
        // navigate('/default-dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
      // Handle login errors (e.g., display an error message to the user)
      // You might want to set a state to display an error message in the UI
      // setErrorMessage('Invalid username or password.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Login to PresencePro</h2>
        <div className="mt-4">
          <div>
            {/* Toggle buttons/links */}
            <div className="flex justify-center mb-4">
              <button
                className={`px-4 py-2 mr-2 rounded ${isAdministratorLogin ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                onClick={() => setIsAdministratorLogin(true)}
              >
                Administrator Login
              </button>
              <button
                className={`px-4 py-2 rounded ${!isAdministratorLogin ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                onClick={() => setIsAdministratorLogin(false)}
              >
                Other Users Login
              </button>
            </div>

            {isAdministratorLogin ? (
              // Administrator Login Form
              <>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="admin-username">Username/Email:</label>
                <input
                  type="text"
                  id="admin-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <div className="mt-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="admin-password">Password:</label>
                  <input
                    type="password"
                    id="admin-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </>
            ) : (
              // Other Users Login Form (Lecturer/Student)
              <>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="other-username">Username/Email:</label>
                <input
                  type="text"
                  id="other-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <div className="mt-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="other-password">Password:</label>
                  <input
                    type="password"
                    id="other-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex items-baseline justify-end" onClick={() => console.log('Parent div clicked')}>
            <button
              onClick={handleLogin}
              className="px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;