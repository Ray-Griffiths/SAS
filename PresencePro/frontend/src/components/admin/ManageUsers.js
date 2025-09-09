import React, { useState, useEffect } from 'react';
import { getUsers, deleteUser } from '../../services/api';
import AddUserForm from './AddUserForm';
import EditUserForm from './EditUserForm';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // State to trigger re-fetch

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const data = await getUsers();
        const usersList = data.users || data;
        setUsers(Array.isArray(usersList) ? usersList : []);
      } catch (err) {
        setError(err.message || 'Failed to fetch users.');
        setUsers([]);
      }
      setIsLoading(false);
    };

    fetchUsers();
  }, [refreshKey]); // Re-run effect when refreshKey changes

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(userId);
        setRefreshKey(oldKey => oldKey + 1); // Trigger re-fetch
      } catch (err) {
        setError(err.message || 'Failed to delete user.');
      }
    }
  };

  const handleUserAdded = () => {
    setShowAddForm(false);
    setRefreshKey(oldKey => oldKey + 1); // Trigger re-fetch
  };

  const handleUserUpdated = () => {
    setEditingUser(null);
    setRefreshKey(oldKey => oldKey + 1); // Trigger re-fetch
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Users</h1>
        {!showAddForm && !editingUser && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            Add User
          </button>
        )}
      </div>

      {showAddForm && (
        <AddUserForm
          onSuccess={handleUserAdded}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingUser && (
        <EditUserForm
          user={editingUser}
          onSuccess={handleUserUpdated}
          onCancel={() => setEditingUser(null)}
        />
      )}

      {error && <p className="text-red-500">Error: {error}</p>}

      {isLoading ? (
        <p>Loading users...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg mt-4">
          <ul className="divide-y divide-gray-200">
            {users.length > 0 ? (
              users.map((user) => (
                <li key={user.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">{user.username}</h2>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-sm text-gray-500">Role: {user.role}</p>
                  </div>
                  <div>
                    <button
                      onClick={() => setEditingUser(user)}
                      className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))
            ) : (
              <p className="p-4 text-gray-500">No users found.</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
