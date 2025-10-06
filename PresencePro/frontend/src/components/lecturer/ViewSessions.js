import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import CreateSessionModal from './CreateSession'; 
import { format, parseISO } from 'date-fns';

const ViewSessions = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [courseRes, sessionsRes] = await Promise.all([
        api.get(`/api/courses/${courseId}`),
        api.get(`/api/courses/${courseId}/sessions`),
      ]);
      setCourse(courseRes.data);
      const sortedSessions = (sessionsRes.data.sessions || []).sort((a, b) => new Date(b.session_date) - new Date(a.session_date));
      setSessions(sortedSessions);
    } catch (err) {
      const errorMessage = err.response?.data?.message || `An error occurred: ${err.message}`;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSessionCreated = () => {
    fetchData();
    alert("Session created successfully!");
  };

  const handleDeleteSession = async (sessionId) => {
    if (window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      try {
        await api.delete(`/api/sessions/${sessionId}`);
        fetchData();
        alert("Session deleted successfully.");
      } catch (err) {
        const errorMessage = err.response?.data?.message || `Failed to delete session: ${err.message}`;
        alert(`Error: ${errorMessage}`);
      }
    }
  };

  if (loading) return <p className="text-lg text-gray-500">Loading sessions...</p>;
  if (error) return <div className="text-center p-4 bg-red-100 text-red-700 rounded-md"><strong>Error:</strong> {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <button onClick={() => navigate('/lecturer/courses')} className="text-blue-500 hover:underline mb-4">&larr; Back to My Courses</button>

      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Manage Sessions</h2>
            <p className="text-xl text-gray-600">Course: <strong>{course?.name}</strong></p>
        </div>
        <button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
            + Create New Session
        </button>
      </div>

      <CreateSessionModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        courseId={courseId}
        onSessionCreated={handleSessionCreated}
      />

      <div className="shadow-md rounded-lg overflow-x-auto">
        {sessions.length > 0 ? (
          <table className="min-w-full bg-white">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Date</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Time</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Topic</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Status</th>
                <th className="text-center py-3 px-4 uppercase font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {sessions.map((session) => (
                <tr key={session.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="text-left py-3 px-4">{format(parseISO(session.session_date + 'T00:00:00'), 'PPP')}</td>
                  <td className="text-left py-3 px-4">{session.start_time} - {session.end_time}</td>
                  <td className="text-left py-3 px-4">{session.topic}</td>
                  <td className="text-left py-3 px-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${session.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {session.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-center py-3 px-4 space-x-1">
                    <button
                      onClick={() => navigate(`/lecturer/courses/${courseId}/sessions/${session.id}`)}
                      className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors duration-200"
                    >
                        View Session
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
          <div className="p-6 text-center bg-white rounded-lg shadow-md">
            <p className="text-gray-500 mb-4">No sessions have been created for this course yet.</p>
            <p className="text-gray-500">Click the "Create New Session" button to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewSessions;
