import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateEmail, validatePassword } from './validation';

/**
 * Property-Based Tests for Validation Utilities
 * Using fast-check for property-based testing
 */

describe('Validation Utilities - Property-Based Tests', () => {
  /**
   * **Feature: cabin-home-page, Property 2: Email format validation**
   * **Validates: Requirements 2.4**
   * 
   * For any invalid email format entered in registration or login forms, 
   * the system should display an appropriate validation message indicating 
   * the email format is incorrect.
   */
  it('Property 2: Email format validation - invalid email formats should be rejected', () => {
    fc.assert(
      fc.property(
        // Generate various invalid email formats
        fc.oneof(
          // Empty strings and whitespace
          fc.constantFrom('', '   ', '\t', '\n'),
          // Missing @ symbol
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('@')),
          // Missing domain
          fc.string({ minLength: 1, maxLength: 20 }).map(s => s + '@'),
          // Missing local part
          fc.string({ minLength: 1, maxLength: 20 }).map(s => '@' + s),
          // Multiple @ symbols
          fc.string({ minLength: 1, maxLength: 10 }).map(s => s + '@@' + s),
          // Missing TLD
          fc.string({ minLength: 1, maxLength: 10 }).map(s => s + '@domain'),
          // Invalid characters
          fc.constantFrom('test@domain..com', 'test@.domain.com', 'test@domain.', '.test@domain.com'),
          // Spaces in email
          fc.constantFrom('test @domain.com', 'test@ domain.com', 'test@domain .com'),
        ),
        (invalidEmail) => {
          // Act: Validate the invalid email
          const result = validateEmail(invalidEmail);
          
          // Assert: Should be invalid
          expect(result.isValid).toBe(false);
          expect(result.message).toBeDefined();
          expect(typeof result.message).toBe('string');
          expect(result.message!.length).toBeGreaterThan(0);
          
          // Should contain appropriate error message
          const message = result.message!.toLowerCase();
          expect(
            message.includes('email') || 
            message.includes('required') || 
            message.includes('valid')
          ).toBe(true);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Property: Valid email formats should be accepted
   * This complements the invalid email test to ensure valid emails pass
   */
  it('Property 2 (complement): Valid email formats should be accepted', () => {
    fc.assert(
      fc.property(
        // Generate valid email formats
        fc.emailAddress(),
        (validEmail) => {
          // Act: Validate the valid email
          const result = validateEmail(validEmail);
          
          // Assert: Should be valid
          expect(result.isValid).toBe(true);
          expect(result.message).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: cabin-home-page, Property 3: Password strength validation**
   * **Validates: Requirements 2.5**
   * 
   * For any password that doesn't meet strength requirements, the registration 
   * form should display validation messages explaining the password requirements.
   */
  it('Property 3: Password strength validation - weak passwords should be rejected', () => {
    fc.assert(
      fc.property(
        // Generate various weak password formats
        fc.oneof(
          // Empty strings and whitespace
          fc.constantFrom('', '   ', '\t', '\n'),
          // Too short (less than 8 characters)
          fc.string({ minLength: 1, maxLength: 7 }),
          // No uppercase letters
          fc.string({ minLength: 8, maxLength: 20 }).filter(s => !/[A-Z]/.test(s)),
          // No lowercase letters
          fc.string({ minLength: 8, maxLength: 20 }).filter(s => !/[a-z]/.test(s)),
          // No numbers
          fc.string({ minLength: 8, maxLength: 20 }).filter(s => !/\d/.test(s)),
          // Specific weak password examples
          fc.constantFrom('password', 'PASSWORD', '12345678', 'abcdefgh', 'ABCDEFGH'),
        ),
        (weakPassword) => {
          // Act: Validate the weak password
          const result = validatePassword(weakPassword);
          
          // Assert: Should be invalid
          expect(result.isValid).toBe(false);
          expect(result.message).toBeDefined();
          expect(typeof result.message).toBe('string');
          expect(result.message!.length).toBeGreaterThan(0);
          
          // Should contain appropriate error message
          const message = result.message!.toLowerCase();
          expect(
            message.includes('password') || 
            message.includes('required') || 
            message.includes('characters') ||
            message.includes('uppercase') ||
            message.includes('lowercase') ||
            message.includes('number')
          ).toBe(true);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Property: Strong passwords should be accepted
   * This complements the weak password test to ensure strong passwords pass
   */
  it('Property 3 (complement): Strong passwords should be accepted', () => {
    fc.assert(
      fc.property(
        // Generate strong passwords that meet all requirements
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => /[A-Z]/.test(s)), // Uppercase part
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => /[a-z]/.test(s)), // Lowercase part
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => /\d/.test(s)), // Number part
          fc.string({ minLength: 1, maxLength: 10 }) // Additional characters
        ).map(([upper, lower, number, extra]) => {
          // Combine parts to ensure all requirements are met
          const password = upper + lower + number + extra;
          // Ensure minimum length
          return password.length >= 8 ? password : password + 'Aa1';
        }),
        (strongPassword) => {
          // Pre-condition: Ensure the generated password actually meets requirements
          fc.pre(
            strongPassword.length >= 8 &&
            /[A-Z]/.test(strongPassword) &&
            /[a-z]/.test(strongPassword) &&
            /\d/.test(strongPassword)
          );
          
          // Act: Validate the strong password
          const result = validatePassword(strongPassword);
          
          // Assert: Should be valid
          expect(result.isValid).toBe(true);
          expect(result.message).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});