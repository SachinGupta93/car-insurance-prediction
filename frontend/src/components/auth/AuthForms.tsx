import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { signInWithGoogle } from '@/lib/firebase-auth';

interface AuthFormsProps {
  mode: 'login' | 'signup';
}

const AuthForms: React.FC<AuthFormsProps> = ({ mode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const isSignup = mode === 'signup';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (isSignup) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = isSignup 
        ? 'Failed to sign up. Please try again.'
        : 'Failed to log in. Please check your credentials.';
      setError(err instanceof Error ? err.message : errorMessage);
      console.error(`${mode} error:`, err);
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    
    // Notify user about API enablement if needed
    console.log('Starting Google authentication process...');
    import('@/lib/firebase-config-check'); // Import to check configuration
    
    try {
      console.log('Calling signInWithGoogle...');
      const result = await signInWithGoogle();
      console.log('Google sign in successful:', result.user.displayName);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(`Google ${mode} error:`, err);
      
      // Check for identity toolkit error
      if (err?.message?.includes('auth/identity-toolkit-api-has-not-been-used')) {
        setError('Google sign-in has not been enabled for this Firebase project. Please contact the administrator.');
        // Import the debugging utility
        const { debugFirebaseAuth } = await import('@/lib/firebase-auth');
        debugFirebaseAuth();
      } else {
        const errorMessage = isSignup
          ? 'Failed to sign up with Google.'
          : 'Failed to sign in with Google.';
        setError(err instanceof Error ? err.message : errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Background */}      <div className="absolute inset-0 bg-white">
        <div className="absolute inset-0 bg-rose-200/20"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        {/* Floating Shapes */}        <div className="absolute top-20 left-10 w-32 h-32 bg-rose-200 rounded-full filter blur-2xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-48 h-48 bg-rose-200/50 rounded-full filter blur-3xl opacity-25 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-rose-200 rounded-full filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-rose-200/50 rounded-full filter blur-2xl opacity-15 animate-pulse" style={{animationDelay: '3s'}}></div>
      </div>
      
      <div className="relative z-10 max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 space-y-8 shadow-xl border border-rose-200/30">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-emerald-200 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-black mb-2">
              {isSignup ? 'Join CarGuard AI' : 'Welcome Back'}
            </h2>
            <p className="text-gray-600">
              {isSignup 
                ? 'Create your CarGuard AI account' 
                : 'Sign in to your CarGuard AI account'
              }
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-black mb-1">
                  Email Address
                </label>                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-rose-200/30 rounded-lg bg-white/10 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-transparent"
                    placeholder={isSignup ? "Enter your email address" : "Enter your email"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-black mb-1">
                  Password
                </label>                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-rose-200/30 rounded-lg bg-white/10 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-transparent"
                    placeholder={isSignup ? "Create a strong password" : "Enter your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {isSignup && (
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-black mb-1">
                    Confirm Password
                  </label>                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="block w-full pl-10 pr-3 py-2 border border-rose-200/30 rounded-lg bg-white/10 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-transparent"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-200/20 border border-red-300/30 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-red-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium text-red-200">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-emerald-200 text-black rounded-lg hover:bg-emerald-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 flex items-center justify-center">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent mr-3"></div>
                    {isSignup ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isSignup ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      )}
                    </svg>
                    {isSignup ? 'Create Account' : 'Sign in to Dashboard'}
                  </>
                )}
              </span>
            </button>

            {/* Divider */}            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-rose-200/30"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white/10 text-gray-600">Or continue with</span>
              </div>
            </div>

            {/* Google Auth Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Processing...' : `Continue with Google`}
              </div>
            </button>
          </form>
            <div className="text-center">
            <p className="text-gray-600 text-sm">
              {isSignup ? (
                <>
                  Already have an account?{' '}
                  <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-emerald-600 hover:text-emerald-700 font-medium">
                    Sign up
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForms;
