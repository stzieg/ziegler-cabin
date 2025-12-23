import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateEmail, validatePhoneNumber, validateName, validateForm } from './validation';

/**
 * Feature: cabin-home-page, Property 3: Field-specific validation
 * 
 * For any input field with field-specific validation rules (email format, phone format), 
 * entering invalid data should trigger a validation error message specific to that field's requirements.
 * 
 * Validates: Requirements 2.4, 2.5
 */
describe('Validation - Property 3: Field-specific validation', () => {
  describe('Email validation', () => {
    it('should reject invalid email formats and provide field-specific error messages', () => {
      fc.assert(
        fc.property(
          // Generate invalid email strings
          fc.oneof(
            // Empty string
            fc.constant(''),
            // Whitespace only
            fc.constant('   '),
            // Missing @ symbol
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('@')),
            // Missing domain
            fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}@`),
            // Missing local part
            fc.string({ minLength: 1, maxLength: 20 }).map(s => `@${s}`),
            // Missing TLD
            fc.tuple(
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('@') && !s.includes('.')),
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('@') && !s.includes('.'))
            ).map(([local, domain]) => `${local}@${domain}`),
            // Multiple @ symbols
            fc.tuple(
              fc.string({ minLength: 1, maxLength: 10 }),
              fc.string({ minLength: 1, maxLength: 10 }),
              fc.string({ minLength: 1, maxLength: 10 })
            ).map(([a, b, c]) => `${a}@${b}@${c}`),
            // Spaces in email
            fc.tuple(
              fc.string({ minLength: 1, maxLength: 10 }),
              fc.string({ minLength: 1, maxLength: 10 })
            ).map(([local, domain]) => `${local} @${domain}.com`)
          ),
          (invalidEmail) => {
            const result = validateEmail(invalidEmail);
            
            // Property: Invalid emails should always be rejected
            expect(result.isValid).toBe(false);
            
            // Property: Error message should be field-specific and present
            expect(result.message).toBeDefined();
            expect(result.message).toBeTruthy();
            
            // Property: Error message should be one of the expected email-specific messages
            const validMessages = [
              'Email is required',
              'Please enter a valid email address'
            ];
            expect(validMessages).toContain(result.message);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid email formats', () => {
      fc.assert(
        fc.property(
          // Generate valid email strings that match our regex pattern
          fc.tuple(
            fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,19}$/),
            fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,19}$/),
            fc.stringMatching(/^[a-zA-Z]{2,10}$/)
          ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`),
          (validEmail) => {
            const result = validateEmail(validEmail);
            
            // Property: Valid emails should always be accepted
            expect(result.isValid).toBe(true);
            
            // Property: Valid emails should not have error messages
            expect(result.message).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Phone number validation', () => {
    it('should reject invalid phone number formats and provide field-specific error messages', () => {
      fc.assert(
        fc.property(
          // Generate invalid phone number strings
          fc.oneof(
            // Empty string
            fc.constant(''),
            // Whitespace only
            fc.constant('   '),
            // Too few digits
            fc.integer({ min: 0, max: 999999999 }).map(n => n.toString()),
            // Too many digits
            fc.integer({ min: 10000000000, max: 99999999999 }).map(n => n.toString()),
            // Invalid characters (letters)
            fc.string({ minLength: 10, maxLength: 10 }).filter(s => /[a-zA-Z]/.test(s)),
            // Invalid special characters
            fc.tuple(
              fc.integer({ min: 100, max: 999 }),
              fc.integer({ min: 100, max: 999 }),
              fc.integer({ min: 1000, max: 9999 })
            ).map(([a, b, c]) => `${a}*${b}#${c}`)
          ),
          (invalidPhone) => {
            const result = validatePhoneNumber(invalidPhone);
            
            // Property: Invalid phone numbers should always be rejected
            expect(result.isValid).toBe(false);
            
            // Property: Error message should be field-specific and present
            expect(result.message).toBeDefined();
            expect(result.message).toBeTruthy();
            
            // Property: Error message should be one of the expected phone-specific messages
            const validMessages = [
              'Phone number is required',
              'Please enter a valid phone number'
            ];
            expect(validMessages).toContain(result.message);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid phone number formats', () => {
      fc.assert(
        fc.property(
          // Generate valid 10-digit phone numbers in various formats
          fc.tuple(
            fc.integer({ min: 100, max: 999 }),
            fc.integer({ min: 100, max: 999 }),
            fc.integer({ min: 1000, max: 9999 })
          ).chain(([area, prefix, line]) => 
            fc.constantFrom(
              // Format: XXXXXXXXXX
              `${area}${prefix}${line}`,
              // Format: XXX-XXX-XXXX
              `${area}-${prefix}-${line}`,
              // Format: (XXX) XXX-XXXX
              `(${area}) ${prefix}-${line}`,
              // Format with spaces: XXX XXX XXXX
              `${area} ${prefix} ${line}`
            )
          ),
          (validPhone) => {
            const result = validatePhoneNumber(validPhone);
            
            // Property: Valid phone numbers should always be accepted
            expect(result.isValid).toBe(true);
            
            // Property: Valid phone numbers should not have error messages
            expect(result.message).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Cross-field validation specificity', () => {
    it('should provide distinct error messages for different field types', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (invalidInput) => {
            const emailResult = validateEmail(invalidInput);
            const phoneResult = validatePhoneNumber(invalidInput);
            
            // Property: If both validations fail, they should provide different error messages
            // (unless the input happens to be valid for one of them)
            if (!emailResult.isValid && !phoneResult.isValid) {
              // The error messages should be field-specific
              // Email errors should mention "email"
              if (emailResult.message && emailResult.message !== 'Email is required') {
                expect(emailResult.message.toLowerCase()).toContain('email');
              }
              
              // Phone errors should mention "phone"
              if (phoneResult.message && phoneResult.message !== 'Phone number is required') {
                expect(phoneResult.message.toLowerCase()).toContain('phone');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Unit tests for validation functions
 * Requirements: 2.4, 2.5
 */
describe('Email Validation - Unit Tests', () => {
  describe('Valid email examples', () => {
    it('should accept standard email format', () => {
      const result = validateEmail('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should accept email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should accept email with numbers', () => {
      const result = validateEmail('user123@example456.com');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should accept email with dots in local part', () => {
      const result = validateEmail('first.last@example.com');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should accept email with plus sign', () => {
      const result = validateEmail('user+tag@example.com');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });
  });

  describe('Invalid email examples', () => {
    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Email is required');
    });

    it('should reject whitespace-only email', () => {
      const result = validateEmail('   ');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Email is required');
    });

    it('should reject email without @ symbol', () => {
      const result = validateEmail('userexample.com');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Please enter a valid email address');
    });

    it('should reject email without domain', () => {
      const result = validateEmail('user@');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Please enter a valid email address');
    });

    it('should reject email without local part', () => {
      const result = validateEmail('@example.com');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Please enter a valid email address');
    });

    it('should reject email without TLD', () => {
      const result = validateEmail('user@example');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Please enter a valid email address');
    });

    it('should reject email with spaces', () => {
      const result = validateEmail('user @example.com');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Please enter a valid email address');
    });

    it('should reject email with multiple @ symbols', () => {
      const result = validateEmail('user@@example.com');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Please enter a valid email address');
    });
  });
});

describe('Phone Number Validation - Unit Tests', () => {
  describe('Valid phone formats', () => {
    it('should accept 10 digits without formatting', () => {
      const result = validatePhoneNumber('1234567890');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should accept format XXX-XXX-XXXX', () => {
      const result = validatePhoneNumber('123-456-7890');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should accept format (XXX) XXX-XXXX', () => {
      const result = validatePhoneNumber('(123) 456-7890');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should accept format with spaces', () => {
      const result = validatePhoneNumber('123 456 7890');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should accept mixed formatting', () => {
      const result = validatePhoneNumber('(123)456-7890');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });
  });

  describe('Invalid phone formats', () => {
    it('should reject empty phone number', () => {
      const result = validatePhoneNumber('');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Phone number is required');
    });

    it('should reject whitespace-only phone number', () => {
      const result = validatePhoneNumber('   ');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Phone number is required');
    });

    it('should reject phone with too few digits', () => {
      const result = validatePhoneNumber('123456789');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Please enter a valid phone number');
    });

    it('should reject phone with too many digits', () => {
      const result = validatePhoneNumber('12345678901');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Please enter a valid phone number');
    });

    it('should reject phone with letters', () => {
      const result = validatePhoneNumber('123-456-ABCD');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Please enter a valid phone number');
    });

    it('should reject phone with invalid special characters', () => {
      const result = validatePhoneNumber('123*456#7890');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Please enter a valid phone number');
    });

    it('should reject phone with only 5 digits', () => {
      const result = validatePhoneNumber('12345');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Please enter a valid phone number');
    });
  });
});

describe('Name Validation - Unit Tests', () => {
  describe('Valid name examples', () => {
    it('should accept simple name', () => {
      const result = validateName('John', 'First name');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should accept name with spaces', () => {
      const result = validateName('Mary Jane', 'First name');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should accept hyphenated name', () => {
      const result = validateName('Anne-Marie', 'First name');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should accept name with mixed case', () => {
      const result = validateName('McDonald', 'Last name');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should accept single character name', () => {
      const result = validateName('A', 'First name');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should accept name at maximum length (50 characters)', () => {
      const result = validateName('a'.repeat(50), 'First name');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });
  });

  describe('Invalid name examples - Edge cases', () => {
    it('should reject empty name', () => {
      const result = validateName('', 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('First name is required');
    });

    it('should reject whitespace-only name', () => {
      const result = validateName('   ', 'Last name');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Last name is required');
    });

    it('should reject name exceeding 50 characters', () => {
      const result = validateName('a'.repeat(51), 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Name must be 50 characters or less');
    });

    it('should reject name with numbers', () => {
      const result = validateName('John123', 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Name can only contain letters, spaces, and hyphens');
    });

    it('should reject name with special characters', () => {
      const result = validateName('John@Doe', 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Name can only contain letters, spaces, and hyphens');
    });

    it('should reject name with underscores', () => {
      const result = validateName('John_Doe', 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Name can only contain letters, spaces, and hyphens');
    });

    it('should reject name with periods', () => {
      const result = validateName('John.Doe', 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Name can only contain letters, spaces, and hyphens');
    });

    it('should use custom field name in error message', () => {
      const result = validateName('', 'Last name');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Last name is required');
    });

    it('should use default field name when not provided', () => {
      const result = validateName('');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Name is required');
    });
  });
});

describe('Form Validation - Unit Tests', () => {
  it('should return no errors for valid form data', () => {
    const formData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '123-456-7890',
    };

    const result = validateForm(formData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return all field errors for completely invalid form', () => {
    const formData = {
      firstName: '',
      lastName: '',
      email: 'invalid-email',
      phoneNumber: '123',
    };

    const result = validateForm(formData);
    expect(result.isValid).toBe(false);
    expect(result.errors.firstName).toBe('First name is required');
    expect(result.errors.lastName).toBe('Last name is required');
    expect(result.errors.email).toBe('Please enter a valid email address');
    expect(result.errors.phoneNumber).toBe('Please enter a valid phone number');
  });

  it('should return only specific field errors', () => {
    const formData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'invalid',
      phoneNumber: '1234567890',
    };

    const result = validateForm(formData);
    expect(result.isValid).toBe(false);
    expect(result.errors.firstName).toBeUndefined();
    expect(result.errors.lastName).toBeUndefined();
    expect(result.errors.email).toBe('Please enter a valid email address');
    expect(result.errors.phoneNumber).toBeUndefined();
  });

  it('should validate first name with proper field label', () => {
    const formData = {
      firstName: '',
      lastName: 'Doe',
      email: 'john@example.com',
      phoneNumber: '1234567890',
    };

    const result = validateForm(formData);
    expect(result.isValid).toBe(false);
    expect(result.errors.firstName).toBe('First name is required');
  });

  it('should validate last name with proper field label', () => {
    const formData = {
      firstName: 'John',
      lastName: '',
      email: 'john@example.com',
      phoneNumber: '1234567890',
    };

    const result = validateForm(formData);
    expect(result.isValid).toBe(false);
    expect(result.errors.lastName).toBe('Last name is required');
  });
});
