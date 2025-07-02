import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { Plus, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

/* ───────── constants ───────── */
const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏'] as const;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/* ───────── types ───────── */
interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}
interface Props {
  messageId: string;
  sourceTable: 'ai_chats' | 'community_posts';
  className?: string;
  onReply?: (id: string) => void;
  isTemporary?: boolean;
  disabled?: boolean;
}

/* ═════════ component ════════ */
const MessageReactions: React.FC<Props> = ({
  messageId,
  sourceTable,
  className = '',
  onReply,
  isTemporary = false,
  disabled = false,
}) => {
  const { user } = useAuth();

  /* state */
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ref to the + button (for positioning) */
  const anchorRef = useRef<HTMLButtonElement>(null);

  /* ───────── early guards ───────── */
  if (disabled) return null;
  if (isTemporary) {
    return (
      <div className={`flex items-center gap-1 mt-2 ${className}`}>
        {onReply && user && (
          <button
            onClick={() => onReply(messageId)}
            className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200"
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Reply
          </button>
        )}
        <span className="text-xs italic text-neutral-400">
          Reactions available after message is saved
        </span>
      </div>
    );
  }

  /* ───────── helpers ───────── */
  const fetchReactions = useCallback(async () => {
    try {
      if (!UUID_REGEX.test(messageId)) return setError('Invalid ID');
      const { data, error } = await supabase
        .from('message_reactions')
        .select('emoji,user_id,profiles!inner(full_name)')
        .eq('source_id', messageId)
        .eq('source_table', sourceTable);
      if (error) throw error;

      const map = new Map<string, Reaction>();
      data?.forEach((r) => {
        const me = r.user_id === user?.id;
        const entry = map.get(r.emoji) ?? {
          emoji: r.emoji,
          count: 0,
          users: [],
          hasReacted: false,
        };
        entry.count += 1;
        entry.users.push(r.profiles?.full_name ?? 'Unknown');
        if (me) entry.hasReacted = true;
        map.set(r.emoji, entry);
      });
      setReactions([...map.values()]);
      setError(null);
    } catch (e) {
      console.error(e);
      setError('Failed to load reactions');
    }
  }, [messageId, sourceTable, user?.id]);

  const toggleReaction = async (emoji: string) => {
    if (!user) return;
    try {
      setBusy(true);
      if (!UUID_REGEX.test(messageId)) throw new Error('Invalid ID');

      /* self-reaction & membership checks (unchanged) */
      const base = sourceTable === 'ai_chats' ? 'ai_chats' : 'community_posts';
      const { data: post } = await supabase
        .from(base)
        .select('user_id, community_id')
        .eq('id', messageId)
        .single();
      if (!post) throw new Error('Message not found');
      if (post.user_id === user.id)
        throw new Error("You can't react to your own messages");

      const { data: member } = await supabase
        .from('community_members')
        .select('user_id')
        .eq('community_id', post.community_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!member) throw new Error('Join the community to react');

      /* toggle DB row */
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('source_id', messageId)
        .eq('source_table', sourceTable)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        await supabase.from('message_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('message_reactions').insert({
          source_id: messageId,
          source_table: sourceTable,
          user_id: user.id,
          emoji,
        });
        /* fire-and-forget engagement RPC */
        (async () => {
          try {
            await supabase.rpc('increment_engagement', {
  message_id: message.id,
  increment_by: 1
});
          } catch {
            /* ignore */
          }
        })();
      }
      await fetchReactions();
    } catch (e: any) {
      setError(e.message ?? 'Failed');
    } finally {
      setBusy(false);
    }
  };

  /* ───────── effects ───────── */
  useEffect(() => {
    if (!UUID_REGEX.test(messageId)) return;
    fetchReactions();
    const sub = supabase
      .channel(`reactions_${messageId}_${sourceTable}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `source_id=eq.${messageId}&source_table=eq.${sourceTable}`,
        },
        fetchReactions,
      )
      .subscribe();
    return () => sub.unsubscribe();
  }, [fetchReactions, messageId, sourceTable]);

  /* ───────── portal positioning ───────── */
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  useLayoutEffect(() => {
    if (pickerOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6, // gap
        left: rect.left,
      });
    }
  }, [pickerOpen]);

  /* close on outside click */
  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('#emoji-picker')
      ) {
        setPickerOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [pickerOpen]);

  /* ───────── render ───────── */
  return (
    <>
      <div className={`flex items-center gap-2 mt-2 ${className}`}>
        {reactions.map((r) => (
          <button
            key={r.emoji}
            onClick={() => toggleReaction(r.emoji)}
            disabled={busy || !user}
            className={`inline-flex items-center px-2 py-1 rounded-full text-sm transition-colors ${
              r.hasReacted
                ? 'bg-primary-100 text-primary-700 border border-primary-200'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
            }`}
            title={`${r.users.join(', ')} reacted with ${r.emoji}`}
          >
            <span className="mr-1">{r.emoji}</span>
            <span className="text-xs">{r.count}</span>
          </button>
        ))}

        {onReply && user && (
          <button
            onClick={() => onReply(messageId)}
            className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200"
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Reply
          </button>
        )}

        {user && (
          <button
            ref={anchorRef}
            onClick={() => setPickerOpen((s) => !s)}
            disabled={busy}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors"
            title="Add reaction"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
      </div>

      {pickerOpen &&
        createPortal(
          <div
            id="emoji-picker"
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-neutral-200 p-2"
          >
            <div className="grid grid-cols-6 gap-1">
              {COMMON_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    toggleReaction(e);
                    setPickerOpen(false);
                  }}
                  className="p-2 hover:bg-neutral-100 rounded-md transition-colors text-lg"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default MessageReactions;
