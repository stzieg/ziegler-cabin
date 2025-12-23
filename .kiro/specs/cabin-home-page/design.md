# Design Document

## Overview

The cabin home page is a React-based single-page application that serves as the entry point for the family cabin management system. It integrates with Supabase for user authentication, registration, and profile management. The interface features a modern, clean aesthetic with a woods/tree theme, prominently displaying a cursive "Z" logo and providing authentication forms for family members to register and log in. The design prioritizes user experience with responsive layouts, clear visual feedback, and accessible form interactions.

## Architecture

The application follows a component-based architecture using React with TypeScript and Supabase integration:

- **Presentation Layer**: React components for UI rendering
- **Authentication Layer**: Supabase Auth for user registration, login, and session management
- **Data Layer**: Supabase database for user profiles and application data
- **State Management**: React hooks (useState, useEffect) for local component state and Supabase client for global auth state
- **Validation Layer**: Form validation logic for user input and Supabase schema validation
- **Styling System**: CSS modules for component-scoped styling with theme consistency

### Authentication Flow

1. **Unauthenticated State**: Display login form and invitation-required message
2. **Invitation Process**: Admin sends invitation email with unique token
3. **Registration**: User clicks invitation link, completes registration with token validation
4. **Account Creation**: Create user account via Supabase Auth, store profile data, mark invitation as used
5. **Login**: Authenticate user via Supabase Auth, establish session
6. **Authenticated State**: Display authenticated home page with user profile
7. **Session Management**: Persist authentication across browser sessions using Supabase session handling

### Access Control Flow

1. **Admin Access**: Authenticated admin can access invitation management interface
2. **Send Invitation**: Admin enters email, system generates unique token and sends invitation email
3. **Token Validation**: Registration form validates invitation token before allowing account creation
4. **Token Expiration**: Invitations expire after 7 days and cannot be used for registration

## Components and Interfaces

### App Component
The root application component that handles authentication state and routing.

**Props**: None (root component)

**Responsibilities**:
- Initialize Supabase client
- Manage global authentication state
- Route between authenticated and unauthenticated views
- Handle session persistence and restoration

### HomePage Component
The main page component that renders different views based on authentication state.

**Props**:
```typescript
interface HomePageProps {
  user: User | null;
  onLogout: () => void;
}
```

**Responsibilities**:
- Render authenticated or unauthenticated layout
- Compose Logo and authentication components
- Display user profile information when authenticated
- Provide logout functionality

### AuthContainer Component
Container component that manages authentication form state and switching.

**Props**:
```typescript
interface AuthContainerProps {
  onAuthSuccess: (user: User) => void;
}
```

**Responsibilities**:
- Toggle between registration and login forms
- Handle authentication success/failure
- Manage loading states during authentication
- Display authentication errors

### Logo Component
Displays the cursive "Z" branding element.

**Props**:
```typescript
interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}
```

**Responsibilities**:
- Render the cursive "Z" logo (SVG or custom font)
- Support different sizes for responsive layouts
- Apply theme-consistent styling

### RegistrationForm Component
Handles new user registration with Supabase Auth.

**Props**:
```typescript
interface RegistrationFormProps {
  onSubmit: (data: RegistrationData) => Promise<void>;
  onSwitchToLogin: () => void;
  isLoading?: boolean;
  error?: string;
}

interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}
```

**Responsibilities**:
- Render registration form with email, password, and profile fields
- Validate user input including password strength
- Handle form submission with Supabase Auth signup
- Display validation errors and authentication errors
- Provide link to switch to login form

### LoginForm Component
Handles user authentication with Supabase Auth.

**Props**:
```typescript
interface LoginFormProps {
  onSubmit: (data: LoginData) => Promise<void>;
  onSwitchToRegister: () => void;
  isLoading?: boolean;
  error?: string;
}

interface LoginData {
  email: string;
  password: string;
}
```

**Responsibilities**:
- Render login form with email and password fields
- Validate user input on blur and submit
- Handle form submission with Supabase Auth signin
- Display validation errors and authentication errors
- Provide link to switch to registration form

