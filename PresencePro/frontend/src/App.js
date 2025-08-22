import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Homepage from './components/Homepage';
import Login from './components/Login';
import Navbar from './components/Navbar'; 
import ContactForm from './components/ContactForm'; 
import AdminDashboard from './components/admin/AdminDashboard'; 
import LecturerDashboard from './components/lecturer/LecturerDashboard'; 
import StudentPortal from './components/StudentPortal';
import ProtectedRoute from './components/ProtectedRoute'; 
import { AuthProvider } from './context/AuthContext'; 
import './styles/App.css';
import './index.css';

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Navbar />

        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Homepage />} />
          <Route path="/contact" element={<ContactForm />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/admin/*"
            element={<ProtectedRoute element={<AdminDashboard />} />}
          />

          <Route
            path="/lecturer/*"
            element={<ProtectedRoute element={<LecturerDashboard />} />}
          />

          <Route
            path="/student/*"
            element={<ProtectedRoute element={<StudentPortal />} />}
          />
        </Routes>
      </AuthProvider>
    </div>
  );
}

export default App;
