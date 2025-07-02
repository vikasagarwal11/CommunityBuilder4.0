import React, { useState, useEffect } from 'react';
import { Atom as At, AlertCircle, Clock, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface MessageTag {
  id: string;
  tag_type: 'mention' | 'action_item' | 'follow_up';
  status: 'pending' | 'acknowledged' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  notes?: string;
  tagged_user: {
    full_name: string;
  };
  tagged_by_user: {
    full_name: string;
  };
}

interface MessageTagsProps {
  messageId: string;
  className?: string;
}

const MessageTags: React.FC<MessageTagsProps> = ({ messageId, className = '' }) => {
  const { user } = useAuth();
  const [tags, setTags] = useState<MessageTag[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('message_tags')
        .select(`
          id,
          tag_type,
          status,
          priority,
          due_date,
          notes,
          tagged_user:profiles!tagged_user_id(full_name),
          tagged_by_user:profiles!tagged_by(full_name)
        `)
        .eq('message_id', messageId);

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const updateTagStatus = async (tagId: string, newStatus: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('message_tags')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', tagId);

      if (error) throw error;
      await fetchTags();
    } catch (error) {
      console.error('Error updating tag status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTagIcon = (tagType: string) => {
    switch (tagType) {
      case 'mention':
        return <At className="h-3 w-3" />;
      case 'action_item':
        return <AlertCircle className="h-3 w-3" />;
      case 'follow_up':
        return <Clock className="h-3 w-3" />;
      default:
        return <At className="h-3 w-3" />;
    }
  };

  const getTagColor = (tagType: string, status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-700 border-green-200';
    
    switch (tagType) {
      case 'mention':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'action_item':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'follow_up':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-neutral-600';
    }
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  useEffect(() => {
    fetchTags();

    // Subscribe to tag changes
    const subscription = supabase
      .channel(`message_tags_${messageId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'message_tags',
          filter: `message_id=eq.${messageId}`
        }, 
        () => {
          fetchTags();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [messageId]);

  if (tags.length === 0) return null;

  return (
    <div className={`space-y-2 mt-2 ${className}`}>
      {tags.map((tag) => (
        <div
          key={tag.id}
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs border ${getTagColor(tag.tag_type, tag.status)}`}
        >
          {getTagIcon(tag.tag_type)}
          <span className="ml-1 font-medium">
            {tag.tag_type === 'mention' && 'Mentioned'}
            {tag.tag_type === 'action_item' && 'Action Item'}
            {tag.tag_type === 'follow_up' && 'Follow Up'}
          </span>
          <span className="ml-1">
            {tag.tagged_user.full_name}
          </span>
          
          {tag.priority && (
            <span className={`ml-1 ${getPriorityColor(tag.priority)}`}>
              ({tag.priority})
            </span>
          )}
          
          {tag.due_date && (
            <span className="ml-1 text-neutral-600">
              - {formatDueDate(tag.due_date)}
            </span>
          )}

          {/* Status actions for tagged user */}
          {user && tag.status !== 'completed' && (
            <div className="ml-2 flex space-x-1">
              {tag.status === 'pending' && (
                <button
                  onClick={() => updateTagStatus(tag.id, 'acknowledged')}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-800"
                  title="Acknowledge"
                >
                  <Check className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={() => updateTagStatus(tag.id, 'completed')}
                disabled={loading}
                className="text-green-600 hover:text-green-800"
                title="Mark as completed"
              >
                <Check className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MessageTags;