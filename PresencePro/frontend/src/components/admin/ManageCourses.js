
import React, { useState, useEffect } from 'react';
import { api, getLecturers } from '../../services/api'; // Combined imports
import { 
    PencilIcon, TrashIcon, PlusCircleIcon, MagnifyingGlassIcon, 
    ExclamationTriangleIcon, XCircleIcon
} from '@heroicons/react/24/solid';

// Reusable Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-2xl mx-4 relative transform transition-all duration-300 ease-in-out">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{title}</h2>
                <button onClick={onClose} className="absolute top-5 right-5 text-gray-500 hover:text-gray-800 transition-colors">
                    <XCircleIcon className="h-8 w-8" />
                </button>
                {children}
            </div>
        </div>
    );
};

// Course Form for adding/editing within the modal
const CourseForm = ({ course, onSuccess, onCancel, lecturers }) => {
    const [name, setName] = useState(course ? course.name : '');
    const [description, setDescription] = useState(course ? course.description : '');
    const [lecturerId, setLecturerId] = useState(course ? course.lecturer_id : '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const courseData = { name, description, lecturer_id: lecturerId ? parseInt(lecturerId, 10) : null };
            if (course) {
                await api.put(`/api/courses/${course.id}`, courseData);
            } else {
                await api.post('/api/courses', courseData);
            }
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || 'An unexpected error occurred.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg">{error}</div>}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows="4" className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Lecturer</label>
                <select value={lecturerId || ''} onChange={e => setLecturerId(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="">Not Assigned</option>
                    {lecturers.map(l => <option key={l.id} value={l.id}>{l.username}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-semibold disabled:bg-indigo-400">
                    {submitting ? 'Saving...' : (course ? 'Update Course' : 'Create Course')}
                </button>
            </div>
        </form>
    );
};

const ManageCourses = () => {
    const [courses, setCourses] = useState([]);
    const [lecturers, setLecturers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    // State for modals
    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);

    // State for filtering and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [lecturerFilter, setLecturerFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Fetch lecturers once
    useEffect(() => {
        const fetchLecturers = async () => {
            try {
                const data = await getLecturers();
                setLecturers(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to fetch lecturers", err);
            }
        };
        fetchLecturers();
    }, []);

    // Fetch courses based on filters and pagination
    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true);
            try {
                // Backend needs to be updated to handle these query params
                const response = await api.get(`/api/courses?page=${currentPage}&search=${searchTerm}&lecturer_id=${lecturerFilter}`);
                setCourses(response.data.courses || []);
                setTotalPages(response.data.pages || 1);
                setError('');
            } catch (err) {
                setError('Failed to fetch courses. Please try again.');
                setCourses([]);
            }
            setLoading(false);
        };
        fetchCourses();
    }, [refreshKey, currentPage, searchTerm, lecturerFilter]);

    const handleSuccess = () => {
        setFormModalOpen(false);
        setSelectedCourse(null);
        setRefreshKey(k => k + 1); // Trigger a re-fetch
    };

    const handleDelete = async () => {
        if (!selectedCourse) return;
        try {
            await api.delete(`/api/courses/${selectedCourse.id}`);
            setDeleteModalOpen(false);
            setSelectedCourse(null);
            setRefreshKey(k => k + 1);
        } catch (err) {
            setError('Failed to delete course.');
        }
    };
    
    const lecturerMap = new Map(lecturers.map(l => [l.id, l.username]));

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Course Management</h1>

            {/* Control Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="relative md:col-span-2">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2"/>
                    <input type="text" placeholder="Search by course name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                <div>
                    <select value={lecturerFilter} onChange={e => setLecturerFilter(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Lecturers</option>
                        {lecturers.map(l => <option key={l.id} value={l.id}>{l.username}</option>)}
                    </select>
                </div>
                <div className="md:text-right">
                    <button onClick={() => { setSelectedCourse(null); setFormModalOpen(true); }} className="w-full md:w-auto inline-flex items-center justify-center px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
                        <PlusCircleIcon className="h-6 w-6 mr-2"/>
                        Add Course
                    </button>
                </div>
            </div>

            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

            {/* Courses Table */}
            <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Course Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Lecturer</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Students</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Sessions</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="5" className="text-center py-10">Loading courses...</td></tr>
                        ) : courses.length > 0 ? (
                            courses.map(course => (
                                <tr key={course.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">
                                        <button onClick={() => { setSelectedCourse(course); setFormModalOpen(true); }} className="text-left hover:text-indigo-600">{course.name}</button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lecturerMap.get(course.lecturer_id) || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">{course.total_students || 0}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">{course.total_sessions || 0}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => { setSelectedCourse(course); setFormModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900 p-1"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => { setSelectedCourse(course); setDeleteModalOpen(true); }} className="text-red-600 hover:text-red-900 p-1"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="5" className="text-center py-10 text-gray-500">No courses found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50">Previous</button>
                <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50">Next</button>
            </div>

            {/* Modals */}
            <Modal isOpen={isFormModalOpen} onClose={() => setFormModalOpen(false)} title={selectedCourse ? 'Edit Course' : 'Add New Course'}>
                <CourseForm course={selectedCourse} onSuccess={handleSuccess} onCancel={() => setFormModalOpen(false)} lecturers={lecturers} />
            </Modal>
            <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Deletion">
                <div className="text-center">
                    <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-5"/>
                    <p className="text-lg text-gray-700">Are you sure you want to delete the course <span className="font-bold">{selectedCourse?.name}</span>? All associated sessions and attendance records will also be permanently removed. This action cannot be undone.</p>
                    <div className="mt-8 flex justify-center space-x-4">
                        <button onClick={() => setDeleteModalOpen(false)} className="px-8 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">Cancel</button>
                        <button onClick={handleDelete} className="px-8 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ManageCourses;
