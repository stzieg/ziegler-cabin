import { forwardRef } from 'react';
import styles from './InputField.module.css';

export interface InputFieldProps {
  label: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'password';
  value: string;
  error?: string;
  touched?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(({
  label,
  name,
  type,
  value,
  error,
  touched,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
}, ref) => {
  const hasError = touched && error;
  const isValid = touched && !error && value.length > 0;

  const inputClassName = `${styles.input} ${hasError ? styles.inputError : ''} ${isValid ? styles.inputValid : ''} ${disabled ? styles.inputDisabled : ''}`;

  return (
    <div className={styles.fieldContainer}>
      <label htmlFor={name} className={styles.label}>
        {label}
        {required && <span className={styles.required} aria-label="required">*</span>}
      </label>
      <input
        ref={ref}
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={inputClassName}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={hasError ? `${name}-error` : undefined}
        aria-required={required}
        disabled={disabled}
      />
      {hasError && (
        <span id={`${name}-error`} className={styles.errorMessage} role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

InputField.displayName = 'InputField';
