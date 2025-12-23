# Implementation Plan

- [x] 1. Initialize React project with TypeScript and Vite
  - Set up Vite project with React and TypeScript template
  - Configure TypeScript with strict mode
  - Install necessary dependencies (React 18+, TypeScript, Vite)
  - Set up ESLint and Prettier for code quality
  - Create basic project structure (src/components, src/styles, src/utils)
  - _Requirements: 5.1, 5.5_

- [x] 2. Set up theme system and global styles
  - Create CSS custom properties for color palette (forest green, browns, neutrals)
  - Define typography variables (fonts, sizes, line heights)
  - Set up spacing system (8px base unit)
  - Create global styles and CSS reset
  - Configure CSS Modules
  - _Requirements: 1.2, 5.3_

- [x] 3. Create Logo component
  - Implement cursive "Z" logo using custom font or SVG
  - Add responsive sizing (small, medium, large)
  - Apply forest green color from theme
  - Style with woods theme aesthetic
  - _Requirements: 1.1_

- [x] 4. Create InputField component with validation support
  - Build reusable input component with label, error display, and visual states
  - Implement focus state styling
  - Implement error state styling
  - Implement valid state styling (optional)
  - Add support for text, email, and tel input types
  - Handle onChange and onBlur events
  - Display error messages below field
  - _Requirements: 2.1, 3.1, 3.2, 3.3_

- [x] 4.1 Write property test for focus feedback
  - **Property 4: Focus feedback**
  - **Validates: Requirements 3.1**

- [x] 4.2 Write property test for validation feedback consistency
  - **Property 5: Validation feedback consistency**
  - **Validates: Requirements 3.2, 3.3**

- [x] 5. Implement form validation utilities
  - Create email validation function with regex pattern
  - Create phone number validation function with format support
  - Create name validation function (length, character restrictions)
  - Create form-level validation function that aggregates field errors
  - _Requirements: 2.4, 2.5_

- [x] 5.1 Write property test for field-specific validation
  - **Property 3: Field-specific validation**
  - **Validates: Requirements 2.4, 2.5**

- [x] 5.2 Write unit tests for validation functions
  - Test email validation with valid and invalid examples
  - Test phone validation with various formats
  - Test name validation edge cases
  - _Requirements: 2.4, 2.5_

- [x] 6. Create LoginForm component
  - Build form with four input fields (firstName, lastName, email, phoneNumber)
  - Implement form state management using useState
  - Track form data, errors, and touched fields
  - Handle input changes and update state
  - Handle field blur events for validation
  - Implement form submission handler
  - Prevent submission when validation fails
  - Display validation errors for each field
  - Maintain form data when validation fails
  - Clear form or show success state on successful submission
  - _Requirements: 2.1, 2.2, 2.3, 3.5_

- [x] 6.1 Write property test for complete form submission
  - **Property 1: Complete form submission**
  - **Validates: Requirements 2.2**

- [x] 6.2 Write property test for incomplete form rejection
  - **Property 2: Incomplete form rejection**
  - **Validates: Requirements 2.3**

- [x] 6.3 Write property test for form data persistence
  - **Property 6: Form data persistence on validation failure**
  - **Validates: Requirements 3.5**

- [x] 6.4 Write unit tests for LoginForm component
  - Test form renders all required fields
  - Test successful submission with valid data
  - Test validation error display
  - Test form data persistence on error
  - _Requirements: 2.1, 2.2, 2.3, 3.5_

- [x] 7. Create HomePage component and layout
  - Build main page layout structure
  - Position Logo component prominently
  - Center LoginForm component
  - Apply woods/tree theme background
  - Implement responsive layout with CSS Grid or Flexbox
  - Style with theme colors and spacing
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 8. Implement responsive design
  - Add mobile styles (375px viewport)
  - Add tablet styles (768px viewport)
  - Add desktop styles (1024px+ viewport)
  - Ensure smooth layout transitions between breakpoints
  - Test touch interaction support for all interactive elements
  - Verify no horizontal scrolling at any viewport size
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8.1 Write property test for responsive layout adaptation
  - **Property 7: Responsive layout adaptation**
  - **Validates: Requirements 4.4**