### InputField Component
Reusable form input component with validation support.

**Props**:
```typescript
interface InputFieldProps {
  label: string;
  name: string;
  type: 'text' | 'email' | 'tel';
  value: string;
  error?: string;
  touched?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
  required?: boolean;
}
```

**Responsibilities**:
- Render labeled input field
- Display error messages when validation fails
- Provide visual feedback for focus, valid, and error states
- Support different input types

### UserProfile Component
Displays authenticated user information and profile management.

**Props**:
```typescript
interface UserProfileProps {
  user: User;
  profile: UserProfile | null;
  onUpdateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  onLogout: () => void;
}
```

**Responsibilities**:
- Display user email and profile information
- Provide profile editing functionality
- Handle profile updates to Supabase database
- Provide logout button

### InvitationForm Component
Admin interface for sending invitations to new users.

**Props**:
```typescript
interface InvitationFormProps {
  onSendInvitation: (email: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}
```

**Responsibilities**:
- Render form for entering email addresses
- Validate email format before submission
- Handle invitation sending with loading states
- Display success/error feedback

### InvitationList Component
Admin interface for viewing and managing sent invitations.

**Props**:
```typescript
interface InvitationListProps {
  invitations: Invitation[];
  onRefresh: () => void;
  isLoading?: boolean;
}
```

**Responsibilities**:
- Display list of sent invitations with status
- Show invitation details (email, sent date, status, expiration)
- Provide refresh functionality
- Handle loading states

### AdminPanel Component
Container component for admin-only features.

**Props**:
```typescript
interface AdminPanelProps {
  user: User;
  isAdmin: boolean;
}
```

**Responsibilities**:
- Check admin permissions
- Render admin-only components (InvitationForm, InvitationList)
- Handle admin navigation
- Provide access control for admin features

### SupabaseProvider Component
React context provider for Supabase client and authentication state.

**Props**:
```typescript
interface SupabaseProviderProps {
  children: React.ReactNode;
}
```

**Responsibilities**:
- Initialize and provide Supabase client
- Manage global authentication state
- Handle session restoration on app load
- Provide authentication methods to child components

### ThemeWrapper Component
Provides theme context and applies global styling.

**Props**:
```typescript
interface ThemeWrapperProps {
  children: React.ReactNode;
}
```

**Responsibilities**:
- Apply woods/tree theme styling
- Provide CSS variables for consistent theming
- Manage background imagery or patterns

## Data Models

### User (Supabase Auth)
```typescript
interface User {
  id: string;             // Supabase user UUID
  email: string;          // User's email address
  created_at: string;     // Account creation timestamp
  email_confirmed_at?: string; // Email verification timestamp
}
```

### UserProfile (Database Table)
```typescript
interface UserProfile {
  id: string;             // References auth.users.id
  first_name: string;     // User's first name (required, 1-50 characters)
  last_name: string;      // User's last name (required, 1-50 characters)
  phone_number?: string;  // User's phone number (optional, valid phone format)
  created_at: string;     // Profile creation timestamp
  updated_at: string;     // Profile last update timestamp
}
```

### Invitation (Database Table)
```typescript
interface Invitation {
  id: string;             // UUID primary key
  email: string;          // Invited email address
  token: string;          // Unique invitation token
  created_by: string;     // References auth.users.id (admin who sent invitation)
  created_at: string;     // Invitation creation timestamp
  expires_at: string;     // Invitation expiration timestamp (7 days from creation)
  used_at?: string;       // Timestamp when invitation was used (null if unused)
  used_by?: string;       // References auth.users.id (user who used invitation)
  status: 'pending' | 'used' | 'expired'; // Invitation status
}
```

### RegistrationData
```typescript
interface RegistrationData {
  email: string;          // User's email (required, valid email format)
  password: string;       // User's password (required, min 8 characters)
  firstName: string;      // User's first name (required, 1-50 characters)
  lastName: string;       // User's last name (required, 1-50 characters)
  phoneNumber: string;    // User's phone number (optional, valid phone format)
  invitationToken: string; // Required invitation token for registration
}
```

