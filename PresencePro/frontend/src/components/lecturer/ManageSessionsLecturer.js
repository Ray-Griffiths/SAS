import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import SessionCard from './SessionCard';
import CourseSummaryWidget from './CourseSummaryWidget';
import { FaBolt, FaBook, FaArrowLeft } from 'react-icons/fa';

const ManageSessionsLecturer = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [sessions, setSessions] = useState([]);
  const [newSession, setNewSession] = useState({ date: '', startTime: '', endTime: '', topic: '' });
  const [summaryData, setSummaryData] = useState({ averageAttendance: 0, totalSessions: 0, studentCount: 0 });

  // Fetch courses for the lecturer
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get('/api/lecturer/courses');
        setCourses(response.data);
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
          const [sessionResponse, summaryResponse] = await Promise.all([
            api.get(`/api/courses/${selectedCourse}/sessions`),
            api.get(`/api/courses/${selectedCourse}/summary`)
          ]);
          
          setSessions(sessionResponse.data.sessions);
          setSummaryData(summaryResponse.data);
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

  const handleNewSessionChange = (event) => {
    const { name, value } = event.target;
    setNewSession(prev => ({ ...prev, [name]: value }));
  };

  const handleRemoveSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await api.delete(`/api/sessions/${sessionId}`);
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
    if (!selectedCourse || !newSession.date || !newSession.startTime || !newSession.endTime) {
      alert('Please fill in all session details.');
      return;
    }
    try {
      const sessionData = {
        course_id: selectedCourse,
        session_date: newSession.date,
        start_time: newSession.startTime,
        end_time: newSession.endTime,
        topic: newSession.topic,
      };
      const response = await api.post(`/api/courses/${selectedCourse}/sessions`, sessionData);
      setSessions(prev => [response.data.session, ...prev.sort((a, b) => new Date(b.session_date) - new Date(a.session_date))]);
      setNewSession({ date: '', startTime: '', endTime: '', topic: '' });
      alert('Session added successfully!');
    } catch (error) {
      console.error('Error adding session:', error);
      alert('Failed to add session.');
    }
  };

  const handleDuplicateSession = (sessionToDuplicate) => {
    const originalDate = new Date(sessionToDuplicate.session_date + 'T00:00:00');
    originalDate.setDate(originalDate.getDate() + 7);

    const year = originalDate.getFullYear();
    const month = String(originalDate.getMonth() + 1).padStart(2, '0');
    const day = String(originalDate.getDate()).padStart(2, '0');
    const nextWeekDate = `${year}-${month}-${day}`;

    setNewSession({
        date: nextWeekDate,
        startTime: sessionToDuplicate.start_time,
        endTime: sessionToDuplicate.end_time,
        topic: sessionToDuplicate.topic
    });

    alert('Session details copied to the "Add New Session" form with the date set for next week.');
    document.getElementById('date')?.focus();
  };

  const handleImpromptuSession = async () => {
    if (sessions.some(s => s.is_active)) {
        alert("An active session is already running. Please end it before starting a new one.");
        return;
    }

    try {
      const response = await api.post(`/api/courses/${selectedCourse}/sessions/impromptu`);
      setSessions(prev => [response.data.session, ...prev]);
      alert('A 15-minute impromptu session has been started!');
    } catch (error) {
      console.error('Error starting impromptu session:', error);
      alert('Failed to start impromptu session.');
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {!selectedCourse ? (
          <div className="bg-white shadow-lg rounded-xl p-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Select a Course</h2>
            <p className="text-gray-600 mb-8">Click on a course to view and manage its sessions.</p>
            {courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCourse(course.id)}
                    className="bg-gray-50 p-6 rounded-lg shadow-md hover:shadow-xl hover:bg-indigo-50 transform transition-all duration-300 cursor-pointer border border-gray-200"
                  >
                    <FaBook className="h-8 w-8 text-indigo-500 mb-4" />
                    <h3 className="text-lg font-bold text-gray-800 mb-2 truncate">{course.name}</h3>
                    <p className="text-sm text-gray-500 truncate h-10">{course.description || 'Manage the sessions for this course.'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No courses found. Please create a course first.</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={() => setSelectedCourse('')}
              className="mb-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FaArrowLeft className="mr-2" />
              Back to Courses
            </button>

            <div className="bg-white shadow-lg rounded-xl p-4 md:p-6">
              <CourseSummaryWidget {...summaryData} />
              
              <div className="flex justify-between items-center my-6">
                <h3 className="text-xl font-semibold text-gray-800">Sessions for {courses.find(c => c.id === selectedCourse)?.name}</h3>
                <button
                  onClick={handleImpromptuSession}
                  className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm"
                >
                  <FaBolt className="mr-2" />
                  Impromptu Session
                </button>
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-12 border bg-gray-50 rounded-lg">
                  <p className="text-gray-600 font-medium">No sessions found for this course.</p>
                  <p className="text-sm text-gray-500 mt-1">You can add a new one below.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sessions.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onDelete={handleRemoveSession}
                      onDuplicate={handleDuplicateSession}
                    />
                  ))}
                </div>
              )}

              <div className="mt-10">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Add New Session</h3>
                <form onSubmit={handleAddSession} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date:</label>
                        <input type="date" id="date" name="date" value={newSession.date} onChange={handleNewSessionChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                      </div>
                      <div>
                        <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start Time:</label>
                        <input type="time" id="startTime" name="startTime" value={newSession.startTime} onChange={handleNewSessionChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                      </div>
                      <div>
                        <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">End Time:</label>
                        <input type="time" id="endTime" name="endTime" value={newSession.endTime} onChange={handleNewSessionChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                      </div>
                      <div className="md:col-span-3">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageSessionsLecturer;
