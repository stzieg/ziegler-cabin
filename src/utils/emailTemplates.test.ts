import { describe, it, expect } from 'vitest';
import {
  generateInvitationEmailHTML,
  generateInvitationEmailText,
  generateInvitationEmailSubject,
  validateEmailTemplateData,
  formatExpirationDate,
  type EmailTemplateData
} from './emailTemplates';

describe('Email Templates - Unit Tests', () => {
  const mockTemplateData: EmailTemplateData = {
    recipientEmail: 'test@example.com',
    invitationUrl: 'https://cabin.family/register?token=test-token-123',
    expiresAt: '2024-01-15T10:30:00.000Z',
    senderName: 'John Doe'
  };

  describe('generateInvitationEmailHTML', () => {
    it('should generate HTML email with all required elements', () => {
      const html = generateInvitationEmailHTML(mockTemplateData);

      // Check for essential HTML structure
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('</html>');

      // Check for recipient email
      expect(html).toContain(mockTemplateData.recipientEmail);

      // Check for invitation URL
      expect(html).toContain(mockTemplateData.invitationUrl);

      // Check for sender name
      expect(html).toContain(mockTemplateData.senderName);

      // Check for expiration date
      expect(html).toContain(mockTemplateData.expiresAt);

      // Check for key content elements
      expect(html).toContain('You\'re Invited!');
      expect(html).toContain('Accept Invitation');
      expect(html).toContain('cabin management system');
      expect(html).toContain('This invitation expires');
    });

    it('should use default sender name when not provided', () => {
      const dataWithoutSender = { ...mockTemplateData };
      delete dataWithoutSender.senderName;

      const html = generateInvitationEmailHTML(dataWithoutSender);

      expect(html).toContain('Cabin Management Team');
      expect(html).not.toContain('undefined');
    });

    it('should include CSS styling for professional appearance', () => {
      const html = generateInvitationEmailHTML(mockTemplateData);

      expect(html).toContain('<style>');
      expect(html).toContain('font-family:');
      expect(html).toContain('background-color:');
      expect(html).toContain('.invitation-button');
      expect(html).toContain('.expiration-notice');
    });

    it('should include accessibility features', () => {
      const html = generateInvitationEmailHTML(mockTemplateData);

      // Check for semantic HTML and accessibility features
      expect(html).toContain('lang="en"');
      expect(html).toContain('<title>');
      expect(html).toContain('meta charset');
      expect(html).toContain('meta name="viewport"');
    });
  });

  describe('generateInvitationEmailText', () => {
    it('should generate plain text email with all required content', () => {
      const text = generateInvitationEmailText(mockTemplateData);

      // Check for recipient email
      expect(text).toContain(mockTemplateData.recipientEmail);

      // Check for invitation URL
      expect(text).toContain(mockTemplateData.invitationUrl);

      // Check for sender name
      expect(text).toContain(mockTemplateData.senderName);

      // Check for expiration date
      expect(text).toContain(mockTemplateData.expiresAt);

      // Check for key content
      expect(text).toContain('You\'re Invited');
      expect(text).toContain('cabin management system');
      expect(text).toContain('IMPORTANT:');
      expect(text).toContain('This invitation expires');
    });

    it('should use default sender name when not provided', () => {
      const dataWithoutSender = { ...mockTemplateData };
      delete dataWithoutSender.senderName;

      const text = generateInvitationEmailText(dataWithoutSender);

      expect(text).toContain('Cabin Management Team');
      expect(text).not.toContain('undefined');
    });

    it('should not contain HTML tags', () => {
      const text = generateInvitationEmailText(mockTemplateData);

      expect(text).not.toContain('<');
      expect(text).not.toContain('>');
      expect(text).not.toContain('&lt;');
      expect(text).not.toContain('&gt;');
    });

    it('should be properly formatted with line breaks', () => {
      const text = generateInvitationEmailText(mockTemplateData);

      expect(text).toContain('\n\n');
      expect(text.split('\n').length).toBeGreaterThan(5);
    });
  });

  describe('generateInvitationEmailSubject', () => {
    it('should return consistent subject line', () => {
      const subject = generateInvitationEmailSubject();

      expect(subject).toBe("Cabin Management System - Registration Invitation");
      expect(subject.length).toBeGreaterThan(10); // Reasonable subject length
    });

    it('should return same subject on multiple calls', () => {
      const subject1 = generateInvitationEmailSubject();
      const subject2 = generateInvitationEmailSubject();

      expect(subject1).toBe(subject2);
    });
  });

  describe('validateEmailTemplateData', () => {
    it('should validate correct template data', () => {
      const result = validateEmailTemplateData(mockTemplateData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email address', () => {
      const invalidData = { ...mockTemplateData, recipientEmail: 'invalid-email' };
      const result = validateEmailTemplateData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid recipient email is required');
    });

    it('should reject empty email address', () => {
      const invalidData = { ...mockTemplateData, recipientEmail: '' };
      const result = validateEmailTemplateData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid recipient email is required');
    });

    it('should reject invalid invitation URL', () => {
      const invalidData = { ...mockTemplateData, invitationUrl: 'not-a-url' };
      const result = validateEmailTemplateData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid invitation URL is required');
    });

    it('should reject empty invitation URL', () => {
      const invalidData = { ...mockTemplateData, invitationUrl: '' };
      const result = validateEmailTemplateData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid invitation URL is required');
    });

    it('should reject missing expiration date', () => {
      const invalidData = { ...mockTemplateData, expiresAt: '' };
      const result = validateEmailTemplateData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expiration date is required');
    });

    it('should collect multiple validation errors', () => {
      const invalidData = {
        recipientEmail: 'invalid',
        invitationUrl: 'not-url',
        expiresAt: '',
        senderName: 'Valid Sender'
      };
      const result = validateEmailTemplateData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Valid recipient email is required');
      expect(result.errors).toContain('Valid invitation URL is required');
      expect(result.errors).toContain('Expiration date is required');
    });
  });

  describe('formatExpirationDate', () => {
    it('should format ISO date string to readable format', () => {
      const isoDate = '2024-01-15T10:30:00.000Z';
      const formatted = formatExpirationDate(isoDate);

      expect(formatted).toContain('2024');
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
      // Time might be different due to timezone conversion, just check it's formatted
      expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Should contain time format
    });

    it('should handle different date formats', () => {
      const dates = [
        '2024-01-15T10:30:00.000Z',
        '2024-12-31T23:59:59Z',
        '2024-06-15T12:00:00+00:00'
      ];

      dates.forEach(date => {
        const formatted = formatExpirationDate(date);
        expect(formatted).toBeTruthy();
        expect(formatted).not.toBe(date); // Should be formatted differently
      });
    });

    it('should return original string for invalid dates', () => {
      const invalidDate = 'not-a-date';
      const formatted = formatExpirationDate(invalidDate);

      expect(formatted).toBe(invalidDate);
    });

    it('should handle empty string gracefully', () => {
      const formatted = formatExpirationDate('');

      expect(formatted).toBe('');
    });

    it('should include timezone information', () => {
      const isoDate = '2024-01-15T10:30:00.000Z';
      const formatted = formatExpirationDate(isoDate);

      // Should contain some timezone indicator
      expect(formatted).toMatch(/GMT|UTC|EST|PST|CST|MST/i);
    });
  });
});