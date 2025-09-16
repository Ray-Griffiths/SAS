
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { 
    FaUsers, FaBook, FaSignal, FaCheckCircle, FaChartLine, 
    FaChartPie, FaSpinner, FaExclamationCircle, FaUserShield, 
    FaChalkboardTeacher, FaUserGraduate, FaCogs
} from 'react-icons/fa';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

// Modernized StatCard with loading state
const StatCard = ({ title, value, icon, loading }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg flex items-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
    <div className="bg-indigo-100 p-4 rounded-full mr-4">{icon}</div>
    <div>
      <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</h3>
      {loading ? 
        <div className="mt-1 h-8 w-20 bg-gray-200 rounded animate-pulse"></div> : 
        <p className="text-3xl font-bold text-gray-800">{value}</p>
      }
    </div>
  </div>
);

// Chart Container for consistency
const ChartContainer = ({ title, icon, children, loading, error, hasData }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg h-96 flex flex-col">
        <div className="flex items-center mb-4">
            {icon}
            <h3 className="text-lg font-bold text-gray-800 ml-2">{title}</h3>
        </div>
        <div className="flex-grow flex items-center justify-center">
            {loading ? <FaSpinner className="animate-spin text-3xl text-indigo-500" /> :
             error ? <div className="text-red-500 text-center"><FaExclamationCircle className="mx-auto mb-2 text-2xl"/>{error}</div> :
             !hasData ? <div className="text-gray-500 text-center"><FaExclamationCircle className="mx-auto mb-2 text-2xl"/>No data available.</div> :
             children}
        </div>
    </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [chartData, setChartData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const statsPromise = api.get('/api/admin/dashboard-stats');
        const chartsPromise = api.get('/api/admin/dashboard-charts');
        
        const [statsResponse, chartsResponse] = await Promise.all([statsPromise, chartsPromise]);
        
        setStats(statsResponse.data);
        setChartData(chartsResponse.data);
        setError('');
      } catch (err) {
        setError('Failed to load dashboard data. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const ROLE_COLORS = { 'Admins': '#818CF8', 'Lecturers': '#38BDF8', 'Students': '#6EE7B7' };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                <p className="text-gray-600 mt-1">System-wide analytics and management hub.</p>
            </div>

            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 text-center">{error}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Users" value={stats.totalUsers} icon={<FaUsers className="text-indigo-500 text-2xl"/>} loading={loading} />
                <StatCard title="Total Courses" value={stats.totalCourses} icon={<FaBook className="text-teal-500 text-2xl"/>} loading={loading} />
                <StatCard title="Active Sessions" value={stats.activeSessions} icon={<FaSignal className="text-sky-500 text-2xl"/>} loading={loading} />
                <StatCard title="Overall Attendance" value={`${stats.overallAttendance || 0}%`} icon={<FaCheckCircle className="text-emerald-500 text-2xl"/>} loading={loading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <ChartContainer 
                    title="User Registration Trend" 
                    icon={<FaChartLine className="text-gray-600 text-xl"/>}
                    loading={loading} 
                    error={error}
                    hasData={chartData.userTrend && chartData.userTrend.length > 0}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData.userTrend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{fontSize: 12}} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} name="New Users" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>

                <ChartContainer 
                    title="User Role Distribution" 
                    icon={<FaChartPie className="text-gray-600 text-xl"/>}
                    loading={loading} 
                    error={error}
                    hasData={chartData.userRoles && chartData.userRoles.some(r => r.value > 0)}
                >
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData.userRoles} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false}>
                                { (chartData.userRoles || []).map((entry, index) => <Cell key={`cell-${index}`} fill={ROLE_COLORS[entry.name]} />) }
                            </Pie>
                            <Tooltip />
                            <Legend iconSize={10} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Management Hub</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
                    <button onClick={() => navigate('/admin/users')} className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                        <FaUserShield className="text-2xl text-indigo-600 mr-4"/>
                        <span className="font-semibold text-gray-700">User Management</span>
                    </button>
                    <button onClick={() => navigate('/admin/courses')} className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                        <FaChalkboardTeacher className="text-2xl text-teal-600 mr-4"/>
                        <span className="font-semibold text-gray-700">Course Management</span>
                    </button>
                    <button onClick={() => navigate('/admin/system-logs')} className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                        <FaUserGraduate className="text-2xl text-sky-600 mr-4"/>
                        <span className="font-semibold text-gray-700">System Logs</span>
                    </button>
                     <button onClick={() => navigate('/admin/settings')} className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                        <FaCogs className="text-2xl text-slate-600 mr-4"/>
                        <span className="font-semibold text-gray-700">Application Settings</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default AdminDashboard;
