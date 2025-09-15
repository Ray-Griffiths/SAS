
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

const AtRiskStudentsReport = () => {
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAtRiskStudents = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/api/lecturer/at-risk-students');
        setAtRiskStudents(response.data || []);
      } catch (err) {
        setError('Failed to fetch at-risk students data. Please ensure the backend is running correctly.');
        console.error("Error fetching at-risk students:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAtRiskStudents();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto" />
        <p className="mt-4 text-gray-600">Identifying At-Risk Students...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 bg-red-100 p-4 rounded-lg text-center py-8">{error}</div>;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center mb-4">
        <FaExclamationTriangle className="text-2xl text-yellow-500 mr-3" />
        <h3 className="text-xl font-bold text-gray-800">At-Risk Students Report</h3>
      </div>
      <p className="text-gray-600 mb-6">
        This report flags students whose attendance rate in the last 3 weeks has dropped by 25 percentage points or more compared to their overall average.
      </p>

      {atRiskStudents.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recent Rate (3 wks)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drop</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {atRiskStudents.map(student => (
                <tr key={student.student_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.student_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.student_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.overall_attendance_rate}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-yellow-600">{student.recent_attendance_rate}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">-{student.drop}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No students currently meet the criteria for being at-risk.</p>
        </div>
      )}
    </div>
  );
};

export default AtRiskStudentsReport;
