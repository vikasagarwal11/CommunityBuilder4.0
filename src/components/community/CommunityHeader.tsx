import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Settings, Calendar, MessageSquare, Shield, UserPlus, LogOut, Menu, X, Bot, Bell, Sparkles, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import UserAvatar from '../profile/UserAvatar';
import CommunityAdminEventScheduler from './CommunityAdminEventScheduler';
import CommunitySettings from './CommunitySettings';
import { motion, AnimatePresence } from 'framer-motion';

interface CommunityHeaderProps {
  community: any;
  userRole: string;
  isMember: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onShowSettings?: () => void;
  onShowAdminContact?: () => void;
  onShowDirectMessage?: () => void;
  onShowAIProfile?: () => void;
}

const CommunityHeader = ({ 
  community, 
  userRole, 
  isMember, 
  onJoin, 
  onLeave,
  onShowSettings,
  onShowAdminContact,
  onShowDirectMessage,
  onShowAIProfile
}: CommunityHeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showEventScheduler, setShowEventScheduler] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  
  const isAdmin = userRole === 'admin' || userRole === 'co-admin';

  const handleJoin = async () => {
    if (!user) {
      // Store the community ID in session storage for redirect after login
      sessionStorage.setItem('joinCommunityId', community.id);
      navigate('/login');
      return;
    }

    setJoining(true);
    await onJoin();
    setJoining(false);
  };

  const handleLeave = async () => {
    setLeaving(true);
    await onLeave();
    setLeaving(false);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
    if (onShowSettings) {
      onShowSettings();
    }
  };

  // Generate the shareable URL for this community
  const communityUrl = community.slug 
    ? `${window.location.origin}/c/${community.slug}`
    : `${window.location.origin}/community/${community.id}`;

  // Check if community is inactive
  const isInactive = community.is_active === false;

  const handleEventCreated = (eventId: string) => {
    setShowEventScheduler(false);
    navigate(community.slug 
      ? `/c/${community.slug}/events?event=${eventId}` 
      : `/community/${community.id}/events?event=${eventId}`
    );
  };

  return (
    <header className="bg-white shadow-md border-b border-neutral-200 sticky top-16 z-30">
      {isInactive && (
        <div className="bg-yellow-50 text-yellow-800 p-2 text-center text-sm flex items-center justify-center">
          <AlertTriangle className="h-4 w-4 mr-2" />
          This community is currently deactivated and is only visible to admins
        </div>
      )}
      
      <div className="container max-w-6xl">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <motion.div 
              className="h-12 w-12 rounded-full overflow-hidden bg-neutral-200 mr-3 border-2 border-primary-500"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              {community.image_url ? (
                <img 
                  src={community.image_url} 
                  alt={community.name} 
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-neutral-400" />
                </div>
              )}
            </motion.div>
            <div>
              <div className="flex items-center">
                <h1 className="text-xl font-bold">{community.name}</h1>
                {isMember && (
                  <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                    Member
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-500 hidden sm:block">
                {community.description.length > 60 
                  ? `${community.description.substring(0, 60)}...` 
                  : community.description}
              </p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-2">
            {isMember && (
              <>
                <Link 
                  to={community.slug ? `/c/${community.slug}/events` : `/community/${community.id}/events`}
                  className="px-3 py-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg flex items-center"
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  Events
                </Link>
                
                <button
                  onClick={() => setShowAIChat(true)}
                  className="px-3 py-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg flex items-center"
                >
                  <Bot className="h-5 w-5 mr-2" />
                  AI Chat
                </button>
                
                {onShowAIProfile && (
                  <button
                    onClick={onShowAIProfile}
                    className="px-3 py-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg flex items-center"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    AI Profile
                  </button>
                )}
                
                {onShowDirectMessage && (
                  <button
                    onClick={onShowDirectMessage}
                    className="px-3 py-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg flex items-center"
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Messages
                  </button>
                )}
                
                {onShowAdminContact && (
                  <button
                    onClick={onShowAdminContact}
                    className="px-3 py-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg flex items-center"
                  >
                    <Shield className="h-5 w-5 mr-2" />
                    Contact Admin
                  </button>
                )}
                
                {isAdmin && (
                  <button
                    onClick={handleSettingsClick}
                    className="px-3 py-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg flex items-center"
                  >
                    <Settings className="h-5 w-5 mr-2" />
                    Settings
                  </button>
                )}
                
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Leave
                </button>
              </>
            )}
            
            {!isMember && (
              <motion.button
                onClick={handleJoin}
                disabled={joining}
                className="btn-primary flex items-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <UserPlus className="h-5 w-5 mr-2" />
                {joining ? 'Joining...' : 'Join Community'}
              </motion.button>
            )}
          </div>
          
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
        
        {/* Mobile Navigation */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div 
              className="md:hidden py-3 border-t border-neutral-200"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-2">
                {isMember && (
                  <>
                    <Link 
                      to={community.slug ? `/c/${community.slug}/events` : `/community/${community.id}/events`} 
                      className="block px-3 py-2 rounded-lg text-neutral-700 hover:text-primary-500 hover:bg-neutral-100 flex items-center"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <Calendar className="h-5 w-5 mr-2" />
                      Events
                    </Link>
                    
                    <button
                      onClick={() => {
                        setShowAIChat(true);
                        setShowMobileMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-neutral-700 hover:text-primary-500 hover:bg-neutral-100 flex items-center"
                    >
                      <Bot className="h-5 w-5 mr-2" />
                      AI Chat
                    </button>
                    
                    {onShowAIProfile && (
                      <button
                        onClick={() => {
                          onShowAIProfile();
                          setShowMobileMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-neutral-700 hover:text-primary-500 hover:bg-neutral-100 flex items-center"
                      >
                        <Sparkles className="h-5 w-5 mr-2" />
                        AI Profile
                      </button>
                    )}
                    
                    {onShowDirectMessage && (
                      <button
                        onClick={() => {
                          onShowDirectMessage();
                          setShowMobileMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-neutral-700 hover:text-primary-500 hover:bg-neutral-100 flex items-center"
                      >
                        <MessageSquare className="h-5 w-5 mr-2" />
                        Messages
                      </button>
                    )}
                    
                    {onShowAdminContact && (
                      <button
                        onClick={() => {
                          onShowAdminContact();
                          setShowMobileMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-neutral-700 hover:text-primary-500 hover:bg-neutral-100 flex items-center"
                      >
                        <Shield className="h-5 w-5 mr-2" />
                        Contact Admin
                      </button>
                    )}
                    
                    {isAdmin && (
                      <button
                        onClick={() => {
                          handleSettingsClick();
                          setShowMobileMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-neutral-700 hover:text-primary-500 hover:bg-neutral-100 flex items-center"
                      >
                        <Settings className="h-5 w-5 mr-2" />
                        Settings
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        handleLeave();
                        setShowMobileMenu(false);
                      }}
                      disabled={leaving}
                      className="w-full text-left px-3 py-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center"
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Leave Community
                    </button>
                  </>
                )}
                
                {!isMember && (
                  <button
                    onClick={() => {
                      handleJoin();
                      setShowMobileMenu(false);
                    }}
                    disabled={joining}
                    className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center justify-center"
                  >
                    <UserPlus className="h-5 w-5 mr-2" />
                    {joining ? 'Joining...' : 'Join Community'}
                  </button>
                )}
                
                {/* Share community URL */}
                <div className="px-4 py-2">
                  <p className="text-sm text-neutral-500 mb-2">Share this community:</p>
                  <div className="flex">
                    <input
                      type="text"
                      value={communityUrl}
                      readOnly
                      className="flex-grow text-sm border border-neutral-300 rounded-l-lg px-3 py-2"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(communityUrl);
                        // Could add a toast notification here
                      }}
                      className="bg-primary-500 text-white px-3 py-2 rounded-r-lg"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Event Scheduler Modal */}
      {showEventScheduler && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CommunityAdminEventScheduler
              communityId={community.id}
              onEventCreated={handleEventCreated}
            />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <CommunitySettings
          communityId={community.id}
          communityName={community.name}
          onClose={() => setShowSettings(false)}
        />
      )}
    </header>
  );
};

export default CommunityHeader;