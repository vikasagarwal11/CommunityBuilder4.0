import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, AlertCircle, UserPlus } from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginForm = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('');
      await signIn(data.email, data.password);
      
      // Check for stored redirect URL first
      const redirectUrl = sessionStorage.getItem('redirectUrl');
      if (redirectUrl) {
        sessionStorage.removeItem('redirectUrl');
        navigate(redirectUrl);
        return;
      }

      // Check for community join intent
      const joinCommunityId = sessionStorage.getItem('joinCommunityId');
      if (joinCommunityId) {
        sessionStorage.removeItem('joinCommunityId');
        navigate('/communities');
        return;
      }

      // Check if coming from a specific page
      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from);
        return;
      }

      // Default redirect based on user type - check if admin
      // We'll determine this after login, so let's go to a more appropriate default
      navigate('/communities');
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Provide more specific error messages based on the error
      if (err?.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (err?.message?.includes('Email not confirmed')) {
        setError('Please check your email and click the confirmation link before signing in.');
      } else if (err?.message?.includes('Too many requests')) {
        setError('Too many login attempts. Please wait a few minutes before trying again.');
      } else if (err?.message?.includes('Network')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to sign in. Please try again or contact support if the problem persists.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-neutral-900">Welcome Back</h2>
          <p className="mt-2 text-neutral-600">Sign in to access your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-xl shadow-lg">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start text-red-700">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm">{error}</div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className={`input pl-10 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                <Mail className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  className={`input pl-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                <Lock className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex justify-center"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="text-center">
              <p className="text-neutral-600">
                New user?{' '}
                <Link 
                  to="/register" 
                  className="text-primary-500 hover:text-primary-600 font-medium flex items-center justify-center mt-2"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Register here
                </Link>
              </p>
            </div>
          </div>
        </form>

        {/* Debug info for development */}
        {import.meta.env.DEV && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <p className="font-medium mb-2">Development Info:</p>
            <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '✓ Configured' : '✗ Missing'}</p>
            <p>Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ Configured' : '✗ Missing'}</p>
            <p className="mt-2 text-blue-600">
              If you don't have an account, please register first or contact an administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginForm;