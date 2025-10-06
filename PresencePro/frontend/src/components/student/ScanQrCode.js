import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';

const ScanQrCode = () => {
    const [searchParams] = useSearchParams();
    const [studentId, setStudentId] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const sessionId = searchParams.get('session_id');
    const qrCodeUuid = searchParams.get('uuid');

    useEffect(() => {
        if (!sessionId || !qrCodeUuid) {
            setError('Invalid URL. Please scan a valid QR code.');
            setMessage('');
        }
    }, [sessionId, qrCodeUuid]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting || !sessionId || !qrCodeUuid) {
            return;
        }

        if (!studentId.trim()) {
            setError('Please enter your Student ID.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setMessage('');

        try {
            // --- THIS LINE IS THE FIX ---
            // Added the "/api" prefix to the URL
            const response = await api.post(`/api/sessions/${sessionId}/attendance`, {
                student_index_number: studentId,
                qr_code_uuid: qrCodeUuid,
            });

            if (response.status === 201) {
                setMessage('Attendance marked successfully! You can now close this page.');
                setStudentId('');
            } else {
                setError(response.data.message || 'An unexpected response was received from the server.');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'An error occurred while marking attendance.';
            setError(errorMessage);
            console.error('Attendance marking error:', errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-3xl font-bold text-center text-gray-800">Mark Your Attendance</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="studentId" className="text-sm font-medium text-gray-700">
                            Enter your Student ID
                        </label>
                        <input
                            id="studentId"
                            type="text"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            placeholder="e.g., 12345678"
                            required
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            disabled={isSubmitting || !!message}
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                            disabled={isSubmitting || !sessionId || !qrCodeUuid || !!message}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </button>
                    </div>
                </form>

                {message && (
                    <div className="p-4 text-center text-green-800 bg-green-100 border border-green-400 rounded-md">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="p-4 text-center text-red-800 bg-red-100 border border-red-400 rounded-md">
                        {error}
                    </div>
                )}

                {(!sessionId || !qrCodeUuid) && (
                     <div className="p-4 text-center text-yellow-800 bg-yellow-100 border border-yellow-400 rounded-md">
                        Waiting for valid session information from QR code...
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScanQrCode;
