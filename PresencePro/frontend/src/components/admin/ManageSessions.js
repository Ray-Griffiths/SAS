import React, { useState, useEffect, useCallback } from 'react';
import { getCourses, getSessionsForCourse, createSession, deleteSession } from '../../services/api';

// Reusable Form component for adding a session (now inside ManageSessions.js)
const SessionForm = ({ selectedCourse, onSuccess, onCancel }) => {
  const [newSessionData, setNewSessionData] = useState({
    session_date: '',
    start_time: '',
    end_time: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSessionData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!newSessionData.session_date || !newSessionData.start_time || !newSessionData.end_time) {
      setError('All fields are required.');
      setIsSubmitting(false);
      return;
    }

    try {
      const sessionPayload = {
        ...newSessionData,
        course_id: parseInt(selectedCourse, 10),
      };
      await createSession(sessionPayload);
      onSuccess(); // Tell the parent to refetch sessions
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h3 className="text-xl font-bold mb-4">Add New Session</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="session_date" className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              id="session_date"
              name="session_date"
              value={newSessionData.session_date}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">Start Time</label>
            <input
              type="time"
              id="start_time"
              name="start_time"
              value={newSessionData.start_time}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">End Time</label>
            <input
              type="time"
              id="end_time"
              name="end_time"
              value={newSessionData.end_time}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              required
            />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300">
            {isSubmitting ? 'Adding...' : 'Add Session'}
          </button>
        </div>
      </form>
    </div>
  );
};

const ManageSessions = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch all courses for the dropdown
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await getCourses(); // Admin gets all courses
        setCourses(Array.isArray(response.courses) ? response.courses : []);
      } catch (err) {
        setError(err.message || 'Failed to fetch courses.');
        setCourses([]);
      }
    };
    fetchCourses();
  }, []);

  // Fetch sessions when a course is selected
  const fetchSessions = useCallback(async () => {
    if (!selectedCourse) {
      setSessions([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await getSessionsForCourse(selectedCourse);
      setSessions(Array.isArray(response.sessions) ? response.sessions : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch sessions.');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCourse]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await deleteSession(sessionId);
        // Refetch sessions to show the change
        fetchSessions();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete session.');
      }
    }
  };

  const handleSuccess = () => {
    fetchSessions(); 
    setShowAddForm(false);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Manage Sessions</h1>

      <div className="mb-4">
        <label htmlFor="course-select" className="block text-sm font-medium text-gray-700">Select a Course to Manage Sessions</label>
        <select
          id="course-select"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="">-- Select a Course --</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-500 mb-4">Error: {error}</p>}
      
      {selectedCourse && (
        <>
          <div className="flex justify-end mb-4">
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Add New Session
              </button>
            )}
          </div>

          {showAddForm && (
            <SessionForm
              selectedCourse={selectedCourse}
              onSuccess={handleSuccess}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {isLoading ? (
            <p>Loading sessions...</p>
          ) : (
            <div className="bg-white shadow-md rounded-lg mt-4">
              <ul className="divide-y divide-gray-200">
                {sessions.length > 0 ? (
                  sessions.map((session) => (
                    <li key={session.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                      <div>
                        <p className="text-lg font-semibold">{new Date(session.session_date).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600">
                          Time: {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(session.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </li>
                  ))
                ) : (
                  <p className="p-4 text-gray-500">No sessions found. Click "Add New Session" to create one.</p>
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ManageSessions;
