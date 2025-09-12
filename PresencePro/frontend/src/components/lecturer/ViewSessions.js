import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import GenerateQRCodeModal from './GenerateQRCode';
import CreateSessionModal from './CreateSession'; 
import { format, parseISO } from 'date-fns'; // Import for formatting dates

// A self-contained modal for editing a session's details.
const EditSessionModal = ({ isOpen, onClose, session, onSave }) => {
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (session) {
      // Assuming session.session_date is in 'YYYY-MM-DD' format
      setSessionDate(session.session_date);
      setStartTime(session.start_time);
      setEndTime(session.end_time);
    }
  }, [session]);

  if (!isOpen || !session) return null;

  const handleSave = () => {
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

// --- NEW: A modal specifically for viewing attendance ---
const AttendanceModal = ({ isOpen, onClose, session, attendanceData, isLoading }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">
              Attendance for Session on {session ? format(parseISO(session.session_date + 'T00:00:00'), 'PPP') : ''}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
          </div>
          {isLoading ? (
            <p>Loading attendance...</p>
          ) : attendanceData.length === 0 ? (
            <p>No students have marked attendance for this session yet.</p>
          ) : (
            <div className="overflow-y-auto max-h-96">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-4 text-left">Student ID</th>
                    <th className="py-2 px-4 text-left">Name</th>
                    <th className="py-2 px-4 text-left">Time Marked</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map((record, index) => (
                    <tr key={index} className="border-b hover:bg-gray-100">
                      <td className="py-2 px-4">{record.student_id}</td>
                      <td className="py-2 px-4">{record.student_name}</td>
                      <td className="py-2 px-4">{format(parseISO(record.timestamp), 'PPpp')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
};


const ViewSessions = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for the modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [sessionForQR, setSessionForQR] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); 
  
  // --- NEW: State for the Attendance modal ---
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [sessionForAttendance, setSessionForAttendance] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);


  // Function to fetch all necessary data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [courseRes, sessionsRes] = await Promise.all([
        api.get(`/api/courses/${courseId}`),
        api.get(`/api/courses/${courseId}/sessions`),
      ]);
      setCourse(courseRes.data);
      // Sort sessions by date, most recent first
      const sortedSessions = (sessionsRes.data.sessions || []).sort((a, b) => new Date(b.session_date) - new Date(a.session_date));
      setSessions(sortedSessions);
    } catch (err) {
      const errorMessage = err.response?.data?.message || `An error occurred: ${err.message}`;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [courseId]);

  // Handler to be called after a session is created successfully
  const handleSessionCreated = () => {
    fetchData(); // Refresh the session list
    alert("Session created successfully!");
  };

  const handleUpdateSession = async (sessionId, updatedData) => {
    try {
      await api.put(`/api/sessions/${sessionId}`, updatedData);
      setIsEditModalOpen(false);
      fetchData();
      alert("Session updated successfully!");
    } catch (err) {
      const errorMessage = err.response?.data?.message || `Failed to update session: ${err.message}`;
      alert(`Error: ${errorMessage}`);
    }
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

  const handleOpenEditModal = (session) => {
    setSessionToEdit(session);
    setIsEditModalOpen(true);
  };
  
  const handleOpenQRModal = (session) => {
    setSessionForQR(session);
    setIsQRModalOpen(true);
  };

  // --- NEW: Handler to open the attendance modal and fetch data ---
  const handleOpenAttendanceModal = async (session) => {
    setSessionForAttendance(session);
    setIsAttendanceModalOpen(true);
    setIsAttendanceLoading(true);
    try {
      const response = await api.get(`/api/sessions/${session.id}/attendance`);
      setAttendanceList(response.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch attendance data.');
    } finally {
      setIsAttendanceLoading(false);
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

      {/* Render the Modals */}
      <CreateSessionModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        courseId={courseId}
        onSessionCreated={handleSessionCreated}
      />
      <EditSessionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        session={sessionToEdit}
        onSave={handleUpdateSession}
      />
      <GenerateQRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => {
          setIsQRModalOpen(false);
          fetchData();
        }}
        session={sessionForQR}
      />
      {/* --- NEW: Render the Attendance Modal --- */}
      <AttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        session={sessionForAttendance}
        attendanceData={attendanceList}
        isLoading={isAttendanceLoading}
      />


      <div className="shadow-md rounded-lg overflow-x-auto">
        {sessions.length > 0 ? (
          <table className="min-w-full bg-white">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Date</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Time</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Status</th>
                <th className="text-center py-3 px-4 uppercase font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {sessions.map((session) => (
                <tr key={session.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="text-left py-3 px-4">{format(parseISO(session.session_date + 'T00:00:00'), 'PPP')}</td>
                  <td className="text-left py-3 px-4">{session.start_time} - {session.end_time}</td>
                  <td className="text-left py-3 px-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${session.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {session.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-center py-3 px-4 space-x-1">
                    {/* --- NEW: "View Attendance" Button --- */}
                    <button
                      onClick={() => handleOpenAttendanceModal(session)}
                      className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors duration-200"
                    >
                        View Attendance
                    </button>
                    <button
                      onClick={() => handleOpenQRModal(session)}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors duration-200"
                    >
                      Generate QR
                    </button>
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
