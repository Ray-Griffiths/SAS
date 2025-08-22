import React, {useEffect, useState} from 'react';
import { getStudentAttendance } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
const ViewMyAttendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const { user } = useAuth();
  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      setError(null);
      setErrorMessage(null);
      setSuccessMessage(null);
      try {
        // Placeholder API call
        const data = await getStudentAttendance(user.id);
 setAttendanceRecords(data.attendance); // Access the 'attendance' key from the response
        setSuccessMessage('Attendance records loaded successfully.');
      } catch (err) {
        setError('Failed to fetch attendance records.');
        setErrorMessage('Failed to fetch attendance records.');
        console.error('Error fetching attendance records:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []); // Empty dependency array means this effect runs once on mount
  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Attendance</h2>

      {!loading && !error && attendanceRecords.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lecturer</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceRecords.map((record) => (
                <tr key={record.attendance_id} className="bg-green-50"> {/* Status is always 'Present' for this view */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.course_name} - {record.session_date} {record.session_start_time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.lecturer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {/* Location is not available in this endpoint */} N/A
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${record.status === 'Present' ? 'text-green-600' : 'text-red-600'}`}>
                    {record.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && <p>Loading attendance records...</p>}

      {errorMessage && (
        <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">
          {errorMessage}
        </div>
      )}

      {successMessage && !loading && !errorMessage && (
         <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md">
           {successMessage}
         </div>
      )}

      {!loading && !error && attendanceRecords.length === 0 && !errorMessage && (
        <p>No attendance records found.</p>
      )}
    </div>
  );
};

export default ViewMyAttendance;
