import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminMenu from './admin/AdminMenu';

const AdminPortal = () => {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <AdminMenu />
      <main className="flex-grow p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminPortal;
