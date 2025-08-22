import React, { useState } from 'react';
import { createSession } from '../../services/api'; // Corrected named import for api
import { QRCodeCanvas } from 'qrcode.react'; // Corrected named import for qrcode.react

const CreateSession = () => {
  const [qrCodeValue, setQrCodeValue] = useState(''); // State for QR code value
  const [formData, setFormData] = useState({
    sessionName: '',
    sessionDate: '',
    sessionTime: '',
    sessionDuration: '', // Added duration field
    sessionLocation: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);

    // Basic validation
    if (
      !formData.sessionName ||
      !formData.sessionDate ||
      !formData.sessionTime ||
      !formData.sessionDuration ||
      !formData.sessionLocation
    ) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      // Placeholder for the actual API call to create a session
      // Use the directly imported createSession function
      const response = await createSession(formData); // Corrected function call
      console.log('Session created successfully!');

      // Optionally reset the form or show a success message
      // Generate QR code value using session ID or other relevant data
      setQrCodeValue(response.sessionId ? `session:${response.sessionId}` : JSON.stringify(formData)); // Use session ID from response
      setFormData({
        sessionName: '',
        sessionDate: '',
        sessionTime: '',
        sessionDuration: '',
        sessionLocation: '',
      });
    } catch (error) {
      console.error('Error creating session:', error);
      // Handle errors (e.g., display an error message to the user)
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Session</h2>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        {/* Course Name */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sessionName">
            Course Name:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-1 focus:ring-blue-600"
            id="sessionName"
            type="text"
            placeholder="e.g., Introduction to Programming"
            value={formData.sessionName}
            onChange={handleChange}
            required
          />
        </div>
        {/* Date */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sessionDate">
            Date:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-1 focus:ring-blue-600"
            id="sessionDate"
            type="date"
            value={formData.sessionDate}
            onChange={handleChange}
            required
          />
        </div>
        {/* Time */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sessionTime">
            Time:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-1 focus:ring-blue-600"
            id="sessionTime"
            type="time"
            value={formData.sessionTime}
            onChange={handleChange}
            required
          />
        </div>
        {/* Duration */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sessionDuration">
            Duration (minutes):
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-1 focus:ring-blue-600"
            id="sessionDuration"
            type="number"
            placeholder="e.g., 60"
            value={formData.sessionDuration}
            onChange={handleChange}
            required
          />
        </div>
        {/* Location */}
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sessionLocation">
            Location:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-1 focus:ring-blue-600"
            id="sessionLocation"
            type="text"
            placeholder="e.g., Room 101"
            value={formData.sessionLocation}
            onChange={handleChange}
            required
          />
        </div>
        {/* Submit Button */}
        <div className="flex items-center justify-between">
          <div className="mb-4">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50"
              type="submit"
            >
              Create Session
            </button>
          </div>
        </div>
      </form>

      {/* QR Code Display */}
      {qrCodeValue && (
        <div className="mt-6 p-4 border rounded-md bg-gray-100 text-center">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Session QR Code</h3>
          {/* Use QRCodeCanvas component */}
          <QRCodeCanvas value={qrCodeValue} size={256} level="H" />
          <p className="mt-4 text-gray-700">Scan this QR code for attendance.</p>
        </div>
      )}
    </div>
  );
};

export default CreateSession;
