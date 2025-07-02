import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, UserPlus, Dumbbell, Shield, Calendar, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import UserAvatar from '../profile/UserAvatar';
import { Capacitor } from '@capacitor/core';
import { useMobileFeatures } from '../../hooks/useMobileFeatures';

interface HeaderProps {
  isScrolled: boolean;
}

function Header({ isScrolled }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const { isNative, platform } = useMobileFeatures();



  // Add extra padding for iOS status bar if in native app
  const iosStatusBarPadding = isNative && platform === 'ios' ? 'ios-safe-area-top' : '';

  return (
    <header 
      className={`fixed w-full z-50 transition-all duration-300 ${iosStatusBarPadding} ${
        isScrolled ? 'bg-white shadow-md' : 'bg-primary-500'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            {logoError ? (
              <Dumbbell className="h-8 w-8 text-primary-500" />
            ) : (
              <Dumbbell className="h-8 w-8 text-white" />
            )}
            <span className={`text-xl font-bold font-heading ${isScrolled ? 'text-neutral-900' : 'text-white'}`}>
              MomFit
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/events" className={`hover:text-primary-500 ${isScrolled ? 'text-neutral-700' : 'text-white'} ${location.pathname === '/events' ? 'font-medium' : ''}`}>
              Events
            </Link>
            <Link to="/communities" className={`hover:text-primary-500 ${isScrolled ? 'text-neutral-700' : 'text-white'} ${location.pathname.includes('/communities') || location.pathname.includes('/community') ? 'font-medium' : ''}`}>
              Communities
            </Link>
            
            {user ? (
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg hover:text-primary-500 ${
                      isScrolled ? 'text-neutral-700' : 'text-white'
                    }`}
                  >
                    <Shield className="h-5 w-5" />
                    <span>Admin</span>
                  </Link>
                )}
                <Link 
                  to="/profile" 
                  className={`px-4 py-2 rounded-lg hover:text-primary-500 ${
                    isScrolled ? 'text-neutral-700' : 'text-white'
                  } ${location.pathname === '/profile' ? 'font-medium' : ''}`}
                >
                  <User className="h-5 w-5" />
                </Link>
                <button
                  onClick={() => signOut()}
                  className="btn-primary"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  to="/login" 
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg hover:text-primary-500 ${
                    isScrolled ? 'text-neutral-700' : 'text-white'
                  }`}
                >
                  <LogIn className="h-5 w-5" />
                  <span>Sign In</span>
                </Link>
                <Link 
                  to="/register" 
                  className="btn-primary flex items-center space-x-2"
                >
                  <UserPlus className="h-5 w-5" />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className={`h-6 w-6 ${isScrolled ? 'text-neutral-600' : 'text-white'}`} />
            ) : (
              <Menu className={`h-6 w-6 ${isScrolled ? 'text-neutral-600' : 'text-white'}`} />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white rounded-lg shadow-lg mt-2">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link 
                to="/events" 
                className={`block px-3 py-2 rounded-lg text-neutral-700 hover:text-primary-500 ${location.pathname === '/events' ? 'bg-neutral-100 font-medium' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Events
              </Link>
              <Link 
                to="/communities" 
                className={`block px-3 py-2 rounded-lg text-neutral-700 hover:text-primary-500 ${location.pathname.includes('/communities') || location.pathname.includes('/community') ? 'bg-neutral-100 font-medium' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Communities
              </Link>
              {user ? (
                <>
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      className="block px-3 py-2 rounded-lg text-neutral-700 hover:text-primary-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <Link 
                    to="/profile" 
                    className={`block px-3 py-2 rounded-lg text-neutral-700 hover:text-primary-500 ${location.pathname === '/profile' ? 'bg-neutral-100 font-medium' : ''}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 rounded-lg text-neutral-700 hover:text-primary-500"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="block px-3 py-2 rounded-lg text-neutral-700 hover:text-primary-500"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link 
                    to="/register" 
                    className="block px-3 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;