
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';
import { 
    FaUsers, FaBookOpen, FaCalendarCheck, FaPercentage, FaChartBar, 
    FaChartPie, FaChartLine, FaSpinner, FaExclamationCircle 
} from 'react-icons/fa';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

const StatCard = ({ title, value, icon, loading }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg flex items-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
    <div className="bg-indigo-100 p-4 rounded-full mr-4">{icon}</div>
    <div>
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      {loading ? 
        <div className="mt-1 h-8 w-16 bg-gray-200 rounded animate-pulse"></div> : 
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      }
    </div>
  </div>
);

const ChartContainer = ({ title, icon, children, loading, error, hasData }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg h-96 flex flex-col">
        <div className="flex items-center mb-4">
            {icon}
            <h3 className="text-lg font-bold text-gray-800 ml-2">{title}</h3>
        </div>
        <div className="flex-grow flex items-center justify-center">
            {loading ? <FaSpinner className="animate-spin text-3xl text-blue-500" /> :
             error ? <div className="text-red-500 text-center"><FaExclamationCircle className="mx-auto mb-2 text-2xl"/>{error}</div> :
             !hasData ? <div className="text-gray-500 text-center"><FaExclamationCircle className="mx-auto mb-2 text-2xl"/>Not enough data to display this chart.</div> :
             children}
        </div>
    </div>
);

const LecturerDashboard = () => {
  const [stats, setStats] = useState({});
  const [chartData, setChartData] = useState({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [chartError, setChartError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setStatsLoading(true);
        const response = await api.get('/api/lecturer/dashboard-stats'); 
        setStats(response.data);
        setStatsError('');
      } catch (err) {
        setStatsError('Failed to load stats.');
        console.error(err);
      } finally {
        setStatsLoading(false);
      }
    };

    const fetchChartData = async () => {
      try {
        setChartLoading(true);
        const response = await api.get('/api/lecturer/dashboard-charts');
        setChartData(response.data);
        setChartError('');
      } catch (err) {
        setChartError('Failed to load charts.');
        console.error(err);
      } finally {
        setChartLoading(false);
      }
    };

    fetchDashboardData();
    fetchChartData();
  }, []);

  const ENGAGEMENT_COLORS = { 'High Engagement (>=80%)': '#10B981', 'Medium Engagement (50-79%)': '#F59E0B', 'Low Engagement (<50%)': '#EF4444' };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Lecturer Dashboard</h1>
                <p className="text-gray-600 mt-1">Welcome! Here's a data-driven overview of your activities.</p>
            </div>

            {statsError && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{statsError}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Courses" value={stats.totalCourses} icon={<FaBookOpen className="text-indigo-500 text-2xl"/>} loading={statsLoading} />
                <StatCard title="Total Students" value={stats.totalStudents} icon={<FaUsers className="text-indigo-500 text-2xl"/>} loading={statsLoading} />
                <StatCard title="Active Sessions" value={stats.activeSessions} icon={<FaCalendarCheck className="text-indigo-500 text-2xl"/>} loading={statsLoading} />
                <StatCard title="Avg. Attendance" value={stats.averageAttendance} icon={<FaPercentage className="text-indigo-500 text-2xl"/>} loading={statsLoading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
                {/* Main charts on the left */}
                <div className="lg:col-span-3 flex flex-col gap-8">
                    <ChartContainer 
                        title="Average Attendance by Course" 
                        icon={<FaChartBar className="text-gray-600 text-xl"/>} 
                        loading={chartLoading} 
                        error={chartError}
                        hasData={chartData.courseAttendance && chartData.courseAttendance.length > 0}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.courseAttendance} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" tick={{fontSize: 12}} />
                                <YAxis unit="%" />
                                <Tooltip formatter={(value) => `${value}%`} />
                                <Legend />
                                <Bar dataKey="attendance" fill="#4f46e5" name="Avg. Attendance" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>

                    <ChartContainer 
                        title="Recent Session Attendance Trend (Last 7)" 
                        icon={<FaChartLine className="text-gray-600 text-xl"/>}
                        loading={chartLoading} 
                        error={chartError}
                        hasData={chartData.sessionAttendanceTrend && chartData.sessionAttendanceTrend.length > 0}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData.sessionAttendanceTrend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" tick={{fontSize: 12}}/>
                                <YAxis unit="%" />
                                <Tooltip formatter={(value) => `${value}%`} />
                                <Legend />
                                <Line type="monotone" dataKey="attendance" stroke="#10B981" strokeWidth={2} name="Attendance Rate" />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>

                {/* Side charts and actions */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                    <ChartContainer 
                        title="Student Engagement Breakdown" 
                        icon={<FaChartPie className="text-gray-600 text-xl"/>}
                        loading={chartLoading} 
                        error={chartError}
                        hasData={chartData.studentEngagement && chartData.studentEngagement.some(e => e.value > 0)}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={chartData.studentEngagement} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} labelLine={false}>
                                    { (chartData.studentEngagement || []).map((entry, index) => <Cell key={`cell-${index}`} fill={ENGAGEMENT_COLORS[entry.name]} />) }
                                </Pie>
                                <Tooltip formatter={(value, name) => [value, name.split(' (')[0]]}/>
                                <Legend iconSize={10} />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>

                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
                        <div className="flex flex-col space-y-3">
                            <Link to="/lecturer/courses" className="w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                                Manage My Courses
                            </Link>
                            <Link to="/lecturer/sessions" className="w-full text-center bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                                Manage My Sessions
                            </Link>
                            {/* Corrected Link */}
                            <Link to="/lecturer/reports" className="w-full text-center bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                                View Attendance Reports
                            </Link>
                            {/* Added New Quick Action */}
                            <Link to="/lecturer/student-directory" className="w-full text-center bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                                View Student Directory
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default LecturerDashboard;
