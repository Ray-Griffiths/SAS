import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { FaDownload, FaSpinner, FaExclamationCircle, FaUsers, FaClipboardList, FaPercentage, FaArrowLeft, FaUserCheck } from 'react-icons/fa';

// This component is the dedicated page for showing the detailed attendance summary for a single course.
const CourseAttendanceSummary = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Effect to fetch the attendance summary when the component mounts or courseId changes
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/api/courses/${courseId}/attendance/summary`);
        setSummary(response.data);
      } catch (err) {
        const errorMessage = err.response?.data?.message || `Failed to fetch attendance summary: ${err.message}`;
        setError(errorMessage);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [courseId]);

  const handleExport = () => {
    if (!summary || !summary.students_summary) return;

    const headers = ["Student ID", "Student Name", "Attended Sessions", "Attendance Rate (%)"];
    const csvRows = [headers.join(',')];

    summary.students_summary.forEach(student => {
      const row = [
        student.student_id,
        `"${student.student_name}"`,
        student.attended_sessions,
        student.attendance_rate
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${summary.course_name}_attendance_summary.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAttendanceRateColor = (rate) => {
    if (rate < 50) return 'text-red-600';
    if (rate < 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <FaSpinner className="animate-spin text-4xl text-blue-500" />
        <p className="ml-4 text-lg text-gray-600">Loading Attendance Summary...</p>
      </div>
    );
  }

  if (error) {
    return (
        <div className="text-center p-8 bg-red-50 rounded-lg shadow-md max-w-2xl mx-auto">
            <FaExclamationCircle className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-4 text-xl font-semibold text-red-800">An Error Occurred</h3>
            <p className="mt-2 text-md text-red-600">{error}</p>
            <button onClick={() => navigate(-1)} className="mt-6 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                <FaArrowLeft className="mr-2" />
                Go Back
            </button>
        </div>
    );
  }

  if (!summary) {
    return null; // Should be handled by loading/error states
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
            <div>
                <button onClick={() => navigate('/lecturer/attendance')} className="inline-flex items-center text-sm text-gray-600 hover:text-indigo-600 mb-2">
                    <FaArrowLeft className="mr-2" />
                    Back to Course Selection
                </button>
                <h2 className="text-3xl font-bold text-gray-800">{summary.course_name}</h2>
                <p className="text-gray-600">Attendance Summary</p>
            </div>
            <button
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
                disabled={!summary.students_summary || summary.students_summary.length === 0}
            >
                <FaDownload className="mr-2" />
                Export CSV
            </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-md flex items-center">
                <div className="bg-blue-100 p-4 rounded-full">
                    <FaUsers className="text-blue-500 text-2xl" />
                </div>
                <div className="ml-4">
                    <p className="text-gray-500 text-sm">Enrolled Students</p>
                    <p className="text-2xl font-bold text-gray-800">{summary.students_summary.length}</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md flex items-center">
                <div className="bg-green-100 p-4 rounded-full">
                    <FaClipboardList className="text-green-500 text-2xl" />
                </div>
                <div className="ml-4">
                    <p className="text-gray-500 text-sm">Total Sessions</p>
                    <p className="text-2xl font-bold text-gray-800">{summary.total_sessions}</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md flex items-center">
                <div className="bg-yellow-100 p-4 rounded-full">
                    <FaPercentage className="text-yellow-500 text-2xl" />
                </div>
                <div className="ml-4">
                    <p className="text-gray-500 text-sm">Average Attendance</p>
                    <p className="text-2xl font-bold text-gray-800">{summary.average_attendance}%</p>
                </div>
            </div>
        </div>
        
        {/* Student Breakdown Table */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Student Breakdown</h3>
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attended Sessions</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance Rate</th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {summary.students_summary.length > 0 ? (
                    summary.students_summary.map(student => (
                    <tr key={student.student_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-200 rounded-full">
                                    <FaUserCheck className="text-gray-500"/>
                                </div>
                                <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{student.student_name}</div>
                                    <div className="text-sm text-gray-500">ID: {student.student_id}</div>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.attended_sessions} / {summary.total_sessions}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${getAttendanceRateColor(student.attendance_rate)}`}>{student.attendance_rate}%</td>
                    </tr>
                    ))
                ) : (
                    <tr>
                    <td colSpan="3" className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
                        <FaUsers className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">No Students Enrolled</h3>
                        <p className="mt-2 text-sm text-gray-500">
                            Once students are enrolled, their attendance summary will appear here.
                        </p>
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CourseAttendanceSummary;
