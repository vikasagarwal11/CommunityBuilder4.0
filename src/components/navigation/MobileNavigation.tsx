import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, User, Menu, MessageSquare, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileFeatures } from '../../hooks/useMobileFeatures';

const MobileNavigation = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [showMenu, setShowMenu] = React.useState(false);
  const { isNative, platform } = useMobileFeatures();

  if (!user) return null; // Don't show navigation for non-logged in users

  // Add bottom padding for iOS devices
  const iosSafeAreaClass = isNative && platform === 'ios' ? 'ios-safe-area-bottom' : '';

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 py-2 px-4 flex justify-around items-center z-50 md:hidden ${iosSafeAreaClass}`}>
        <Link 
          to="/communities" 
          className={`flex flex-col items-center justify-center p-2 ${
            location.pathname === '/communities' || location.pathname === '/' 
              ? 'text-primary-500' 
              : 'text-neutral-600'
          }`}
        >
          <Home className="h-6 w-6" />
          <span className="text-xs mt-1">Home</span>
        </Link>
        
        <Link 
          to="/events" 
          className={`flex flex-col items-center justify-center p-2 ${
            location.pathname.includes('/events') 
              ? 'text-primary-500' 
              : 'text-neutral-600'
          }`}
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs mt-1">Events</span>
        </Link>
        
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex flex-col items-center justify-center p-2 text-neutral-600 relative"
        >
          <Menu className="h-6 w-6" />
          <span className="text-xs mt-1">Menu</span>
        </button>
        
        <Link 
          to="/profile" 
          className={`flex flex-col items-center justify-center p-2 ${
            location.pathname.includes('/profile') 
              ? 'text-primary-500' 
              : 'text-neutral-600'
          }`}
        >
          <User className="h-6 w-6" />
          <span className="text-xs mt-1">Profile</span>
        </Link>
      </nav>

      {/* Expanded Menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div 
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`absolute bottom-16 left-4 right-4 bg-white rounded-xl shadow-lg overflow-hidden ${iosSafeAreaClass}`}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 500 }}
            >
              <div className="flex justify-between items-center p-4 border-b border-neutral-200">
                <h3 className="font-semibold">Menu</h3>
                <button 
                  onClick={() => setShowMenu(false)}
                  className="p-2 text-neutral-500 hover:text-neutral-700 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-2">
                <Link 
                  to="/communities" 
                  className="flex items-center p-3 rounded-lg hover:bg-neutral-100"
                  onClick={() => setShowMenu(false)}
                >
                  <Users className="h-5 w-5 mr-3 text-primary-500" />
                  <span>Communities</span>
                </Link>
                
                <Link 
                  to="/contact-admin" 
                  className="flex items-center p-3 rounded-lg hover:bg-neutral-100"
                  onClick={() => setShowMenu(false)}
                >
                  <MessageSquare className="h-5 w-5 mr-3 text-blue-500" />
                  <span>Contact Admin</span>
                </Link>
                
                <Link 
                  to="/profile?tab=preferences" 
                  className="flex items-center p-3 rounded-lg hover:bg-neutral-100"
                  onClick={() => setShowMenu(false)}
                >
                  <Bell className="h-5 w-5 mr-3 text-purple-500" />
                  <span>Notifications</span>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileNavigation;