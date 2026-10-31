import React, { useState } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  X, 
  Loader2, 
  ShieldCheck, 
  CreditCard, 
  MessageSquare, 
  Lock, 
  KeyRound,
  LogIn
} from 'lucide-react';
import { UserProfile } from '../types';
import { reauthenticateWithGoogle } from '../lib/firebase';

interface ConfirmCancelAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    reason: string, 
    feedback: string, 
    passwordConfirm?: string
  ) => Promise<{ success: boolean; requiresReauth?: boolean; error?: string }>;
  onForceWipeAndSignOut: (reason: string, feedback: string) => Promise<void>;
  user: UserProfile | null;
}

const CANCELLATION_REASONS = [
  'Price is too high / Looking for a cheaper tool',
  'Found an alternative tool or competitor',
  'Not enough businesses or executive emails in my area',
  'Only needed it for a short project / task finished',
  'Encountered technical issues or bugs',
  'Other reason',
];

export const ConfirmCancelAccountModal: React.FC<ConfirmCancelAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onForceWipeAndSignOut,
  user,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [customFeedback, setCustomFeedback] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [needsPassword, setNeedsPassword] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isGoogleUser = user?.photoURL || (typeof window !== 'undefined' && user?.email && !user?.email.endsWith('.local') && false);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    setErrorMessage(null);

    // Require password if user is not Google authenticated
    if (!password && !needsPassword) {
      // Prompt password check
      setNeedsPassword(true);
      setErrorMessage('Please enter your account password so Firebase can permanently delete your email from authentication.');
      setIsDeleting(false);
      return;
    }

    try {
      const res = await onConfirm(selectedReason, customFeedback.trim(), password || undefined);
      if (!res.success) {
        if (res.requiresReauth) {
          setNeedsPassword(true);
          setErrorMessage(res.error || 'Please enter your account password to confirm permanent deletion.');
        } else {
          setErrorMessage(res.error || 'Failed to cancel subscription.');
        }
        setIsDeleting(false);
        return;
      }
      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel subscription. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleGoogleReauth = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const res = await reauthenticateWithGoogle();
      if (res.success) {
        // Now finalize deletion & cancel
        const delRes = await onConfirm(selectedReason, customFeedback.trim());
        if (delRes.success) {
          setIsDeleting(false);
          onClose();
        } else {
          setErrorMessage(delRes.error || 'Failed to delete account');
          setIsDeleting(false);
        }
      } else {
        setErrorMessage(res.error || 'Google verification failed.');
        setIsDeleting(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to re-authenticate with Google');
      setIsDeleting(false);
    }
  };

  const handleForceWipe = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await onForceWipeAndSignOut(selectedReason, customFeedback.trim());
      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete cleanup.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-red-200 overflow-hidden relative animate-in zoom-in-95 duration-150 my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-650 via-red-600 to-rose-700 p-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white">Permanently Delete Account & Subscription</h3>
              <p className="text-xs text-red-100 font-medium mt-0.5">Please let us know why you are canceling</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleExecute} className="p-5 sm:p-6 space-y-4">
          <div className="p-3 bg-red-50 border border-red-200/80 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-900 leading-snug">
              Deleting account for: <strong className="font-mono text-red-950">{user?.email || user?.displayName || 'Active Account'}</strong>. 
              Your active Stripe subscription will be terminated and all saved records erased.
            </div>
          </div>

          {/* Cancellation Reason Questionnaire */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Why are you canceling your subscription? <span className="text-red-500">*</span>
            </label>
            <div className="space-y-1.5 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
              {CANCELLATION_REASONS.map((reason) => (
                <label 
                  key={reason} 
                  className={`flex items-center gap-2.5 p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                    selectedReason === reason 
                      ? 'bg-red-50 text-red-900 font-semibold border border-red-200/70' 
                      : 'text-slate-700 hover:bg-slate-100/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancel_reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-red-600 w-4 h-4"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Feedback Textarea */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>What could we have done better? (Optional)</span>
            </label>
            <textarea
              value={customFeedback}
              onChange={(e) => setCustomFeedback(e.target.value)}
              placeholder="Tell us what was missing or how we could improve..."
              rows={2}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Password Confirmation (Required to delete user permanently from Firebase Auth) */}
          <div className={`space-y-1.5 p-3 rounded-2xl border transition-all ${needsPassword ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Confirm Account Password <span className="text-red-500">*</span></span>
              </label>
              <span className="text-[10px] font-bold text-slate-600 uppercase bg-slate-200 px-1.5 py-0.5 rounded">
                Required for Full Erasure
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Enter your current account password so Firebase Authentication can completely delete your credentials, allowing you to freely register again with the same email anytime.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your current password to authorize erasure"
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
          </div>

          {/* Google Sign-in Verification Alternative */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 text-[11px]">Used Google to sign in?</span>
            <button
              type="button"
              onClick={handleGoogleReauth}
              disabled={isDeleting}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              Verify with Google &amp; Delete
            </button>
          </div>

          {/* Summary of What Happens */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <CreditCard className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>Stripe Subscription: Terminated &amp; Invalidated immediately.</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Supabase Status: Synced as "canceled" with your cancellation reason.</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleForceWipe}
              disabled={isDeleting}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline text-center sm:text-left cursor-pointer"
              title="Cancel billing, wipe workspace data and sign out even if you forgot your password"
            >
              Forgot password? Force sign out &amp; cancel
            </button>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Keep Account
              </button>
              <button
                type="submit"
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-95"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm &amp; Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
