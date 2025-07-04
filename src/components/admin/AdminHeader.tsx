import { Menu, Bell, Search, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AdminHeaderProps {
  toggleSidebar: () => void;
}

const AdminHeader = ({ toggleSidebar }: AdminHeaderProps) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      // Get all communities where user is admin
      const { data: adminCommunities } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user?.id)
        .in('role', ['admin', 'co-admin']);

      if (!adminCommunities || adminCommunities.length === 0) {
        setUnreadCount(0);
        return;
      }

      const communityIds = adminCommunities.map(c => c.community_id);

      // Count unread notifications
      const { count, error } = await supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .in('community_id', communityIds)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <button
          className="p-1 mr-4 lg:hidden text-neutral-700 focus:outline-none"
          onClick={toggleSidebar}
        >
          <Menu size={24} />
        </button>
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
          />
          <Search className="absolute left-3 top-2.5 text-neutral-500" size={18} />
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="p-1 rounded-full text-neutral-700 hover:bg-neutral-100 focus:outline-none relative">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        
        <div className="flex items-center">
          <div className="hidden md:block mr-2 text-right">
            <p className="text-sm font-medium text-neutral-800">
              {user?.email?.split('@')[0] || 'Admin User'}
            </p>
            <p className="text-xs text-neutral-500">{user?.email || 'admin@momfit.com'}</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-neutral-200 flex items-center justify-center">
            <User size={18} className="text-neutral-500" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;