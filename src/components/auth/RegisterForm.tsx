import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';
import zxcvbn from 'zxcvbn';
import toast, { Toaster } from 'react-hot-toast';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

const RegisterForm = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordScore, setPasswordScore] = useState(0);
  
  const { register, handleSubmit, watch, formState: { errors }, setError: setFormError } = useForm<RegisterFormData>();
  const password = watch('password');

  const blockedDomains = ['example.com', 'test.com', 'domain.com'];

  const validateEmail = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (blockedDomains.includes(domain)) {
      return 'Please use a valid email address from a real email provider';
    }
    return true;
  };

  const checkPasswordStrength = (password: string) => {
    if (!password) {
      setPasswordScore(0);
      return;
    }
    
    const result = zxcvbn(password);
    setPasswordScore(result.score);
  };

  const getPasswordStrengthLabel = () => {
    switch (passwordScore) {
      case 0: return { text: 'Very Weak', color: 'bg-red-500' };
      case 1: return { text: 'Weak', color: 'bg-red-400' };
      case 2: return { text: 'Fair', color: 'bg-yellow-500' };
      case 3: return { text: 'Good', color: 'bg-green-400' };
      case 4: return { text: 'Strong', color: 'bg-green-500' };
      default: return { text: '', color: 'bg-neutral-200' };
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      console.log('🚀 Starting registration process...');
      setIsSubmitting(true);
      setError('');

      // Sign up user using AuthContext
      console.log('📧 Attempting to sign up with email:', data.email);
      await signUp({ 
        email: data.email, 
        password: data.password, 
        options: { 
          data: { 
            full_name: data.fullName, 
            email: data.email 
          } 
        } 
      });

      // Get the registered user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ Failed to get user after registration:', userError);
        throw new Error('Failed to complete registration');
      }

      console.log('✅ Auth successful. User ID:', user.id);

      // Insert into users and profiles tables
      await supabase.from('users').insert({ id: user.id })
        .then(() => 
          supabase.from('profiles').insert({ 
            id: user.id, 
            email: data.email, 
            full_name: data.fullName 
          })
        );

      // Store user data in session storage for the onboarding modal
      sessionStorage.setItem('newUser', 'true');
      sessionStorage.setItem('userFullName', data.fullName);
      sessionStorage.setItem('userEmail', data.email);

      // Check for stored redirect URL or community join intent
      const redirectUrl = sessionStorage.getItem('redirectUrl');
      const joinCommunityId = sessionStorage.getItem('joinCommunityId');
      
      // Show success toast
      toast.success('Account created successfully!', {
        duration: 3000,
        position: 'top-center',
        icon: '✅'
      });
      
      // Wait a moment for auth state to update
      setTimeout(() => {
        if (redirectUrl) {
          sessionStorage.removeItem('redirectUrl');
          if (joinCommunityId) {
            sessionStorage.removeItem('joinCommunityId');
          }
          navigate(redirectUrl);
        } else if (joinCommunityId) {
          sessionStorage.removeItem('joinCommunityId');
          navigate('/communities');
        } else {
          // For new users, show them the communities page to get started
          navigate('/communities');
        }
      }, 500);

      console.log('✅ Registration completed');
    } catch (err: any) {
      console.error('❌ Registration error:', err);
      
      // Check for user already exists error using the full error object
      const isUserExistsError = 
        err instanceof Error && err.message.includes('User already registered') ||
        (err.code && err.code === 'user_already_exists') ||
        (err.body && typeof err.body === 'string' && err.body.includes('user_already_exists'));
      
      if (isUserExistsError) {
        setFormError('email', { 
          type: 'manual', 
          message: 'This email is already registered. Please log in or use a different email.' 
        });
      } else {
        setError(err.message || 'Failed to create account');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <Toaster />
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-neutral-900">Create Account</h2>
          <p className="mt-2 text-neutral-600">Join our fitness community</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-xl shadow-lg">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-neutral-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  id="fullName"
                  type="text"
                  {...register('fullName', {
                    required: 'Full name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters'
                    }
                  })}
                  className={`input pl-10 w-full ${errors.fullName ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                <User className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    },
                    validate: validateEmail
                  })}
                  className={`input pl-10 w-full ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
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
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    },
                    onChange: (e) => checkPasswordStrength(e.target.value)
                  })}
                  className={`input pl-10 w-full ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                <Lock className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
              
              {/* Password strength meter */}
              {password && (
                <div className="mt-2">
                  <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getPasswordStrengthLabel().color}`} 
                      style={{ width: `${(passwordScore + 1) * 20}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-neutral-600 mt-1">
                    Password strength: {getPasswordStrengthLabel().text}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  className={`input pl-10 w-full ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                <Lock className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex justify-center"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;