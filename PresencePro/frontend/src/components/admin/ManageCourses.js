import React, { useState, useEffect } from 'react';
import { getCourses, createCourse, updateCourse, deleteCourse, getLecturers } from '../../services/api';

// Form component for adding or editing a course
const CourseForm = ({ course, onSuccess, onCancel, lecturers }) => {
  const [name, setName] = useState(course ? course.name : '');
  const [description, setDescription] = useState(course ? course.description : '');
  const [lecturerId, setLecturerId] = useState(course ? course.lecturer_id : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const courseData = { 
        name, 
        description, 
        lecturer_id: lecturerId ? parseInt(lecturerId, 10) : null 
      };

      if (course) {
        await updateCourse(course.id, courseData);
        onSuccess(); // On update, trigger a refresh
      } else {
        const response = await createCourse(courseData);
        onSuccess(response.course); // On create, pass the new course data back
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save course.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-bold mb-4">{course ? 'Edit Course' : 'Add New Course'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Course Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            rows="3"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="lecturer" className="block text-sm font-medium text-gray-700">Assign Lecturer</label>
          <select
            id="lecturer"
            value={lecturerId || ''}
            onChange={(e) => setLecturerId(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select a Lecturer (optional)</option>
            {lecturers.map(lecturer => (
              <option key={lecturer.id} value={lecturer.id}>{lecturer.username}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300">
            {isSubmitting ? 'Saving...' : 'Save Course'}
          </button>
        </div>
      </form>
    </div>
  );
};

const ManageCourses = () => {
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch courses and lecturers
  useEffect(() => {
    const fetchCoursesAndLecturers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const coursesPromise = getCourses();
        const lecturersPromise = getLecturers(); // Use the new dedicated API function
        
        const [coursesData, lecturersData] = await Promise.all([coursesPromise, lecturersPromise]);

        setCourses(Array.isArray(coursesData.courses) ? coursesData.courses : []);
        setLecturers(Array.isArray(lecturersData) ? lecturersData : []); // The data is the array itself

      } catch (err) {
        setError(err.message || 'Failed to fetch data.');
        setCourses([]);
        setLecturers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoursesAndLecturers();
  }, [refreshKey]);
  
  const handleDelete = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        await deleteCourse(courseId);
        setCourses(courses.filter(c => c.id !== courseId)); // Optimistic UI update
      } catch (err) {
        setError(err.message || 'Failed to delete course.');
      }
    }
  };

  const handleSuccess = (newCourse) => {
    setShowAddForm(false);
    setEditingCourse(null);
    if (newCourse) {
      // If a new course was created, add it to the state
      setCourses(prevCourses => [newCourse, ...prevCourses]);
    } else {
      // If a course was updated, re-fetch the entire list to ensure data consistency
      setRefreshKey(oldKey => oldKey + 1);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Courses</h1>
        {!showAddForm && !editingCourse && (
            <button 
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Add Course
            </button>
        )}
      </div>
      
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}

      {(showAddForm || editingCourse) && (
        <CourseForm 
            course={editingCourse}
            onSuccess={handleSuccess}
            onCancel={() => { setShowAddForm(false); setEditingCourse(null); }}
            lecturers={lecturers}
        />
      )}

      {isLoading ? (
        <p>Loading courses...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg mt-4">
          <ul className="divide-y divide-gray-200">
            {courses.length > 0 ? (
              courses.map((course) => (
                <li key={course.id} className="p-4 hover:bg-gray-50 flex justify-between items-center flex-wrap">
                  <div className="flex-1 min-w-0 pr-4">
                    <h2 className="text-lg font-semibold text-gray-800 truncate">{course.name}</h2>
                    <p className="text-sm text-gray-600">{course.description || 'No description'}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Lecturer: {lecturers.find(l => l.id === course.lecturer_id)?.username || 'Not Assigned'}
                    </p>
                  </div>
                  <div className="flex-shrink-0 mt-4 sm:mt-0">
                    <button 
                        onClick={() => setEditingCourse(course)}
                        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 mr-2"
                    >
                        Edit
                    </button>
                    <button 
                        onClick={() => handleDelete(course.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                        Delete
                    </button>
                  </div>
                </li>
              ))
            ) : (
              <p className="p-4 text-gray-500">No courses found. Click "Add Course" to create one.</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ManageCourses;
