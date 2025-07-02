import { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import type { CommunityRole } from '../lib/types/community';
import { roleManager } from '../lib/rbac/RoleManager';
import { PLATFORM_OWNER } from '../lib/types/roles';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: { email: string, password: string, options?: any }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAdmin: boolean;
  getUserRole: (communityId: string) => Promise<CommunityRole | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session retrieval error:', error);
          
          // Check if the error is specifically about invalid refresh token
          if (error.message?.includes('Refresh Token Not Found') || 
              error.message?.includes('Invalid Refresh Token')) {
            console.log('Invalid refresh token detected, clearing session...');
            // Clear stale session data by signing out
            await supabase.auth.signOut();
          }
          
          // If there's an error (like invalid refresh token), treat as unauthenticated
          setUser(null);
          setIsAdmin(false);
        } else {
          setUser(session?.user ?? null);
          await checkAdminStatus(session?.user ?? null);
        }
      } catch (error) {
        console.error('Unexpected error during session initialization:', error);
        // On any unexpected error, treat as unauthenticated
        setUser(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      checkAdminStatus(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (user: User | null) => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    try {
      // Check if email domain matches admin domain first (faster check)
      const isAdminDomain = user.email?.endsWith('@momsfitnessmojo.com') || false;
      
      if (isAdminDomain) {
        setIsAdmin(true);
        return;
      }

      // Check if user has PLATFORM_OWNER role - fetch all roles, don't use .single()
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        setIsAdmin(false);
        return;
      }

      // Check if any of the user's roles is PLATFORM_OWNER
      const isOwner = userRoles?.some(role => role.role_id === PLATFORM_OWNER.id) || false;
      
      if (isOwner) {
        setIsAdmin(true);
        return;
      }

      // Check if user is admin/co-admin of any community
      const { data: adminCommunities, error: communityError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)
        .in('role', ['admin', 'co-admin']);

      if (communityError) {
        console.error('Error checking community admin status:', communityError);
        setIsAdmin(false);
        return;
      }

      // User is admin if they have platform owner role OR are admin/co-admin of any community
      const isCommunityAdmin = adminCommunities && adminCommunities.length > 0;
      setIsAdmin(isOwner || isCommunityAdmin);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Sign in error:', error);
        throw new Error(error.message || 'Failed to sign in');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const signUp = async (params: { email: string, password: string, options?: any }) => {
    try {
      const { error, data } = await supabase.auth.signUp(params);
      
      if (error) {
        console.error('Sign up error:', error);
        // Re-throw the original error to preserve structure
        throw error; // Changed from new Error(error.message) to preserve AuthError
      }
      
      if (data.user) {
        try {
          const isPlatformOwner = params.email.toLowerCase() === 'admin@momsfitnessmojo.com';
          const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('name', isPlatformOwner ? 'Platform Owner' : 'Platform User')
            .maybeSingle();

          if (roleError || !roleData) {
            console.error('Failed to find role:', roleError);
            return;
          }

          await roleManager.assignRole(data.user.id, roleData.id);
        } catch (roleAssignmentError) {
          console.error('Failed to assign role during registration:', roleAssignmentError);
        }
      }
    } catch (error: any) {
      throw error; // Ensure the original error is thrown
    }
  };

  const signOut = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.log('No active session found, skipping logout API call');
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error (handled):', error);
      }
    } catch (error) {
      console.error('Unexpected logout error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        console.error('Reset password error:', error);
        throw new Error(error.message || 'Failed to send reset email');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const getUserRole = async (communityId: string): Promise<CommunityRole | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('community_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('community_id', communityId)
        .maybeSingle();

      if (error || !data) return null;
      return data.role;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isAdmin,
    getUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}