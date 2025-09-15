
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FaSpinner, FaTrophy } from 'react-icons/fa';

const TopStudentsReport = () => {
  const [topStudents, setTopStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTopStudents = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/api/lecturer/top-students');
        setTopStudents(response.data || []);
      } catch (err) {
        setError('Failed to fetch top students data.');
        console.error("Error fetching top students:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopStudents();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto" />
        <p className="mt-4 text-gray-600">Searching for Top Students...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 bg-red-100 p-4 rounded-lg text-center py-8">{error}</div>;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center mb-4">
        <FaTrophy className="text-2xl text-yellow-500 mr-3" />
        <h3 className="text-xl font-bold text-gray-800">Top Students (100% Attendance)</h3>
      </div>
      <p className="text-gray-600 mb-6">
        This report highlights students who have maintained a perfect attendance record across all sessions in the courses you teach.
      </p>

      {topStudents.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Attended Sessions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topStudents.map(student => (
                <tr key={student.student_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.student_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.student_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{student.attended_sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No students have a 100% attendance record at this time.</p>
        </div>
      )}
    </div>
  );
};

export default TopStudentsReport;
