import React, { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../../services/api';
// We'll add AddUserForm and EditUserForm later as separate components or modals

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all users from the backend
      const data = await getUsers(); // Corrected function call
      setUsers(data);
    } catch (err) {
      setError('Failed to fetch users.');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddClick = () => {
    setShowAddForm(true);
    setEditingUser(null); // Hide edit form if visible
  };

  const handleEditClick = (user) => {
    setEditingUser(user); // This will trigger the Edit form/modal
  };

  const handleDeleteClick = async (userId) => {
 if (window.confirm('Are you sure you want to delete this user?')) {
 try {
 // Use the directly imported deleteUser function
 const response = await deleteUser(userId);
 console.log(response.message); // Log success message
 fetchUsers(); // Refresh the user list after deletion
 } catch (error) {
 console.error(`Error deleting user ${userId}:`, error);
 setError(`Failed to delete user: ${error.message}`);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowAddForm(false);
    setEditingUser(null);
    fetchUsers(); // Refresh the user list after adding/editing
  };

  const handleFormCancel = () => {
    setShowAddForm(false);
    setEditingUser(null);
  };

  // Placeholder functions for Add/Edit User forms (to be implemented fully later)
  const handleAddUserSubmit = async (userData) => {
    setLoading(true); // Indicate submission is in progress
    setError(null); // Clear previous errors
    try {
      const response = await createUser(userData);
      if (response.status === 'success') {
        console.log('User added successfully:', response.user);
        handleFormSuccess(); // Close form and refresh list
      } else {
        // Handle backend validation errors or other messages
        setError(response.message || 'Failed to add user.');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      setError(`Failed to add user: ${error.message || 'An unexpected error occurred.'}`);
    } finally {
      setLoading(false); // Stop loading indicator
    }
  };

  const handleUpdateUserSubmit = async (userData) => {
    if (!editingUser) return; // Should not happen if edit form is shown

    setLoading(true); // Indicate submission is in progress
    setError(null); // Clear previous errors
    try {
      const response = await updateUser(editingUser.id, userData);
      if (response.status === 'success') {
        console.log('User updated successfully:', response.user);
        handleFormSuccess(); // Close form and refresh list
      } else {
         // Handle backend validation errors or other messages
        setError(response.message || 'Failed to update user.');
      }
    } catch (error) {
      console.error(`Error updating user ${editingUser.id}:`, error);
      setError(`Failed to update user: ${error.message || 'An unexpected error occurred.'}`);
    } finally {
      setLoading(false); // Stop loading indicator
    }
  };

  // Simple Form Component (can be replaced by a more complex modal/component later)
  const UserForm = ({ initialData, onSubmit, onCancel }) => {
      const [formData, setFormData] = useState(initialData || { username: '', password: '', name: '', email: '', role: 'student', index_number: '', staff_id: '' });

      const handleChange = (e) => {
          setFormData({ ...formData, [e.target.name]: e.target.value });
      };

      const handleSubmit = (e) => {
          e.preventDefault();
          onSubmit(formData);
      };

      return (
          <form onSubmit={handleSubmit} className="mb-4 p-4 border rounded shadow-sm bg-gray-50">
              <h3 className="text-lg font-semibold mb-4">{initialData ? 'Edit User' : 'Add New User'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Username:</label>
                      <input type="text" name="username" value={formData.username} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                  </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700">Password: {initialData && <span className="text-xs text-gray-500">(Leave blank to keep current)</span>}</label>
                      <input type="password" name="password" value={formData.password} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name:</label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                  </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700">Email:</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                  </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700">Role:</label>
                      <select name="role" value={formData.role} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
                          <option value="student">Student</option>
                          <option value="lecturer">Lecturer</option>
                          <option value="admin">Admin</option>
                      </select>
                  </div>
                   {formData.role === 'student' && (
                       <div>
                          <label className="block text-sm font-medium text-gray-700">Student Index Number:</label>
                          <input type="text" name="index_number" value={formData.index_number} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                       </div>
                   )}
                   {formData.role === 'lecturer' && (
                       <div>
                          <label className="block text-sm font-medium text-gray-700">Staff ID:</label>
                          <input type="text" name="staff_id" value={formData.staff_id} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                       </div>
                   )}
              </div>
              <div className="mt-6 flex justify-end space-x-4">
                  <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      {initialData ? 'Update User' : 'Add User'}
                  </button>
              </div>
          </form>
      );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Users</h2>

      <div className="mb-4">
        <button
          onClick={handleAddClick}
          className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-opacity-50"
        >
          Add New User
        </button>
      </div>

      {showAddForm && <UserForm onSubmit={handleAddUserSubmit} onCancel={handleFormCancel} />}
      {editingUser && <UserForm initialData={editingUser} onSubmit={handleUpdateUserSubmit} onCancel={handleFormCancel} />}

      {loading && <p>Loading users...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditClick(user)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <p>No users found.</p>
      )}
    </div>
  );
};

export default ManageUsers;
