import React, { useState, useEffect, useCallback } from 'react';
import { api, deleteUser } from '../../services/api';
import AddUserForm from './AddUserForm';
import EditUserForm from './EditUserForm';
import { ExclamationTriangleIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/solid';
import { useDebounce } from '../../hooks/useDebounce';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl max-w-lg w-full m-4">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};

const ManageUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const fetchUsers = useCallback(async (page, search, role) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page, per_page: 10 });
            if (search) params.append('search', search);
            if (role) params.append('role', role);
            
            const response = await api.get(`/api/users?${params.toString()}`);
            
            setUsers(response.data.users || []);
            setTotalUsers(response.data.total || 0);
            setTotalPages(response.data.pages || 1);
            setCurrentPage(response.data.current_page || 1);

        } catch (err) {
            setError('Failed to fetch users. Please try again later.');
            setUsers([]);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers(currentPage, debouncedSearchTerm, roleFilter);
    }, [currentPage, debouncedSearchTerm, roleFilter, fetchUsers]);


    const handleAddSuccess = () => {
        setAddModalOpen(false);
        setSearchTerm(''); 
        setRoleFilter('');
        if (currentPage !== 1) {
            setCurrentPage(1); 
        } else {
            fetchUsers(1, '', '');
        }
    };

    const handleEditSuccess = () => {
        setEditModalOpen(false);
        setSelectedUser(null);
        fetchUsers(currentPage, debouncedSearchTerm, roleFilter); // Refresh current page
    };

    const handleDelete = async () => {
        if (!selectedUser) return;
        try {
            await deleteUser(selectedUser.id);
            setDeleteModalOpen(false);
            setSelectedUser(null);
            if (users.length === 1 && currentPage > 1) {
                setCurrentPage(p => p - 1);
            } else {
                fetchUsers(currentPage, debouncedSearchTerm, roleFilter);
            }
        } catch (err) {
            setError('Failed to delete user.');
            console.error(err);
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setEditModalOpen(true);
    };

    const openDeleteModal = (user) => {
        setSelectedUser(user);
        setDeleteModalOpen(true);
    };

    return (
        <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Manage Users</h1>
                <button 
                    onClick={() => setAddModalOpen(true)} 
                    className="px-5 py-2.5 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105"
                >
                    Add New User
                </button>
            </div>

            <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search by username, email, or student ID..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="w-full md:w-auto px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All Roles</option>
                    <option value="student">Student</option>
                    <option value="lecturer">Lecturer</option>
                    <option value="admin">Admin</option>
                </select>
            </div>
            
            {loading ? (
                <div className="flex justify-center items-center h-64"><div className="loader"></div></div>
            ) : error ? (
                <div className="text-center text-red-500 bg-red-100 p-4 rounded-md">Error: {error}</div>
            ) : (
                <>
                    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Username</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Student ID</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.length > 0 ? users.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800' : user.role === 'lecturer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.student_id || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button onClick={() => openEditModal(user)} className="text-indigo-600 hover:text-indigo-900 p-1"><PencilIcon className="h-5 w-5"/></button>
                                                <button onClick={() => openDeleteModal(user)} className="text-red-600 hover:text-red-900 p-1"><TrashIcon className="h-5 w-5"/></button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="text-center py-10 text-gray-500">
                                                No users found. Try adjusting your search or filter.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                             <span className="text-sm text-gray-600">Showing {users.length > 0 ? ((currentPage - 1) * 10) + 1 : 0} - {((currentPage - 1) * 10) + users.length} of {totalUsers} Users</span>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1 || loading} className="px-3 py-1 text-sm rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                                <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages || loading} className="px-3 py-1 text-sm rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="Add New User">
                <AddUserForm onSuccess={handleAddSuccess} onCancel={() => setAddModalOpen(false)} />
            </Modal>
            <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Edit User">
                {selectedUser && <EditUserForm user={selectedUser} onSuccess={handleEditSuccess} onCancel={() => setEditModalOpen(false)} />}
            </Modal>
            <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Deletion">
                <div className="text-center p-4">
                    <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4"/>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Are you sure?</h3>
                    <p className="text-sm text-gray-500 mb-6">You are about to delete the user <span className="font-bold">{selectedUser?.username}</span>. This action cannot be undone.</p>
                    <div className="flex justify-center space-x-4">
                        <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ManageUsers;
