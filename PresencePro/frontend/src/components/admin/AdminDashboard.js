import React from 'react';

// A simple card component for displaying stats
const StatCard = ({ title, value, icon }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
      <div className="mr-4">{icon}</div>
      <div>
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  // Placeholder data - in a real app, this would come from an API
  const stats = {
    totalUsers: 150,
    totalCourses: 25,
    totalSessions: 5,
    attendanceRate: "92%",
  };
  
  // Icons for the cards (using simple text/emojis as placeholders for actual icons)
  const UserIcon = () => <span className="text-3xl">👥</span>;
  const CourseIcon = () => <span className="text-3xl">📚</span>;
  const SessionIcon = () => <span className="text-3xl">🗓️</span>;
  const AttendanceIcon = () => <span className="text-3xl">✅</span>;


  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <p className="mb-8 text-gray-600">Welcome! Here's a quick overview of the system.</p>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={stats.totalUsers} icon={<UserIcon />} />
        <StatCard title="Total Courses" value={stats.totalCourses} icon={<CourseIcon />} />
        <StatCard title="Active Sessions" value={stats.totalSessions} icon={<SessionIcon />} />
        <StatCard title="Overall Attendance" value={stats.attendanceRate} icon={<AttendanceIcon />} />
      </div>

      {/* Placeholder for future charts or activity feeds */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <p className="text-gray-500">Activity feed coming soon...</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
