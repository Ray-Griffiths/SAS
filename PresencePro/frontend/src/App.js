
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/Login';
import Homepage from './components/Homepage';
import Navbar from './components/Navbar';
import AdminPortal from './components/AdminPortal';
import ContactForm from './components/ContactForm'; // Import the ContactForm

// ... [rest of the imports] ...

// Layouts & Menus
import StudentDashboard from './components/student/StudentDashboard';
import LecturerMenu from './components/lecturer/LecturerMenu';

// Admin Components
import AdminDashboard from './components/admin/AdminDashboard';
import ManageUsers from './components/admin/ManageUsers';
import ManageCourses from './components/admin/ManageCourses';
import ManageSessions from './components/admin/ManageSessions';
import AttendanceReports from './components/admin/AttendanceReports';
import SystemLogs from './components/admin/SystemLogs';
import Settings from './components/admin/Settings';

// Lecturer Components
import LecturerDashboard from './components/lecturer/LecturerDashboard';
import ManageCoursesLecturer from './components/lecturer/ManageCoursesLecturer';
import ManageSessionsLecturer from './components/lecturer/ManageSessionsLecturer';
import ManageCourseStudents from './components/lecturer/ManageCourseStudents';
import ViewSessions from './components/lecturer/ViewSessions';
import SessionDetails from './components/lecturer/SessionDetails';
import LecturerProfile from './components/lecturer/LecturerProfile';
import StudentDirectory from './pages/lecturer/StudentDirectory';
import Reports from './pages/lecturer/Reports';

// Student Components
import ScanQrCode from './components/student/ScanQrCode';
import ViewMyAttendance from './components/student/ViewMyAttendance';
import UpdateProfile from './components/student/UpdateProfile';

// New Layout for the Lecturer section
const LecturerLayout = () => (
  <div className="flex h-screen bg-gray-100">
    <LecturerMenu />
    <main className="flex-grow p-8 overflow-auto">
      <Outlet />
    </main>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/contact" element={<ContactForm />} /> {/* Add the contact route */}

        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={<ProtectedRoute roles={['admin']}><AdminPortal /></ProtectedRoute>}
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="courses" element={<ManageCourses />} />
          <Route path="sessions" element={<ManageSessions />} />
          <Route path="reports" element={<AttendanceReports />} />
          <Route path="system-logs" element={<SystemLogs />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* --- UPDATED LECTURER ROUTES --- */}
        <Route 
          path="/lecturer" 
          element={<ProtectedRoute roles={['lecturer', 'admin']}><LecturerLayout /></ProtectedRoute>}
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<LecturerDashboard />} />
          <Route path="courses" element={<ManageCoursesLecturer />} />
          <Route path="student-directory" element={<StudentDirectory />} />
          <Route path="courses/:courseId/students" element={<ManageCourseStudents />} />
          <Route path="courses/:courseId/sessions" element={<ViewSessions />} />
          <Route path="courses/:courseId/sessions/:sessionId" element={<SessionDetails />} />
          <Route path="sessions" element={<ManageSessionsLecturer />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<LecturerProfile />} />
        </Route>

        {/* --- FIX: Public Route for QR Code Scanning --- */}
        <Route path="/student/scan-qr" element={<ScanQrCode />} />

        {/* --- FIX: Protected Student Routes --- */}
        <Route 
          path="/student" 
          element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>}
        >
          <Route index element={<Navigate to="my-attendance" replace />} />
          <Route path="my-attendance" element={<ViewMyAttendance />} />
          <Route path="profile" element={<UpdateProfile />} />
        </Route>

        {/* Default Route */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </AuthProvider>
  );
}

export default App;
