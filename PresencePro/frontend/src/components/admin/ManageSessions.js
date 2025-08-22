import React, { useEffect, useState } from 'react';
import { getSessionsForCourse, createSession, deleteSession } from '../../services/api';

const ManageSessions = () => {
  const courseId = 'YOUR_COURSE_ID'; // Replace with the actual course ID
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newSession, setNewSession] = useState({
    course: '', lecturer: '', date: '', time: ''
  });
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Placeholder API call to fetch sessions
      // Use the directly imported getSessions function
      const data = await getSessionsForCourse(courseId); // Corrected function call and added courseId
      setSessions(data);
    } catch (error) {
      setError('Failed to fetch sessions.');
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSession({ ...newSession, [name]: value });
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      // Placeholder API call to create a session
      // Use the directly imported createSession function
      await createSession(newSession); // Corrected function call
      console.log('Session created successfully (placeholder)');
      fetchSessions(); // Refetch sessions after creating a new one
      setNewSession({ course: '', lecturer: '', date: '', time: '' }); // Clear form
    } catch (error) {
      console.error('Error creating session:', error);
      // Handle error (e.e., show error message)
    }
  };

  const handleEditSession = (session) => {
    console.log('Edit session clicked:', session);
    // Implement logic to show edit form and pre-fill with session data
    // setEditingSession(session); // Example state for editing
  };

  const handleDeleteSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        // Placeholder API call to delete a session
        // Use the directly imported deleteSession function
        await deleteSession(sessionId); // Corrected function call
        console.log('Session deleted successfully (placeholder)');
        fetchSessions(); // Refetch sessions after deleting a session
      } catch (error) {
        console.error('Error deleting session:', error);
        // Handle error
      }
    }
  };

  const handleExportUsers = () => {
    // TODO: Implement actual export logic, likely requiring a backend endpoint.
    console.log('Export Users functionality not implemented yet.');
  };

  const handleImportUsers = () => {
    // TODO: Implement actual import logic, likely involving file upload to a backend endpoint.
    console.log('Import Users functionality not implemented yet.');
  };

  const handlePrintUsers = () => {
    // TODO: Implement actual print logic. This might involve generating a printable view or PDF.
    console.log('Print Users functionality not implemented yet.');
    // Example: Trigger browser print
    // window.print();
  };

  const handleExportSessions = () => {
    console.log('Export Sessions functionality not implemented yet.');
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Manage Sessions</h2>
      <p>This is where you can create, view, edit, and delete sessions.</p>
      <div className="mt-4 p-4 border rounded">
        <h3 className="text-xl font-semibold mb-4">Create New Session</h3>
        <form onSubmit={handleCreateSession} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="course" className="block text-sm font-medium text-gray-700">Course</label>
            <input
              type="text"
              id="course"
              name="course"
              value={newSession.course}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g., 60"
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location (GPS Coordinates - Placeholder)</label>
            <input
              type="text" // Consider using a date picker later
              id="date"
              name="date"
              value={newSession.date}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g., 40.7128,-74.0060"
            />
          </div>
           <div>
            <label htmlFor="lecturer" className="block text-sm font-medium text-gray-700">Lecturer</label>
            <input
              type="text"
              id="lecturer"
              name="lecturer"
              value={newSession.lecturer}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g., Dr. Smith"
            />
          </div>
           <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700">Time</label>
            <input // Change type to time later if needed
              type="text" // Consider using a time picker later
              id="time"
              name="time"
              value={newSession.time}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g., 10:00 AM"
            />
          </div>
          <div className="col-span-full">


          <button
            type="submit"
            className="w-full inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Create Session
          </button>
            </div>
        </form>
      </div>
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Existing Sessions</h3>
        <div className="flex space-x-4 mb-4">
          {/* Placeholder buttons for file operations - require backend implementation */}
          <button onClick={handleExportSessions} className="px-4 py-2 bg-gray-200 rounded">Export Sessions</button>
          <button onClick={handleImportUsers} className="px-4 py-2 bg-gray-200 rounded">Import Users</button>
          <button onClick={handlePrintUsers} className="px-4 py-2 bg-gray-200 rounded">Print Report</button>
        </div>
        {loading && <p>Loading sessions...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && sessions.length === 0 && <p>No sessions found.</p>}
        {!loading && !error && sessions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lecturer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{session.course}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.lecturer}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleEditSession(session)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                      <button onClick={() => handleDeleteSession(session.id)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && sessions.length === 0 && <p>No sessions found.</p>}
      </div>
    </div>
  );
};

export default ManageSessions;