### LoginData
```typescript
interface LoginData {
  email: string;          // User's email (required, valid email format)
  password: string;       // User's password (required)
}
```

### AuthState
```typescript
interface AuthState {
  user: User | null;      // Current authenticated user
  profile: UserProfile | null; // User profile data
  loading: boolean;       // Authentication loading state
  error: string | null;   // Authentication error message
}
```

### ValidationError
```typescript
interface ValidationError {
  field: string;
  message: string;
}
```

### FormState
```typescript
type FormState = 'idle' | 'validating' | 'submitting' | 'success' | 'error';
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property 1: Valid registration creates account**
*For any* valid registration data (valid email, strong password, valid names), submitting the registration form should trigger Supabase account creation and email verification.
**Validates: Requirements 2.2**

**Property 2: Email format validation**
*For any* invalid email format entered in registration or login forms, the system should display an appropriate validation message indicating the email format is incorrect.
**Validates: Requirements 2.4**

**Property 3: Password strength validation**
*For any* password that doesn't meet strength requirements, the registration form should display validation messages explaining the password requirements.
**Validates: Requirements 2.5**

**Property 4: Valid login establishes session**
*For any* valid login credentials (existing email and correct password), submitting the login form should authenticate with Supabase and establish a user session.
**Validates: Requirements 3.2**

**Property 5: Invalid login shows error**
*For any* invalid login credentials (non-existent email or incorrect password), submitting the login form should display an error message indicating invalid credentials.
**Validates: Requirements 3.3**

**Property 6: Successful login redirects**
*For any* successful login, the system should redirect to the authenticated dashboard or home view.
**Validates: Requirements 3.4**

**Property 7: Session storage**
*For any* successful login, the system should store the authentication session using Supabase session management.
**Validates: Requirements 5.1**

**Property 8: Session persistence**
*For any* user returning to the website within the session timeout period, the system should automatically authenticate the user without requiring re-login.
**Validates: Requirements 5.2**

**Property 9: Logout clears session**
*For any* explicit logout action, the system should clear the session and redirect to the login form.
**Validates: Requirements 5.3**

**Property 10: Session persistence across browser sessions**
*For any* user who closes the browser and returns later, the system should maintain the session if it hasn't expired.
**Validates: Requirements 5.4**

**Property 11: Supabase initialization**
*For any* application initialization, the system should establish a connection to Supabase with proper configuration.
**Validates: Requirements 7.1**

**Property 12: Supabase Auth usage**
*For any* authentication operation (login, logout, registration), the system should use Supabase Auth for user management.
**Validates: Requirements 7.2**

**Property 13: Profile data storage**
*For any* user profile data being stored, the system should save it to the Supabase database with proper data validation.
**Validates: Requirements 7.3**

**Property 14: Focus feedback**
*For any* input field in authentication forms, when that field receives focus, the system should apply visual styling to indicate the active state.
**Validates: Requirements 4.1**

**Property 15: Validation feedback consistency**
*For any* input field, the presence of an error message should correspond to the validity state of the field - valid fields should not show errors, invalid fields should show appropriate error messages.
**Validates: Requirements 4.2, 4.3**

**Property 16: Form data persistence on validation failure**
*For any* form data that fails validation, the form fields should retain the user's entered values after validation occurs.
**Validates: Requirements 4.5**

**Property 17: Responsive layout adaptation**
*For any* viewport width, the layout should render without horizontal scrolling and all interactive elements should remain accessible and functional.
**Validates: Requirements 6.4**

**Property 18: Touch interaction support**
*For any* interactive element (buttons, input fields), touch events should trigger the same behavior as click events.
**Validates: Requirements 6.5**

## Error Handling

### Validation Errors

**Email Validation**:
- Empty email: "Email is required"
- Invalid format: "Please enter a valid email address"
- Regex pattern: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

**Phone Number Validation**:
- Empty phone: "Phone number is required"
- Invalid format: "Please enter a valid phone number"
- Accepted formats: (XXX) XXX-XXXX, XXX-XXX-XXXX, XXXXXXXXXX
- Regex pattern: `/^[\d\s\-\(\)]+$/` with length validation

**Name Validation**:
- Empty first name: "First name is required"
- Empty last name: "Last name is required"
- Too long (>50 chars): "Name must be 50 characters or less"
- Invalid characters: "Name can only contain letters, spaces, and hyphens"

### Form Submission Errors

For the MVP, form submission will log data to console. Future backend integration should handle:
- Network errors: Display "Unable to connect. Please check your internet connection."
- Server errors: Display "Something went wrong. Please try again later."
- Authentication failures: Display specific error message from server

### Component Error Boundaries

Implement React Error Boundaries to catch and handle component rendering errors gracefully:
- Display fallback UI instead of crashing the entire application
- Log errors for debugging
- Provide user-friendly error messages

## Testing Strategy

### Unit Testing

**Framework**: Jest with React Testing Library

**Component Tests**:
- Logo component renders correctly
- InputField component displays labels, handles input, shows errors
- LoginForm component renders all required fields
- Form submission calls onSubmit with correct data
- Validation messages appear for specific error conditions

**Validation Logic Tests**:
- Email validation function correctly identifies valid/invalid emails
- Phone validation function correctly identifies valid/invalid phone numbers
- Name validation function correctly identifies valid/invalid names
- Form-level validation correctly aggregates field errors

**Responsive Behavior Tests**:
- Components render at mobile viewport (375px)
- Components render at tablet viewport (768px)
- Components render at desktop viewport (1024px+)

### Property-Based Testing

**Framework**: fast-check (JavaScript property-based testing library)

**Property Tests**:

1. **Complete form submission property** (Property 1)
   - Generate random valid form data
   - Verify submission is processed for all valid inputs
   - Minimum 100 iterations

2. **Incomplete form rejection property** (Property 2)
   - Generate form data with random combinations of missing fields
   - Verify all incomplete forms are rejected with appropriate messages
   - Minimum 100 iterations

3. **Field validation property** (Property 3)
   - Generate random invalid emails and phone numbers
   - Verify all invalid inputs trigger appropriate error messages
   - Minimum 100 iterations

4. **Focus feedback property** (Property 4)
   - Test focus events on all form fields
   - Verify visual feedback is applied consistently
   - Minimum 100 iterations

5. **Validation feedback consistency property** (Property 5)
   - Generate random valid and invalid field values
   - Verify error display matches validation state
   - Minimum 100 iterations

6. **Form data persistence property** (Property 6)
   - Generate random invalid form data
   - Verify data persists after validation failure
   - Minimum 100 iterations

7. **Responsive layout property** (Property 7)
   - Generate random viewport widths
   - Verify no horizontal scroll and element accessibility
   - Minimum 100 iterations

8. **Touch interaction property** (Property 8)
   - Test touch events on all interactive elements
   - Verify behavior matches click events
   - Minimum 100 iterations

### Integration Testing

- Full form workflow: fill out form → validate → submit
- Error recovery: trigger validation errors → correct them → submit successfully
- Responsive behavior: resize viewport → verify layout adapts

### Accessibility Testing

- Keyboard navigation through form fields
- Screen reader compatibility (ARIA labels)
- Focus management
- Color contrast ratios meet WCAG AA standards

## Technology Stack

**Core Framework**:
- React 18+ with TypeScript
- Vite for build tooling and dev server

**Backend Services**:
- Supabase for authentication and database
- Supabase Auth for user management
- PostgreSQL database (via Supabase)

**Authentication**:
- @supabase/supabase-js client library
- Supabase Auth for registration, login, session management
- Email verification and password reset

**Styling**:
- CSS Modules for component-scoped styling
- CSS custom properties for theme variables

**Form Handling**:
- Custom validation logic with Supabase schema validation
- React hooks for state management
- Supabase client for authentication operations

**Testing**:
- Jest for unit testing
- React Testing Library for component testing
- fast-check for property-based testing
- Supabase test utilities for authentication testing

**Development Tools**:
- ESLint for code quality
- Prettier for code formatting
- TypeScript for type safety
- Environment variables for Supabase configuration

## Theme Design System

### Color Palette

**Primary Colors** (Woods/Tree Theme):
- Forest Green: `#2D5016` (primary actions, accents)
- Deep Brown: `#3E2723` (text, borders)
- Sage Green: `#8BC34A` (success states, highlights)
- Bark Brown: `#5D4037` (secondary elements)

