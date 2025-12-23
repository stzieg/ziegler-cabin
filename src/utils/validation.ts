/**
 * Form validation utilities for the cabin home page
 */

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
}

/**
 * Validates email format
 * Requirements: 2.4
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return {
      isValid: false,
      message: 'Email is required',
    };
  }

  // Email regex that allows single character local/domain parts but prevents dots at start/end
  const emailRegex = /^[^\s@.][^\s@]*@[^\s@.][^\s@]*\.[a-zA-Z]{2,}$/;
  
  // Additional check for consecutive dots
  if (email.includes('..')) {
    return {
      isValid: false,
      message: 'Please enter a valid email address',
    };
  }
  
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      message: 'Please enter a valid email address',
    };
  }

  return { isValid: true };
}

/**
 * Validates phone number format
 * Accepts formats: (XXX) XXX-XXXX, XXX-XXX-XXXX, XXXXXXXXXX
 * Requirements: 2.5
 */
export function validatePhoneNumber(phoneNumber: string): ValidationResult {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return {
      isValid: false,
      message: 'Phone number is required',
    };
  }

  // Remove all non-digit characters to check length
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Must have exactly 10 digits
  if (digitsOnly.length !== 10) {
    return {
      isValid: false,
      message: 'Please enter a valid phone number',
    };
  }

  // Check if format contains only valid characters
  const phoneRegex = /^[\d\s\-\(\)]+$/;
  
  if (!phoneRegex.test(phoneNumber)) {
    return {
      isValid: false,
      message: 'Please enter a valid phone number',
    };
  }

  return { isValid: true };
}

/**
 * Validates name (first name or last name)
 * Requirements: 2.3
 */
export function validateName(name: string, fieldName: string = 'Name'): ValidationResult {
  if (!name || name.trim() === '') {
    return {
      isValid: false,
      message: `${fieldName} is required`,
    };
  }

  if (name.length > 50) {
    return {
      isValid: false,
      message: 'Name must be 50 characters or less',
    };
  }

  // Allow letters, spaces, and hyphens only
  const nameRegex = /^[a-zA-Z\s\-]+$/;
  
  if (!nameRegex.test(name)) {
    return {
      isValid: false,
      message: 'Name can only contain letters, spaces, and hyphens',
    };
  }

  return { isValid: true };
}

/**
 * Validates password strength
 * Requirements: 2.5
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || password.trim() === '') {
    return {
      isValid: false,
      message: 'Password is required',
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long',
    };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter',
    };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number',
    };
  }

  return { isValid: true };
}

/**
 * Validates the entire form and aggregates field errors
 * Requirements: 2.3, 2.4, 2.5
 */
export function validateForm(formData: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password?: string;
}): { isValid: boolean; errors: FormErrors } {
  const errors: FormErrors = {};

  // Validate first name
  const firstNameResult = validateName(formData.firstName, 'First name');
  if (!firstNameResult.isValid) {
    errors.firstName = firstNameResult.message;
  }

  // Validate last name
  const lastNameResult = validateName(formData.lastName, 'Last name');
  if (!lastNameResult.isValid) {
    errors.lastName = lastNameResult.message;
  }

  // Validate email
  const emailResult = validateEmail(formData.email);
  if (!emailResult.isValid) {
    errors.email = emailResult.message;
  }

  // Validate phone number
  const phoneResult = validatePhoneNumber(formData.phoneNumber);
  if (!phoneResult.isValid) {
    errors.phoneNumber = phoneResult.message;
  }

  // Validate password if provided (for registration)
  if (formData.password !== undefined) {
    const passwordResult = validatePassword(formData.password);
    if (!passwordResult.isValid) {
      errors.password = passwordResult.message;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
