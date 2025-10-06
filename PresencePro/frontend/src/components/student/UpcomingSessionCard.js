
import React from 'react';
import { FaCalendarAlt, FaClock, FaBook } from 'react-icons/fa';

const UpcomingSessionCard = ({ session }) => {
  if (!session) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-md text-gray-800 truncate">{session.course_name}</h3>
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Upcoming</span>
        </div>
        <div className="flex items-center text-gray-600 mb-2">
          <FaBook className="mr-2 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{session.topic || 'No topic'}</span>
        </div>
        <div className="flex items-center text-gray-500 mb-1">
          <FaCalendarAlt className="mr-2 text-gray-400" />
          <span className="text-sm">{new Date(session.session_date).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center text-gray-500">
          <FaClock className="mr-2 text-gray-400" />
          <span className="text-sm">{session.start_time} - {session.end_time}</span>
        </div>
      </div>
    </div>
  );
};

export default UpcomingSessionCard;
