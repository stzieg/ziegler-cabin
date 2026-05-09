import React, { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '../../contexts/SupabaseProvider';
import {
  getMessages,
  createMessage,
  deleteMessage,
  toggleMessageLike,
  createMessageComment,
  deleteMessageComment,
  subscribeToMessages,
  formatMessageTime,
  type Message
} from '../../utils/messages';
import styles from './MessageBoardTab.module.css';

interface MessageBoardTabProps {
  user: User;
  formState?: Record<string, any>;
}

export const MessageBoardTab: React.FC<MessageBoardTabProps> = ({ user }) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin = profile?.is_admin || false;

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToMessages(
      (newMsg) => {
        setMessages(prev => [newMsg, ...prev]);
      },
      (deletedId) => {
        setMessages(prev => prev.filter(m => m.id !== deletedId));
      },
      () => {
        loadMessages();
      }
    );

    return unsubscribe;
  }, [user.id]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMessages(100, user.id);
      setMessages(data);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleLikeClick = async (message: Message) => {
    setMessages(prev => prev.map(item => {
      if (item.id !== message.id) return item;

      return {
        ...item,
        liked_by_current_user: !item.liked_by_current_user,
        like_count: item.like_count + (item.liked_by_current_user ? -1 : 1)
      };
    }));

    try {
      await toggleMessageLike(message.id, user.id, message.liked_by_current_user);
    } catch (err) {
      console.error('Error updating like:', err);
      setError('Failed to update like');
      await loadMessages();
    }
  };

  const handleCommentSubmit = async (messageId: string) => {
    const content = (commentDrafts[messageId] || '').trim();
    if (!content || commentSubmitting[messageId]) return;

    try {
      setCommentSubmitting(prev => ({ ...prev, [messageId]: true }));
      setError(null);
      await createMessageComment(messageId, user.id, content);
      setCommentDrafts(prev => ({ ...prev, [messageId]: '' }));
      await loadMessages();
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
    } finally {
      setCommentSubmitting(prev => ({ ...prev, [messageId]: false }));
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    try {
      await deleteMessageComment(commentId);
      await loadMessages();
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const content = newMessage.trim();
    if (!content || sending) return;

    try {
      setSending(true);
      setError(null);
      await createMessage(user.id, content);
      setNewMessage('');
      textareaRef.current?.focus();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteClick = (messageId: string) => {
    setDeleteConfirm(messageId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteMessage(deleteConfirm);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message');
      setDeleteConfirm(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Message Board</h1>
          <p className={styles.subtitle}>Share updates with the family</p>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* New Message Form */}
      <form className={styles.messageForm} onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className={styles.messageInput}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          rows={3}
          disabled={sending}
        />
        <div className={styles.formActions}>
          <span className={styles.hint}>Press Enter to send, Shift+Enter for new line</span>
          <button
            type="submit"
            className={styles.sendButton}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? 'Sending...' : 'Post Message'}
          </button>
        </div>
      </form>

      {/* Messages List */}
      <div className={styles.messagesList}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💬</div>
            <h3>No messages yet</h3>
            <p>Be the first to post a message!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={styles.messageCard}>
              <div className={styles.messageHeader}>
                <span className={styles.authorName}>{message.author_name}</span>
                <div className={styles.messageHeaderRight}>
                  <span className={styles.messageTime}>{formatMessageTime(message.created_at)}</span>
                  {(message.user_id === user.id || isAdmin) && (
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteClick(message.id)}
                      aria-label="Delete message"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <p className={styles.messageContent}>{message.content}</p>
              <div className={styles.messageActions}>
                <button
                  type="button"
                  className={`${styles.likeButton} ${message.liked_by_current_user ? styles.likeButtonActive : ''}`}
                  onClick={() => handleLikeClick(message)}
                  aria-pressed={message.liked_by_current_user}
                  aria-label={message.liked_by_current_user ? 'Unlike message' : 'Like message'}
                >
                  <svg className={styles.likeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M7 10v11" />
                    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                  </svg>
                  {message.like_count > 0 && (
                    <span className={styles.likeCountBadge}>{message.like_count}</span>
                  )}
                </button>
                <span className={styles.commentCount}>
                  {message.comments.length} comment{message.comments.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className={styles.commentsSection}>
                {message.comments.length > 0 && (
                  <div className={styles.commentsList}>
                    {message.comments.map((comment) => (
                      <div key={comment.id} className={styles.commentItem}>
                        <div className={styles.commentHeader}>
                          <span className={styles.commentAuthor}>{comment.author_name}</span>
                          <div className={styles.commentMeta}>
                            <span>{formatMessageTime(comment.created_at)}</span>
                            {(comment.user_id === user.id || isAdmin) && (
                              <button
                                type="button"
                                className={styles.commentDeleteButton}
                                onClick={() => handleCommentDelete(comment.id)}
                                aria-label="Delete comment"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                        <p className={styles.commentContent}>{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  className={styles.commentForm}
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCommentSubmit(message.id);
                  }}
                >
                  <input
                    className={styles.commentInput}
                    value={commentDrafts[message.id] || ''}
                    onChange={(e) => setCommentDrafts(prev => ({ ...prev, [message.id]: e.target.value }))}
                    placeholder="Write a comment..."
                    disabled={commentSubmitting[message.id]}
                    maxLength={500}
                  />
                  <button
                    type="submit"
                    className={styles.commentButton}
                    disabled={!commentDrafts[message.id]?.trim() || commentSubmitting[message.id]}
                  >
                    Comment
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Delete Message</h3>
            <p>Are you sure you want to delete this message?</p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmDeleteButton}
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
