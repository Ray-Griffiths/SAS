import React, { useState, useEffect } from 'react';
import SessionCard from './SessionCard';
import CourseSummaryWidget from './CourseSummaryWidget'; // Import the new widget
import { FaBolt } from 'react-icons/fa'; // Import icon for impromptu button

const ManageSessionsLecturer = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [sessions, setSessions] = useState([]);
  const [newSession, setNewSession] = useState({ date: '', time: '', topic: '' });
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [summaryData, setSummaryData] = useState({ averageAttendance: 0, totalSessions: 0, studentCount: 0 });

  // Fetch courses for the lecturer
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = [
          { id: 1, name: 'Introduction to Programming', code: 'CS101' },
          { id: 2, name: 'Data Structures', code: 'CS201' },
        ];
        setCourses(data);
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };
    fetchCourses();
  }, []);

  // Fetch sessions and summary data for the selected course
  useEffect(() => {
    if (selectedCourse) {
      const fetchSessionsAndSummary = async () => {
        try {
          // Simulated session data with topics
          const sessionData = [
            { id: 101, topic: 'Introduction to React', session_date: '2023-10-26', start_time: '10:00', end_time: '11:00', is_active: true, attendanceRate: 95 },
            { id: 102, topic: 'State and Props', session_date: '2023-11-02', start_time: '11:00', end_time: '12:00', is_active: false, attendanceRate: 88 },
          ];
          // Simulated summary data
          const summary = { averageAttendance: 92, totalSessions: 12, studentCount: 45 };
          
          setSessions(sessionData);
          setSummaryData(summary);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
      fetchSessionsAndSummary();
    } else {
      setSessions([]);
      setSummaryData({ averageAttendance: 0, totalSessions: 0, studentCount: 0 });
    }
  }, [selectedCourse]);

  // Simulate real-time attendance updates for active sessions
  useEffect(() => {
    const activeSession = sessions.find(session => session.is_active);
    if (activeSession) {
      const interval = setInterval(() => setAttendanceCount(prevCount => prevCount + 1), 5000);
      return () => clearInterval(interval);
    }
  }, [sessions]);

  const handleCourseChange = (event) => setSelectedCourse(event.target.value);
  const handleNewSessionChange = (event) => {
    const { name, value } = event.target;
    setNewSession(prev => ({ ...prev, [name]: value }));
  };

  const handleRemoveSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        setSessions(prev => prev.filter(session => session.id !== sessionId));
        alert('Session deleted successfully!');
      } catch (error) {
        console.error('Error deleting session:', error);
        alert('Failed to delete session.');
      }
    }
  };

  const handleAddSession = async (event) => {
    event.preventDefault();
    if (!selectedCourse || !newSession.date || !newSession.time) {
      alert('Please fill in all session details.');
      return;
    }
    try {
      const createdSession = { 
        id: Date.now(), 
        ...newSession, 
        is_active: false, 
        session_date: newSession.date, 
        start_time: newSession.time, 
        end_time: newSession.time, // Assuming end_time is same as start for simplicity
        attendanceRate: 0
      };
      setSessions(prev => [...prev, createdSession]);
      setNewSession({ date: '', time: '', topic: '' });
      alert('Session added successfully!');
    } catch (error) {
      console.error('Error adding session:', error);
      alert('Failed to add session.');
    }
  };

  // --- NEW: Quality-of-Life Feature Handlers ---

  const handleDuplicateSession = (sessionToDuplicate) => {
    const originalDate = new Date(sessionToDuplicate.session_date + 'T00:00:00'); // Fix for timezone issues
    originalDate.setDate(originalDate.getDate() + 7);

    const year = originalDate.getFullYear();
    const month = String(originalDate.getMonth() + 1).padStart(2, '0');
    const day = String(originalDate.getDate()).padStart(2, '0');
    const nextWeekDate = `${year}-${month}-${day}`;

    setNewSession({
        date: nextWeekDate,
        time: sessionToDuplicate.start_time,
        topic: sessionToDuplicate.topic
    });

    alert('Session details copied to the "Add New Session" form with the date set for next week.');
    document.getElementById('date')?.focus(); // Focus form for better UX
  };

  const handleImpromptuSession = () => {
    if (sessions.some(s => s.is_active)) {
        alert("An active session is already running. Please end it before starting a new one.");
        return;
    }

    const now = new Date();
    const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    const formatTime = (date) => date.toTimeString().split(' ')[0].substring(0, 5);

    const impromptuSession = {
        id: Date.now(),
        session_date: formatDate(now),
        start_time: formatTime(now),
        end_time: formatTime(fifteenMinutesLater),
        topic: 'Impromptu Session',
        is_active: true,
        attendanceRate: 0,
    };

    setSessions(prev => [impromptuSession, ...prev]);
    setAttendanceCount(0); // Reset counter for new session
    alert('A 15-minute impromptu session has been started!');
  };

  // --- End of New Handlers ---

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Sessions</h2>

        <div className="mb-6">
          <label htmlFor="course-select" className="block text-sm font-medium text-gray-700 mb-2">Select Course:</label>
          <select id="course-select" value={selectedCourse} onChange={handleCourseChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option value="">-- Select a Course --</option>
            {courses.map(course => <option key={course.id} value={course.id}>{course.name} ({course.code})</option>)}
          </select>
        </div>

        {selectedCourse && (
          <div>
            <CourseSummaryWidget {...summaryData} />
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Sessions</h3>
              <button
                onClick={handleImpromptuSession}
                className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <FaBolt className="mr-2" />
                Impromptu Session
              </button>
            </div>

            {sessions.length === 0 ? (
              <p className="text-gray-500">No sessions found for this course.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onDelete={handleRemoveSession}
                    attendanceCount={session.is_active ? attendanceCount : undefined}
                    attendanceRate={session.attendanceRate}
                    onEdit={() => alert(`Editing session ${session.id}`)}
                    onGenerateQR={() => alert(`Generating QR for session ${session.id}`)}
                    onViewAttendance={() => alert(`Viewing attendance for ${session.id}`)}
                    onDuplicate={() => handleDuplicateSession(session)}
                  />
                ))}
              </div>
            )}

            <div className="mt-10">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Add New Session</h3>
              <form onSubmit={handleAddSession} className="bg-white p-6 rounded-lg shadow-md">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date:</label>
                      <input type="date" id="date" name="date" value={newSession.date} onChange={handleNewSessionChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                      <label htmlFor="time" className="block text-sm font-medium text-gray-700">Time:</label>
                      <input type="time" id="time" name="time" value={newSession.time} onChange={handleNewSessionChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="topic" className="block text-sm font-medium text-gray-700">Topic:</label>
                        <input type="text" id="topic" name="topic" value={newSession.topic} onChange={handleNewSessionChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                </div>
                <div className="mt-6 text-right">
                    <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Add Session</button>
                </div>
              </form>
            </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default ManageSessionsLecturer;
