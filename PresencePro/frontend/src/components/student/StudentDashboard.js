
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyAttendance, getMyEngagement, getMyUpcomingSessions, getMyAttendanceTrends } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import UpcomingSessionCard from './UpcomingSessionCard';

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
    <div className="mr-4">{icon}</div>
    <div>
      <p className="text-gray-600">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

const EngagementCard = ({ engagementData }) => {
  if (!engagementData) return null;

  const { engagement_score, engagement_tier, tier_color, message } = engagementData;

  const tierColors = {
    high: 'border-green-500',
    medium: 'border-yellow-500',
    low: 'border-red-500',
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${tierColors[tier_color.toLowerCase()]}`}>
      <h3 className="text-xl font-bold text-gray-800">My Engagement</h3>
      <div className="flex items-center mt-2">
        <p className="text-4xl font-bold text-gray-900">{engagement_score}%</p>
        <span className={`ml-4 text-lg font-semibold text-${tier_color}-600`}>
          {engagement_tier} Tier
        </span>
      </div>
      <p className="text-gray-600 mt-2">{message}</p>
    </div>
  );
};

const AttendanceHeatmap = ({ data }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h3 className="text-xl font-bold text-gray-800 mb-4">Attendance Heatmap (Last 90 Days)</h3>
    <CalendarHeatmap
      startDate={new Date(new Date().setDate(new Date().getDate() - 90))}
      endDate={new Date()}
      values={data}
      classForValue={(value) => {
        if (!value) {
          return 'color-empty';
        }
        return `color-scale-${Math.min(value.count, 4)}`;
      }}
      tooltipDataAttrs={value => {
        return {
          'data-tip': `${value.date} - ${value.count} sessions attended`,
        };
      }}
    />
  </div>
);

const WeeklyTrendChart = ({ data }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h3 className="text-xl font-bold text-gray-800 mb-4">Weekly Attendance Trend</h3>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="attendance" stroke="#8884d8" activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const StudentDashboard = () => {
  const [stats, setStats] = useState({
    enrolledCourses: 0,
  });
  const [engagementData, setEngagementData] = useState(null);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [attendanceTrends, setAttendanceTrends] = useState({ heatmap_data: [], weekly_trend_data: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [attendanceRecords, engagement, upcoming, trends] = await Promise.all([
          getMyAttendance(),
          getMyEngagement(),
          getMyUpcomingSessions(),
          getMyAttendanceTrends(),
        ]);

        const courseSet = new Set(attendanceRecords.map(r => r.course_name));

        setStats({
          enrolledCourses: courseSet.size,
        });

        setEngagementData(engagement);
        setRecentAttendance(attendanceRecords.slice(0, 5));
        setUpcomingSessions(upcoming);
        setAttendanceTrends(trends);

      } catch (err) {
        setError('Failed to load dashboard data. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (loading) {
    return <div className="text-center p-8">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="bg-red-100 text-red-700 p-4 rounded-md">{error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">My Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <EngagementCard engagementData={engagementData} />
        <StatCard title="Enrolled Courses" value={stats.enrolledCourses} />
      </div>

      {/* Upcoming Sessions Section */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-700 mb-4">My Upcoming Sessions</h3>
        {upcomingSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingSessions.map(session => (
              <UpcomingSessionCard key={session.session_id} session={session} />
            ))}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <p className="text-gray-600">You have no upcoming sessions.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AttendanceHeatmap data={attendanceTrends.heatmap_data} />
        <WeeklyTrendChart data={attendanceTrends.weekly_trend_data} />
      </div>

      {/* Recent Attendance */}
      <div>
        <h3 className="text-2xl font-bold text-gray-700 mb-4">Recent Activity</h3>
        {recentAttendance.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {recentAttendance.map(record => (
                <li key={record.attendance_id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <p className="font-semibold text-gray-800">{record.course_name}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(record.session_date).toLocaleDateString()} - {record.session_start_time}
                    </p>
                  </div>
                  <span className="text-green-600 font-semibold bg-green-100 py-1 px-3 rounded-full text-sm">
                    {record.attendance_status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-gray-600">No recent attendance records found.</p>
        )}
        <div className="mt-4">
            <Link to="/student/my-attendance" className="text-blue-600 hover:underline">
                View All Attendance
            </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
