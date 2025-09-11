
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
    <div className="mr-4">{icon}</div>
    <div>
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

const LecturerDashboard = () => {
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    activeSessions: 0,
    averageAttendance: '0%',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // --- FIX: Corrected the API endpoint URL ---
        const response = await api.get('/api/lecturer/dashboard-stats'); 
        setStats(response.data);
        setError('');
      } catch (err) {
        setError('Failed to fetch dashboard data. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const UserIcon = () => <span className="text-3xl">👥</span>;
  const CourseIcon = () => <span className="text-3xl">📚</span>;
  const SessionIcon = () => <span className="text-3xl">🗓️</span>;
  const AttendanceIcon = () => <span className="text-3xl">✅</span>;

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Lecturer Dashboard</h1>
      <p className="mb-8 text-gray-600">Welcome! Here's a quick overview of your activities.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Courses" value={stats.totalCourses} icon={<CourseIcon />} />
        <StatCard title="Total Students" value={stats.totalStudents} icon={<UserIcon />} />
        <StatCard title="Active Sessions" value={stats.activeSessions} icon={<SessionIcon />} />
        <StatCard title="Avg. Attendance" value={stats.averageAttendance} icon={<AttendanceIcon />} />
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="flex space-x-4">
          <Link to="courses" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            Manage Courses
          </Link>
          <Link to="sessions" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
            Manage Sessions
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LecturerDashboard;
