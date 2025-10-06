
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const MarkAttendancePage = () => {
  const [studentIndexNumber, setStudentIndexNumber] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionDetails, setSessionDetails] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();
  
  const queryParams = new URLSearchParams(location.search);
  const sessionId = queryParams.get('session_id');
  const qrCodeUuid = queryParams.get('uuid');

  useEffect(() => {
    if (!sessionId || !qrCodeUuid) {
      setError('Invalid URL. Session ID or QR code data is missing.');
      return;
    }

    const fetchSessionDetails = async () => {
        try {
            // This is a public endpoint, so no auth is needed
            const response = await api.get(`/api/sessions/${sessionId}/details-public`);
            setSessionDetails(response.data);
        } catch (err) {
            setError('Could not fetch session details. The session may not exist.');
        }
    };

    fetchSessionDetails();
  }, [sessionId, qrCodeUuid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    if (!studentIndexNumber) {
      setError('Please enter your student index number.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post(`/api/sessions/${sessionId}/attendance`, {
        student_index_number: studentIndexNumber,
        qr_code_uuid: qrCodeUuid,
      });
      setMessage(response.data.message || 'Attendance marked successfully!');
      setTimeout(() => navigate('/login'), 3000); // Redirect to login after 3 seconds
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark attendance. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSessionInfo = () => {
    if(!sessionDetails) {
        return <div className="text-center p-4 bg-gray-100 rounded-md">Loading session details...</div>
    }
    return (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">{sessionDetails.course_name}</h2>
            <p className="text-gray-600">
                Date: {new Date(sessionDetails.session_date).toLocaleDateString()}
            </p>
            <p className="text-gray-600">
                Time: {sessionDetails.start_time} - {sessionDetails.end_time}
            </p>
        </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <div>
            {renderSessionInfo()}
            <h1 className="text-xl font-bold text-center text-gray-700">Mark Your Attendance</h1>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md" role="alert">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}
        
        {message && (
          <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md" role="alert">
            <span className="font-medium">Success:</span> {message}
          </div>
        )}

        {!message && (
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="studentIndex" className="block text-sm font-medium text-gray-700">
                Student Index Number
              </label>
              <input
                id="studentIndex"
                type="text"
                value={studentIndexNumber}
                onChange={(e) => setStudentIndexNumber(e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 12345678"
                required
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
              >
                {isLoading ? 'Submitting...' : 'Mark My Attendance'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MarkAttendancePage;
