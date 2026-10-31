import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  UploadCloud, 
  DownloadCloud, 
  Copy, 
  Check, 
  X, 
  ExternalLink,
  Code2,
  Server,
  Settings2,
  Globe2,
  RotateCcw,
  Users,
  CreditCard,
  MessageSquare,
  Search,
  AlertTriangle,
  Clock,
  Sparkles,
  HelpCircle,
  FileCode,
  ArrowRight,
  UserX,
  UserCheck,
  History,
  Archive,
  Trash2,
  DollarSign
} from 'lucide-react';
import { BusinessItem } from '../types';
import { 
  testSupabaseConnection, 
  testCanceledUsersTable,
  batchSaveBusinessesToSupabase, 
  loadBusinessesFromSupabase,
  loadUserSubscriptionsFromSupabase,
  loadCanceledUsersFromSupabase,
  batchSyncUsersToSupabase,
  batchSyncCanceledUsersToSupabase,
  removeUserAccountFromSupabase,
  purgeUserFromActiveTable,
  fixSupabaseAmountsAndCanceledStatus,
  markUserAsCanceledInSupabase,
  getLocalCanceledUsers,
  UserSubscriptionRecord,
  CanceledUserRecord,
  SUPABASE_SQL_SCHEMA,
  USER_SUBSCRIPTIONS_SQL,
  CANCELED_USERS_SQL,
  ALL_USER_TABLES_SQL,
  getActiveSupabaseConfig,
  setCustomSupabaseCredentials,
  resetCustomSupabaseCredentials
} from '../lib/supabase';
import { getAllUsersFromFirestore } from '../lib/firebase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: BusinessItem[];
  onLoadBusinesses: (loaded: BusinessItem[]) => void;
  autoSync: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  stripePlan?: {
    unitAmount: number;
    currency: string;
    formattedPrice: string;
    productName: string;
  };
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  businesses,
  onLoadBusinesses,
  autoSync,
  onToggleAutoSync,
  stripePlan,
}) => {
  const [activeTab, setActiveTab] = useState<'leads' | 'subscriptions'>('subscriptions');
  const [userSubView, setUserSubView] = useState<'active' | 'canceled'>('active');
  const [config, setConfig] = useState(getActiveSupabaseConfig());
  const [showConfigInputs, setShowConfigInputs] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newKey, setNewKey] = useState('');
  const [configFeedback, setConfigFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [statusMessage, setStatusMessage] = useState<string>('Verifying Supabase connection...');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);

  // SQL Copy states
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [copiedUserSQL, setCopiedUserSQL] = useState(false);
  const [copiedCancelSQL, setCopiedCancelSQL] = useState(false);
  const [copiedAllSQL, setCopiedAllSQL] = useState(false);

  // Active Subscriptions State (Active users: paid, not_paid, canceling)
  const [activeUsers, setActiveUsers] = useState<UserSubscriptionRecord[]>([]);
  const [canceledUsers, setCanceledUsers] = useState<CanceledUserRecord[]>([]);
  const defaultPlan = stripePlan || {
    unitAmount: 5.00,
    currency: 'chf',
    formattedPrice: '5.00 CHF',
    productName: 'LeadRadar Pro',
  };

  const [isLoadingSubs, setIsLoadingSubs] = useState<boolean>(false);
  const [subsError, setSubsError] = useState<string | null>(null);
  const [canceledError, setCanceledError] = useState<string | null>(null);

  const [subFilter, setSubFilter] = useState<'all' | 'paid' | 'not_paid' | 'canceling' | 'canceled'>('all');
  const [subSearchQuery, setSubSearchQuery] = useState<string>('');
  const [canceledSearchQuery, setCanceledSearchQuery] = useState<string>('');
  const [canceledFilterReason, setCanceledFilterReason] = useState<string>('all');

  // Batch sync & Stripe price fix states
  const [isBatchSyncingUsers, setIsBatchSyncingUsers] = useState<boolean>(false);
  const [batchSyncMsg, setBatchSyncMsg] = useState<string | null>(null);
  const [batchSyncError, setBatchSyncError] = useState<string | null>(null);
  const [showSqlGuide, setShowSqlGuide] = useState<boolean>(true);
  const [canceledTableExists, setCanceledTableExists] = useState<boolean | null>(null);
  const [manualPurgeEmail, setManualPurgeEmail] = useState<string>('');
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [isFixingAmounts, setIsFixingAmounts] = useState<boolean>(false);
  const [fixResultMsg, setFixResultMsg] = useState<string | null>(null);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    setStatusMessage('Connecting to Supabase project...');
    const [res, cancelCheck] = await Promise.all([
      testSupabaseConnection(),
      testCanceledUsersTable()
    ]);
    if (res.ok) {
      setConnectionStatus('connected');
      setStatusMessage(res.message);
    } else {
      setConnectionStatus('error');
      setStatusMessage(res.message);
    }
    setCanceledTableExists(cancelCheck.exists);
  };

  const handleFixAmountsAndStatus = async () => {
    setIsFixingAmounts(true);
    setFixResultMsg(null);
    try {
      const res = await fixSupabaseAmountsAndCanceledStatus(defaultPlan.unitAmount, defaultPlan.currency);
      setFixResultMsg(res.message);
      await fetchUserData();
    } catch (e: any) {
      setFixResultMsg(e?.message || 'Error updating amounts in Supabase');
    } finally {
      setIsFixingAmounts(false);
    }
  };

  const handleMarkAsCanceled = async (user: UserSubscriptionRecord) => {
    setIsPurging(true);
    setSyncSuccessMsg(null);
    setSyncErrorMsg(null);
    try {
      const res = await markUserAsCanceledInSupabase(
        user.id,
        user.email,
        user.cancel_reason || 'Account marked as canceled by user request',
        user.cancel_feedback || 'Canceled via Supabase Accounts Manager',
        defaultPlan.unitAmount,
        defaultPlan.currency
      );
      if (res.success) {
        setSyncSuccessMsg(`Account ${user.email} was successfully marked as CANCELED with ${defaultPlan.unitAmount.toFixed(2)} ${defaultPlan.currency.toUpperCase()} in Supabase!`);
        await fetchUserData();
      } else {
        setSyncErrorMsg(res.error || 'Failed to mark account as canceled');
      }
    } catch (e: any) {
      setSyncErrorMsg(e?.message || 'Failed to mark as canceled');
    } finally {
      setIsPurging(false);
    }
  };

  const handlePurgeAccount = async (email: string, id?: string) => {
    if (!email) return;
    setIsPurging(true);
    setSyncSuccessMsg(null);
    setSyncErrorMsg(null);
    try {
      const cleanEmail = email.trim();
      const res = await purgeUserFromActiveTable(cleanEmail, id, defaultPlan.unitAmount, defaultPlan.currency);
      if (res.success) {
        setActiveUsers(prev => prev.filter(u => u.email.toLowerCase() !== cleanEmail.toLowerCase() && u.id !== id));
        const archivedRecord: CanceledUserRecord = {
          id: id || cleanEmail,
          email: cleanEmail,
          display_name: cleanEmail.split('@')[0],
          cancel_reason: 'Removed / deleted from active table',
          cancel_feedback: 'Manual purge from active table in Supabase Manager',
          previous_plan: defaultPlan.productName,
          amount_paid: defaultPlan.unitAmount,
          currency: defaultPlan.currency,
          canceled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        setCanceledUsers(prev => [archivedRecord, ...prev.filter(u => u.email.toLowerCase() !== cleanEmail.toLowerCase())]);
        setSyncSuccessMsg(`Account ${cleanEmail} was permanently removed from active table and archived in canceled_users!`);
      } else {
        setSyncErrorMsg(res.error || `Could not remove ${cleanEmail} from user_subscriptions.`);
      }
    } catch (e: any) {
      setSyncErrorMsg(e?.message || 'Purge failed');
    } finally {
      setIsPurging(false);
    }
  };

  const fetchUserData = async () => {
    setIsLoadingSubs(true);
    setSubsError(null);
    setCanceledError(null);
    setBatchSyncMsg(null);
    setBatchSyncError(null);

    const [supaActiveRes, supaCanceledRes, firestoreUsers] = await Promise.all([
      loadUserSubscriptionsFromSupabase(),
      loadCanceledUsersFromSupabase(),
      getAllUsersFromFirestore()
    ]);
    setIsLoadingSubs(false);

    // 1. Process All Accounts in public.user_subscriptions (shows paid, not_paid, canceling, canceled)
    if (supaActiveRes.success && supaActiveRes.data.length > 0) {
      setActiveUsers(supaActiveRes.data);
    } else {
      if (supaActiveRes.error) {
        setSubsError(supaActiveRes.error);
      }
      // Populate active users from Firestore
      const activeFromFirestore = firestoreUsers
        .map(u => ({
          id: u.id,
          email: u.email,
          display_name: u.display_name,
          status: u.status,
          amount: u.amount || (u.status === 'paid' ? defaultPlan.unitAmount : 0),
          currency: defaultPlan.currency,
          cancel_reason: u.cancel_reason || null,
          cancel_feedback: u.cancel_feedback || null,
          created_at: u.created_at || undefined,
          updated_at: u.updated_at || undefined,
        }));
      setActiveUsers(activeFromFirestore);
    }

    // 2. Process Past Canceled Users Archive in public.canceled_users
    if (supaCanceledRes.success && supaCanceledRes.data.length > 0) {
      setCanceledUsers(supaCanceledRes.data);
    } else {
      if (supaCanceledRes.error) {
        setCanceledError(supaCanceledRes.error);
      }
      // Populate canceled users from Firestore or local archive
      const canceledFromFirestore = firestoreUsers
        .filter(u => u.status === 'canceled')
        .map(u => ({
          id: u.id,
          email: u.email,
          display_name: u.display_name,
          cancel_reason: u.cancel_reason || 'Canceled by user',
          cancel_feedback: u.cancel_feedback || null,
          amount_paid: u.amount || defaultPlan.unitAmount,
          previous_plan: defaultPlan.productName,
          currency: defaultPlan.currency,
          canceled_at: u.updated_at || new Date().toISOString(),
          created_at: u.created_at || new Date().toISOString(),
        }));

      if (canceledFromFirestore.length > 0) {
        setCanceledUsers(canceledFromFirestore);
      } else if (supaCanceledRes.data.length > 0) {
        setCanceledUsers(supaCanceledRes.data);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      const active = getActiveSupabaseConfig();
      setConfig(active);
      setNewUrl(active.url);
      setNewKey(active.key);
      checkConnection();
      fetchUserData();
      setSyncSuccessMsg(null);
      setSyncErrorMsg(null);
      setConfigFeedback(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'subscriptions') {
      fetchUserData();
    }
  }, [activeTab]);

  const handleSaveCustomCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setConfigFeedback(null);
    const result = setCustomSupabaseCredentials(newUrl, newKey);
    if (result.ok) {
      const updated = getActiveSupabaseConfig();
      setConfig(updated);
      setConfigFeedback({ message: 'Connected to new Supabase project credentials!', type: 'success' });
      checkConnection();
      fetchUserData();
      setTimeout(() => setConfigFeedback(null), 4000);
    } else {
      setConfigFeedback({ message: result.error || 'Failed to update credentials.', type: 'error' });
    }
  };

  const handleResetToDefault = () => {
    resetCustomSupabaseCredentials();
    const updated = getActiveSupabaseConfig();
    setConfig(updated);
    setNewUrl(updated.url);
    setNewKey(updated.key);
    setConfigFeedback({ message: 'Reset to default workspace Supabase database.', type: 'success' });
    checkConnection();
    fetchUserData();
    setTimeout(() => setConfigFeedback(null), 4000);
  };

  const handleSyncToSupabase = async () => {
    if (businesses.length === 0) {
      setSyncErrorMsg('No businesses in current workspace to sync.');
      return;
    }
    setIsSyncing(true);
    setSyncSuccessMsg(null);
    setSyncErrorMsg(null);

    const res = await batchSaveBusinessesToSupabase(businesses);
    setIsSyncing(false);

    if (res.success) {
      setSyncSuccessMsg(`Successfully saved and synced ${res.count} lead(s) to Supabase database!`);
    } else {
      setSyncErrorMsg(res.error || 'Failed to sync with Supabase table. Ensure table "businesses" is created.');
    }
  };

  const handleLoadFromSupabase = async () => {
    setIsLoading(true);
    setSyncSuccessMsg(null);
    setSyncErrorMsg(null);

    const res = await loadBusinessesFromSupabase();
    setIsLoading(false);

    if (res.success) {
      if (res.data.length === 0) {
        setSyncSuccessMsg('Supabase query succeeded: No saved leads found in database yet.');
      } else {
        onLoadBusinesses(res.data);
        setSyncSuccessMsg(`Successfully loaded ${res.data.length} lead(s) from Supabase!`);
      }
    } else {
      setSyncErrorMsg(res.error || 'Failed to load from Supabase. Ensure table "businesses" is created.');
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  const handleCopyUserSQL = () => {
    navigator.clipboard.writeText(USER_SUBSCRIPTIONS_SQL);
    setCopiedUserSQL(true);
    setTimeout(() => setCopiedUserSQL(false), 2000);
  };

  const handleCopyCancelSQL = () => {
    navigator.clipboard.writeText(CANCELED_USERS_SQL);
    setCopiedCancelSQL(true);
    setTimeout(() => setCopiedCancelSQL(false), 2000);
  };

  const handleCopyAllSQL = () => {
    navigator.clipboard.writeText(ALL_USER_TABLES_SQL);
    setCopiedAllSQL(true);
    setTimeout(() => setCopiedAllSQL(false), 2000);
  };

  // Push Active Users into public.user_subscriptions
  const handleBatchSyncActiveUsers = async () => {
    setIsBatchSyncingUsers(true);
    setBatchSyncMsg(null);
    setBatchSyncError(null);

    const res = await batchSyncUsersToSupabase(activeUsers);
    setIsBatchSyncingUsers(false);

    if (res.success) {
      setBatchSyncMsg(`Uploaded ${res.count} active account(s) to Supabase table public.user_subscriptions!`);
      fetchUserData();
    } else {
      setBatchSyncError(`Supabase error: ${res.error}. Make sure you ran the SQL in your Supabase SQL Editor.`);
    }
  };

  // Push Canceled Users into public.canceled_users
  const handleBatchSyncCanceledUsers = async () => {
    setIsBatchSyncingUsers(true);
    setBatchSyncMsg(null);
    setBatchSyncError(null);

    const res = await batchSyncCanceledUsersToSupabase(canceledUsers);
    setIsBatchSyncingUsers(false);

    if (res.success) {
      setBatchSyncMsg(`Uploaded ${res.count} past canceled record(s) to Supabase table public.canceled_users!`);
      fetchUserData();
    } else {
      setBatchSyncError(`Supabase error: ${res.error}. Make sure table public.canceled_users is created in Supabase.`);
    }
  };

  // Filter Active Users (only paid, not_paid, canceling)
  const filteredActiveUsers = activeUsers.filter(sub => {
    const matchesStatus = subFilter === 'all' || sub.status === subFilter;
    const matchesSearch = !subSearchQuery.trim() || 
      (sub.email && sub.email.toLowerCase().includes(subSearchQuery.toLowerCase())) ||
      (sub.display_name && sub.display_name.toLowerCase().includes(subSearchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Filter Past Canceled Users
  const filteredCanceledUsers = canceledUsers.filter(user => {
    const matchesReason = canceledFilterReason === 'all' || user.cancel_reason === canceledFilterReason;
    const matchesSearch = !canceledSearchQuery.trim() ||
      (user.email && user.email.toLowerCase().includes(canceledSearchQuery.toLowerCase())) ||
      (user.display_name && user.display_name.toLowerCase().includes(canceledSearchQuery.toLowerCase())) ||
      (user.cancel_reason && user.cancel_reason.toLowerCase().includes(canceledSearchQuery.toLowerCase())) ||
      (user.cancel_feedback && user.cancel_feedback.toLowerCase().includes(canceledSearchQuery.toLowerCase()));
    return matchesReason && matchesSearch;
  });

  const countActiveTotal = activeUsers.length;
  const countPaid = activeUsers.filter(s => s.status === 'paid').length;
  const countNotPaid = activeUsers.filter(s => s.status === 'not_paid').length;
  const countCanceling = activeUsers.filter(s => s.status === 'canceling').length;
  const countCanceledInTable1 = activeUsers.filter(s => s.status === 'canceled').length;
  const countCanceled = canceledUsers.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 pb-4 flex items-start justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'checking' ? 'Checking...' : 'Disconnected'}
                </span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-slate-400 text-xs font-mono">{config.projectRef}</span>
                {config.isCustom && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                    Custom Project
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Supabase Cloud Database &amp; User Directory
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Top Level) */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 pt-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'subscriptions'
                  ? 'bg-white text-indigo-600 border-t border-x border-slate-200 shadow-2xs -mb-px'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Accounts Management</span>
              <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold">
                {countActiveTotal + countCanceled} Total
              </span>
            </button>

            <button
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'leads'
                  ? 'bg-white text-indigo-600 border-t border-x border-slate-200 shadow-2xs -mb-px'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Leads Database (Sync &amp; Backup)</span>
              <span className="px-1.5 py-0.2 bg-slate-200 rounded-full text-[10px] font-bold text-slate-700">
                {businesses.length}
              </span>
            </button>
          </div>

          <a
            href={`https://supabase.com/dashboard/project/${config.projectRef}/editor`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-lg flex items-center gap-1.5 mb-1.5 transition-colors"
          >
            <span>Open Supabase Table Editor</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-900 flex-1">
          
          {/* TAB 1: USER ACCOUNTS (SEPARATED INTO ACTIVE USERS AND PAST CANCELED USERS) */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-4">

              {/* Supabase Connection Alert & Quick Connect when not connected */}
              {connectionStatus !== 'connected' && (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 text-slate-800 space-y-3 shadow-sm animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-amber-950">Supabase Connection Notice ({config.projectRef})</h4>
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {connectionStatus === 'checking' ? 'Checking Connection...' : 'Database Unreachable'}
                        </span>
                      </div>
                      <p className="text-xs text-amber-900 mt-1 leading-snug">
                        The configured Supabase endpoint <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">{config.url}</code> is currently unreachable. If your Supabase free tier project is paused or you are using a new project URL, connect it below or run the SQL in your Supabase SQL Editor.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveCustomCredentials} className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="url"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="Supabase URL (e.g. https://your-project.supabase.co)"
                        required
                        className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                      />
                      <input
                        type="text"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="Supabase Anon / Public API Key"
                        required
                        className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                      <a
                        href="https://supabase.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:underline font-bold flex items-center gap-1"
                      >
                        <span>Open Supabase Dashboard (Settings &gt; API)</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-xs"
                      >
                        Save &amp; Connect Project
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Step-by-Step Instructions Banner for Supabase Tables */}
              <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 border border-indigo-500/30 shadow-md space-y-3">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-400/30 shrink-0">
                      <HelpCircle className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Supabase Dual-Table Architecture: Active Users &amp; Past Canceled Users</span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Active users reside in <code className="bg-white/10 px-1 py-0.5 rounded font-mono text-indigo-200">public.user_subscriptions</code>. When an account is canceled, it is automatically removed from that table and archived in <code className="bg-white/10 px-1 py-0.5 rounded font-mono text-rose-300">public.canceled_users</code> with all cancellation reasons &amp; feedback.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSqlGuide(prev => !prev)}
                      className="text-xs text-indigo-300 hover:text-white underline cursor-pointer font-semibold"
                    >
                      {showSqlGuide ? 'Hide SQL Snippets' : 'View Tables SQL'}
                    </button>
                  </div>
                </div>

                {/* 3 Step Setup Guide */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                  <div className="bg-white/10 border border-white/10 rounded-xl p-3 flex flex-col justify-between space-y-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">Step 1</span>
                      <p className="text-xs font-bold text-white mt-0.5">Copy Both Tables SQL</p>
                      <p className="text-[11px] text-slate-300 mt-0.5">Creates both <code className="text-indigo-200 font-mono">user_subscriptions</code> and <code className="text-rose-200 font-mono">canceled_users</code>.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAllSQL}
                      className="w-full py-1.5 px-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                    >
                      {copiedAllSQL ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAllSQL ? 'Both Tables SQL Copied!' : 'Copy Tables SQL'}</span>
                    </button>
                  </div>

                  <div className="bg-white/10 border border-white/10 rounded-xl p-3 flex flex-col justify-between space-y-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">Step 2</span>
                      <p className="text-xs font-bold text-white mt-0.5">Run in Supabase SQL Editor</p>
                      <p className="text-[11px] text-slate-300 mt-0.5">Paste into the Supabase SQL Editor and click the green "Run" button.</p>
                    </div>
                    <a
                      href={`https://supabase.com/dashboard/project/${config.projectRef}/sql/new`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1.5 px-3 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all text-center"
                    >
                      <span>Open SQL Editor</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="bg-white/10 border border-white/10 rounded-xl p-3 flex flex-col justify-between space-y-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">Step 3</span>
                      <p className="text-xs font-bold text-white mt-0.5">Upload Current Data</p>
                      <p className="text-[11px] text-slate-300 mt-0.5">Populate both tables in your Supabase dashboard with live records.</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={handleBatchSyncActiveUsers}
                        disabled={isBatchSyncingUsers}
                        className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Upload active accounts to user_subscriptions"
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>Sync Active</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleBatchSyncCanceledUsers}
                        disabled={isBatchSyncingUsers}
                        className="flex-1 py-1 px-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Upload canceled records to canceled_users"
                      >
                        <UserX className="w-3 h-3" />
                        <span>Sync Canceled</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Optional SQL Snippet Drawer */}
                {showSqlGuide && (
                  <div className="pt-2 border-t border-white/10 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                      <span>SQL to Create Both Tables:</span>
                      <div className="flex items-center gap-2">
                        <button onClick={handleCopyUserSQL} className="text-indigo-300 hover:underline">Copy active only</button>
                        <span>•</span>
                        <button onClick={handleCopyCancelSQL} className="text-rose-300 hover:underline">Copy canceled only</button>
                      </div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-white/10 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-48">
                      <pre>{ALL_USER_TABLES_SQL}</pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Feedback messages */}
              {batchSyncMsg && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-2.5 text-emerald-800 text-xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="flex-1 font-medium">{batchSyncMsg}</div>
                  <a
                    href={`https://supabase.com/dashboard/project/${config.projectRef}/editor`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline text-emerald-900 ml-2 flex items-center gap-1"
                  >
                    <span>Open Supabase Table Editor</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {batchSyncError && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-amber-900 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-snug">
                    <p className="font-bold">{batchSyncError}</p>
                    <p className="text-[11px] text-amber-800 mt-1">
                      Make sure you copied and executed the SQL script in your Supabase SQL Editor.
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Paid Subscribers
                  </p>
                  <p className="text-xl font-black text-emerald-800 mt-0.5">{countPaid}</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-amber-700 uppercase flex items-center justify-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Unpaid Accounts
                  </p>
                  <p className="text-xl font-black text-amber-800 mt-0.5">{countNotPaid}</p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-orange-700 uppercase flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" /> Canceling Survey
                  </p>
                  <p className="text-xl font-black text-orange-800 mt-0.5">{countCanceling}</p>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-rose-700 uppercase flex items-center justify-center gap-1">
                    <UserX className="w-3 h-3" /> Canceled Accounts
                  </p>
                  <p className="text-xl font-black text-rose-800 mt-0.5">{countCanceledInTable1 + countCanceled}</p>
                </div>
              </div>

              {/* Live Stripe Pricing & 1-Click Supabase Sync Banner */}
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-2xl p-4 border border-emerald-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">Live Stripe Pricing:</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {defaultPlan.formattedPrice} / month
                      </span>
                      <span className="text-slate-400 text-xs font-mono">({defaultPlan.productName})</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Stripe product price is <strong className="text-white">{defaultPlan.unitAmount.toFixed(2)} {defaultPlan.currency.toUpperCase()}</strong>. If your Supabase database has legacy 19.00 rows, click below to sync:
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFixAmountsAndStatus}
                  disabled={isFixingAmounts}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFixingAmounts ? 'animate-spin' : ''}`} />
                  <span>{isFixingAmounts ? 'Updating Supabase...' : `Sync ${defaultPlan.formattedPrice} to Supabase`}</span>
                </button>
              </div>

              {fixResultMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{fixResultMsg}</span>
                </div>
              )}

              {/* Sub-View Switcher: Table 1 (Active) vs Table 2 (Past Canceled) */}
              <div className="flex items-center justify-between border-b border-slate-200 pt-2 pb-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUserSubView('active')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      userSubView === 'active'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Table 1: User Accounts (public.user_subscriptions)</span>
                    <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                      {countActiveTotal}
                    </span>
                  </button>

                  <button
                    onClick={() => setUserSubView('canceled')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      userSubView === 'canceled'
                        ? 'bg-rose-700 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5 text-rose-200" />
                    <span>Table 2: Past Canceled Users Archive (public.canceled_users)</span>
                    <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                      {countCanceled}
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={fetchUserData}
                  disabled={isLoadingSubs}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                  title="Refresh from Supabase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSubs ? 'animate-spin' : ''}`} />
                  <span>Refresh Data</span>
                </button>
              </div>

              {/* Missing Table Banner if canceled_users is not detected in Supabase */}
              {canceledTableExists === false && (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 text-slate-800 space-y-2.5 shadow-sm animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-amber-950">Table "public.canceled_users" Not Created in Supabase Yet</h4>
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Action Required</span>
                      </div>
                      <p className="text-xs text-amber-900 mt-1 leading-snug">
                        PostgreSQL requires executing the table creation SQL once before the table is visible in your Supabase Table Editor. Click below to copy the SQL and run it in your Supabase SQL editor:
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 flex-wrap sm:pl-12">
                    <button
                      type="button"
                      onClick={handleCopyCancelSQL}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                    >
                      {copiedCancelSQL ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCancelSQL ? '1-Click SQL Copied!' : '1-Click Copy "canceled_users" SQL'}</span>
                    </button>

                    <a
                      href={`https://supabase.com/dashboard/project/${config.projectRef}/sql/new`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Open Supabase SQL Editor</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        checkConnection();
                        fetchUserData();
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 inline mr-1" />
                      <span>Re-Check Status</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TABLE 1: USER ACCOUNTS (SHOWS PAID, NOT PAID, CANCELED, CANCELING) */}
              {userSubView === 'active' && (
                <div className="space-y-3 animate-in fade-in">
                  
                  {/* Quick Purge / Delete bar for removing accounts */}
                  <div className="p-3 bg-red-50/80 border border-red-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 text-red-900 font-bold shrink-0">
                      <Trash2 className="w-4 h-4 text-red-600" />
                      <span>Remove Account from user_subscriptions:</span>
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="email"
                        value={manualPurgeEmail}
                        onChange={(e) => setManualPurgeEmail(e.target.value)}
                        placeholder="Enter email to permanently wipe from user_subscriptions..."
                        className="flex-1 px-3 py-1.5 bg-white border border-red-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (manualPurgeEmail.trim()) {
                            handlePurgeAccount(manualPurgeEmail.trim());
                            setManualPurgeEmail('');
                          }
                        }}
                        disabled={!manualPurgeEmail.trim() || isPurging}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50 transition-all shrink-0"
                      >
                        {isPurging ? 'Removing...' : 'Purge Account'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    {/* Search */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={subSearchQuery}
                        onChange={(e) => setSubSearchQuery(e.target.value)}
                        placeholder="Search users by email or display name..."
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {(['all', 'paid', 'not_paid', 'canceled', 'canceling'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setSubFilter(tab)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize transition-all cursor-pointer whitespace-nowrap ${
                            subFilter === tab
                              ? tab === 'canceled'
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {tab.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* User Accounts Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                            <th className="py-3 px-4">User Account</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3">Price / Amount</th>
                            <th className="py-3 px-4">Status Details & Reason</th>
                            <th className="py-3 px-3 text-right">Last Updated</th>
                            <th className="py-3 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {isLoadingSubs ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400">
                                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-500 mb-2" />
                                <span>Loading user subscriptions from Supabase...</span>
                              </td>
                            </tr>
                          ) : filteredActiveUsers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-10 text-center text-slate-500">
                                <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="font-bold text-slate-700">No users found for selected filter</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Try selecting "All" or check Table 2 for the past canceled archive.
                                </p>
                              </td>
                            </tr>
                          ) : (
                            filteredActiveUsers.map((user) => {
                              const statusColor = 
                                user.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                user.status === 'not_paid' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                user.status === 'canceled' ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold' :
                                'bg-orange-50 text-orange-700 border-orange-200 animate-pulse';

                              const statusLabel = 
                                user.status === 'paid' ? 'PAID' :
                                user.status === 'not_paid' ? 'NOT PAID' :
                                user.status === 'canceled' ? 'CANCELED' :
                                'CANCELING...';

                              const displayAmount = user.amount !== undefined && user.amount > 0
                                ? `${user.amount.toFixed(2)} ${(user.currency || defaultPlan.currency).toUpperCase()}`
                                : `0.00 ${(user.currency || defaultPlan.currency).toUpperCase()}`;

                              const isOutdated19 = user.amount === 19 || user.amount === 19.00;

                              return (
                                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2.5">
                                      <div className={`w-7 h-7 rounded-full font-bold flex items-center justify-center shrink-0 uppercase text-[11px] ${
                                        user.status === 'canceled' 
                                          ? 'bg-rose-100 text-rose-700' 
                                          : 'bg-indigo-100 text-indigo-700'
                                      }`}>
                                        {(user.display_name || user.email || 'U')[0]}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-900 truncate">
                                          {user.display_name || user.email.split('@')[0]}
                                        </p>
                                        <p className="text-[11px] text-slate-500 font-mono truncate">
                                          {user.email}
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${statusColor}`}>
                                      {statusLabel}
                                    </span>
                                  </td>

                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span className="font-bold text-slate-800">
                                      {displayAmount}
                                    </span>
                                    {isOutdated19 && (
                                      <span className="block text-[9px] text-amber-600 font-bold">
                                        (Legacy 19.00 - Click Sync above)
                                      </span>
                                    )}
                                    <span className="block text-[10px] text-slate-400">
                                      {user.plan_name || defaultPlan.productName}
                                    </span>
                                  </td>

                                  <td className="py-3 px-4 text-[11px]">
                                    {user.status === 'canceled' ? (
                                      <div className="space-y-0.5">
                                        <span className="text-rose-700 font-bold flex items-center gap-1">
                                          <UserX className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                          <span>{user.cancel_reason || 'Canceled by user'}</span>
                                        </span>
                                        {user.cancel_feedback && (
                                          <p className="text-[10px] text-slate-500 italic">"{user.cancel_feedback}"</p>
                                        )}
                                      </div>
                                    ) : user.status === 'canceling' ? (
                                      <span className="text-orange-600 font-semibold italic flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        In process of cancellation (survey active)
                                      </span>
                                    ) : (
                                      <span className="text-slate-500">
                                        Active Workspace Account
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-3 px-3 text-right whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                    {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Recently'}
                                  </td>

                                  <td className="py-3 px-3 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {user.status !== 'canceled' && (
                                        <button
                                          type="button"
                                          onClick={() => handleMarkAsCanceled(user)}
                                          disabled={isPurging}
                                          title="Mark account as CANCELED in user_subscriptions & archive in canceled_users"
                                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                        >
                                          <UserX className="w-3 h-3 text-amber-600" />
                                          <span>Mark Canceled</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handlePurgeAccount(user.email, user.id)}
                                        disabled={isPurging}
                                        title="Permanently remove from user_subscriptions table"
                                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                                      >
                                        <Trash2 className="w-3 h-3 text-red-500" />
                                        <span>Purge</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TABLE 2: PAST CANCELED USERS ARCHIVE (WITH DETAILED REASONS & FEEDBACK) */}
              {userSubView === 'canceled' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    {/* Search */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={canceledSearchQuery}
                        onChange={(e) => setCanceledSearchQuery(e.target.value)}
                        placeholder="Search canceled users by email, reason, or feedback..."
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500">Filter Reason:</span>
                      <select
                        value={canceledFilterReason}
                        onChange={(e) => setCanceledFilterReason(e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-1.5 text-slate-700 font-medium focus:outline-none"
                      >
                        <option value="all">All Reasons ({canceledUsers.length})</option>
                        <option value="Price is too high / Looking for a cheaper tool">Price too high</option>
                        <option value="Found an alternative tool or competitor">Found competitor</option>
                        <option value="Not enough businesses or executive emails in my area">Not enough emails</option>
                        <option value="Only needed it for a short project / task finished">Finished project</option>
                        <option value="Encountered technical issues or bugs">Bugs / Issues</option>
                        <option value="Other reason">Other reason</option>
                      </select>
                    </div>
                  </div>

                  {/* Past Canceled Users Table */}
                  <div className="border border-rose-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-rose-50/70 border-b border-rose-200 text-rose-900 font-bold text-[11px] uppercase tracking-wider">
                            <th className="py-3 px-4">Past User</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3">Plan / Amount Paid</th>
                            <th className="py-3 px-4">Why They Canceled</th>
                            <th className="py-3 px-4">User's Feedback / Comments</th>
                            <th className="py-3 px-3 text-right">Canceled Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {isLoadingSubs ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400">
                                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-rose-500 mb-2" />
                                <span>Loading canceled users archive from Supabase...</span>
                              </td>
                            </tr>
                          ) : filteredCanceledUsers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-10 text-center text-slate-500">
                                <UserX className="w-8 h-8 text-rose-300 mx-auto mb-2" />
                                <p className="font-bold text-slate-700">No canceled users recorded yet</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  When an account cancels or is deleted, its complete record and reason are archived here.
                                </p>
                              </td>
                            </tr>
                          ) : (
                            filteredCanceledUsers.map((user) => {
                              return (
                                <tr key={user.id} className="hover:bg-rose-50/30 transition-colors">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0 uppercase text-[11px]">
                                        {(user.display_name || user.email || 'U')[0]}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-900 truncate">
                                          {user.display_name || user.email.split('@')[0]}
                                        </p>
                                        <p className="text-[11px] text-slate-500 font-mono truncate">
                                          {user.email}
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider bg-rose-50 text-rose-700 border-rose-200">
                                      CANCELED
                                    </span>
                                  </td>

                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span className="font-bold text-slate-800">
                                      {user.amount_paid !== undefined 
                                        ? `${user.amount_paid.toFixed(2)} ${(user.currency || defaultPlan.currency).toUpperCase()}` 
                                        : `${defaultPlan.unitAmount.toFixed(2)} ${defaultPlan.currency.toUpperCase()}`}
                                    </span>
                                    <span className="block text-[10px] text-slate-400">
                                      {user.previous_plan || defaultPlan.productName}
                                    </span>
                                  </td>

                                  <td className="py-3 px-4">
                                    <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 font-bold text-[11px] border border-rose-200/80 inline-block">
                                      {user.cancel_reason}
                                    </span>
                                  </td>

                                  <td className="py-3 px-4">
                                    {user.cancel_feedback ? (
                                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 italic flex items-start gap-1.5">
                                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                        <span>"{user.cancel_feedback}"</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">
                                        No custom note provided
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-3 px-3 text-right whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                    {user.canceled_at ? new Date(user.canceled_at).toLocaleDateString() : 'Recently'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Notice */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-900">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[11px]">
                  <strong>Clean separation:</strong> Active users are stored in <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono font-bold">public.user_subscriptions</code> and past users who canceled are archived in <code className="bg-rose-100 text-rose-900 px-1 py-0.5 rounded font-mono font-bold">public.canceled_users</code> with their cancellation questionnaire answers.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: LEADS DATABASE */}
          {activeTab === 'leads' && (
            <div className="space-y-5">
              {/* Connection Status Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    {connectionStatus === 'checking' && (
                      <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
                    )}
                    {connectionStatus === 'connected' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    )}
                    {connectionStatus === 'error' && (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>Project:</span>
                        <span className="font-mono text-indigo-600">{config.url}</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {statusMessage}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfigInputs(prev => !prev)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>{showConfigInputs ? 'Hide Settings' : 'Connect New Project'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={checkConnection}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Test</span>
                    </button>
                  </div>
                </div>

                {/* Custom Project Credentials Input Form */}
                {showConfigInputs && (
                  <form onSubmit={handleSaveCustomCredentials} className="pt-3.5 border-t border-slate-200/80 space-y-3 animate-in fade-in">
                    <div className="bg-indigo-900/5 p-3 rounded-xl border border-indigo-100 text-xs text-indigo-950 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-indigo-900">
                        <Globe2 className="w-3.5 h-3.5 text-indigo-600" />
                        Connect Any New Supabase Database Project
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Find these in your Supabase dashboard at <strong>Project Settings &gt; API &gt; Project URL &amp; anon / public key</strong>.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Supabase Project URL:
                        </label>
                        <input
                          type="url"
                          value={newUrl}
                          onChange={(e) => setNewUrl(e.target.value)}
                          placeholder="https://your-project-ref.supabase.co"
                          required
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Supabase Anon / Public API Key:
                        </label>
                        <input
                          type="text"
                          value={newKey}
                          onChange={(e) => setNewKey(e.target.value)}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          required
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {config.isCustom ? (
                        <button
                          type="button"
                          onClick={handleResetToDefault}
                          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset to Workspace Default</span>
                        </button>
                      ) : <div></div>}

                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        Save &amp; Connect New Database
                      </button>
                    </div>

                    {configFeedback && (
                      <div className={`p-2.5 rounded-xl text-xs font-medium ${configFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {configFeedback.message}
                      </div>
                    )}
                  </form>
                )}

                {/* Auto-Sync Toggle */}
                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Automatic Supabase Sync</p>
                    <p className="text-[11px] text-slate-500">Automatically save newly crawled executive emails and discovered leads to your Supabase database.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={autoSync} 
                      onChange={(e) => onToggleAutoSync(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Sync & Load Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Sync Current Leads */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <UploadCloud className="w-4.5 h-4.5 text-indigo-600" />
                      <span>Push Leads to Supabase</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Upload all <span className="font-bold text-slate-800">{businesses.length}</span> currently discovered businesses and crawled executive contacts to the <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">businesses</code> table.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncToSupabase}
                    disabled={isSyncing || businesses.length === 0}
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Syncing with Supabase...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Save {businesses.length} Leads to Cloud</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Load Saved Leads */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <DownloadCloud className="w-4.5 h-4.5 text-emerald-600" />
                      <span>Fetch Stored Database Leads</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Retrieve previously saved businesses and verified decision-maker emails from your Supabase project.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleLoadFromSupabase}
                    disabled={isLoading}
                    className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 active:bg-black disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Querying Supabase...</span>
                      </>
                    ) : (
                      <>
                        <DownloadCloud className="w-4 h-4" />
                        <span>Load Leads from Supabase</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Feedback messages */}
              {syncSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-2.5 text-emerald-800 text-xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{syncSuccessMsg}</span>
                </div>
              )}

              {syncErrorMsg && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-amber-900 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">{syncErrorMsg}</p>
                    <p className="text-[11px] text-amber-800">
                      Tip: Make sure the <code className="bg-amber-100 px-1 py-0.5 rounded">businesses</code> table is created in your Supabase project. You can copy the ready-to-use SQL schema below!
                    </p>
                  </div>
                </div>
              )}

              {/* SQL Table Schema Definition Snippet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-indigo-500" />
                    Supabase Complete Database Schema (All Tables)
                  </h4>
                  <button
                    type="button"
                    onClick={handleCopySQL}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedSQL ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSQL ? 'SQL Copied!' : 'Copy SQL Schema'}</span>
                  </button>
                </div>

                <div className="bg-slate-950 text-slate-200 rounded-2xl p-4 text-[11px] font-mono overflow-x-auto max-h-44 border border-slate-800 shadow-inner">
                  <pre>{SUPABASE_SQL_SCHEMA}</pre>
                </div>

                <p className="text-[11px] text-slate-500 flex items-center justify-between flex-wrap gap-1">
                  <span>Paste this in the <strong>SQL Editor</strong> tab of your Supabase dashboard to create all tables with Row Level Security.</span>
                  <a
                    href={`https://supabase.com/dashboard/project/${config.projectRef}/sql/new`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline flex items-center gap-1 shrink-0 ml-2 font-semibold"
                  >
                    <span>Open SQL Editor</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <Server className="w-3.5 h-3.5 text-emerald-600" />
            <span>Supabase: {config.projectRef} {config.isCustom ? '(Custom)' : '(Default)'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
