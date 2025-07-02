export type CommunityRole = 'admin' | 'co-admin' | 'member';

export interface Community {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  slug?: string; // URL-friendly identifier
  is_active?: boolean;
  deactivated_at?: string | null;
  deleted_at?: string | null;
}

export interface CommunityAIProfile {
  id?: string;
  community_id: string;
  purpose: string;
  tone: 'casual' | 'supportive' | 'professional' | 'motivational';
  target_audience: string[];
  common_topics: string[];
  event_types: string[];
  is_active?: boolean;
  deactivated_at?: string | null;
  knowledge_transfer_enabled?: boolean;
  anonymized_insights?: any;
  feedback?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CommunityMember {
  user_id: string;
  community_id: string;
  role: CommunityRole;
  joined_at: string;
}

export interface CommunityCreate {
  name: string;
  description: string;
  image?: File;
  slug?: string;
  aiProfile?: CommunityAIProfile;
}

// Generate a URL-friendly slug from a string
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
};