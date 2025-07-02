import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

interface RBACRouteProps {
  children: React.ReactNode;
  requiredRoles: string[];
  fallbackPath?: string;
}

const RBACRoute = ({ 
  children, 
  requiredRoles,
  fallbackPath = '/login'
}: RBACRouteProps) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Check if user is authenticated
  if (!user) {
    // Store the attempted URL for redirect after login
    sessionStorage.setItem('redirectUrl', location.pathname);
    
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // For now, we're just checking isAdmin
  // In a more complex system, we would check specific roles
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RBACRoute;