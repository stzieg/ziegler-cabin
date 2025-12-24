/**
 * Email service for sending invitation emails
 * Requirements: 8.2, 8.3
 */

import { 
  generateInvitationEmailHTML, 
  generateInvitationEmailText, 
  generateInvitationEmailSubject,
  formatExpirationDate,
  validateEmailTemplateData,
  type EmailTemplateData 
} from './emailTemplates';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailServiceConfig {
  provider: 'resend' | 'console';
  fromEmail?: string;
  fromName?: string;
}

/**
 * Email service class for handling invitation emails
 */
export class EmailService {
  private config: EmailServiceConfig;

  constructor(config: EmailServiceConfig) {
    this.config = {
      fromEmail: 'noreply@zieglercabin.com',
      fromName: 'Ziegler Family Cabin',
      ...config
    };
  }

  /**
   * Send invitation email
   * Requirements: 8.2, 8.3
   */
  async sendInvitationEmail(
    recipientEmail: string,
    invitationUrl: string,
    expiresAt: string,
    senderName?: string
  ): Promise<EmailSendResult> {
    try {
      // Prepare email template data
      const templateData: EmailTemplateData = {
        recipientEmail,
        invitationUrl,
        expiresAt: formatExpirationDate(expiresAt),
        senderName
      };

      // Validate template data
      const validation = validateEmailTemplateData(templateData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid email data: ${validation.errors.join(', ')}`
        };
      }

      // Generate email content
      const subject = generateInvitationEmailSubject();
      const htmlContent = generateInvitationEmailHTML(templateData);
      const textContent = generateInvitationEmailText(templateData);

      // Send email based on provider
      switch (this.config.provider) {
        case 'resend':
          return await this.sendViaResend(recipientEmail, subject, htmlContent, textContent);
        case 'console':
        default:
          return await this.sendViaConsole(recipientEmail, subject, htmlContent, textContent);
      }
    } catch (error: any) {
      console.error('Error sending invitation email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  /**
   * Send email via Resend (using Vercel serverless function)
   */
  private async sendViaResend(
    to: string,
    subject: string,
    html: string,
    text: string
  ): Promise<EmailSendResult> {
    try {
      console.log('Sending email via Resend:', {
        to,
        from: this.config.fromEmail,
        subject
      });

      // Use the Vercel serverless function endpoint
      // In production, use relative URL; in dev, try the current origin
      const apiUrl = '/api/send-email';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          text
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `API error: ${response.status}`);
      }
      
      console.log('Email sent successfully via Resend:', {
        id: result.messageId,
        to
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error: any) {
      console.error('Resend email sending error:', error);
      
      let userFriendlyError = error.message;
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        userFriendlyError = 'Cannot connect to email service. Please check your internet connection.';
      } else if (error.message.includes('not configured')) {
        userFriendlyError = 'Email service not configured. Please contact the administrator.';
      }
      
      return {
        success: false,
        error: userFriendlyError
      };
    }
  }

  /**
   * Console-based email sending for development/testing
   * Requirements: 8.2, 8.3
   */
  private async sendViaConsole(
    to: string,
    subject: string,
    html: string,
    text: string
  ): Promise<EmailSendResult> {
    try {
      console.log('\n=== EMAIL INVITATION ===');
      console.log(`To: ${to}`);
      console.log(`From: ${this.config.fromName} <${this.config.fromEmail}>`);
      console.log(`Subject: ${subject}`);
      console.log('\n--- TEXT CONTENT ---');
      console.log(text);
      console.log('\n--- HTML CONTENT ---');
      console.log(html);
      console.log('\n========================\n');

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        messageId: `console-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      };
    } catch (error: any) {
      console.error('Console email sending error:', error);
      return {
        success: false,
        error: error.message || 'Failed to log email to console'
      };
    }
  }

  /**
   * Test email service configuration
   */
  async testConnection(): Promise<EmailSendResult> {
    try {
      const testEmail = 'test@example.com';
      const testUrl = 'https://example.com/register?token=test-token';
      const testExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      return await this.sendInvitationEmail(
        testEmail,
        testUrl,
        testExpiration,
        'Test Sender'
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Email service test failed'
      };
    }
  }

  /**
   * Send a test email to verify configuration
   */
  async sendTestEmail(recipientEmail: string): Promise<EmailSendResult> {
    try {
      console.log(`Sending test email to ${recipientEmail}...`);
      
      const testUrl = `${import.meta.env.VITE_APP_URL || 'http://localhost:5175'}/register?token=test-token-${Date.now()}`;
      const testExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const result = await this.sendInvitationEmail(
        recipientEmail,
        testUrl,
        testExpiration,
        'Email Test'
      );

      if (result.success) {
        console.log('✅ Test email sent successfully!');
        console.log('Check your inbox (and spam folder) for the invitation email.');
      } else {
        console.log('❌ Test email failed:', result.error);
      }

      return result;
    } catch (error: any) {
      console.error('Test email error:', error);
      return {
        success: false,
        error: error.message || 'Test email failed'
      };
    }
  }
}

/**
 * Create email service instance based on environment configuration
 */
export const createEmailService = (): EmailService => {
  const provider = (import.meta.env.VITE_EMAIL_PROVIDER as EmailServiceConfig['provider']) || 'console';
  const fromEmail = import.meta.env.VITE_EMAIL_FROM || 'noreply@zieglercabin.com';
  const fromName = import.meta.env.VITE_EMAIL_FROM_NAME || 'Ziegler Family Cabin';

  return new EmailService({
    provider,
    fromEmail,
    fromName
  });
};

/**
 * Default email service instance
 */
export const emailService = createEmailService();
