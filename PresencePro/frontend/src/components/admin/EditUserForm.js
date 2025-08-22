import React, { useState, useEffect } from 'react';
import { updateUser } from '../../services/api'; // Import the api service

const EditUserForm = ({ user }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setRole(user.role || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Placeholder for handling form submission (e.g., sending data to API)
    console.log('Editing user:', { name, email, role });
    const formData = { name, email, role };

    try {
      // Placeholder for actual API call to update user
      await updateUser(user.id, formData);
      console.log('User updated successfully (placeholder)');
      // Call a function passed from parent to handle the update
      // For now, we'll just log a success message
    } catch (error) {
      console.error('Error updating user (placeholder):', error);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-md shadow-sm bg-gray-50">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit User</h3>
      {user ? (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-name">Name:</label>
            <input
              type="text"
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-email">Email:</label>
            <input
              type="email"
              id="edit-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-role">Role:</label>
            <select
              id="edit-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">Select Role</option>
              <option value="admin">Admin</option>
              <option value="lecturer">Lecturer</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div className="flex items-center justify-end">
            <button
              type="button"
              // Add an onClick handler to call the onCancel prop (assuming it's passed)
              className="mr-2 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-opacity-50"
            >
              Update User
            </button>
          </div>
        </form>
      ) : (
        <p className="text-gray-600">Select a user to edit.</p>
      )}
    </div>
  );
};

export default EditUserForm;