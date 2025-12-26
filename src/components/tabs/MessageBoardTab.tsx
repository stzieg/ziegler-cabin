import React, { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '../../contexts/SupabaseProvider';
import {
  getMessages,
  createMessage,
  deleteMessage,
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
      }
    );

    return unsubscribe;
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMessages(100);
      setMessages(data);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
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
