
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaClock, FaTrash, FaCopy, FaEye } from 'react-icons/fa';

const SessionCard = ({ session, onDelete, onDuplicate }) => {
  const navigate = useNavigate();
  const cardBgColor = session.is_active ? 'bg-green-50' : 'bg-white';
  const borderColor = session.is_active ? 'border-green-400' : 'border-gray-200';

  const getSessionStatus = () => {
    const sessionEndDateTime = new Date(`${session.session_date}T${session.end_time}`);
    const isCompleted = new Date() > sessionEndDateTime;

    if (session.is_active) {
      return (
        <div className="flex items-center">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="ml-2 text-sm font-semibold text-green-600">Active</span>
        </div>
      );
    }
    if (isCompleted) {
      return <span className="text-sm font-semibold text-gray-500">Completed</span>;
    }
    return <span className="text-sm font-semibold text-blue-600">Upcoming</span>;
  };

  const handleViewSession = () => {
    navigate(`/lecturer/courses/${session.course_id}/sessions/${session.id}`);
  };

  return (
    <div className={`shadow-lg rounded-lg border ${borderColor} ${cardBgColor} p-4 flex flex-col justify-between`}>
      <div>
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-lg text-gray-800 truncate">{session.topic || 'Session Details'}</h3>
          {getSessionStatus()}
        </div>
        <div className="flex items-center text-gray-600 mb-2">
          <FaCalendarAlt className="mr-2 text-gray-400" />
          <span className="text-sm">{new Date(session.session_date).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center text-gray-600 mb-4">
          <FaClock className="mr-2 text-gray-400" />
          <span className="text-sm">{session.start_time} - {session.end_time}</span>
        </div>

        {/* Attendance rate display */}
        {session.attendanceRate !== undefined && (
            <div className="my-3">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-600">Attendance Rate</span>
                    <span className="text-sm font-bold text-gray-800">{session.attendanceRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${session.attendanceRate}%` }}></div>
                </div>
            </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="mt-4 space-y-2">
        <button 
          onClick={handleViewSession} 
          className="w-full flex items-center justify-center p-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <FaEye className="mr-2" /> View Session
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => onDuplicate(session)} 
            className="flex items-center justify-center p-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none"
          >
            <FaCopy className="mr-1" /> Duplicate
          </button>
          <button 
            onClick={() => onDelete(session.id)} 
            className="flex items-center justify-center p-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200 focus:outline-none"
          >
            <FaTrash className="mr-1" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionCard;
