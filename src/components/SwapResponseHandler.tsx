import React, { useState, useEffect } from 'react';
import styles from './SwapResponseHandler.module.css';

type ResponseStatus = 'loading' | 'success' | 'error';

export const SwapResponseHandler: React.FC = () => {
  const [status, setStatus] = useState<ResponseStatus>('loading');
  const [message, setMessage] = useState('');
  const [action, setAction] = useState<'accepted' | 'declined' | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const actionParam = params.get('action');

    if (!token || !actionParam) {
      setStatus('error');
      setMessage('Invalid link. Missing required parameters.');
      return;
    }

    handleSwapResponse(token, actionParam);
  }, []);

  const handleSwapResponse = async (token: string, actionParam: string) => {
    try {
      const response = await fetch(`/api/handle-swap-response?token=${token}&action=${actionParam}`);
      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setAction(data.action);
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch (err) {
      console.error('Error processing swap response:', err);
      setStatus('error');
      setMessage('Failed to process your response. Please try again or contact support.');
    }
  };

  const goToCalendar = () => {
    window.location.href = '/#calendar';
  };

  const goToHome = () => {
    window.location.href = '/';
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {status === 'loading' && (
          <>
            <div className={styles.spinner} />
            <h1 className={styles.title}>Processing...</h1>
            <p className={styles.message}>Please wait while we process your response.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={`${styles.icon} ${action === 'accepted' ? styles.success : styles.declined}`}>
              {action === 'accepted' ? '✓' : '✕'}
            </div>
            <h1 className={styles.title}>
              {action === 'accepted' ? 'Swap Complete!' : 'Request Declined'}
            </h1>
            <p className={styles.message}>{message}</p>
            {action === 'accepted' && (
              <p className={styles.subMessage}>
                Both reservations have been updated. Check the calendar to see your new reservation dates.
              </p>
            )}
            <div className={styles.actions}>
              <button className={styles.primaryButton} onClick={goToCalendar}>
                View Calendar
              </button>
              <button className={styles.secondaryButton} onClick={goToHome}>
                Go to Home
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={`${styles.icon} ${styles.error}`}>!</div>
            <h1 className={styles.title}>Something Went Wrong</h1>
            <p className={styles.message}>{message}</p>
            <div className={styles.actions}>
              <button className={styles.primaryButton} onClick={goToHome}>
                Go to Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
