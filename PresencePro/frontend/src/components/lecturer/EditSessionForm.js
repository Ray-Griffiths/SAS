import React, { useState, useEffect } from 'react';
import { updateSession } from '../../services/api';

const EditSessionForm = ({ session, onSuccess, onCancel }) => {
  const [course, setCourse] = useState('');
  const [lecturer, setLecturer] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (session) {
      setCourse(session.course || '');
      setLecturer(session.lecturer || '');
      setDate(session.date || ''); // Assuming date is in a suitable format
      setTime(session.time || ''); // Assuming time is in a suitable format
      setDuration(session.duration || '');
      setLocation(session.location || '');
    }
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) return; // Prevent submission if no session is being edited

    const formData = {
      course,
      lecturer,
      date,
      time,
      duration,
      location,
    };
    console.log('Submitting updated session data:', session.id, formData);

    try {
      // Placeholder for actual API call to update session
      // Use the directly imported updateSession function
      await updateSession(session.id, formData); // Corrected function call
      console.log('Session updated successfully (placeholder)');
      if (onSuccess) {
        onSuccess(); // Notify parent component
      }
    } catch (error) {
      console.error('Error updating session (placeholder):', error);
      // Handle error (e.g., display error message)
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-md shadow-sm bg-gray-50">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Session</h3>
      {session ? (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="editCourse">Course:</label>
            <input
              type="text"
              id="editCourse"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="editLecturer">Lecturer:</label>
            <input
              type="text"
              id="editLecturer"
              value={lecturer}
              onChange={(e) => setLecturer(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="editDate">Date:</label>
            <input
              type="date"
              id="editDate"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="editTime">Time:</label>
            <input
              type="time"
              id="editTime"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              required
            />
          </div>
           <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="editDuration">Duration:</label>
            <input
              type="text"
              id="editDuration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              placeholder="e.g., 1 hour 30 minutes"
            />
          </div>
           <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="editLocation">Location:</label>
            <input
              type="text"
              id="editLocation"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="mr-2 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50"
            >
              Update Session
            </button>
          </div>
        </form>
      ) : (
        <p>Loading session data...</p>
      )}
    </div>
  );
};

export default EditSessionForm;
