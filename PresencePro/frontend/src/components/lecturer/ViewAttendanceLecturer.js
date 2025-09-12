import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { FaUsers, FaChartPie, FaSpinner, FaExclamationCircle, FaBook } from 'react-icons/fa';

const ViewAttendanceLecturer = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLecturerCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        // We use the existing endpoint that also provides the student count
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

    fetchLecturerCourses();
  }, []);

  const handleViewSummary = (courseId) => {
    navigate(`/lecturer/courses/${courseId}/attendance`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <FaSpinner className="animate-spin text-4xl text-blue-500" />
        <p className="ml-4 text-lg text-gray-600">Loading Courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-lg shadow-md max-w-2xl mx-auto">
        <FaExclamationCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-4 text-xl font-semibold text-red-800">An Error Occurred</h3>
        <p className="mt-2 text-md text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Select a Course</h2>
          <p className="text-gray-600 mt-1">Choose a course to view its detailed attendance summary.</p>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg bg-white">
            <FaBook className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No Courses Found</h3>
            <p className="mt-2 text-sm text-gray-500">
              You are not assigned to any courses yet. Please create a course first.
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
                      <FaUsers className="mr-3 text-indigo-500" />
                      <span><span className="font-bold">{course.enrolled_students_count}</span> Enrolled Students</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-b-xl">
                  <button 
                      onClick={() => handleViewSummary(course.id)} 
                      className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-sm"
                  >
                      <FaChartPie className="mr-2"/>
                      View Summary
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

export default ViewAttendanceLecturer;
