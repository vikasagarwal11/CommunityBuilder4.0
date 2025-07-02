import React, { useState, useEffect } from 'react';
import { Atom as At, AlertCircle, Clock, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CommunityMember {
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

interface MessageTaggerProps {
  messageId: string;
  communityId: string;
  onClose: () => void;
}

const MessageTagger: React.FC<MessageTaggerProps> = ({ messageId, communityId, onClose }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [tagType, setTagType] = useState<'mention' | 'action_item' | 'follow_up'>('mention');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCommunityMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          user_id,
          profiles!inner(
            full_name,
            avatar_url
          )
        `)
        .eq('community_id', communityId)
        .neq('user_id', user?.id); // Exclude current user

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching community members:', error);
    }
  };

  const createTag = async () => {
    if (!user || !selectedMember || !messageId) {
      setError('Please select a member to tag');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const tagData = {
        message_id: messageId,
        tagged_user_id: selectedMember,
        tagged_by: user.id,
        tag_type: tagType,
        priority: tagType === 'action_item' ? priority : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        notes: notes || null
      };

      const { error } = await supabase
        .from('message_tags')
        .insert(tagData);

      if (error) throw error;

      // If it's an action item, also create an action item record
      if (tagType === 'action_item') {
        const { error: actionError } = await supabase
          .from('action_items')
          .insert({
            community_id: communityId,
            created_by: user.id,
            assigned_to: selectedMember,
            title: `Action item from message`,
            description: notes,
            priority,
            due_date: dueDate ? new Date(dueDate).toISOString() : null,
            message_id: messageId
          });

        if (actionError) console.error('Error creating action item:', actionError);
      }

      onClose();
    } catch (error: any) {
      console.error('Error creating tag:', error);
      setError(error.message || 'Failed to create tag');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityMembers();
  }, [communityId]);

  return (
    <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-neutral-200 p-4 z-50 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-900">Tag User</h3>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Select user */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-neutral-700 mb-2">
          Select User
        </label>
        <select
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Choose a member...</option>
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.profiles.full_name}
            </option>
          ))}
        </select>
      </div>

      {/* Tag type */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-neutral-700 mb-2">
          Tag Type
        </label>
        <div className="flex space-x-2">
          {[
            { value: 'mention', label: 'Mention', icon: At },
            { value: 'action_item', label: 'Action Item', icon: AlertCircle },
            { value: 'follow_up', label: 'Follow Up', icon: Clock }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTagType(value as any)}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                tagType === value
                  ? 'bg-primary-100 text-primary-700 border border-primary-200'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
              }`}
            >
              <Icon className="h-3 w-3 mr-1" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority (for action items) */}
      {tagType === 'action_item' && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-neutral-700 mb-2">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      )}

      {/* Due date (for action items and follow-ups) */}
      {(tagType === 'action_item' || tagType === 'follow_up') && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-neutral-700 mb-2">
            Due Date (Optional)
          </label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Notes */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-neutral-700 mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Add a note..."
        />
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={onClose}
          className="flex-1 px-3 py-2 border border-neutral-300 text-neutral-700 rounded-md text-sm hover:bg-neutral-50"
        >
          Cancel
        </button>
        <button
          onClick={createTag}
          disabled={loading || !selectedMember}
          className="flex-1 px-3 py-2 bg-primary-500 text-white rounded-md text-sm hover:bg-primary-600 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Tag'}
        </button>
      </div>
    </div>
  );
};

export default MessageTagger;