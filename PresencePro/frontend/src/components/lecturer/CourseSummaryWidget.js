
import React from 'react';
import { FaUsers, FaChartBar, FaCalendarCheck } from 'react-icons/fa';

const CourseSummaryWidget = ({ averageAttendance, totalSessions, studentCount }) => {
  const stats = [
    {
      icon: <FaChartBar className="text-blue-500" size="1.5em" />,
      label: 'Average Attendance',
      value: `${averageAttendance}%`,
      color: 'text-blue-600'
    },
    {
      icon: <FaCalendarCheck className="text-green-500" size="1.5em" />,
      label: 'Total Sessions',
      value: totalSessions,
      color: 'text-green-600'
    },
    {
      icon: <FaUsers className="text-indigo-500" size="1.5em" />,
      label: 'Enrolled Students',
      value: studentCount,
      color: 'text-indigo-600'
    }
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Course Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="mr-4">
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseSummaryWidget;
