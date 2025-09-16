import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import CourseForm from './CourseForm';
import { FaUsers, FaClipboardList, FaEdit, FaTrash, FaPlus, FaBook } from 'react-icons/fa';

const ManageCoursesLecturer = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const navigate = useNavigate();

  const fetchLecturerCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/lecturer/courses');
      setCourses(response.data || []);
    } catch (err) {
      const errorMessage = err.response?.data?.message || `Failed to fetch courses: ${err.message}`;
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLecturerCourses();
  }, []);

  const handleAddOrUpdateCourse = async (courseData) => {
    try {
      if (editingCourse) {
        await api.put(`/api/courses/${editingCourse.id}`, courseData);
      } else {
        await api.post('/api/courses', courseData);
      }
      fetchLecturerCourses();
      setIsAddingCourse(false);
      setEditingCourse(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || `Failed to save course: ${err.message}`;
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course? This will also delete all its sessions and attendance records.')) {
      try {
        await api.delete(`/api/courses/${courseId}`);
        fetchLecturerCourses();
      } catch (err) {
        const errorMessage = err.response?.data?.message || `Failed to delete course: ${err.message}`;
        alert(`Error: ${errorMessage}`);
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><p className="text-lg text-gray-500">Loading courses...</p></div>;
  }

  if (error) {
    return <div className="text-center p-4 bg-red-100 text-red-700 rounded-md"><strong>Error:</strong> {error}</div>;
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">My Courses</h2>
          {!isAddingCourse && !editingCourse && (
            <button 
              onClick={() => setIsAddingCourse(true)}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm"
            >
              <FaPlus className="mr-2" />
              Add Course
            </button>
          )}
        </div>

        {(isAddingCourse || editingCourse) && (
          <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
            <CourseForm 
              onSuccess={handleAddOrUpdateCourse} 
              onCancel={() => {
                setIsAddingCourse(false);
                setEditingCourse(null);
              }}
              course={editingCourse}
            />
          </div>
        )}

        {courses.length === 0 && !isAddingCourse && !editingCourse ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg bg-white">
            <FaBook className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No courses yet!</h3>
            <p className="mt-2 text-sm text-gray-500">
              Click the "Add Course" button to create your first course.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl shadow-lg flex flex-col justify-between transform hover:-translate-y-1 transition-all duration-300">
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 truncate">{course.name}</h3>
                  <p className="text-gray-600 text-sm h-16 overflow-hidden">{course.description || 'No description provided.'}</p>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center text-sm text-gray-500">
                      <FaUsers className="mr-2 text-indigo-500" />
                      <span>{course.enrolled_students_count} Enrolled Students</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-b-xl grid grid-cols-2 gap-2">
                  <button 
                      onClick={() => navigate(`/lecturer/courses/${course.id}/students`)} 
                      className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                      <FaUsers className="mr-2"/>
                      Students
                  </button>
                  <button 
                      onClick={() => navigate(`/lecturer/courses/${course.id}/sessions`)} 
                      className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                      <FaClipboardList className="mr-2"/>
                      Sessions
                  </button>
                  <button 
                      onClick={() => setEditingCourse(course)} 
                      className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                      <FaEdit className="mr-2"/>
                      Edit
                  </button>
                  <button 
                      onClick={() => handleDeleteCourse(course.id)} 
                      className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                      <FaTrash className="mr-2"/>
                      Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageCoursesLecturer;
