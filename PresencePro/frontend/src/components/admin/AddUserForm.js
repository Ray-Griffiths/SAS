import React, { useState } from 'react';
import { createUser } from '../../services/api';

const AddUserForm = ({ onSuccess, onCancel }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({}); // Object to hold all validation errors

  const validate = () => {
    const errors = {};
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    const emailRegex = /^[\w\.-]+@[\w\.-]+\.\w+$/;

    if (!usernameRegex.test(username)) {
      errors.username = 'Username must be 3-50 characters and can only contain letters, numbers, and underscores.';
    }
    if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0; // Return true if no errors
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!validate()) {
      return; // Stop submission if validation fails
    }

    const userData = {
      username,
      email,
      password,
      role,
      is_admin: role === 'admin',
    };

    try {
      await createUser(userData);
      if (onSuccess) {
        onSuccess();
      }
      // Reset form fields after successful submission
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('student');
    } catch (err) {
      setError(err.message || 'Failed to create user.');
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-md shadow-sm bg-gray-50">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Add New User</h3>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${validationErrors.username ? 'border-red-500 ring-red-500' : 'focus:ring-blue-600'}`}
            required
          />
          {validationErrors.username && <p className="text-red-500 text-xs mt-1">{validationErrors.username}</p>}
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${validationErrors.email ? 'border-red-500 ring-red-500' : 'focus:ring-blue-600'}`}
            required
          />
          {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${validationErrors.password ? 'border-red-500 ring-red-500' : 'focus:ring-blue-600'}`}
            required
          />
          {validationErrors.password && <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>}
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="role">Role:</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
            required
          >
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="mr-2 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50"
          >
            Add User
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddUserForm;
