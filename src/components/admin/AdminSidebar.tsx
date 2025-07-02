import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Image, 
  MessageSquare, 
  Users, 
  Brain 
} from 'lucide-react';

const AdminSidebar: React.FC = () => {
  const navLinks = [
    { path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/admin/events', icon: <Calendar size={20} />, label: 'Events' },
    { path: '/admin/gallery', icon: <Image size={20} />, label: 'Gallery' },
    { path: '/admin/messages', icon: <MessageSquare size={20} />, label: 'Messages' },
    { path: '/admin/users', icon: <Users size={20} />, label: 'Users' },
    { path: '/admin/ai-learning', icon: <Brain size={20} />, label: 'AI Learning' },
  ];

  return (
    <div className="w-64 bg-white shadow-lg h-full">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Admin Panel</h2>
        <nav className="space-y-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {link.icon}
              <span className="font-medium">{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default AdminSidebar;