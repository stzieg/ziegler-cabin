// Quick test script for SendGrid email functionality
import { emailService } from './src/utils/emailService.js';

async function testSendGridEmail() {
  console.log('Testing SendGrid email functionality...');
  
  try {
    const result = await emailService.sendInvitationEmail(
      'test@example.com', // Replace with your email for testing
      'http://localhost:5174/register?token=test-token-123',
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      'Test Sender'
    );
    
    console.log('Email send result:', result);
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('Message ID:', result.messageId);
    } else {
      console.log('❌ Email failed to send:', result.error);
    }
  } catch (error) {
    console.error('❌ Error testing email:', error.message);
  }
}

testSendGridEmail();