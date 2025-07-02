import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import UserAvatar from '../profile/UserAvatar';

interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  votes: number;
  voters: string[];
}

interface AvailabilityPollProps {
  pollId: string;
  communityId: string;
  onCreateEvent?: (selectedSlot: AvailabilitySlot) => void;
}

const AvailabilityPollCard: React.FC<AvailabilityPollProps> = ({
  pollId,
  communityId,
  onCreateEvent
}) => {
  const { user } = useAuth();
  const [poll, setPoll] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [voting, setVoting] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<number, boolean>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState<Record<string, any>>({});

  // Fetch poll data
  useEffect(() => {
    const fetchPoll = async () => {
      if (!pollId) return;
      
      try {
        setLoading(true);
        
        // Fetch poll data
        const { data, error } = await supabase
          .from('event_polls')
          .select(`
            *,
            creator:profiles!created_by(
              full_name,
              avatar_url
            )
          `)
          .eq('id', pollId)
          .single();
          
        if (error) throw error;
        setPoll(data);
        
        // Initialize user votes
        if (user && data.options) {
          const votes: Record<number, boolean> = {};
          data.options.forEach((option: AvailabilitySlot, index: number) => {
            votes[index] = option.voters.includes(user.id);
          });
          setUserVotes(votes);
        }
        
        // Check if user is admin
        if (user) {
          const { data: memberData } = await supabase
            .from('community_members')
            .select('role')
            .eq('community_id', communityId)
            .eq('user_id', user.id)
            .maybeSingle();
            
          setIsAdmin(memberData?.role === 'admin' || memberData?.role === 'co-admin');
        }
        
        // Fetch member profiles for voters
        const uniqueVoterIds = new Set<string>();
        data.options.forEach((option: AvailabilitySlot) => {
          option.voters.forEach((voterId: string) => uniqueVoterIds.add(voterId));
        });
        
        if (uniqueVoterIds.size > 0) {
          const { data: voterProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', Array.from(uniqueVoterIds));
            
          if (voterProfiles) {
            const membersMap: Record<string, any> = {};
            voterProfiles.forEach(profile => {
              membersMap[profile.id] = profile;
            });
            setMembers(membersMap);
          }
        }
      } catch (err) {
        console.error('Error fetching poll:', err);
        setError('Failed to load poll data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPoll();
  }, [pollId, user, communityId]);

  // Vote for a time slot
  const handleVote = async (slotIndex: number) => {
    if (!user || !poll) return;
    
    try {
      setVoting(true);
      
      // Toggle vote
      const newVote = !userVotes[slotIndex];
      
      // Update local state first for responsive UI
      setUserVotes({
        ...userVotes,
        [slotIndex]: newVote
      });
      
      // Clone options array
      const updatedOptions = [...poll.options];
      
      // Update voters list
      if (newVote) {
        // Add user to voters if not already there
        if (!updatedOptions[slotIndex].voters.includes(user.id)) {
          updatedOptions[slotIndex].voters.push(user.id);
          updatedOptions[slotIndex].votes = updatedOptions[slotIndex].voters.length;
        }
      } else {
        // Remove user from voters
        updatedOptions[slotIndex].voters = updatedOptions[slotIndex].voters.filter(
          (voterId: string) => voterId !== user.id
        );
        updatedOptions[slotIndex].votes = updatedOptions[slotIndex].voters.length;
      }
      
      // Update poll in database
      const { error } = await supabase
        .from('event_polls')
        .update({ options: updatedOptions })
        .eq('id', pollId);
        
      if (error) throw error;
      
      // Update local state
      setPoll({
        ...poll,
        options: updatedOptions
      });
    } catch (err) {
      console.error('Error voting:', err);
      // Revert local state on error
      setUserVotes({
        ...userVotes,
        [slotIndex]: !userVotes[slotIndex]
      });
    } finally {
      setVoting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Create event from the most popular time slot
  const handleCreateEvent = () => {
    if (!poll || !onCreateEvent) return;
    
    // Find the slot with the most votes
    let mostPopularSlot = poll.options[0];
    let maxVotes = poll.options[0].votes;
    
    poll.options.forEach((slot: AvailabilitySlot) => {
      if (slot.votes > maxVotes) {
        mostPopularSlot = slot;
        maxVotes = slot.votes;
      }
    });
    
    onCreateEvent(mostPopularSlot);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 animate-pulse">
        <div className="h-6 bg-neutral-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-neutral-200 rounded"></div>
          <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
        <p className="text-red-500">Error loading poll data</p>
      </div>
    );
  }

  // Check if poll has expired
  const isPollExpired = new Date(poll.expires_at) < new Date();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
      <div className="p-4 border-b border-neutral-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-primary-500" />
              {poll.title}
            </h3>
            <p className="text-sm text-neutral-600 mt-1">{poll.description}</p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-neutral-400 hover:text-neutral-600 rounded-full"
          >
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-3 text-sm">
          <div className="flex items-center text-neutral-500">
            <UserAvatar 
              src={poll.creator?.avatar_url}
              alt={poll.creator?.full_name}
              size="sm"
            />
            <span className="ml-2">Created by {poll.creator?.full_name}</span>
          </div>
          
          {isPollExpired ? (
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
              Poll closed
            </span>
          ) : (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
              Poll active
            </span>
          )}
        </div>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4">
              <h4 className="font-medium text-sm mb-3">Vote for your preferred time slots:</h4>
              
              <div className="space-y-3 mb-4">
                {poll.options.map((option: AvailabilitySlot, index: number) => (
                  <div key={index} className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg">
                    <div>
                      <div className="flex items-center mb-1">
                        <Calendar className="h-4 w-4 mr-2 text-neutral-500" />
                        <span className="font-medium">{formatDate(option.date)}</span>
                      </div>
                      <div className="flex items-center text-sm text-neutral-600">
                        <Clock className="h-4 w-4 mr-2 text-neutral-400" />
                        <span>{option.startTime} - {option.endTime}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="flex -space-x-2 mr-3">
                        {option.voters.slice(0, 3).map((voterId: string) => (
                          <UserAvatar 
                            key={voterId}
                            src={members[voterId]?.avatar_url}
                            alt={members[voterId]?.full_name || 'User'}
                            size="sm"
                            className="border-2 border-white"
                          />
                        ))}
                        {option.voters.length > 3 && (
                          <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center border-2 border-white text-xs font-medium">
                            +{option.voters.length - 3}
                          </div>
                        )}
                      </div>
                      
                      {!isPollExpired && user && (
                        <button
                          onClick={() => handleVote(index)}
                          disabled={voting}
                          className={`p-2 rounded-full ${
                            userVotes[index]
                              ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                              : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                          }`}
                        >
                          {userVotes[index] ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <p className="text-neutral-500">
                  {isPollExpired 
                    ? 'This poll has ended.' 
                    : `Poll closes on ${new Date(poll.expires_at).toLocaleDateString()}`}
                </p>
                
                {isAdmin && (
                  <button
                    onClick={handleCreateEvent}
                    className="px-3 py-1 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Create Event
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AvailabilityPollCard;