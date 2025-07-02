import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary-500 mb-4">404</h1>
        <h2 className="text-3xl font-semibold mb-6">Page Not Found</h2>
        <p className="text-neutral-600 max-w-md mx-auto mb-8">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <Link 
          to="/" 
          className="btn-primary inline-flex items-center"
        >
          <Home className="mr-2 h-5 w-5" />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;