import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Corrected import paths based on the actual file structure
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/Login';
import Homepage from './components/Homepage'; // Import the Homepage component
import Navbar from './components/Navbar';
import AdminPortal from './components/AdminPortal'; // Import AdminPortal

// Layouts
import LecturerDashboard from './components/lecturer/LecturerDashboard';
import StudentDashboard from './components/student/StudentDashboard';

// Admin Components
import AdminDashboard from './components/admin/AdminDashboard';
import ManageUsers from './components/admin/ManageUsers';
import ManageCourses from './components/admin/ManageCourses';
import ManageSessions from './components/admin/ManageSessions';
import AttendanceReports from './components/admin/AttendanceReports';

// Lecturer Components
import ManageCoursesLecturer from './components/lecturer/ManageCoursesLecturer';
import ManageSessionsLecturer from './components/lecturer/ManageSessionsLecturer';
import ViewAttendanceLecturer from './components/lecturer/ViewAttendanceLecturer';

// Student Components
import ScanQrCode from './components/student/ScanQrCode';
import ViewMyAttendance from './components/student/ViewMyAttendance';
import UpdateProfile from './components/student/UpdateProfile';

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<LoginPage />} />

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
        </Route>

        {/* Lecturer Routes */}
        <Route 
          path="/lecturer" 
          element={<ProtectedRoute roles={['lecturer']}><LecturerDashboard /></ProtectedRoute>}
        >
            <Route index element={<Navigate to="courses" replace />} />
          <Route path="courses" element={<ManageCoursesLecturer />} />
          <Route path="sessions" element={<ManageSessionsLecturer />} />
          <Route path="attendance" element={<ViewAttendanceLecturer />} />
        </Route>

        {/* Student Routes */}
        <Route 
          path="/student" 
          element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>}
        >
          <Route index element={<Navigate to="scan-qr" replace />} />
          <Route path="scan-qr" element={<ScanQrCode />} />
          <Route path="my-attendance" element={<ViewMyAttendance />} />
          <Route path="profile" element={<UpdateProfile />} />
        </Route>

        {/* Default Route - now redirects to homepage */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </AuthProvider>
  );
}

export default App;