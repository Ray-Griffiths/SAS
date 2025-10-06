
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api'; 
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';

const EngagementScoreWidget = ({ score, tier, message }) => {
    const getTierColor = (tierName) => {
        switch (tierName) {
            case 'High': return 'text-green-500';
            case 'Medium': return 'text-yellow-500';
            case 'Low': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg text-center mb-8">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Overall Engagement</h3>
            <div className={`text-6xl font-bold ${getTierColor(tier)}`}>{score}%</div>
            <p className="text-gray-600 mt-2">{message}</p>
        </div>
    );
};

const CourseAttendanceChart = ({ data }) => (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Attendance by Course</h3>
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <XAxis type="number" domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
                <YAxis type="category" dataKey="course_name" width={100} interval={0} />
                <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                <Legend />
                <Bar dataKey="attendance_rate" name="Attendance Rate" fill="#3B82F6">
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.attendance_rate < 50 ? '#EF4444' : entry.attendance_rate < 80 ? '#F59E0B' : '#10B981'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
);

const AttendanceHistoryTable = ({ records }) => (
    <div className="overflow-x-auto bg-white rounded-lg shadow-md mt-8">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lecturer</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {records.length > 0 ? records.map((record) => (
                    <tr key={record.attendance_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.course_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(record.session_date).toLocaleDateString()} - {record.session_start_time}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.lecturer_name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <span className={`py-1 px-3 rounded-full text-xs ${record.attendance_status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {record.attendance_status}
                            </span>
                        </td>
                    </tr>
                )) : (
                    <tr>
                        <td colSpan="4" className="text-center py-6 text-gray-600">No attendance records found.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const AttendanceTrends = ({ heatmapData, weeklyTrendData }) => (
    <div className="bg-white p-6 rounded-lg shadow-lg mt-8">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Attendance Trends (Last 90 Days)</h3>
        <div className="mb-8">
            <h4 className="text-lg font-medium text-gray-600 mb-2">Daily Attendance Heatmap</h4>
            <CalendarHeatmap
                startDate={new Date(new Date().setDate(new Date().getDate() - 90))}
                endDate={new Date()}
                values={heatmapData}
                classForValue={(value) => {
                    if (!value) return 'color-empty';
                    return `color-scale-${Math.min(value.count, 4)}`;
                }}
            />
        </div>
        <div>
            <h4 className="text-lg font-medium text-gray-600 mb-2">Weekly Attendance Rate</h4>
            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={weeklyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
                    <Tooltip formatter={(value) => `${value.toFixed(0)}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="attendance" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const ViewMyAttendance = () => {
    const [engagement, setEngagement] = useState(null);
    const [courseBreakdown, setCourseBreakdown] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [trends, setTrends] = useState({ heatmap_data: [], weekly_trend_data: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        const fetchAttendanceData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const [engagementRes, coursesRes, trendsRes, recordsRes] = await Promise.all([
                    api.get('/api/my-engagement'),
                    api.get('/api/courses'),
                    api.get('/api/my-attendance-trends'),
                    api.get('/api/my-attendance')
                ]);

                setEngagement(engagementRes.data);
                setTrends(trendsRes.data);
                setAttendanceRecords(recordsRes.data);

                const courseAttendancePromises = coursesRes.data.courses.map(course =>
                    api.get(`/api/my-attendance?course_id=${course.id}`)
                );
                const courseAttendanceResults = await Promise.all(courseAttendancePromises);

                const breakdown = coursesRes.data.courses.map((course, index) => {
                    const attended = courseAttendanceResults[index].data.length;
                    return {
                        course_name: course.name,
                        attendance_rate: attended > 0 ? (attended / (course.total_sessions || 1)) * 100 : 0,
                    };
                });
                setCourseBreakdown(breakdown.filter(c => c.total_sessions !== 'N/A'));

            } catch (err) {
                console.error("Error fetching attendance data:", err);
                setError("We couldn't load your detailed attendance data. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchAttendanceData();
    }, [user]);

    if (loading) {
        return <div className="text-center p-12">Loading your attendance analysis...</div>;
    }

    if (error) {
        return <div className="bg-red-100 text-red-700 p-6 rounded-lg shadow-md">{error}</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">My Attendance Dashboard</h2>
            {engagement && <EngagementScoreWidget score={engagement.engagement_score} tier={engagement.engagement_tier} message={engagement.message} />}
            {courseBreakdown.length > 0 && <CourseAttendanceChart data={courseBreakdown} />}
            <AttendanceTrends heatmapData={trends.heatmap_data} weeklyTrendData={trends.weekly_trend_data} />
            <AttendanceHistoryTable records={attendanceRecords} />
        </div>
    );
};

export default ViewMyAttendance;
