export {
  validateEmail,
  validatePhoneNumber,
  validateName,
  validatePassword,
  validateForm,
  type ValidationResult,
  type FormErrors,
} from './validation';

export { debounce } from './debounce';

export {
  supabase,
  getCurrentUser,
  getCurrentSession,
  signUp,
  signIn,
  signOut,
  getUserProfile,
  upsertUserProfile,
  getInvitationByToken,
  markInvitationAsUsed,
  createInvitation,
  getAllInvitations,
  isUserAdmin,
} from './supabase';

export {
  generateInvitationToken,
  createInvitation as createInvitationWithToken,
  validateInvitationToken,
  markInvitationAsUsed as markInvitationUsed,
  markInvitationAsExpired,
  getAllInvitations as getInvitations,
  getInvitationsByStatus,
  hasPendingInvitation,
  expireOldInvitations,
  sendInvitationEmail,
  createAndSendInvitation,
  getInvitationStats,
  deleteInvitation,
} from './invitations';

export {
  registerWithInvitation,
} from './auth';

export {
  ErrorType,
  createAppError,
  getUserFriendlyMessage,
  isRetryableError,
  classifyError,
  processError,
  logError,
  withRetry,
  checkNetworkConnectivity,
  waitForNetworkRecovery,
  type AppError,
} from './errorHandling';