**Neutral Colors**:
- Off-White: `#F5F5F0` (backgrounds)
- Light Gray: `#E0E0D8` (borders, dividers)
- Medium Gray: `#9E9E94` (disabled states)
- Charcoal: `#424242` (body text)

**Feedback Colors**:
- Error Red: `#C62828` (validation errors)
- Success Green: `#558B2F` (success messages)
- Warning Amber: `#F57C00` (warnings)

### Typography

**Logo Font**: 
- Cursive/Script font for "Z" logo (e.g., Pacifico, Dancing Script, or custom)
- Large size: 72px for desktop, 48px for mobile

**Body Font**:
- Sans-serif for readability (e.g., Inter, Open Sans)
- Base size: 16px
- Line height: 1.5

**Headings**:
- Font weight: 600
- Sizes: H1 (32px), H2 (24px), H3 (20px)

### Spacing System

- Base unit: 8px
- Spacing scale: 8px, 16px, 24px, 32px, 48px, 64px

### Component Styling

**Input Fields**:
- Border: 2px solid light gray
- Border radius: 8px
- Padding: 12px 16px
- Focus state: Forest green border, subtle shadow
- Error state: Error red border
- Valid state: Success green border (optional)

**Buttons**:
- Primary: Forest green background, white text
- Border radius: 8px
- Padding: 12px 24px
- Hover: Darker green
- Disabled: Medium gray