- [x] 8.2 Write property test for touch interaction support
  - **Property 8: Touch interaction support**
  - **Validates: Requirements 4.5**

- [x] 8.3 Write unit tests for responsive behavior
  - Test mobile viewport rendering
  - Test tablet viewport rendering
  - Test desktop viewport rendering
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Add accessibility features
  - Add ARIA labels to all form fields
  - Implement keyboard navigation (Tab, Enter)
  - Add focus visible indicators
  - Associate error messages with fields using aria-describedby
  - Ensure minimum touch target sizes (44x44px)
  - Verify color contrast ratios meet WCAG AA
  - Test with keyboard-only navigation
  - _Requirements: 3.1, 4.5_

- [x] 9.1 Write unit tests for accessibility
  - Test keyboard navigation
  - Test ARIA labels presence
  - Test focus management
  - _Requirements: 3.1_

- [x] 10. Implement error handling and user feedback
  - Add success feedback on form submission
  - Implement error boundary component
  - Add console logging for form submission (MVP)
  - Style success and error states
  - _Requirements: 3.4_

- [x] 10.1 Write unit test for success feedback
  - Test success message displays after valid submission
  - _Requirements: 3.4_

- [x] 11. Final polish and optimization
  - Optimize font loading with font-display: swap
  - Add debouncing to validation (300ms)
  - Verify bundle size is under target
  - Test full user flow end-to-end
  - Verify build produces optimized assets
  - _Requirements: 5.4_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Set up Supabase integration
  - Install @supabase/supabase-js package
  - Create Supabase client configuration
  - Set up environment variables for Supabase URL and anon key
  - Create Supabase client utility functions
  - Set up TypeScript types for Supabase
  - _Requirements: 7.1, 9.1, 9.5_

- [x] 14. Create Supabase database schema
  - Create profiles table with RLS policies
  - Create invitations table with RLS policies
  - Set up database indexes for performance
  - Configure Row Level Security policies
  - Test database schema with sample data
  - _Requirements: 7.3, 8.1_

- [x] 15. Implement SupabaseProvider and authentication context
  - Create React context for Supabase client
  - Implement authentication state management
  - Handle session restoration on app load
  - Provide authentication methods to components
  - Add loading states for authentication operations
  - _Requirements: 7.1, 7.2, 5.1, 5.2_

- [x] 15.1 Write property test for Supabase initialization
  - **Property 11: Supabase initialization**
  - **Validates: Requirements 7.1**

- [x] 15.2 Write property test for session persistence
  - **Property 8: Session persistence**
  - **Validates: Requirements 5.2**

- [x] 16. Create invitation management system
  - Implement invitation token generation
  - Create invitation email sending functionality
  - Build invitation validation logic
  - Handle invitation expiration
  - Create invitation status tracking
  - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 16.1 Write unit tests for invitation system
  - Test invitation token generation
  - Test invitation validation
  - Test invitation expiration logic
  - _Requirements: 8.1, 8.2, 8.5_

- [x] 17. Update RegistrationForm for invitation-only access
  - Add invitation token validation to registration
  - Pre-populate email from invitation
  - Handle invitation token in URL parameters
  - Display appropriate error messages for invalid tokens
  - Mark invitation as used after successful registration
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 17.1 Write property test for valid registration with invitation
  - **Property 1: Valid registration creates account**
  - **Validates: Requirements 2.2**

- [x] 17.2 Write unit tests for invitation-based registration
  - Test registration with valid invitation token
  - Test registration with invalid invitation token
  - Test registration with expired invitation token
  - _Requirements: 2.1, 2.3, 2.4_

