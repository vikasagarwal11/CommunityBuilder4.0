import React, { useState } from 'react';
import { Calendar, Users, Wand2, Plus, ArrowRight } from 'lucide-react';
import AdminEventManagement from '../../components/admin/AdminEventManagement';

const AdminEvents = () => {
  return (
    <div className="p-6">
      <AdminEventManagement />
    </div>
  );
};

export default AdminEvents;