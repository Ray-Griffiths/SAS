
import React from 'react';
import { FaCalendarAlt, FaClock, FaQrcode, FaListAlt, FaEdit, FaTrash, FaCopy, FaUsers, FaChartBar } from 'react-icons/fa';

const SessionCard = ({ session, onEdit, onGenerateQR, onViewAttendance, onDelete, onDuplicate, attendanceCount, attendanceRate }) => {
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

  const isCompleted = new Date(`${session.session_date}T${session.end_time}`) < new Date();

  return (
    <div className={`shadow-lg rounded-lg border ${borderColor} ${cardBgColor} p-4 flex flex-col justify-between`}>
      <div>
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-lg text-gray-800 truncate">Session Details</h3>
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
        
        {/* Real-time attendance counter for active sessions */}
        {session.is_active && attendanceCount !== undefined && (
          <div className="flex items-center text-gray-700 mb-4 p-2 bg-green-100 rounded-lg">
            <FaUsers className="mr-2 text-green-600" />
            <span className="text-sm font-semibold">{attendanceCount} students checked in</span>
          </div>
        )}

        {/* Attendance rate for completed sessions */}
        {isCompleted && attendanceRate !== undefined && (
            <div className="my-3">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-600">Attendance Rate</span>
                    <span className="text-sm font-bold text-gray-800">{attendanceRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${attendanceRate}%` }}></div>
                </div>
            </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={() => onViewAttendance(session)} className="flex items-center justify-center p-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <FaListAlt className="mr-1" /> View Attendance
        </button>
        <button onClick={() => onGenerateQR(session)} className={`flex items-center justify-center p-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${session.is_active || isCompleted ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`} disabled={session.is_active || isCompleted}>
          <FaQrcode className="mr-1" /> {session.is_active ? 'Active' : 'Generate QR'}
        </button>
        <button onClick={() => onEdit(session)} className="flex items-center justify-center p-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none">
          <FaEdit className="mr-1" /> Edit
        </button>
        <button onClick={() => onDuplicate(session)} className="flex items-center justify-center p-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none">
          <FaCopy className="mr-1" /> Duplicate
        </button>
        <button onClick={() => onDelete(session.id)} className="col-span-2 flex items-center justify-center p-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200 focus:outline-none">
          <FaTrash className="mr-1" /> Delete Session
        </button>
      </div>
    </div>
  );
};

export default SessionCard;
