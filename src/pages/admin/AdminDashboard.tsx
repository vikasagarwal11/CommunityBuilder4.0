import { Activity, Users, Calendar, Eye, ArrowUpRight, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminDashboardWidgets from '../../components/admin/AdminDashboardWidgets';
import AdminNotificationCenter from '../../components/admin/AdminNotificationCenter';

const AdminDashboard = () => {
  const stats = [
    { id: 1, title: 'Total Users', value: '248', icon: <Users className="h-5 w-5 text-primary-500" />, change: '+12%' },
    { id: 2, title: 'Active Events', value: '16', icon: <Calendar className="h-5 w-5 text-secondary-500" />, change: '+3%' },
    { id: 3, title: 'Page Views', value: '1,389', icon: <Eye className="h-5 w-5 text-emerald-500" />, change: '+24%' },
  ];
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="text-sm text-neutral-500">
          Last updated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-neutral-500 text-sm">{stat.title}</p>
                <p className="text-3xl font-semibold mt-1">{stat.value}</p>
              </div>
              <div className="p-2 rounded-lg bg-neutral-100">
                {stat.icon}
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-500 font-medium">{stat.change}</span>
              <span className="text-neutral-500 ml-1">since last month</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Dashboard Widgets */}
      <AdminDashboardWidgets />
      
      {/* Admin Notification Center */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <AdminNotificationCenter />
      </div>
    </div>
  );
};

export default AdminDashboard;