
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FaSpinner, FaExclamationCircle } from 'react-icons/fa';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const StudentEngagementReport = () => {
  const [engagementData, setEngagementData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEngagementData = async () => {
      try {
        const response = await api.get('/api/lecturer/student-engagement-report');
        setEngagementData(response.data);
      } catch (err) {
        setError('Failed to fetch student engagement data. Please try again.');
        console.error("Error fetching engagement data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEngagementData();
  }, []);

  const renderStudentList = (students, tier) => {
    if (!students || students.length === 0) {
      return <p className="text-gray-500 italic">No students in this category.</p>;
    }
    return (
      <ul className="divide-y divide-gray-200">
        {students.map(student => (
          <li key={student.student_id} className="py-3 flex justify-between items-center">
            <span className="font-medium text-gray-800">{student.student_name}</span>
            <span className={`px-3 py-1 text-sm rounded-full ${tier === 'High' ? 'bg-green-100 text-green-800' : tier === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
              {student.average_attendance.toFixed(2)}% Avg. Attendance
            </span>
          </li>
        ))}
      </ul>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto" />
        <p className="mt-4 text-gray-600">Analyzing Student Engagement...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  if (!engagementData) {
    return null;
  }

  const highCount = engagementData.high_engagement?.length || 0;
  const mediumCount = engagementData.medium_engagement?.length || 0;
  const lowCount = engagementData.low_engagement?.length || 0;
  const totalStudents = highCount + mediumCount + lowCount;

  const chartData = {
    labels: [`High (${highCount})`, `Medium (${mediumCount})`, `Low (${lowCount})`],
    datasets: [
      {
        label: '# of Students',
        data: [highCount, mediumCount, lowCount],
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(239, 68, 68, 0.7)',
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: `Distribution of ${totalStudents} Students`,
        font: { size: 16 },
      },
    },
  };
  
  if (totalStudents === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Student Engagement Tiers</h2>
        <p className="text-gray-500">No student data is available to generate an engagement report.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Student Engagement Tiers</h2>
      <div className="flex flex-col md:flex-row md:space-x-8 items-center">
        {/* Chart Section */}
        <div className="md:w-1/3 mb-8 md:mb-0">
          <Doughnut data={chartData} options={chartOptions} />
        </div>

        {/* Lists Section */}
        <div className="md:w-2/3 space-y-6 w-full">
          <div>
            <h3 className="text-xl font-semibold text-green-700 mb-3">High Engagement (80%+)</h3>
            {renderStudentList(engagementData.high_engagement, 'High')}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-yellow-700 mb-3">Medium Engagement (50-79%)</h3>
            {renderStudentList(engagementData.medium_engagement, 'Medium')}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-red-700 mb-3 flex items-center">
              <FaExclamationCircle className="mr-2" />
              Low Engagement / At-Risk (&lt;50%)
            </h3>
            {renderStudentList(engagementData.low_engagement, 'Low')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentEngagementReport;
