import { supabase } from './supabase';

export interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined from profiles
  author_name?: string;
  like_count: number;
  liked_by_current_user: boolean;
  comments: MessageComment[];
}

export interface MessageComment {
  id: string;
  message_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

/**
 * Get all messages with author names
 */
export async function getMessages(limit: number = 50, currentUserId?: string): Promise<Message[]> {
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
  const messageIds = messages.map(m => m.id);
  const userIds = [...new Set(messages.map(m => m.user_id))];

  const [
    { data: profiles },
    { data: likes, error: likesError },
    { data: comments, error: commentsError },
  ] = await Promise.all([
    supabase
    .from('profiles')
    .select('id, first_name, last_name')
      .in('id', userIds),
    supabase
      .from('message_likes')
      .select('message_id, user_id')
      .in('message_id', messageIds),
    supabase
      .from('message_comments')
      .select('*')
      .in('message_id', messageIds)
      .order('created_at', { ascending: true }),
  ]);

  if (likesError) {
    console.error('Error fetching message likes:', likesError);
    throw new Error(`Failed to fetch message likes: ${likesError.message}`);
  }

  if (commentsError) {
    console.error('Error fetching message comments:', commentsError);
    throw new Error(`Failed to fetch message comments: ${commentsError.message}`);
  }

  const commentUserIds = [...new Set((comments || []).map(comment => comment.user_id))];
  const missingProfileIds = commentUserIds.filter(id => !userIds.includes(id));

  if (missingProfileIds.length > 0) {
    const { data: commentProfiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', missingProfileIds);

    profiles?.push(...(commentProfiles || []));
  }

  // Create a map of user_id to name
  const profileMap = new Map<string, string>();
  (profiles || []).forEach((p: any) => {
    const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
    profileMap.set(p.id, name);
  });

  const likesByMessage = new Map<string, string[]>();
  (likes || []).forEach((like: any) => {
    const userLikes = likesByMessage.get(like.message_id) || [];
    userLikes.push(like.user_id);
    likesByMessage.set(like.message_id, userLikes);
  });

  const commentsByMessage = new Map<string, MessageComment[]>();
  (comments || []).forEach((comment: any) => {
    const messageComments = commentsByMessage.get(comment.message_id) || [];
    messageComments.push({
      id: comment.id,
      message_id: comment.message_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      author_name: profileMap.get(comment.user_id) || 'Unknown'
    });
    commentsByMessage.set(comment.message_id, messageComments);
  });

  // Transform to include author_name
  return messages.map((msg: any) => ({
    id: msg.id,
    user_id: msg.user_id,
    content: msg.content,
    created_at: msg.created_at,
    updated_at: msg.updated_at,
    author_name: profileMap.get(msg.user_id) || 'Unknown',
    like_count: likesByMessage.get(msg.id)?.length || 0,
    liked_by_current_user: currentUserId
      ? Boolean(likesByMessage.get(msg.id)?.includes(currentUserId))
      : false,
    comments: commentsByMessage.get(msg.id) || []
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
 * Like or unlike a message for the current user
 */
export async function toggleMessageLike(
  messageId: string,
  userId: string,
  liked: boolean
): Promise<void> {
  if (liked) {
    const { error } = await supabase
      .from('message_likes')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing message like:', error);
      throw new Error(`Failed to remove like: ${error.message}`);
    }

    return;
  }

  const { error } = await supabase
    .from('message_likes')
    .insert({ message_id: messageId, user_id: userId });

  if (error) {
    console.error('Error liking message:', error);
    throw new Error(`Failed to like message: ${error.message}`);
  }
}

/**
 * Add a comment to a message
 */
export async function createMessageComment(
  messageId: string,
  userId: string,
  content: string
): Promise<MessageComment> {
  const { data, error } = await supabase
    .from('message_comments')
    .insert({ message_id: messageId, user_id: userId, content })
    .select()
    .single();

  if (error) {
    console.error('Error creating message comment:', error);
    throw new Error(`Failed to create comment: ${error.message}`);
  }

  return data;
}

/**
 * Delete a comment
 */
export async function deleteMessageComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('message_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting message comment:', error);
    throw new Error(`Failed to delete comment: ${error.message}`);
  }
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
  onDeleteMessage: (messageId: string) => void,
  onMessageActivity?: () => void
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
          author_name: authorName,
          like_count: 0,
          liked_by_current_user: false,
          comments: []
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
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'message_likes' },
      () => {
        onMessageActivity?.();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'message_comments' },
      () => {
        onMessageActivity?.();
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
