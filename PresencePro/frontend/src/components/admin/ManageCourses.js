import React, { useEffect, useState } from 'react';
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getUsers,
} from '../../services/api';

const ManageCourses = () => {
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [form, setForm] = useState({ id: null, name: '', description: '', lecturer_id: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch courses
  const fetchCourses = async () => {
    try {
      const data = await getCourses();
      setCourses(data.courses || []);
    } catch (error) {
      setError(error.message);
    }
  };

  // Fetch lecturers (and admins)
  const fetchLecturers = async () => {
    try {
      const data = await getUsers();
      const lecturerUsers = data.users.filter(
        (user) => user.role === 'lecturer' || Boolean(user.is_admin)
      );
      setLecturers(lecturerUsers);
    } catch (error) {
      setError(error.message);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchLecturers();
  }, []);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (form.id) {
        await updateCourse(form.id, form);
      } else {
        await createCourse(form);
      }
      resetForm();
      fetchCourses();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit course
  const handleEdit = (course) => {
    setForm({
      id: course.id,
      name: course.name,
      description: course.description,
      lecturer_id: course.lecturer_id,
    });
  };

  // Delete course
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await deleteCourse(id);
        fetchCourses();
      } catch (error) {
        setError(error.message);
      }
    }
  };

  // Reset form
  const resetForm = () => {
    setForm({ id: null, name: '', description: '', lecturer_id: '' });
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Manage Courses</h2>
      {error && <div className="mb-4 text-red-600">{error}</div>}

      {/* Course Form */}
      <form onSubmit={handleSubmit} className="mb-6 space-y-4 bg-white p-4 rounded shadow">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Course Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="lecturer_id" className="block text-sm font-medium text-gray-700">
            Lecturer
          </label>
          <select
            id="lecturer_id"
            name="lecturer_id"
            value={form.lecturer_id}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          >
            <option value="">Select Lecturer</option>
            {lecturers.map((lecturer) => (
              <option key={lecturer.id} value={lecturer.id}>
                {lecturer.name} {lecturer.is_admin ? '(Admin)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Course Table */}
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Course Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Lecturer
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {courses.map((course) => (
              <tr key={course.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{course.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500 break-words max-w-xs">
                  {course.description || 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{course.lecturer_name || 'N/A'}</td>
                <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(course)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                  No courses found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageCourses;
