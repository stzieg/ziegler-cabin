import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService, createEmailService, emailService, type EmailServiceConfig } from './emailService';

// Mock the email templates module
vi.mock('./emailTemplates', () => ({
  generateInvitationEmailHTML: vi.fn(() => '<html>Mock HTML Content</html>'),
  generateInvitationEmailText: vi.fn(() => 'Mock Text Content'),
  generateInvitationEmailSubject: vi.fn(() => 'Mock Subject'),
  formatExpirationDate: vi.fn((date) => `Formatted: ${date}`),
  validateEmailTemplateData: vi.fn(() => ({ isValid: true, errors: [] }))
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Email Service - Unit Tests', () => {
  const testData = {
    recipientEmail: 'test@example.com',
    invitationUrl: 'https://cabin.family/register?token=test-token',
    expiresAt: '2024-01-15T10:30:00.000Z',
    senderName: 'John Doe'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('EmailService Constructor', () => {
    it('should create service with default configuration', () => {
      const config: EmailServiceConfig = { provider: 'console' };
      const service = new EmailService(config);

      expect(service).toBeInstanceOf(EmailService);
    });

    it('should merge provided config with defaults', () => {
      const config: EmailServiceConfig = {
        provider: 'sendgrid',
        apiKey: 'test-key'
      };
      const service = new EmailService(config);

      expect(service).toBeInstanceOf(EmailService);
    });
  });

  describe('sendInvitationEmail', () => {

    describe('Console Provider', () => {
      it('should successfully send email via console', async () => {
        const service = new EmailService({ provider: 'console' });
        const consoleSpy = vi.spyOn(console, 'log');

        const result = await service.sendInvitationEmail(
          testData.recipientEmail,
          testData.invitationUrl,
          testData.expiresAt,
          testData.senderName
        );

        expect(result.success).toBe(true);
        expect(result.messageId).toBeTruthy();
        expect(result.messageId).toContain('console-');
        expect(consoleSpy).toHaveBeenCalledWith('\n=== EMAIL INVITATION ===');
      });

      it('should handle console provider errors gracefully', async () => {
        const service = new EmailService({ provider: 'console' });
        
        // Mock console.log to throw an error
        vi.spyOn(console, 'log').mockImplementation(() => {
          throw new Error('Console error');
        });

        const result = await service.sendInvitationEmail(
          testData.recipientEmail,
          testData.invitationUrl,
          testData.expiresAt
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Console error');
      });
    });

    describe('SendGrid Provider', () => {
      it('should successfully send email via SendGrid', async () => {
        const service = new EmailService({ 
          provider: 'sendgrid',
          apiKey: 'test-sendgrid-key'
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            success: true,
            messageId: 'sendgrid-message-id-123'
          }),
          headers: {
            get: vi.fn(() => 'sendgrid-message-id-123')
          }
        });

        const result = await service.sendInvitationEmail(
          testData.recipientEmail,
          testData.invitationUrl,
          testData.expiresAt
        );

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('sendgrid-message-id-123');
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/send-email',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        );
      });

      it('should handle SendGrid API errors', async () => {
        const service = new EmailService({ 
          provider: 'sendgrid',
          apiKey: 'test-sendgrid-key'
        });

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: vi.fn().mockResolvedValue('Bad Request')
        });

        const result = await service.sendInvitationEmail(
          testData.recipientEmail,
          testData.invitationUrl,
          testData.expiresAt
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('SendGrid proxy error: 400');
      });

      it('should handle SendGrid network errors', async () => {
        const service = new EmailService({ 
          provider: 'sendgrid',
          apiKey: 'test-sendgrid-key'
        });

        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await service.sendInvitationEmail(
          testData.recipientEmail,
          testData.invitationUrl,
          testData.expiresAt
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Network error');
      });
    });

    describe('Mailgun Provider', () => {
      it('should successfully send email via Mailgun', async () => {
        const service = new EmailService({ 
          provider: 'mailgun',
          apiKey: 'test-mailgun-key',
          fromEmail: 'test@cabin.family'
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ id: 'mailgun-message-id-123' })
        });

        const result = await service.sendInvitationEmail(
          testData.recipientEmail,
          testData.invitationUrl,
          testData.expiresAt
        );

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('mailgun-message-id-123');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.mailgun.net/v3/cabin.family/messages',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Basic')
            })
          })
        );
      });

      it('should handle Mailgun API errors', async () => {
        const service = new EmailService({ 
          provider: 'mailgun',
          apiKey: 'test-mailgun-key'
        });

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: vi.fn().mockResolvedValue('Unauthorized')
        });

        const result = await service.sendInvitationEmail(
          testData.recipientEmail,
          testData.invitationUrl,
          testData.expiresAt
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Mailgun API error: 401');
      });
    });

    describe('Supabase Provider', () => {
      it('should successfully send email via Supabase', async () => {
        const service = new EmailService({ 
          provider: 'supabase',
          apiKey: 'test-supabase-key'
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ 
            success: true,
            messageId: 'supabase-message-id-123' 
          })
        });

        const result = await service.sendInvitationEmail(
          testData.recipientEmail,
          testData.invitationUrl,
          testData.expiresAt
        );

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('supabase-message-id-123');
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/functions/v1/send-email'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        );
      });

      it('should handle Supabase API errors', async () => {
        const service = new EmailService({ 
          provider: 'supabase',
          apiKey: 'test-supabase-key'
        });

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: vi.fn().mockResolvedValue('Internal Server Error')
        });

        const result = await service.sendInvitationEmail(
          testData.recipientEmail,
          testData.invitationUrl,
          testData.expiresAt
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Supabase Edge Function error: 500');
      });
    });

    describe('Validation', () => {
      it('should handle validation errors', async () => {
        const { validateEmailTemplateData } = await import('./emailTemplates');
        vi.mocked(validateEmailTemplateData).mockReturnValueOnce({
          isValid: false,
          errors: ['Invalid email', 'Invalid URL']
        });

        const service = new EmailService({ provider: 'console' });

        const result = await service.sendInvitationEmail(
          'invalid-email',
          'invalid-url',
          testData.expiresAt
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid email data');
        expect(result.error).toContain('Invalid email, Invalid URL');
      });
    });

    describe('Error Handling', () => {
      it('should handle unexpected errors gracefully', async () => {
        const service = new EmailService({ provider: 'console' });

        // Mock the email templates to throw an error
        const { generateInvitationEmailHTML } = await import('./emailTemplates');
        vi.mocked(generateInvitationEmailHTML).mockImplementationOnce(() => {
          throw new Error('Template generation failed');
        });

        const result = await service.sendInvitationEmail(
          testData.recipientEmail,
          testData.invitationUrl,
          testData.expiresAt
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Template generation failed');
      });
    });
  });

  describe('testConnection', () => {
    it('should test email service connection', async () => {
      const service = new EmailService({ provider: 'console' });

      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.messageId).toBeTruthy();
    });

    it('should handle test connection failures', async () => {
      const service = new EmailService({ provider: 'console' });

      // Mock console.log to throw an error during test
      vi.spyOn(console, 'log').mockImplementationOnce(() => {
        throw new Error('Test connection failed');
      });

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Test connection failed');
    });
  });

  describe('createEmailService', () => {
    it('should create email service with default configuration', () => {
      const service = createEmailService();

      expect(service).toBeInstanceOf(EmailService);
    });

    it('should use environment variables when available', () => {
      // Mock environment variables
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        VITE_EMAIL_PROVIDER: 'sendgrid',
        VITE_EMAIL_API_KEY: 'env-api-key',
        VITE_EMAIL_FROM: 'env@cabin.family',
        VITE_EMAIL_FROM_NAME: 'Env Cabin Team'
      };

      const service = createEmailService();

      expect(service).toBeInstanceOf(EmailService);

      // Restore environment
      process.env = originalEnv;
    });
  });

  describe('Default Email Service Instance', () => {
    it('should export a default email service instance', () => {
      expect(emailService).toBeInstanceOf(EmailService);
    });
  });

  describe('Email Content Generation', () => {
    it('should call template generation functions with correct parameters', async () => {
      const service = new EmailService({ provider: 'console' });
      
      const { 
        generateInvitationEmailHTML,
        generateInvitationEmailText,
        generateInvitationEmailSubject,
        formatExpirationDate
      } = await import('./emailTemplates');

      await service.sendInvitationEmail(
        testData.recipientEmail,
        testData.invitationUrl,
        testData.expiresAt,
        testData.senderName
      );

      expect(formatExpirationDate).toHaveBeenCalledWith(testData.expiresAt);
      expect(generateInvitationEmailSubject).toHaveBeenCalled();
      expect(generateInvitationEmailHTML).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: testData.recipientEmail,
          invitationUrl: testData.invitationUrl,
          senderName: testData.senderName
        })
      );
      expect(generateInvitationEmailText).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: testData.recipientEmail,
          invitationUrl: testData.invitationUrl,
          senderName: testData.senderName
        })
      );
    });
  });
});