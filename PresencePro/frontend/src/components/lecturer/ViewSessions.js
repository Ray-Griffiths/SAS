import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

// A self-contained modal for editing a session's details.
const EditSessionModal = ({ isOpen, onClose, session, onSave }) => {
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (session) {
      // Ensure the state is updated when a new session is selected for editing.
      // The backend provides date and time in a format that works well with inputs.
      setSessionDate(session.session_date);
      setStartTime(session.start_time);
      setEndTime(session.end_time);
    }
  }, [session]);

  if (!isOpen || !session) return null;

  const handleSave = () => {
    // Basic validation
    if (!sessionDate || !startTime || !endTime) {
      alert("Please fill out all fields.");
      return;
    }
    onSave(session.id, {
      session_date: sessionDate,
      start_time: startTime,
      end_time: endTime,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h3 className="text-xl font-bold mb-4">Edit Session</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Session Date</label>
          <input
            type="date"
            className="w-full p-2 border rounded-md"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
          <input
            type="time"
            className="w-full p-2 border rounded-md"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
          <input
            type="time"
            className="w-full p-2 border rounded-md"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
            Cancel
          </button>
          <button onClick={handleSave} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};


const ViewSessions = () => {
  const { courseId } = useParams(); // Correctly get courseId from URL
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State to manage the edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState(null);

  // Function to fetch all necessary data from the backend
  const fetchData = async () => {
    try {
      setLoading(true);
      const [courseRes, sessionsRes] = await Promise.all([
        api.get(`/api/courses/${courseId}`),
        api.get(`/api/courses/${courseId}/sessions`),
      ]);
      setCourse(courseRes.data);
      setSessions(sessionsRes.data.sessions || []);
    } catch (err) {
      const errorMessage = err.response?.data?.message || `An error occurred: ${err.message}`;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when the component mounts
  useEffect(() => {
    fetchData();
  }, [courseId]);

  // Handler to save updated session data
  const handleUpdateSession = async (sessionId, updatedData) => {
    try {
      await api.put(`/api/sessions/${sessionId}`, updatedData);
      setIsEditModalOpen(false); // Close modal on success
      fetchData(); // Refresh the session list
      alert("Session updated successfully!");
    } catch (err) {
      const errorMessage = err.response?.data?.message || `Failed to update session: ${err.message}`;
      alert(`Error: ${errorMessage}`);
    }
  };

  // Handler to delete a session
  const handleDeleteSession = async (sessionId) => {
    if (window.confirm("Are you sure you want to delete this session? This action cannot be undone and will remove all related attendance records.")) {
      try {
        await api.delete(`/api/sessions/${sessionId}`);
        fetchData(); // Refresh the session list
        alert("Session deleted successfully.");
      } catch (err) {
        const errorMessage = err.response?.data?.message || `Failed to delete session: ${err.message}`;
        alert(`Error: ${errorMessage}`);
      }
    }
  };

  // Handler to open the modal and set the session to be edited
  const handleOpenEditModal = (session) => {
    setSessionToEdit(session);
    setIsEditModalOpen(true);
  };

  if (loading) return <p className="text-lg text-gray-500">Loading sessions...</p>;
  if (error) return <div className="text-center p-4 bg-red-100 text-red-700 rounded-md"><strong>Error:</strong> {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <button onClick={() => navigate('/lecturer/courses')} className="text-blue-500 hover:underline mb-4">&larr; Back to My Courses</button>

      <h2 className="text-2xl font-bold text-gray-800 mb-2">Manage Sessions</h2>
      <p className="text-xl text-gray-600 mb-6">Course: <strong>{course?.name}</strong></p>

      {/* Render the Edit Session Modal */}
      <EditSessionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        session={sessionToEdit}
        onSave={handleUpdateSession}
      />

      <div className="shadow-md rounded-lg overflow-x-auto">
        {sessions.length > 0 ? (
          <table className="min-w-full bg-white">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Date</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Start Time</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">End Time</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Status</th>
                <th className="text-center py-3 px-4 uppercase font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {sessions.map((session) => (
                <tr key={session.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="text-left py-3 px-4">{session.session_date}</td>
                  <td className="text-left py-3 px-4">{session.start_time}</td>
                  <td className="text-left py-3 px-4">{session.end_time}</td>
                  <td className="text-left py-3 px-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${session.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {session.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-center py-3 px-4 space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(session)}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors duration-200"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteSession(session.id)} 
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors duration-200"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-4 text-gray-500">No sessions have been created for this course yet.</p>
        )}
      </div>
    </div>
  );
};

export default ViewSessions;
