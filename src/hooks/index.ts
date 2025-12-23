/**
 * Hooks index file
 * Exports all custom hooks for the cabin management system
 */

export { useResponsiveBackground } from './useResponsiveBackground';
export { useOrientation, type OrientationType, type OrientationState } from './useOrientation';
export { 
  useKeyboardAccessibility, 
  type KeyboardState, 
  type KeyboardAccessibilityOptions 
} from './useKeyboardAccessibility';