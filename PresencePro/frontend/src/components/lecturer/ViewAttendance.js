import React, { useEffect, useState } from 'react';
import { getSessionAttendance, getSessionsForCourse } from '../../services/api';
// This component assumes a course is somehow selected or available to the lecturer.  Need to fetch sessions based on lecturer's courses.
const ViewAttendance = () => {
  const [selectedSessionId, setSelectedSessionId] = useState(null); // State to manage selected session
  const [sessions, setSessions] = useState([]); // State to store list of sessions
  const [attendanceData, setAttendanceData] = useState([]);
  const [totalSessions, setTotalSessions] = useState(0); // State to store the total number of sessions for the semester
  const [totalMarks, setTotalMarks] = useState(100); // State for total marks
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!selectedSessionId) {
        setAttendanceData([]); // Clear attendance data if no session is selected
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Placeholder API call - replace with actual call to fetch attendance
        console.log(`Fetching attendance for session ID: ${selectedSessionId}`);
        // Use the directly imported getSessionAttendance function
        const data = await getSessionAttendance(selectedSessionId); // Corrected function call
        setAttendanceData(data);
      } catch (error) {
        console.error('Error fetching attendance data:', error); // Keep this log
        // Handle error (e.g., display an error message)
        setAttendanceData([]); // Clear attendance data on error
      } finally {
        setLoading(false);
      }
    };

    // Fetch data only if a session is selected
    fetchAttendanceData();

  }, [selectedSessionId]); // Re-run effect when selectedSessionId changes

  useEffect(() => {
    const fetchSessions = async () => {
      // TODO: Fetch sessions based on the lecturer's assigned courses, not all sessions.
      try {
        // Placeholder API call to get list of lecturer's sessions
        // Use the directly imported getLecturerSessions function
        const sessionsData = await getSessionsForCourse(); // Corrected function call and added courseId
        setTotalSessions(sessionsData.length); // Set total sessions based on fetched data
        setSessions(sessionsData);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        // Handle error
      }
    };


    fetchSessions();
  }, []); // Fetch sessions only once on component mount

  const handleSessionChange = (e) => {
    setSelectedSessionId(e.target.value);
  };

  // Function to calculate attendance mark based on attended sessions count and total possible sessions
  const calculateAttendanceMark = (studentAttendanceRecords) => {
    const attendedSessionsCount = studentAttendanceRecords.filter(record => record.status === 'Present').length;

    // Ensure totalSessions is not zero to avoid division by zero
    if (totalSessions === 0) return 0;
    // For this placeholder, let's assume each student has attended the current session
    // In a real app, you'd fetch all sessions for the course/student for the semester
    return (attendedSessionsCount / 1) * totalMarks; // Placeholder calculation
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">View Attendance</h2>

      <div className="mb-4">
        <label htmlFor="session-select" className="block text-sm font-medium text-gray-700 mb-2">Select Session:</label>
        <select
          id="session-select"
          value={selectedSessionId || ''}
          onChange={handleSessionChange}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="" disabled>-- Select a Session --</option>
          {sessions.map(session => (
            <option key={session.id} value={session.id}>{session.course} - {session.date} {session.time}</option>
          ))}
        </select>
      </div>

      {/* Placeholder for showing total number of sessions - replace with actual data source */}
      <div className="mb-4">
        <p className="block text-sm font-medium text-gray-700 mb-2">Total Sessions for Semester: <span className="font-bold">{totalSessions}</span></p>
        {/* In a real application, you might fetch the total number of sessions for a course/semester */}
      </div>

       <div className="mb-4">
        <p className="text-sm text-gray-600">The attendance mark will be calculated based on attended sessions out of the total sessions ({totalSessions}).</p>
      </div>

      <div className="mb-4">
        <label htmlFor="total-marks" className="block text-sm font-medium text-gray-700 mb-2">Total Marks for Attendance:</label>
        <input
          type="number"
          id="total-marks"
          value={totalMarks}
          onChange={(e) => setTotalMarks(parseInt(e.target.value, 10))}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      {attendanceData.length > 0 ? (
        // Display attendance data in a table
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
               <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attendance Mark
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attendanceData.map((record, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.studentName}</td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {/* You'll need to aggregate attendance for each student across all relevant sessions to get their total attended sessions */}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-600">No attendance data available.</p>
      )}
    </div>
  );
};


export default ViewAttendance;
