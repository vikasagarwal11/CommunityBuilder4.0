import React from 'react';
import { Calendar, Users, Clock, TrendingUp, BarChart2, ArrowRight, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminEventDashboard from './AdminEventDashboard';

interface AdminDashboardWidgetsProps {
  communityId?: string;
}

const AdminDashboardWidgets: React.FC<AdminDashboardWidgetsProps> = ({ communityId }) => {
  return (
    <div className="space-y-8">
      {/* Event Management Widget */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-200">
          <h3 className="text-lg font-semibold flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-primary-500" />
            Event Management
          </h3>
        </div>
        <div className="p-6">
          <AdminEventDashboard communityId={communityId} />
        </div>
      </div>
      
      {/* Other widgets can be added here */}
    </div>
  );
};

export default AdminDashboardWidgets;