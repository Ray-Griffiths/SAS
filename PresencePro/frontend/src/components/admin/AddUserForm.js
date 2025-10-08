import React, { useState } from 'react';
import { createUser } from '../../services/api';

const AddUserForm = ({ onSuccess, onCancel }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  // --- FIX: Add state for student-specific fields ---
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (username.length < 3) errors.username = 'Username must be at least 3 characters.';
    if (!/^[\w.-]+@[\w.-]+\.\w+$/.test(email)) errors.email = 'Invalid email format.';
    if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    // --- FIX: Add validation for student ID if the role is student ---
    if (role === 'student' && !studentId.trim()) {
      errors.studentId = 'Student ID is required for the student role.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!validate()) {
      return;
    }

    // --- FIX: Conditionally include student data in the payload ---
    const userData = {
      username,
      email,
      password,
      role,
      is_admin: role === 'admin',
    };

    if (role === 'student') {
      userData.student_id = studentId;
      userData.name = name; // Backend uses username as fallback if name is empty
    }

    try {
      await createUser(userData);
      if (onSuccess) {
        onSuccess();
      }
      // Reset form
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('student');
      setStudentId('');
      setName('');
      setValidationErrors({});

    } catch (err) {
      // --- FIX: Display backend validation errors more clearly ---
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create user.';
      setError(errorMessage);
    }
  };

  return (
    <div className="mt-4 p-6 border rounded-lg shadow-lg bg-white">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">Add New User</h3>
      {error && <p className="text-red-600 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Role Selection */}
          <div className="md:col-span-2">
            <label className="block text-gray-700 font-semibold mb-2" htmlFor="role">Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="student">Student</option>
              <option value="lecturer">Lecturer</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* --- FIX: Conditional fields for Student role --- */}
          {role === 'student' && (
            <>
              <div>
                <label className="block text-gray-700 font-semibold mb-2" htmlFor="studentId">Student ID</label>
                <input
                  type="text"
                  id="studentId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${validationErrors.studentId ? 'border-red-500 ring-red-500' : 'focus:ring-blue-500'}`}
                  required
                />
                {validationErrors.studentId && <p className="text-red-500 text-sm mt-1">{validationErrors.studentId}</p>}
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2" htmlFor="name">Full Name (Optional)</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">If not provided, username will be used as name.</p>
              </div>
            </>
          )}

          {/* Username */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2" htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${validationErrors.username ? 'border-red-500 ring-red-500' : 'focus:ring-blue-500'}`}
              required
            />
            {validationErrors.username && <p className="text-red-500 text-sm mt-1">{validationErrors.username}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${validationErrors.email ? 'border-red-500 ring-red-500' : 'focus:ring-blue-500'}`}
              required
            />
            {validationErrors.email && <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>}
          </div>

          {/* Password */}
          <div className="md:col-span-2">
            <label className="block text-gray-700 font-semibold mb-2" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${validationErrors.password ? 'border-red-500 ring-red-500' : 'focus:ring-blue-500'}`}
              required
            />
            {validationErrors.password && <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="mr-3 px-5 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            Add User
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddUserForm;
