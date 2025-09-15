
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { FaSpinner } from 'react-icons/fa';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const CrossCourseComparisonReport = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      setError('');
      try {
        // This endpoint already exists and provides the data we need.
        const response = await api.get('/api/lecturer/dashboard-charts');
        const data = response.data.courseAttendance;

        if (!data || data.length === 0) {
            setError('No course attendance data is available to generate a comparison.');
            setLoading(false);
            return;
        }

        setChartData({
          labels: data.map(course => course.name),
          datasets: [
            {
              label: 'Average Attendance Rate (%)',
              data: data.map(course => course.attendance),
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1,
            },
          ],
        });
      } catch (err) {
        setError('Failed to fetch cross-course comparison data.');
        console.error("Error fetching cross-course comparison data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Average Attendance Rate by Course',
        font: {
            size: 18
        }
      },
       tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.y !== null) {
                        label += context.parsed.y + '%';
                    }
                    return label;
                }
            }
        }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
            display: true,
            text: 'Average Attendance (%)'
        }
      },
      x: {
          title: {
              display: true,
              text: 'Courses'
          }
      }
    }
  };

  if (loading) {
    return (
        <div className="text-center py-12">
            <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading Comparison Report...</p>
        </div>
    );
  }

  if (error) {
    return <div className="text-red-500 bg-red-100 p-4 rounded-lg text-center py-8">{error}</div>;
  }

  if (!chartData) {
    return <div className="text-center py-8 text-gray-500">No data available to display the report.</div>;
  }

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
      <Bar options={options} data={chartData} />
    </div>
  );
};

export default CrossCourseComparisonReport;
