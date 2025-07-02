import { createClient } from '@supabase/supabase-js';
import type { CommunityRole } from './types/community';
import { generateSlug } from './types/community';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in development mode and Supabase is not configured
const isDevelopment = import.meta.env.DEV;
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

if (!isSupabaseConfigured) {
  if (isDevelopment) {
    console.warn('Supabase not configured. Running in demo mode with mock data.');
  } else {
    throw new Error('Missing Supabase environment variables. Please check your .env file.');
  }
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error('Invalid Supabase URL format. Please check VITE_SUPABASE_URL in your .env file.');
}

export const supabase = createClient(supabaseUrl || 'https://demo.supabase.co', supabaseAnonKey || 'demo-key', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  // Add global error handling
  global: {
    headers: {
      'X-Client-Info': 'community-platform-app'
    }
  }
});

// Enhanced connection test function with better error handling
export const testSupabaseConnection = async () => {
  try {
    // If Supabase is not configured in development, return true for demo mode
    if (!isSupabaseConfigured && isDevelopment) {
      console.log('Running in demo mode - Supabase connection test skipped');
      return true;
    }

    console.log('Testing Supabase connection...');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Anon Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...');
    
    // Test basic connectivity first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Supabase API not accessible:', response.status, response.statusText);
        return false;
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Network error connecting to Supabase:', fetchError);
      return false;
    }
    
    // Test database query
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.error('Supabase database query failed:', error);
      return false;
    }
    
    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
};

// Profile types
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  interests?: string[];
  custom_interests?: string[];
  age_range?: string;
  location?: string;
  experience_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferences?: {
    notifications_enabled: boolean;
    private_profile: boolean;
  };
  created_at: string;
  updated_at: string;
  username?: string; // URL-friendly identifier for profiles
}

export interface UserCommunity {
  community_id: string;
  role: CommunityRole;
  joined_at: string;
}

export type ProfileUpdate = Omit<Partial<Profile>, 'id' | 'email' | 'created_at'>;

export const communityService = {
  async createCommunity(name: string, description: string, imageFile?: File, customSlug?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate slug from name if not provided
      const slug = customSlug || generateSlug(name);

      // Check if slug is already taken
      const { data: existingCommunity } = await supabase
        .from('communities')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      // If slug exists, append a random string
      const finalSlug = existingCommunity 
        ? `${slug}-${Math.random().toString(36).substring(2, 8)}`
        : slug;

      let imageUrl = '';
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('community-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('community-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from('communities')
        .insert({
          name,
          description,
          image_url: imageUrl,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          slug: finalSlug
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger AI learning system to generate user interest vector for the new community
      try {
        const { learningSystem } = await import('./ai/learningSystem');
        await learningSystem.onUserJoinsCommunity(user.id, data.id);
      } catch (aiError) {
        console.warn('Failed to generate user interest vector for new community:', aiError);
        // Don't throw error - this is not critical for community creation
      }

      return data;
    } catch (error) {
      console.error('Error creating community:', error);
      throw error;
    }
  },

  async getUserCommunities(userId: string) {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          role,
          joined_at,
          communities (
            id,
            name,
            description,
            image_url,
            created_at,
            slug
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user communities:', error);
      throw error;
    }
  },

  async updateMemberRole(communityId: string, userId: string, newRole: CommunityRole) {
    try {
      const { error } = await supabase
        .from('community_members')
        .update({ role: newRole })
        .match({ community_id: communityId, user_id: userId });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  },

  async getCommunityBySlug(slug: string) {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching community by slug:', error);
      throw error;
    }
  }
};

export const profileService = {
  async updateProfile(userId: string, updates: ProfileUpdate) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  async getProfileByUsername(username: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching profile by username:', error);
      throw error;
    }
  },

  async checkUsernameAvailability(username: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !data; // Username is available if no data is returned
    } catch (error) {
      console.error('Error checking username availability:', error);
      throw error;
    }
  }
};

export const eventService = {
  async getEventBySlug(slug: string) {
    try {
      const { data, error } = await supabase
        .from('community_events')
        .select(`
          *,
          creator_profile:users!created_by(
            profiles!id(
              full_name,
              avatar_url,
              username
            )
          ),
          rsvp_count:event_rsvps(count)
        `)
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching event by slug:', error);
      throw error;
    }
  }
};