- [x] 18. Implement LoginForm with Supabase Auth
  - Connect login form to Supabase Auth signin
  - Handle authentication success and failure
  - Implement session establishment
  - Add loading states during authentication
  - Display appropriate error messages
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 18.1 Write property test for valid login
  - **Property 4: Valid login establishes session**
  - **Validates: Requirements 3.2**

- [x] 18.2 Write property test for invalid login
  - **Property 5: Invalid login shows error**
  - **Validates: Requirements 3.3**

- [x] 18.3 Write property test for login redirect
  - **Property 6: Successful login redirects**
  - **Validates: Requirements 3.4**

- [x] 19. Create UserProfile component and profile management
  - Display authenticated user information
  - Implement profile editing functionality
  - Handle profile updates to Supabase database
  - Add logout functionality
  - Manage user session state
  - _Requirements: 5.3, 7.3_

- [x] 19.1 Write property test for logout functionality
  - **Property 9: Logout clears session**
  - **Validates: Requirements 5.3**

- [x] 19.2 Write property test for profile data storage
  - **Property 13: Profile data storage**
  - **Validates: Requirements 7.3**

- [x] 20. Create AdminPanel and invitation management UI
  - Build admin-only interface for sending invitations
  - Create invitation list with status display
  - Implement admin permission checking
  - Add invitation form with email validation
  - Display invitation management feedback
  - _Requirements: 8.1, 8.2, 8.4_

- [x] 20.1 Write unit tests for admin panel
  - Test admin permission checking
  - Test invitation form functionality
  - Test invitation list display
  - _Requirements: 8.1, 8.2, 8.4_

- [x] 21. Update HomePage to handle authentication states
  - Route between authenticated and unauthenticated views
  - Display appropriate components based on auth state
  - Handle loading states during authentication
  - Implement session restoration on page load
  - Add error handling for authentication failures
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 21.1 Write property test for session restoration
  - **Property 10: Session persistence across browser sessions**
  - **Validates: Requirements 5.4**

- [x] 22. Implement email invitation system
  - Set up email templates for invitations
  - Configure email sending through Supabase or external service
  - Include invitation links with tokens
  - Add invitation expiration information to emails
  - Handle email sending errors gracefully
  - _Requirements: 8.2, 8.3_

- [x] 22.1 Write unit tests for email system
  - Test invitation email generation
  - Test email sending functionality
  - Test error handling for email failures
  - _Requirements: 8.2, 8.3_

- [x] 23. Add comprehensive error handling
  - Handle Supabase connection failures
  - Implement graceful session expiration handling
  - Add network error recovery
  - Display user-friendly error messages
  - Log errors for debugging
  - _Requirements: 7.4, 5.5_

- [x] 23.1 Write unit tests for error handling
  - Test network error scenarios
  - Test session expiration handling
  - Test Supabase connection failures
  - _Requirements: 7.4, 5.5_

- [x] 24. Update existing property tests for authentication
  - Modify existing form tests to work with Supabase Auth
  - Update validation tests for new authentication flow
  - Ensure responsive design tests work with auth states
  - Update accessibility tests for new components
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 6.4, 6.5_

- [x] 24.1 Write property test for email format validation
  - **Property 2: Email format validation**
  - **Validates: Requirements 2.4**

- [x] 24.2 Write property test for password strength validation
  - **Property 3: Password strength validation**
  - **Validates: Requirements 2.5**

- [x] 24.3 Write property test for Supabase Auth usage
  - **Property 12: Supabase Auth usage**
  - **Validates: Requirements 7.2**

- [x] 25. Final integration and testing
  - Test complete user registration flow with invitations
  - Test admin invitation management workflow
  - Verify all authentication states work correctly
  - Test session persistence across browser restarts
  - Validate all error scenarios work properly
  - _Requirements: All_

- [x] 25.1 Write integration tests for complete flows
  - Test invitation → registration → login flow
  - Test admin invitation management flow
  - Test session management across browser sessions
  - _Requirements: All_

- [x] 26. Checkpoint - Ensure all tests pass with Supabase integration
  - Ensure all tests pass, ask the user if questions arise.
