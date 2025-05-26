// Auth Components Export Index
// Centralized export for all authentication-related components

import Login from './Login';
import SignUp from './SignUp';
import AuthForms from './AuthForms';
import LogoutButton from './LogoutButton';

// Re-export components
export { Login, SignUp, AuthForms, LogoutButton };

// Convenience exports for common auth flows
export const AuthComponents = {
  Login,
  SignUp,
  AuthForms,
  LogoutButton
} as const;

// Default export for the main auth forms component
export default AuthForms;
