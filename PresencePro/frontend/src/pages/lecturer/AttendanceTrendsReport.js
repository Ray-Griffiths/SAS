
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { FaSpinner } from 'react-icons/fa';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const AttendanceTrendsReport = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      setError('');
      try {
        // This endpoint needs to be created in the backend.
        // It should return data in the format: { labels: ['Week 1', ...], values: [85, ...] }
        const response = await api.get('/api/lecturer/attendance/trends');
        const data = response.data;

        setChartData({
          labels: data.labels,
          datasets: [
            {
              label: 'Average Attendance Rate (%)',
              data: data.values,
              fill: true,
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
            },
          ],
        });
      } catch (err) {
        setError('Failed to fetch attendance trends. The backend endpoint might not be implemented yet.');
        console.error("Error fetching attendance trends:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, []);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Average Attendance Trends Over Time',
        font: {
            size: 18
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
            display: true,
            text: 'Average Attendance (%)'
        }
      }
    }
  };

  if (loading) {
    return (
        <div className="text-center py-12">
            <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading Attendance Trends...</p>
        </div>
    );
  }

  if (error) {
    return <div className="text-red-500 bg-red-100 p-4 rounded-lg text-center py-8">{error}</div>;
  }

  if (!chartData || !chartData.labels || chartData.labels.length === 0) {
    return <div className="text-center py-8 text-gray-500">No attendance data available to show trends.</div>;
  }

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
      <Line options={options} data={chartData} />
    </div>
  );
};

export default AttendanceTrendsReport;
