import React, { useState } from 'react';
import { emailService } from '../utils/emailService';

/**
 * Email testing component for SendGrid verification
 * This is a temporary component for testing email functionality
 */
export const EmailTest: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const testResult = await emailService.sendTestEmail(email);
      
      if (testResult.success) {
        setResult(`✅ Test email sent successfully! Message ID: ${testResult.messageId}`);
      } else {
        setError(`❌ Failed to send test email: ${testResult.error}`);
      }
    } catch (err: any) {
      setError(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '500px', 
      margin: '20px auto',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>📧 SendGrid Email Test</h3>
      <p>Test your SendGrid configuration by sending a test invitation email.</p>
      
      <form onSubmit={handleTestEmail}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="test-email" style={{ display: 'block', marginBottom: '5px' }}>
            Your Email Address:
          </label>
          <input
            id="test-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your-email@example.com"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            disabled={isLoading}
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !email}
          style={{
            backgroundColor: isLoading ? '#ccc' : '#2D5016',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {isLoading ? 'Sending...' : 'Send Test Email'}
        </button>
      </form>

      {result && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          color: '#155724'
        }}>
          {result}
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          color: '#721c24'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
        <strong>Current Configuration:</strong>
        <br />
        Provider: {import.meta.env.VITE_EMAIL_PROVIDER || 'console'}
        <br />
        From: {import.meta.env.VITE_EMAIL_FROM || 'noreply@cabin.family'}
        <br />
        API Key: {import.meta.env.VITE_EMAIL_API_KEY ? '✅ Set' : '❌ Missing'}
      </div>
    </div>
  );
};