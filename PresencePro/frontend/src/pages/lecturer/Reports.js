
import React, { useState, useEffect } from 'react';
import { FaChartBar, FaArrowLeft, FaFileAlt, FaUserFriends, FaBook, FaChartLine, FaChartPie, FaHeartbeat, FaTrophy, FaCalendarDay } from 'react-icons/fa';
import { api } from '../../services/api';
import CourseAttendanceReport from './CourseAttendanceReport';
import StudentEngagementReport from './StudentEngagementReport';
import AttendanceTrendsReport from './AttendanceTrendsReport';
import CrossCourseComparisonReport from './CrossCourseComparisonReport';
import AtRiskStudentsReport from './AtRiskStudentsReport';
import TopStudentsReport from './TopStudentsReport'; // Import new component
import WeekdayAnalysisReport from './WeekdayAnalysisReport'; // Import new component

const ReportCard = ({ title, description, onClick, icon }) => (
  <div 
    className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between"
  >
    <div>
        <div className="flex items-center mb-3">
            {icon}
            <h3 className="text-xl font-semibold text-gray-800 ml-3">{title}</h3>
        </div>
      <p className="text-gray-600">{description}</p>
    </div>
    <div className="mt-4 text-right">
      <button 
        onClick={onClick}
        className="text-indigo-600 hover:text-indigo-800 font-medium"
      >
        View Report &rarr;
      </button>
    </div>
  </div>
);

const Reports = () => {
  const [courses, setCourses] = useState([]);
  // Add 'top-students' and 'weekday-analysis' to possible views
  const [activeView, setActiveView] = useState({ type: 'hub' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get('/api/lecturer/courses');
        setCourses(response.data || []);
      } catch (err) {
        setError('Failed to fetch courses. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const renderContent = () => {
    const BackButton = () => (
        <button 
            onClick={() => setActiveView({ type: 'hub' })} 
            className="mb-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
        >
            <FaArrowLeft className="mr-2" />
            Back to Reports Hub
        </button>
    );

    switch (activeView.type) {
        case 'course':
            return (<div><BackButton /><h2 className="text-2xl font-bold text-gray-800 mb-4">Attendance Report for: {activeView.courseName}</h2><CourseAttendanceReport courseId={activeView.courseId} /></div>);
        case 'engagement':
            return (<div><BackButton /><StudentEngagementReport /></div>);
        case 'trends':
            return (<div><BackButton /><AttendanceTrendsReport /></div>);
        case 'comparison':
            return (<div><BackButton /><CrossCourseComparisonReport /></div>);
        case 'at-risk':
            return (<div><BackButton /><AtRiskStudentsReport /></div>);
        case 'top-students': // New case for Top Students
            return (<div><BackButton /><TopStudentsReport /></div>);
        case 'weekday-analysis': // New case for Weekday Analysis
            return (<div><BackButton /><WeekdayAnalysisReport /></div>);
        case 'hub':
        default:
            return (
                <div className="space-y-10">
                    {/* Cross-Course Student Reports */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Cross-Course Student Reports</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                             <ReportCard 
                                title="'At-Risk' Student Identifier"
                                description="Flags students whose attendance has recently dropped significantly."
                                onClick={() => setActiveView({ type: 'at-risk' })}
                                icon={<FaHeartbeat className="text-2xl text-red-500" />}
                            />
                             <ReportCard 
                                title="Student Engagement Deep Dive"
                                description="Categorizes students into engagement tiers based on overall attendance."
                                onClick={() => setActiveView({ type: 'engagement' })}
                                icon={<FaUserFriends className="text-2xl text-indigo-500"/>}
                            />
                            <ReportCard 
                                title="Top Students (Perfect Attendance)"
                                description="Highlights students who have a 100% attendance record."
                                onClick={() => setActiveView({ type: 'top-students' })}
                                icon={<FaTrophy className="text-2xl text-yellow-500" />}
                            />
                        </div>
                    </div>
                    {/* Cross-Course Performance Reports */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Cross-Course Performance Reports</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <ReportCard 
                                title="Cross-Course Comparison"
                                description="Compare attendance rates side-by-side across all your courses."
                                onClick={() => setActiveView({ type: 'comparison' })}
                                icon={<FaChartPie className="text-2xl text-purple-500" />}
                            />
                            <ReportCard 
                                title="Attendance Trends Over Time"
                                description="Visualize the average attendance rate across all courses over the semester."
                                onClick={() => setActiveView({ type: 'trends' })}
                                icon={<FaChartLine className="text-2xl text-blue-500" />}
                            />
                            <ReportCard 
                                title="Attendance Analysis by Weekday"
                                description="Analyze attendance patterns based on the day of the week."
                                onClick={() => setActiveView({ type: 'weekday-analysis' })}
                                icon={<FaCalendarDay className="text-2xl text-orange-500" />}
                            />
                        </div>
                    </div>

                    {/* Course-Specific Reports */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Course-Specific Attendance Reports</h2>
                        {loading && <div className="text-center py-8">Loading courses...</div>}
                        {error && <div className="text-red-500 text-center py-8">{error}</div>}
                        {!loading && !error && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {courses.length > 0 ? (
                                courses.map(course => (
                                <ReportCard 
                                    key={course.id} 
                                    title={course.name}
                                    description="View detailed attendance summary for this specific course."
                                    onClick={() => setActiveView({ type: 'course', courseId: course.id, courseName: course.name })}
                                    icon={<FaBook className="text-2xl text-teal-500"/>}
                                />
                                ))
                            ) : (
                                <div className="col-span-full bg-gray-100 p-8 rounded-lg text-center">
                                    <FaFileAlt className="text-4xl text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-700">No Courses Found</h3>
                                    <p className="text-gray-500 mt-2">You are not assigned to any courses yet.</p>
                                </div>
                            )}
                            </div>
                        )}
                    </div>
                </div>
            );
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-8">
          <FaChartBar className="text-3xl text-indigo-600 mr-4" />
          <h1 className="text-3xl font-bold text-gray-800">Reports Hub</h1>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default Reports;
