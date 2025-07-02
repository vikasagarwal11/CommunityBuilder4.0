import React from 'react';
import AdminMessaging from '../../components/admin/AdminMessaging';

const AdminMessages = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Admin Messages</h1>
        <p className="text-neutral-600">Manage secure conversations with users</p>
      </div>
      
      <AdminMessaging />
    </div>
  );
};

export default AdminMessages;