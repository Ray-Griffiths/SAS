
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { FaSpinner, FaCalendarDay } from 'react-icons/fa';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const WeekdayAnalysisReport = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/api/lecturer/weekday-analysis');
        const data = response.data;

        if (!data || data.labels.length === 0) {
            setError('No data available to generate a weekday analysis.');
            setLoading(false);
            return;
        }

        setChartData({
          labels: data.labels,
          datasets: [
            {
              label: 'Average Attendance Rate (%)',
              data: data.values,
              backgroundColor: 'rgba(255, 159, 64, 0.6)',
              borderColor: 'rgba(255, 159, 64, 1)',
              borderWidth: 1,
            },
          ],
        });
      } catch (err) {
        setError('Failed to fetch weekday analysis data.');
        console.error("Error fetching weekday analysis data:", err);
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
        display: false, // Hide legend for a cleaner look with a single dataset
      },
      title: {
        display: true,
        text: 'Average Attendance Rate by Day of the Week',
        font: {
            size: 18
        }
      },
      tooltip: {
            callbacks: {
                label: function(context) {
                    return `Average Attendance: ${context.parsed.y.toFixed(2)}%`;
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
            text: 'Average Attendance Rate (%)'
        }
      }
    }
  };

  if (loading) {
    return (
        <div className="text-center py-12">
            <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto" />
            <p className="mt-4 text-gray-600">Analyzing Weekday Performance...</p>
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
       <div className="flex items-center mb-4">
        <FaCalendarDay className="text-2xl text-orange-500 mr-3" />
        <h3 className="text-xl font-bold text-gray-800">Weekday Attendance Analysis</h3>
      </div>
      <Bar options={options} data={chartData} />
    </div>
  );
};

export default WeekdayAnalysisReport;
