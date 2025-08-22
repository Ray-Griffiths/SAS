import React, { useState } from 'react';

const ViewAttendanceLecturer = () => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);

  // Placeholder data (replace with actual data fetching from backend)
  const courses = [
    { id: 'course1', name: 'Introduction to React', code: 'CS101' },
    { id: 'course2', name: 'Advanced JavaScript', code: 'JS201' },
  ];

  const sessions = {
    course1: [
      { id: 'session1a', date: '2023-10-27', time: '10:00', topic: 'Component Basics' },
      { id: 'session1b', date: '2023-11-03', time: '10:00', topic: 'State and Props' },
    ],
    course2: [
      { id: 'session2a', date: '2023-10-28', time: '14:00', topic: 'ES6 Features' },
    ],
  };

  const dummyAttendance = {
    session1a: [
      { studentName: 'Alice Smith', status: 'Present' },
      { studentName: 'Bob Johnson', status: 'Absent' },
      { studentName: 'Charlie Brown', status: 'Present' },
    ],
    session1b: [
      { studentName: 'Alice Smith', status: 'Present' },
      { studentName: 'Bob Johnson', status: 'Present' },
      { studentName: 'Charlie Brown', status: 'Absent' },
    ],
    session2a: [
      { studentName: 'Alice Smith', status: 'Present' },
      { studentName: 'David Green', status: 'Present' },
    ],
  };

  const handleCourseChange = (event) => {
    setSelectedCourse(event.target.value);
    setSelectedSession(''); // Reset session when course changes
    setAttendanceData([]); // Clear attendance data
  };

  const handleSessionChange = (event) => {
    setSelectedSession(event.target.value);
    // In a real application, fetch attendance data based on selected session
    setAttendanceData(dummyAttendance[event.target.value] || []);
  };

  const handleGenerateReport = () => {
    // Placeholder for generating reports
    alert('Generating report for ' + (selectedSession ? 'session ' + selectedSession : 'course ' + selectedCourse));
    // Implement report generation logic here
  };

  return (
    <div>
      <h2>View Attendance</h2>

      <div>
        <label htmlFor="courseSelect">Select Course:</label>
        <select id="courseSelect" value={selectedCourse} onChange={handleCourseChange}>
          <option value="">-- Select a Course --</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>{course.name} ({course.code})</option>
          ))}
        </select>
      </div>

      {selectedCourse && (
        <div>
          <label htmlFor="sessionSelect">Select Session:</label>
          <select id="sessionSelect" value={selectedSession} onChange={handleSessionChange}>
            <option value="">-- Select a Session --</option>
            {sessions[selectedCourse]?.map(session => (
              <option key={session.id} value={session.id}>{session.date} - {session.time} - {session.topic}</option>
            ))}
          </select>
        </div>
      )}

      {attendanceData.length > 0 && (
        <div>
          <h3>Attendance Details</h3>
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((record, index) => (
                <tr key={index}>
                  <td>{record.studentName}</td>
                  <td>{record.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={handleGenerateReport}>Generate Report</button>
        </div>
      )}
    </div>
  );
};

export default ViewAttendanceLecturer;