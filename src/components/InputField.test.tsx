import { describe, it, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import { InputField, type InputFieldProps } from './InputField';

/**
 * Feature: cabin-home-page, Property 4: Focus feedback
 * 
 * For any input field in the form, when that field receives focus, 
 * the system should apply visual styling to indicate the active state.
 * 
 * Validates: Requirements 3.1
 */
describe('InputField - Property 4: Focus feedback', () => {
  it('should apply focus styling when any input field receives focus', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary input field configurations
        fc.record({
          label: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
          type: fc.constantFrom('text' as const, 'email' as const, 'tel' as const),
          value: fc.string({ maxLength: 100 }),
          placeholder: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
          required: fc.boolean(),
          error: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          touched: fc.boolean(),
        }),
        async (fieldConfig) => {
          // Setup
          const onChange = vi.fn();
          const onBlur = vi.fn();
          const user = userEvent.setup();

          const props: InputFieldProps = {
            label: fieldConfig.label,
            name: fieldConfig.name,
            type: fieldConfig.type,
            value: fieldConfig.value,
            onChange,
            onBlur,
            placeholder: fieldConfig.placeholder,
            required: fieldConfig.required,
            error: fieldConfig.error,
            touched: fieldConfig.touched,
          };

          // Render the component
          const { container } = render(<InputField {...props} />);

          // Get the input element by its ID (which matches the name)
          const input = container.querySelector(`#${fieldConfig.name}`) as HTMLInputElement;
          expect(input).toBeTruthy();

          // Verify input is not focused initially
          expect(input).not.toHaveFocus();

          // Focus the input field
          await user.click(input);

          // Verify the input now has focus
          expect(input).toHaveFocus();

          // Verify that the focused element is the input we clicked
          expect(document.activeElement).toBe(input);

          // Clean up after each property test run
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: cabin-home-page, Property 5: Validation feedback consistency
 * 
 * For any input field, the presence of an error message should correspond to 
 * the validity state of the field - valid fields should not show errors, 
 * invalid fields should show appropriate error messages.
 * 
 * Validates: Requirements 3.2, 3.3
 */
describe('InputField - Property 5: Validation feedback consistency', () => {
  it('should show error messages only for invalid touched fields and not for valid fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary input field configurations
        fc.record({
          label: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
          type: fc.constantFrom('text' as const, 'email' as const, 'tel' as const),
          value: fc.string({ maxLength: 100 }),
          placeholder: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
          required: fc.boolean(),
          error: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          touched: fc.boolean(),
        }),
        async (fieldConfig) => {
          // Setup
          const onChange = vi.fn();
          const onBlur = vi.fn();

          const props: InputFieldProps = {
            label: fieldConfig.label,
            name: fieldConfig.name,
            type: fieldConfig.type,
            value: fieldConfig.value,
            onChange,
            onBlur,
            placeholder: fieldConfig.placeholder,
            required: fieldConfig.required,
            error: fieldConfig.error,
            touched: fieldConfig.touched,
          };

          // Render the component
          const { container, queryByRole } = render(<InputField {...props} />);

          // Get the input element
          const input = container.querySelector(`#${fieldConfig.name}`) as HTMLInputElement;
          expect(input).toBeTruthy();

          // Check for error message element
          const errorMessage = queryByRole('alert');

          // Property: Error messages should only appear when field is touched AND has an error
          if (fieldConfig.touched && fieldConfig.error) {
            // Invalid touched field should show error message
            expect(errorMessage).toBeTruthy();
            expect(errorMessage?.textContent).toBe(fieldConfig.error);
            
            // Verify aria-invalid is set correctly
            expect(input.getAttribute('aria-invalid')).toBe('true');
            
            // Verify aria-describedby links to error message
            expect(input.getAttribute('aria-describedby')).toBe(`${fieldConfig.name}-error`);
          } else {
            // Valid fields or untouched fields should NOT show error messages
            expect(errorMessage).toBeNull();
            
            // Verify aria-invalid is set correctly
            expect(input.getAttribute('aria-invalid')).toBe('false');
            
            // Verify aria-describedby is not set
            expect(input.getAttribute('aria-describedby')).toBeNull();
          }

          // Clean up after each property test run
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});
