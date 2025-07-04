import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RBACRoute from './components/auth/RBACRoute';
import MobileNavigation from './components/navigation/MobileNavigation';
import InstallPWAPrompt from './components/common/InstallPWAPrompt';

// Import pages
import CommunityListPage from './pages/CommunityListPage';
import CommunityPage from './pages/CommunityPage';
import CommunityDashboard from './pages/CommunityDashboard';
import CreateCommunityPage from './pages/CreateCommunityPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import CreateEventPage from './pages/events/CreateEventPage';
import CommunityEventsPage from './pages/CommunityEventsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import UserProfilePage from './pages/UserProfilePage';
import ContactAdminPage from './pages/ContactAdminPage';
import CommunityAdminMessagesPage from './pages/CommunityAdminMessagesPage';
import AIExamplePage from './pages/AIExamplePage';
import NotFoundPage from './pages/NotFoundPage';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';

// Import admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEvents from './pages/admin/AdminEvents';
import AdminGallery from './pages/admin/AdminGallery';
import AdminMessages from './pages/admin/AdminMessages';
import AdminAILearning from './pages/admin/AdminAILearning';

function App() {
  const { user, loading, isAdmin } = useAuth();

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch(error => {
            console.log('ServiceWorker registration failed: ', error);
          });
      });
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        
        {/* Public routes */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/communities" replace />} />
          <Route path="communities" element={<CommunityListPage />} />
          <Route path="communities/create" element={
            <ProtectedRoute>
              <CreateCommunityPage />
            </ProtectedRoute>
          } />
          <Route path="community/:id" element={<CommunityPage />} />
          <Route path="c/:slug/*" element={<CommunityPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="event/:slug" element={<EventDetailPage />} />
          <Route path="user/:username" element={<UserProfilePage />} />
        </Route>

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<CommunityDashboard />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="community/:id/events" element={<CommunityEventsPage />} />
          <Route path="c/:slug/events" element={<CommunityEventsPage />} />
          <Route path="community/:id/events/create" element={<CreateEventPage />} />
          <Route path="contact-admin" element={<ContactAdminPage />} />
          <Route path="community/:id/admin/messages" element={<CommunityAdminMessagesPage />} />
          <Route path="ai-example" element={<AIExamplePage />} />
        </Route>

        {/* Admin routes */}
        {isAdmin && (
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="gallery" element={<AdminGallery />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="ai-learning" element={<AdminAILearning />} />
          </Route>
        )}

        {/* 404 route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      
      {/* Mobile Navigation - only visible on mobile devices */}
      <MobileNavigation />
      
      {/* PWA Install Prompt */}
      <InstallPWAPrompt />
    </>
  );
}

export default App;