**Layout**:
- Max width: 1200px
- Content padding: 24px mobile, 48px desktop
- Form max width: 480px

### Visual Elements

**Background**:
- Subtle tree/wood texture or pattern
- Light, non-distracting
- Maintains text readability

**Logo**:
- Cursive "Z" in forest green
- Optional: subtle leaf or tree accent

## Performance Considerations

- Lazy load images and heavy assets
- Minimize bundle size (target <200KB initial load)
- Optimize font loading (font-display: swap)
- Use CSS containment for layout optimization
- Debounce validation on input (300ms delay)

## Accessibility Requirements

- WCAG 2.1 AA compliance
- Semantic HTML elements
- ARIA labels for form fields
- Keyboard navigation support (Tab, Enter, Escape)
- Focus visible indicators
- Error messages associated with fields (aria-describedby)
- Sufficient color contrast (4.5:1 for text)
- Touch targets minimum 44x44px

## Supabase Configuration

### Database Schema

**users table** (managed by Supabase Auth):
- Standard Supabase auth.users table with email, password, etc.

**profiles table**:
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**invitations table**:
```sql
CREATE TABLE invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired'))
);

-- Index for efficient token lookups
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_status ON invitations(status);
```

### Row Level Security (RLS)

**profiles table policies**:
```sql
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile during registration
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );
```

**invitations table policies**:
```sql
-- Admins can read all invitations
CREATE POLICY "Admins can read invitations" ON invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can insert invitations
CREATE POLICY "Admins can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Anyone can read invitations by token (for registration validation)
CREATE POLICY "Public can read invitation by token" ON invitations
  FOR SELECT USING (true);

-- System can update invitation status when used
CREATE POLICY "System can update invitation status" ON invitations
  FOR UPDATE USING (true);
```

### Environment Variables

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Authentication Configuration

- Email confirmation required for new accounts
- Password minimum length: 8 characters
- Session timeout: 24 hours (configurable)
- Automatic session refresh enabled

## Future Considerations

- Password reset functionality via Supabase Auth
- Social login options (Google, GitHub) via Supabase Auth
- Multi-factor authentication via Supabase Auth
- Real-time features using Supabase subscriptions
- File upload for user avatars via Supabase Storage
- Internationalization (i18n) support
- Advanced user roles and permissions
- Audit logging for user actions
