import { supabase } from './supabase';

export interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined from profiles
  author_name?: string;
}

/**
 * Get all messages with author names
 */
export async function getMessages(limit: number = 50): Promise<Message[]> {
  // First get messages
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching messages:', error);
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  if (!messages || messages.length === 0) {
    return [];
  }

  // Get unique user IDs
  const userIds = [...new Set(messages.map(m => m.user_id))];

  // Fetch profiles for those users
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', userIds);

  // Create a map of user_id to name
  const profileMap = new Map<string, string>();
  (profiles || []).forEach((p: any) => {
    const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
    profileMap.set(p.id, name);
  });

  // Transform to include author_name
  return messages.map((msg: any) => ({
    id: msg.id,
    user_id: msg.user_id,
    content: msg.content,
    created_at: msg.created_at,
    updated_at: msg.updated_at,
    author_name: profileMap.get(msg.user_id) || 'Unknown'
  }));
}

/**
 * Create a new message
 */
export async function createMessage(userId: string, content: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ user_id: userId, content })
    .select()
    .single();

  if (error) {
    console.error('Error creating message:', error);
    throw new Error(`Failed to create message: ${error.message}`);
  }

  return data;
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    console.error('Error deleting message:', error);
    throw new Error(`Failed to delete message: ${error.message}`);
  }
}

/**
 * Subscribe to real-time message updates
 */
export function subscribeToMessages(
  onNewMessage: (message: Message) => void,
  onDeleteMessage: (messageId: string) => void
) {
  const subscription = supabase
    .channel('messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      async (payload) => {
        // Fetch the author's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', payload.new.user_id)
          .single();
        
        const authorName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown';

        onNewMessage({
          id: payload.new.id,
          user_id: payload.new.user_id,
          content: payload.new.content,
          created_at: payload.new.created_at,
          updated_at: payload.new.updated_at,
          author_name: authorName
        });
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'messages' },
      (payload) => {
        onDeleteMessage(payload.old.id);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

/**
 * Format message timestamp
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
