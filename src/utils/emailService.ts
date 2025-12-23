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
  provider: 'supabase' | 'sendgrid' | 'mailgun' | 'resend' | 'console';
  apiKey?: string;
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
      fromEmail: 'noreply@cabin.family',
      fromName: 'Cabin Management Team',
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
        case 'supabase':
          return await this.sendViaSupabase(recipientEmail, subject, htmlContent, textContent);
        case 'sendgrid':
          return await this.sendViaSendGrid(recipientEmail, subject, htmlContent, textContent);
        case 'mailgun':
          return await this.sendViaMailgun(recipientEmail, subject, htmlContent, textContent);
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
   * Send email via Supabase Edge Functions
   * This calls a Supabase Edge Function that handles email sending via SendGrid
   */
  private async sendViaSupabase(
    to: string,
    subject: string,
    html: string,
    text: string
  ): Promise<EmailSendResult> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          text
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Supabase Edge Function error: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error
      };
    } catch (error: any) {
      console.error('Supabase email sending error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email via Supabase'
      };
    }
  }

  /**
   * Send email via SendGrid (using proxy server to avoid CORS)
   */
  private async sendViaSendGrid(
    to: string,
    subject: string,
    html: string,
    text: string
  ): Promise<EmailSendResult> {
    try {
      // Validate configuration
      if (!this.config.apiKey) {
        throw new Error('SendGrid API key is required. Please set VITE_EMAIL_API_KEY in your .env file.');
      }

      if (!this.config.fromEmail) {
        throw new Error('From email is required. Please set VITE_EMAIL_FROM in your .env file.');
      }

      console.log('Sending email via SendGrid proxy:', {
        to,
        from: this.config.fromEmail,
        subject,
        apiKeyPrefix: this.config.apiKey?.substring(0, 10) + '...'
      });

      // Use local proxy server to avoid CORS issues
      const proxyUrl = 'http://localhost:3001/send-email';
      
      const response = await fetch(proxyUrl, {
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

      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `SendGrid proxy error: ${response.status}`;
        
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch (parseError) {
          errorMessage += ` - ${errorData}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown SendGrid error');
      }

      console.log('Email sent successfully via SendGrid:', {
        messageId: result.messageId,
        to
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error: any) {
      console.error('SendGrid email sending error:', error);
      
      // Provide helpful error messages
      let userFriendlyError = error.message;
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        userFriendlyError = 'Cannot connect to email proxy server. Please start the proxy server with: node email-proxy-server.js';
      } else if (error.message.includes('ECONNREFUSED')) {
        userFriendlyError = 'Email proxy server not running. Please start it with: node email-proxy-server.js';
      }
      
      return {
        success: false,
        error: userFriendlyError
      };
    }
  }

  /**
   * Send email via Resend
   */
  private async sendViaResend(
    to: string,
    subject: string,
    html: string,
    text: string
  ): Promise<EmailSendResult> {
    try {
      // Validate configuration
      if (!this.config.apiKey) {
        throw new Error('Resend API key is required. Please set VITE_EMAIL_API_KEY in your .env file.');
      }

      if (!this.config.fromEmail) {
        throw new Error('From email is required. Please set VITE_EMAIL_FROM in your .env file.');
      }

      console.log('Sending email via Resend:', {
        to,
        from: this.config.fromEmail,
        subject,
        apiKeyPrefix: this.config.apiKey?.substring(0, 10) + '...'
      });

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
          to: [to],
          subject,
          html,
          text
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `Resend API error: ${response.status}`;
        
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch (parseError) {
          errorMessage += ` - ${errorData}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      console.log('Email sent successfully via Resend:', {
        id: result.id,
        to
      });

      return {
        success: true,
        messageId: result.id
      };
    } catch (error: any) {
      console.error('Resend email sending error:', error);
      
      // Provide helpful error messages
      let userFriendlyError = error.message;
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        userFriendlyError = 'Cannot connect to Resend API. Please check your internet connection.';
      } else if (error.message.includes('401')) {
        userFriendlyError = 'Invalid Resend API key. Please check your VITE_EMAIL_API_KEY.';
      } else if (error.message.includes('domain not verified')) {
        userFriendlyError = 'Domain not verified in Resend. Please verify your domain in the Resend dashboard.';
      }
      
      return {
        success: false,
        error: userFriendlyError
      };
    }
  }

  /**
   * Send email via Mailgun
   */
  private async sendViaMailgun(
    to: string,
    subject: string,
    html: string,
    text: string
  ): Promise<EmailSendResult> {
    try {
      const domain = this.config.fromEmail?.split('@')[1] || 'cabin.family';
      const formData = new FormData();
      formData.append('from', `${this.config.fromName} <${this.config.fromEmail}>`);
      formData.append('to', to);
      formData.append('subject', subject);
      formData.append('text', text);
      formData.append('html', html);

      const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`api:${this.config.apiKey}`)}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Mailgun API error: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      return {
        success: true,
        messageId: result.id
      };
    } catch (error: any) {
      console.error('Mailgun email sending error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email via Mailgun'
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
        messageId: `console-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
   * Send a test email to verify SendGrid configuration
   * Use your own email address for testing
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
        'SendGrid Test'
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
  // In a real application, these would come from environment variables
  const provider = (import.meta.env.VITE_EMAIL_PROVIDER as EmailServiceConfig['provider']) || 'console';
  const apiKey = import.meta.env.VITE_EMAIL_API_KEY;
  const fromEmail = import.meta.env.VITE_EMAIL_FROM || 'noreply@cabin.family';
  const fromName = import.meta.env.VITE_EMAIL_FROM_NAME || 'Cabin Management Team';

  return new EmailService({
    provider,
    apiKey,
    fromEmail,
    fromName
  });
};

/**
 * Default email service instance
 */
export const emailService = createEmailService();