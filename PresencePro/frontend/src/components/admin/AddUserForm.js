import React, { useState } from 'react';
import { createUser } from '../../services/api'; // Adjust the import path if necessary

const AddUserForm = ({ onSuccess, onCancel }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student'); // Default role

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = { name, email, role };
    console.log('Submitting new user data:', formData);

    try {
      // Placeholder for actual API call to create user
      await createUser(formData);
      console.log('User created successfully (placeholder)');
      if (onSuccess) {
        onSuccess(); // Notify parent component
      }
    } catch (error) {
      console.error('Error creating user (placeholder):', error);
      // Handle error (e.g., display error message)
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-md shadow-sm bg-gray-50">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Add New User</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
            required
          />
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
