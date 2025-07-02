import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  guestAllowed?: boolean;
  previewLimit?: number;
}

const ProtectedRoute = ({ children, guestAllowed = false, previewLimit }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Allow guest access if specified
  if (!user && guestAllowed) {
    return <>{children}</>;
  }

  // Redirect to login for protected routes
  if (!user) {
    // Store the attempted URL for redirect after login
    sessionStorage.setItem('redirectUrl', location.pathname);
    
    return (
      <Navigate 
        to="/login" 
        state={{ 
          from: location,
          message: "Please log in to continue"
        }} 
        replace 
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;