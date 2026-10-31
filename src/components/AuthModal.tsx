import React, { useState } from 'react';
import { 
  Radar, 
  Globe2, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Zap, 
  AlertCircle,
  Database,
  Building2,
  Search,
  KeyRound,
  Check,
  X,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { loginWithGoogle, loginWithEmail, registerWithEmail, sendResetPassword } from '../lib/firebase';
import { User } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
  onAuthSuccess?: (user: User) => void;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onSuccess,
  onAuthSuccess,
  onClose
}) => {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [emailInUse, setEmailInUse] = useState<boolean>(false);
  const [isResetSent, setIsResetSent] = useState<boolean>(false);
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setInfoMessage(null);
    setEmailInUse(false);

    try {
      if (isSignUp) {
        const res = await registerWithEmail(email, password, name);
        if (!res.success) {
          if (res.code === 'auth/email-already-in-use') {
            setEmailInUse(true);
            setError(null);
            setInfoMessage(
              `An account with ${email} was found in authentication. If you previously deleted this account, enter your previous password to reset and recreate it fresh, or send a password reset link below.`
            );
          } else {
            setError(res.error || 'Failed to create account.');
          }
        } else {
          if (res.user) onAuthSuccess?.(res.user);
          onSuccess?.();
        }
      } else {
        const res = await loginWithEmail(email, password);
        if (!res.success) {
          if (res.code === 'auth/invalid-credential' || res.code === 'auth/wrong-password') {
            setEmailInUse(true);
            setError(`Incorrect password for ${email}. If you forgot your password or previously deleted this account, click "Send Password Reset Link" below to set a new password.`);
          } else {
            setError(res.error || 'Invalid credentials.');
          }
        } else {
          if (res.user) onAuthSuccess?.(res.user);
          onSuccess?.();
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);
    setInfoMessage(null);
    setEmailInUse(false);
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setError(res.error || 'Google sign-in failed.');
      } else {
        if (res.user) onAuthSuccess?.(res.user);
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first to receive a password reset link.');
      return;
    }
    setIsSendingReset(true);
    setError(null);
    try {
      const res = await sendResetPassword(email);
      if (res.success) {
        setIsResetSent(true);
        setInfoMessage(`Password reset email sent to ${email}! Check your inbox (or spam) to set a new password, then sign in.`);
      } else {
        setError(res.error || 'Could not send reset email.');
      }
    } catch (e: any) {
      setError('Failed to send reset email.');
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden relative my-6">
        
        {/* Top Header Graphic */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Radar className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>

          <h2 className="text-xl font-black tracking-tight text-white">
            LeadRadar <span className="text-indigo-400">Global</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto leading-relaxed">
            {isSignUp 
              ? 'Create your account to unlock OSINT executive searches and dedicated cloud storage.' 
              : 'Sign in to access your personal search history, saved leads, and verified email contacts.'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-4">

          {/* Existing Account Resolution Card (when email-already-in-use is encountered) */}
          {emailInUse && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl space-y-2.5 text-xs text-amber-950 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold">Existing Account Detected</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    An account for <strong className="font-mono">{email}</strong> already exists in Firebase Authentication.
                  </p>
                </div>
              </div>

              <div className="pt-1 flex flex-col gap-1.5 border-t border-amber-200/80">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isSendingReset}
                  className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{isSendingReset ? 'Sending reset link...' : `Send Password Reset Link to ${email || 'your email'}`}</span>
                </button>
              </div>
            </div>
          )}

          {/* Info Banner */}
          {infoMessage && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2 text-xs text-indigo-950 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
                <div className="leading-snug flex-1 font-medium">{infoMessage}</div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl space-y-2 text-xs text-red-700 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div className="leading-snug flex-1">{error}</div>
              </div>
              <div className="flex items-center justify-end pt-1 border-t border-red-100">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isSendingReset}
                  className="text-[11px] font-bold text-red-800 hover:text-red-950 underline cursor-pointer"
                >
                  {isSendingReset ? 'Sending reset link...' : 'Email me a 1-click password reset link'}
                </button>
              </div>
            </div>
          )}

          {/* Quick Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 active:scale-98"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">or with email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            {isSignUp && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Your Full Name</label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700">Password</label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isSendingReset}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    {isSendingReset ? 'Sending reset...' : 'Forgot password?'}
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-2xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              <span>{isLoading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In to Workspace')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Switch mode */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setInfoMessage(null);
                setEmailInUse(false);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account yet? Create one"}
            </button>
          </div>

          {/* Feature Badges list */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Private search history</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Saved leads database</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Deep mailbox OSINT</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Google Maps features</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
