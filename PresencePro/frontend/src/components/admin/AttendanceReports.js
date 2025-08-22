import React, { useEffect, useState } from 'react';
import { getAttendanceReport, getCourses } from '../../services/api';
import { Bar } from 'react-chartjs-2'; // Assuming you are using react-chartjs-2

const AttendanceReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
 // Implement state for storing report data, loading state, and error messages.
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
 // Use useEffect to fetch report data when the component mounts or when filters change (if filtering is implemented later).
        const response = await getReports();
        if (response && response.reports) {
          setReports(response.reports); // Assuming the reports are in a 'reports' key
        } else {
          setError(response.message || 'Failed to fetch attendance reports.');
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
        setError('An error occurred while fetching reports.');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
 // Render the report data in a user-friendly format (e.g., tables, charts - though simple tables are sufficient for now).
 // Include basic error and loading indicators. If filtering by course is supported by the backend, you might also need state for the selected course and a dropdown to select a course, and potentially fetch the list of courses for filtering.
 // Corrected named import
 // Placeholder API call to fetch reports (replace with actual call using getAttendanceReport)
 // Assuming api.getReports() now returns an array of objects with
 // properties like session, date, present, and absent
 // Use the directly imported getReports function
  }, []);

  // Chart Data Preparation
  const chartData = {
    labels: reports.map(report => report.session),
    datasets: [
      {
        label: 'Present',
        data: reports.map(report => report.present),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
      {
        label: 'Absent',
        data: reports.map(report => report.absent),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Chart Options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Session Attendance Overview',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };


  if (loading) {
    return <div className="p-4 text-center">Loading reports...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error loading reports.</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Attendance Reports</h2>

      {/* Placeholder for Charts */}
      <div className="mb-8">
        <div className="bg-white p-4 shadow rounded">
          <h3 className="text-xl font-semibold mb-2">Attendance Overview Chart</h3>
          {reports.length > 0 ? <Bar data={chartData} options={chartOptions} /> : <p className="text-gray-600">No data available for chart.</p>}
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-4">Detailed Reports Table</h3>
      {reports.length === 0 ? (
        <div className="text-center text-gray-600">No reports available.</div>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report, index) => (
                <tr key={index}> {/* Using index as key for simplicity, replace with unique ID if available */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.session}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.present}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.absent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AttendanceReports;
