import React, { useState, useEffect } from 'react';
// Assume you have an api.js file for making API calls
import { getCourses, addCourse, removeCourse, createCourse, deleteCourse } from '../../services/api';
const ManageCoursesLecturer = () => {
  const [courses, setCourses] = useState([]);
  const [newCourse, setNewCourse] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getCourses();
        // Safer: handle missing properties gracefully
        setCourses(response?.data?.courses || []);
      } catch (err) {
        setError(`Failed to fetch courses: ${err.message}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCourse({ ...newCourse, [name]: value });
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!newCourse.name.trim()) {
      setFormError('Course name is required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const addedCourse = await createCourse(newCourse);
      setCourses([...courses, addedCourse]);
      setNewCourse({ name: '', description: '' });
      setSuccessMessage('Course added successfully!');
    } catch (err) {
      setError(`Failed to add course: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCourse = async (courseId) => {
    const isConfirmed = window.confirm('Are you sure you want to remove this course? This action cannot be undone.');
    if (!isConfirmed) return;

    setLoading(true);
    setError(null);
    try {
      setSuccessMessage(null);
      await deleteCourse(courseId);
      setCourses(courses.filter(course => course.id !== courseId));
    } catch (err) {
      setError(`Failed to remove course: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Manage Courses</h2>
      {loading && <p>Loading courses...</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <table>
        <thead>
          <tr>
            <th>Course Name</th>
            <th>Description</th>
            <th>Enrolled Students</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course.id}>
              <td>{course.name}</td>
              <td>{course.description || 'No description provided'}</td>
              <td>{course.enrolledStudents ? course.enrolledStudents.length : 0}</td>
              <td>
                <button onClick={() => handleRemoveCourse(course.id)} disabled={loading}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <h3>Add New Course</h3>
        <form onSubmit={handleAddCourse}>
          {formError && <p style={{ color: 'red' }}>{formError}</p>}
          <div>
            <label htmlFor="name">Course Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newCourse.name}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
          </div>
          <div style={{ marginTop: '10px' }}>
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              name="description"
              value={newCourse.description}
              onChange={handleInputChange}
            ></textarea>
          </div>
          <div style={{ marginTop: '10px' }}>
            <button type="submit" disabled={loading}>
              Add Course
              {loading && '...'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageCoursesLecturer;
