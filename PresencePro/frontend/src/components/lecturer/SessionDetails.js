import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import GenerateQRCodeModal from './GenerateQRCode';
import EditSessionForm from './EditSessionForm';
import { format, parseISO } from 'date-fns';

const SessionDetails = () => {
  const { courseId, sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionRes, attendanceRes] = await Promise.all([
        api.get(`/api/courses/${courseId}/sessions/${sessionId}`),
        api.get(`/api/sessions/${sessionId}/attendance`)
      ]);
      setSession(sessionRes.data.session); // Corrected to access the nested session object
      setAttendance(attendanceRes.data);
    } catch (err) {
      setError(err.response?.data?.message || `An error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [courseId, sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateSuccess = () => {
    setIsEditModalOpen(false);
    fetchData();
    alert('Session updated successfully!');
  };

  if (loading) return <p>Loading session details...</p>;
  if (error) return <div>Error: {error}</div>;
  if (!session) return <p>Session not found.</p>; // Added a check for the session object

  return (
    <div className="container mx-auto p-4">
      <button onClick={() => navigate(`/lecturer/courses/${courseId}/sessions`)} className="text-blue-500 hover:underline mb-4">&larr; Back to Sessions</button>
      
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-3xl font-bold">Session Details</h2>
            <p className="text-lg text-gray-600">{format(parseISO(session.session_date + 'T00:00:00'), 'PPP')}</p>
            <p className="text-md text-gray-500">{session.start_time} - {session.end_time}</p>
            <p className="text-md text-gray-500">Topic: {session.topic}</p>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => setIsQRModalOpen(true)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
              Generate QR
            </button>
            <button onClick={() => setIsEditModalOpen(true)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
              Edit Session
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-semibold mb-3">Attendance</h3>
          {attendance.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {attendance.map(record => (
                <li key={record.student_id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{record.student_name}</p>
                    <p className="text-sm text-gray-500">ID: {record.student_id}</p>
                  </div>
                  <p className="text-sm text-gray-600">Marked at: {format(parseISO(record.timestamp), 'pp')}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No attendance records for this session.</p>
          )}
        </div>
      </div>

      {isQRModalOpen && (
        <GenerateQRCodeModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          session={session}
        />
      )}

      {isEditModalOpen && (
        <EditSessionForm
          session={session}
          onSuccess={handleUpdateSuccess}
          onCancel={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
};

export default SessionDetails;
