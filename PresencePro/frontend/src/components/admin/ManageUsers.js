
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { 
    PencilIcon, TrashIcon, UserPlusIcon, MagnifyingGlassIcon, 
    ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon 
} from '@heroicons/react/24/solid';

// A reusable, accessible modal component
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 relative">
                <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
                    <XCircleIcon className="h-6 w-6" />
                </button>
                {children}
            </div>
        </div>
    );
};

// Badge for styling user roles
const RoleBadge = ({ role }) => {
  const roleStyles = {
    admin: 'bg-indigo-100 text-indigo-800 ring-1 ring-inset ring-indigo-200',
    lecturer: 'bg-teal-100 text-teal-800 ring-1 ring-inset ring-teal-200',
    student: 'bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-200',
  };
  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleStyles[role.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
};

// --- Forms will be used inside the modal --- 
// Note: For this example, we assume AddUserForm and EditUserForm are adapted to work within a modal.
// They would call onSuccess or onCancel, which are passed as props, to close the modal.
const AddUserForm = ({ onSuccess, onCancel }) => {
    // A simplified form for demonstration. In a real app, this would have state and validation.
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSuccess(); }}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Username</label>
                    <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input type="password" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                        <option>student</option>
                        <option>lecturer</option>
                        <option>admin</option>
                    </select>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Create User</button>
            </div>
        </form>
    );
};

const EditUserForm = ({ user, onSuccess, onCancel }) => {
    // A simplified form. In a real app, this would have state initialized from the `user` prop.
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSuccess(); }}>
            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Username</label>
                    <input type="text" defaultValue={user.username} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" defaultValue={user.email} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select defaultValue={user.role} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                        <option>student</option>
                        <option>lecturer</option>
                        <option>admin</option>
                    </select>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>
                <button type="submit" className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700">Update User</button>
            </div>
        </form>
    );
};

const ManageUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    
    // State for modals
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // State for filtering and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                // In the next step, we will update the backend to accept these parameters
                const response = await api.get(`/api/users?page=${currentPage}&search=${searchTerm}&role=${roleFilter}`);
                setUsers(response.data.users || []);
                setTotalPages(response.data.pages || 1);
                setError('');
            } catch (err) {
                setError('Failed to fetch users. Please try again.');
                setUsers([]);
            }
            setLoading(false);
        };

        fetchUsers();
    }, [refreshKey, currentPage, searchTerm, roleFilter]);

    const handleAddSuccess = () => {
        setAddModalOpen(false);
        setRefreshKey(k => k + 1);
    };

    const handleEditSuccess = () => {
        setEditModalOpen(false);
        setSelectedUser(null);
        setRefreshKey(k => k + 1);
    };

    const handleDelete = async () => {
        if (!selectedUser) return;
        try {
            await api.delete(`/api/users/${selectedUser.id}`);
            setDeleteModalOpen(false);
            setSelectedUser(null);
            setRefreshKey(k => k + 1);
        } catch (err) {
            setError('Failed to delete user.');
        }
    };

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">User Management</h1>

            {/* --- Control Bar --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative md:col-span-1">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2"/>
                    <input 
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div className="md:col-span-1">
                    <select 
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="lecturer">Lecturer</option>
                        <option value="student">Student</option>
                    </select>
                </div>
                <div className="md:col-span-1 md:text-right">
                    <button 
                        onClick={() => setAddModalOpen(true)}
                        className="w-full md:w-auto inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
                    >
                        <UserPlusIcon className="h-5 w-5 mr-2"/>
                        Add User
                    </button>
                </div>
            </div>

            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

            {/* --- Users Table --- */}
            <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="4" className="text-center py-8">Loading users...</td></tr>
                        ) : users.length > 0 ? (
                            users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm"><RoleBadge role={user.role} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => { setSelectedUser(user); setEditModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900 p-1"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => { setSelectedUser(user); setDeleteModalOpen(true); }} className="text-red-600 hover:text-red-900 p-1"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" className="text-center py-8 text-gray-500">No users found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

             {/* --- Pagination --- */}
            <div className="flex justify-between items-center mt-4">
                <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >Previous</button>
                <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
                <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >Next</button>
            </div>

            {/* --- Modals --- */}
            <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="Add New User">
                <AddUserForm onSuccess={handleAddSuccess} onCancel={() => setAddModalOpen(false)} />
            </Modal>
            <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Edit User">
                {selectedUser && <EditUserForm user={selectedUser} onSuccess={handleEditSuccess} onCancel={() => setEditModalOpen(false)} />}
            </Modal>
             <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Deletion">
                <div className="text-center">
                    <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4"/>
                    <p className="text-gray-700">Are you sure you want to delete the user <span className="font-bold">{selectedUser?.username}</span>? This action cannot be undone.</p>
                    <div className="mt-6 flex justify-center space-x-4">
                        <button onClick={() => setDeleteModalOpen(false)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button onClick={handleDelete} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ManageUsers;
