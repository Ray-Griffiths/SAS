import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import CollapsibleSidebar from './layout/CollapsibleSidebar';
import {
  HomeIcon,
  BookOpenIcon,
  UsersIcon,
  PresentationChartLineIcon,
  DocumentChartBarIcon, 
  UserCircleIcon,
  Bars3Icon, // 1. Import Hamburger Icon
} from '@heroicons/react/24/solid';

// Navigation links remain the same
const lecturerNavLinks = [
  { to: '/lecturer/dashboard', label: 'Dashboard', icon: <HomeIcon className="h-6 w-6" /> },
  { to: '/lecturer/courses', label: 'Courses', icon: <BookOpenIcon className="h-6 w-6" /> },
  { to: '/lecturer/student-directory', label: 'Students', icon: <UsersIcon className="h-6 w-6" /> },
  { to: '/lecturer/sessions', label: 'Sessions', icon: <PresentationChartLineIcon className="h-6 w-6" /> },
  { to: '/lecturer/reports', label: 'Reports', icon: <DocumentChartBarIcon className="h-6 w-6" /> },
  { to: '/lecturer/profile', label: 'Profile', icon: <UserCircleIcon className="h-6 w-6" /> },
];

function LecturerPortal() {
  // 2. State to manage the sidebar visibility on mobile
  const [isMobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative md:flex h-screen bg-gray-100 font-sans">

      {/* 3. Pass the mobile state to the now-responsive sidebar */}
      <CollapsibleSidebar 
        title="Lecturer Portal" 
        navLinks={lecturerNavLinks} 
        isMobileOpen={isMobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* 4. Mobile Header with Hamburger Button */}
        <header className="md:hidden bg-white shadow-sm p-4 flex items-center">
          <button onClick={() => setMobileOpen(true)} className="text-gray-500 focus:outline-none">
            <Bars3Icon className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-800 ml-4">Lecturer Portal</h1>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          <Outlet />
        </main>
        
      </div>
    </div>
  );
}

export default LecturerPortal;
