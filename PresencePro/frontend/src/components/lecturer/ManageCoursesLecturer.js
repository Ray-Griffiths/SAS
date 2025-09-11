import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import CourseForm from './CourseForm'; // Assuming CourseForm is correctly set up for lecturers

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
      // This endpoint is designed to fetch only the courses for the logged-in lecturer
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

  const handleManageStudents = (courseId) => {
    navigate(`/lecturer/courses/${courseId}/students`);
  };

  // --- THIS FUNCTION IS NOW FIXED ---
  const handleViewSessions = (courseId) => {
    // This now navigates to the specific sessions page for the course
    navigate(`/lecturer/courses/${courseId}/sessions`);
  };

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
    return <div className="flex justify-center items-center h-full"><p className="text-lg text-gray-500">Loading courses...</p></div>;
  }

  if (error) {
    return <div className="text-center p-4 bg-red-100 text-red-700 rounded-md"><strong>Error:</strong> {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Courses</h2>
        {!isAddingCourse && !editingCourse && (
          <button 
            onClick={() => setIsAddingCourse(true)}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
          >
            Add Course
          </button>
        )}
      </div>

      {(isAddingCourse || editingCourse) && (
        <CourseForm 
          onSuccess={handleAddOrUpdateCourse} 
          onCancel={() => {
            setIsAddingCourse(false);
            setEditingCourse(null);
          }}
          course={editingCourse}
          // Lecturers should only be able to assign themselves, so we don't pass the lecturers prop
        />
      )}

      {courses.length === 0 && !isAddingCourse && !editingCourse ? (
        <div className="text-center p-8 border rounded-lg bg-gray-50 mt-6">
          <p className="text-gray-600">You are not assigned to any courses. Click "Add Course" to create one.</p>
        </div>
      ) : (
        <div className="shadow-md rounded-lg overflow-x-auto mt-6">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Course Name</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Description</th>
                <th className="text-center py-3 px-4 uppercase font-semibold text-sm">Enrolled Students</th>
                <th className="text-center py-3 px-4 uppercase font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {courses.map((course) => (
                <tr key={course.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="text-left py-3 px-4">{course.name}</td>
                  <td className="text-left py-3 px-4">{course.description || '-'}</td>
                  <td className="text-center py-3 px-4">{course.enrolled_students_count}</td>
                  <td className="text-center py-3 px-4 space-x-2">
                    <button 
                        onClick={() => handleManageStudents(course.id)} 
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors duration-200"
                    >
                        Manage Students
                    </button>
                    <button 
                        onClick={() => handleViewSessions(course.id)} 
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors duration-200"
                    >
                        View Sessions
                    </button>
                    <button 
                        onClick={() => setEditingCourse(course)} 
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors duration-200"
                    >
                        Edit
                    </button>
                    <button 
                        onClick={() => handleDeleteCourse(course.id)} 
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors duration-200"
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
    </div>
  );
};

export default ManageCoursesLecturer;
