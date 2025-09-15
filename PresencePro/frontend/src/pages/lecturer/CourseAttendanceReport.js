
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FaDownload, FaSpinner } from 'react-icons/fa';

const CourseAttendanceReport = ({ courseId }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!courseId) return;

    const fetchReport = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/api/courses/${courseId}/attendance/summary`);
        setReportData(response.data);
      } catch (err) {
        setError('Failed to generate the report. Please try again.');
        console.error("Error generating report:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [courseId]);

  const handleExport = () => {
    if (!reportData || !reportData.students_summary) return;

    const headers = ["Student ID", "Student Name", "Attended Sessions", "Attendance Rate (%)"];
    const csvRows = [
      headers.join(','),
      ...reportData.students_summary.map(row => 
        [row.student_id, `"${row.student_name}"`, row.attended_sessions, row.attendance_rate].join(',')
      )
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${reportData.course_name}_attendance_summary.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
        <div className="text-center py-12">
            <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto" />
            <p className="mt-4 text-gray-600">Generating Your Report...</p>
        </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  if (!reportData) {
    return null; // Or some placeholder if you prefer
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <div>
            <h3 className="text-xl font-bold text-gray-800">{reportData.course_name}</h3>
            <p className="text-gray-600">
                Overall Attendance Rate: <span className="font-bold">{reportData.average_attendance}%</span> |
                Total Sessions: <span className="font-bold">{reportData.total_sessions}</span>
            </p>
        </div>
        <button
          onClick={handleExport}
          disabled={!reportData || reportData.students_summary.length === 0}
          className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-green-400 transition duration-300 flex items-center"
        >
          <FaDownload className="mr-2" />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attended Sessions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance Rate</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reportData.students_summary.length > 0 ? (
              reportData.students_summary.map(student => (
                <tr key={student.student_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.student_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.student_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.attended_sessions} / {reportData.total_sessions}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.attendance_rate}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-8 text-gray-500">No students enrolled in this course.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CourseAttendanceReport;
