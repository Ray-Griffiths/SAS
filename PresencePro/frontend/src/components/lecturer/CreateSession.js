import React, { useState } from 'react';
import { api } from '../../services/api';

const CreateSessionModal = ({ isOpen, onClose, courseId, onSessionCreated }) => {
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!sessionDate || !startTime || !endTime) {
      setError('Please fill out all fields.');
      setIsLoading(false);
      return;
    }

    try {
      const sessionData = {
        course_id: courseId,
        session_date: sessionDate,
        start_time: startTime,
        end_time: endTime,
      };
      await api.post(`/api/courses/${courseId}/sessions`, sessionData);
      onSessionCreated(); // This will trigger a refresh in the parent
      onClose(); // Close the modal on success
    } catch (err) {
      const errorMessage = err.response?.data?.message || `Failed to create session: ${err.message}`;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
        <h3 className="text-2xl font-bold mb-4 text-gray-800">Create New Session</h3>

        {error && <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-md"><strong>Error:</strong> {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Session Date</label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="time"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="time"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-blue-300">
              {isLoading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSessionModal;
