import React, { useState, useEffect } from 'react';

const ManageSessionsLecturer = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [sessions, setSessions] = useState([]);
  const [newSession, setNewSession] = useState({
    date: '',
    time: '',
    topic: '',
  });

  // In a real application, fetch courses for the lecturer here
  useEffect(() => {
    // Example fetch (replace with actual API call)
    const fetchCourses = async () => {
      try {
        // const response = await fetch('/api/lecturer/courses');
        // const data = await response.json();
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

  // In a real application, fetch sessions for the selected course
  useEffect(() => {
    if (selectedCourse) {
      const fetchSessions = async () => {
        try {
          // const response = await fetch(`/api/lecturer/courses/${selectedCourse}/sessions`);
          // const data = await response.json();
          // Example data (replace with actual API call)
          const data = [
            { id: 101, date: '2023-10-26', time: '10:00', topic: 'Introduction' },
            { id: 102, date: '2023-11-02', time: '11:00', topic: 'Arrays' },
          ];
          setSessions(data);
        } catch (error) {
          console.error('Error fetching sessions:', error);
        }
      };

      fetchSessions();
    } else {
      setSessions([]);
    }
  }, [selectedCourse]);

  const handleCourseChange = (event) => {
    setSelectedCourse(event.target.value);
  };

  const handleNewSessionChange = (event) => {
    const { name, value } = event.target;
    setNewSession((prevSession) => ({
      ...prevSession,
      [name]: value,
    }));
  };

  const handleRemoveSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        // In a real application, send a DELETE request to remove the session
        // await fetch(`/api/lecturer/sessions/${sessionId}`, { method: 'DELETE' });

        setSessions((prevSessions) => prevSessions.filter(session => session.id !== sessionId));
        alert('Session deleted successfully!');
      } catch (error) {
        console.error('Error deleting session:', error);
        alert('Failed to delete session.');
      }
    }
  };

  const handleAddSession = async (event) => {
    event.preventDefault();
    if (!selectedCourse || !newSession.date || !newSession.time || !newSession.topic) {
      alert('Please select a course and fill in all session details.');
      return;
    }

    try {
      // In a real application, send a POST request to create the new session
      // const response = await fetch(`/api/lecturer/courses/${selectedCourse}/sessions`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(newSession),
      // });
      // const createdSession = await response.json();

      // For now, simulate adding the session to the state
      const createdSession = { id: Date.now(), ...newSession };
      setSessions((prevSessions) => [...prevSessions, createdSession]);
      setNewSession({ date: '', time: '', topic: '' }); // Clear the form
      alert('Session added successfully!');
    } catch (error) {
      console.error('Error adding session:', error);
      alert('Failed to add session.');
    }
  };

  return (
    <div>
      <h2>Manage Sessions</h2>

      <div>
        <label htmlFor="course-select">Select Course:</label>
        <select id="course-select" value={selectedCourse} onChange={handleCourseChange}>
          <option value="">-- Select a Course --</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name} ({course.code})
            </option>
          ))}
        </select>
      </div>

      {selectedCourse && (
        <div>
          <h3>Sessions for Selected Course</h3>
          {sessions.length === 0 ? (
            <p>No sessions found for this course.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Actions</th>
                  <th>Topic</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>{session.date}</td>
                    <td>{session.time}</td>
                    <td>{session.topic}</td>
                    <td>
                      <button onClick={() => handleRemoveSession(session.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3>Add New Session</h3>
          <form onSubmit={handleAddSession}>
            <div>
              <label htmlFor="date">Date:</label>
              <input
                type="date"
                id="date"
                name="date"
                value={newSession.date}
                onChange={handleNewSessionChange}
              />
            </div>
            <div>
              <label htmlFor="time">Time:</label>
              <input
                type="time"
                id="time"
                name="time"
                value={newSession.time}
                onChange={handleNewSessionChange}
              />
            </div>
            <div>
              <label htmlFor="topic">Topic:</label>
              <input
                type="text"
                id="topic"
                name="topic"
                value={newSession.topic}
                onChange={handleNewSessionChange}
              />
            </div>
            <button type="submit">Add Session</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ManageSessionsLecturer;