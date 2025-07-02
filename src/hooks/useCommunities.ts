import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface Community {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  member_count?: number;
  is_member?: boolean;
  tags?: string[];
  match_score?: number;
  is_active?: boolean;
  deleted_at?: string | null;
}

interface Filters {
  tags?: boolean;
  memberCount?: number;
}

interface PaginatedResponse {
  data: Community[];
  nextPage?: number;
}

const fetchCommunities = async ({ pageParam = 1, filters }: { pageParam?: number; filters?: Filters }) => {
  const { data, error } = await supabase.rpc('fetch_communities_batch', {
    p_user: supabase.auth.getUser().data.user?.id || null,
    p_page: pageParam,
    p_page_size: 20,
    p_filters: filters ? JSON.stringify(filters) : '{}',
  });

  if (error) {
    console.error('Error fetching communities:', error.message);
    throw new Error(`Failed to fetch communities: ${error.message}`);
  }

  if (!data || !Array.isArray(data)) {
    throw new Error('Invalid data format from fetch_communities_batch');
  }

  return { data, nextPage: data.length === 20 ? pageParam + 1 : undefined } as PaginatedResponse;
};

export function useCommunities(filters?: Filters) {
  return useInfiniteQuery<PaginatedResponse, Error>(
    ['communities', filters],
    ({ pageParam }) => fetchCommunities({ pageParam, filters }),
    {
      getNextPageParam: (lastPage) => lastPage.nextPage,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    }
  );
}