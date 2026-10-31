import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BusinessItem, 
  SearchQueryParams, 
  SearchResultResponse,
  SavedSearchRecord,
  SavedLeadItem,
  UserProfile
} from './types';
import { Navbar } from './components/Navbar';
import { ZipcodeSearchForm } from './components/ZipcodeSearchForm';
import { InteractiveMap } from './components/InteractiveMap';
import { BusinessCard } from './components/BusinessCard';
import { ExecutiveModal } from './components/ExecutiveModal';
import { BatchProgressBanner } from './components/BatchProgressBanner';
import { SupabaseModal } from './components/SupabaseModal';
import { SaveContactsModal } from './components/SaveContactsModal';
import { SearchHistorySidebar } from './components/SearchHistorySidebar';
import { AuthModal } from './components/AuthModal';
import { SavedLeadsModal } from './components/SavedLeadsModal';
import { PaywallModal } from './components/PaywallModal';
import { ConfirmCancelAccountModal } from './components/ConfirmCancelAccountModal';
import { exportToCSV, exportToJSON, extractAllCrawledIndividuals } from './utils/csvExport';
import { 
  saveBusinessToSupabase, 
  batchSaveBusinessesToSupabase, 
  recordSearchInSupabase,
  saveSearchSessionToSupabase,
  loadSearchSessionsFromSupabase,
  deleteSearchSessionFromSupabase,
  syncUserSubscriptionToSupabase,
  removeUserAccountFromSupabase
} from './lib/supabase';
import { 
  auth,
  logoutUser,
  saveSearchSessionToFirestore,
  loadSearchHistoryFromFirestore,
  deleteSearchHistoryFromFirestore,
  saveLeadToFirestore,
  loadSavedLeadsFromFirestore,
  deleteSavedLeadFromFirestore,
  checkUserPaidStatus,
  markUserAsPaid,
  resetUserToUnpaid,
  getGuestFavorites,
  saveGuestFavorites,
  getUserLocalFavorites,
  saveUserLocalFavorites,
  eraseCurrentAccountAndData,
  executeOneTimeAccountPurge,
  db,
  sendResetPassword,
  setUserPaidAccessCache,
  saveUserLocalSearchHistory
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDocs, deleteDoc } from 'firebase/firestore';
import { 
  Building2, 
  UserCheck, 
  Mail, 
  ShieldCheck, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Sparkles, 
  MapPin, 
  CheckSquare, 
  Square, 
  Zap, 
  Download, 
  AlertCircle,
  Layers,
  Map as MapIcon,
  List,
  Columns,
  Globe2,
  Database,
  Contact,
  History,
  RotateCcw,
  Clock,
  BookmarkCheck,
  Lock,
  LogIn,
  CheckCircle2,
  Star
} from 'lucide-react';

export default function App() {
  // Authentication & Paywall State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState<boolean>(false);
  const [paymentSuccessToast, setPaymentSuccessToast] = useState<string | null>(null);
  const [erasedNotice, setErasedNotice] = useState<string | null>(null);
  const [isConfirmCancelAccountOpen, setIsConfirmCancelAccountOpen] = useState<boolean>(false);

  // Saved Leads State
  const [savedLeads, setSavedLeads] = useState<SavedLeadItem[]>([]);
  const [isSavedLeadsModalOpen, setIsSavedLeadsModalOpen] = useState<boolean>(false);

  // Business and Map State
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 51.5074, lng: -0.1278 });
  const [currentCountry, setCurrentCountry] = useState<string>('Worldwide / All Countries');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [hoveredBusinessId, setHoveredBusinessId] = useState<string | null>(null);
  const [modalBusiness, setModalBusiness] = useState<BusinessItem | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedZipcodes, setSearchedZipcodes] = useState<string[]>([]);
  const [formResetKey, setFormResetKey] = useState<number>(0);

  // Saved Search Results History State (User-Scoped Firestore)
  const [savedSearches, setSavedSearches] = useState<SavedSearchRecord[]>([]);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState<boolean>(false);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);
  const [cachedNotice, setCachedNotice] = useState<{
    title: string;
    count: number;
    date: string;
    zipcodes: string[];
    country: string;
  } | null>(null);
  const [lastSearchParams, setLastSearchParams] = useState<SearchQueryParams | null>(null);

  // Supabase Integration State
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [autoSyncToSupabase, setAutoSyncToSupabase] = useState<boolean>(true);

  // Save Crawled Contacts Modal State
  const [isSaveContactsModalOpen, setIsSaveContactsModalOpen] = useState<boolean>(false);

  // Live Stripe Plan Pricing State (dynamically fetched from Stripe product prod_VRFRSXUZ0SCkuj)
  const [stripePlan, setStripePlan] = useState<{
    unitAmount: number;
    currency: string;
    formattedPrice: string;
    productName: string;
  }>({
    unitAmount: 5.00,
    currency: 'chf',
    formattedPrice: '5.00 CHF',
    productName: 'LeadRadar Pro',
  });

  useEffect(() => {
    fetch('/api/stripe-plan-info')
      .then(res => res.json())
      .then(data => {
        if (data && data.unitAmount) {
          setStripePlan({
            unitAmount: data.unitAmount,
            currency: data.currency || 'chf',
            formattedPrice: data.formattedPrice || `${data.unitAmount.toFixed(2)} ${(data.currency || 'chf').toUpperCase()}`,
            productName: data.productName || 'LeadRadar Pro',
          });
        }
      })
      .catch(() => {});
  }, []);

  // Batch Crawling State
  const [isBatchCrawling, setIsBatchCrawling] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState({
    total: 0,
    completed: 0,
    emailsFound: 0,
    currentName: '',
  });
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());

  // Filter & Layout Controls
  const [filterTab, setFilterTab] = useState<'all' | 'personal_email' | 'enriched' | 'pending' | 'favorites'>('all');
  const [listSearchQuery, setListSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'default' | 'rating' | 'name' | 'email_found'>('default');
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');

  const cancelBatchRef = useRef<boolean>(false);
  const lastUidRef = useRef<string | null>(null);
  const isCancellationCompletedRef = useRef<boolean>(false);

  // Reset all search results, map pins, and form inputs to start from a completely clean slate
  const handleStartFresh = () => {
    setBusinesses([]);
    setSearchedZipcodes([]);
    setActiveSearchId(null);
    setCachedNotice(null);
    setSelectedBusinessId(null);
    setHoveredBusinessId(null);
    setModalBusiness(null);
    setSearchError(null);
    setSelectedBatchIds(new Set());
    setLastSearchParams(null);
    setCurrentCountry('Worldwide / All Countries');
    setFormResetKey(prev => prev + 1);
    if (currentUser) {
      try {
        localStorage.removeItem(`leadradar_active_search_id_${currentUser.uid}`);
      } catch (e) {}
    }
  };

  // One-time erasure of any accounts and cached sessions (runs just ONCE)
  useEffect(() => {
    let isMounted = true;
    executeOneTimeAccountPurge().then(didPurge => {
      if (didPurge && isMounted) {
        setErasedNotice('Clean slate initialized: any previous accounts and cached sessions have been erased once as requested. You can now register or sign in fresh.');
        handleStartFresh();
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        const isSwitchingUser = lastUidRef.current && lastUidRef.current !== user.uid;
        if (isSwitchingUser) {
          // If a different user is logging in, wipe previous user's search data
          setBusinesses([]);
          setSearchedZipcodes([]);
          setSavedSearches([]);
          setSavedLeads([]);
          setActiveSearchId(null);
          setCachedNotice(null);
          setSelectedBusinessId(null);
          setHoveredBusinessId(null);
          setModalBusiness(null);
          setSearchError(null);
          setSelectedBatchIds(new Set());
          setLastSearchParams(null);
          setCurrentCountry('Worldwide / All Countries');
          setFormResetKey(prev => prev + 1);
        }

        lastUidRef.current = user.uid;

        // Check if user just returned from Stripe Hosted Checkout with a success session
        let userIsPaid = false;
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const sessionId = urlParams.get('session_id');
          const paymentStatus = urlParams.get('payment_status');

          if (sessionId && paymentStatus === 'success') {
            const verifyRes = await fetch(`/api/verify-checkout-session?session_id=${encodeURIComponent(sessionId)}`);
            const verifyData = await verifyRes.json();
            if (verifyData.paid) {
              await markUserAsPaid(user.uid, {
                sessionId: sessionId,
                amount: verifyData.amountTotal ? verifyData.amountTotal * 100 : 500,
                currency: verifyData.currency || 'usd',
              });
              userIsPaid = true;
              setPaymentSuccessToast('Stripe payment verified! Welcome to LeadRadar Global with full lifetime access.');
              // Clean query parameters from URL
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        } catch (e) {
          console.error('Session verify error:', e);
        }

        if (!userIsPaid) {
          userIsPaid = await checkUserPaidStatus(user.uid);
        }

        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL,
          hasPaidAccess: userIsPaid,
        };
        setCurrentUser(profile);
        setIsAuthModalOpen(false);

        // Sync user state to Supabase table public.user_subscriptions
        syncUserSubscriptionToSupabase({
          id: user.uid,
          email: user.email || '',
          displayName: profile.displayName,
          status: userIsPaid ? 'paid' : 'not_paid',
          amount: userIsPaid ? stripePlan.unitAmount : 0,
          currency: stripePlan.currency,
        }).catch(() => {});

        // Gate unpaid users with the paywall immediately
        if (!userIsPaid) {
          setIsPaywallOpen(true);
        } else {
          setIsPaywallOpen(false);
        }

        // Load this user's private search history and saved leads from Firestore + local cache
        await loadUserData(user.uid);
      } else {
        lastUidRef.current = null;
        setCurrentUser(null);
        setIsPaywallOpen(false);
        setBusinesses([]);
        setSearchedZipcodes([]);
        setSavedSearches([]);
        setSavedLeads(getGuestFavorites());
        setActiveSearchId(null);
        setCachedNotice(null);
        setSelectedBusinessId(null);
        setHoveredBusinessId(null);
        setModalBusiness(null);
        setSearchError(null);
        setSelectedBatchIds(new Set());
        setLastSearchParams(null);
        setCurrentCountry('Worldwide / All Countries');
        setFormResetKey(prev => prev + 1);
        // Prompt login for non-logged-in users
        setIsAuthModalOpen(true);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load User's Data (Search History + Saved Leads / Favorites)
  const loadUserData = async (uid: string) => {
    try {
      // 1. Load Search History (from local storage cache + Firestore cloud)
      const histRes = await loadSearchHistoryFromFirestore(uid);
      if (histRes.success && histRes.data.length > 0) {
        setSavedSearches(histRes.data);
        setIsCloudSynced(true);

        // Find active search session preserved before page refresh (or default to latest)
        let targetSearch = histRes.data[0];
        try {
          const activeSavedId = localStorage.getItem(`leadradar_active_search_id_${uid}`);
          if (activeSavedId) {
            const matched = histRes.data.find(s => s.id === activeSavedId);
            if (matched) {
              targetSearch = matched;
            }
          }
        } catch (e) {}

        if (targetSearch && targetSearch.businesses && targetSearch.businesses.length > 0) {
          setBusinesses(targetSearch.businesses);
          setCenter(targetSearch.center || { lat: 51.52, lng: -0.1 });
          setCurrentCountry(targetSearch.country || 'Worldwide');
          setSearchedZipcodes(targetSearch.zipcodes || []);
          setActiveSearchId(targetSearch.id);
          setSelectedBusinessId(targetSearch.businesses[0].id);
          setCachedNotice({
            title: targetSearch.title || `${targetSearch.category || 'Businesses'} in ${targetSearch.country}`,
            count: targetSearch.businesses.length,
            date: targetSearch.updatedAt || targetSearch.createdAt,
            zipcodes: targetSearch.zipcodes,
            country: targetSearch.country,
          });
        }
      } else {
        // Fresh user with no saved search history: start clean from scratch
        setSavedSearches([]);
        setBusinesses([]);
        setSearchedZipcodes([]);
        setActiveSearchId(null);
        setCachedNotice(null);
        setSelectedBusinessId(null);
        setLastSearchParams(null);
        setCurrentCountry('Worldwide / All Countries');
      }

      // 2. Load Saved Leads (Favorites)
      const leadsRes = await loadSavedLeadsFromFirestore(uid);
      const guestFavs = getGuestFavorites();
      if (leadsRes.success) {
        if (guestFavs.length > 0) {
          const map = new Map<string, SavedLeadItem>();
          guestFavs.forEach(f => map.set(f.id, f));
          leadsRes.data.forEach(f => map.set(f.id, f));
          const merged = Array.from(map.values());
          setSavedLeads(merged);
          saveUserLocalFavorites(uid, merged);
          // Persist guest favorites to user Firestore
          for (const gf of guestFavs) {
            saveLeadToFirestore(uid, gf);
          }
          saveGuestFavorites([]);
        } else {
          setSavedLeads(leadsRes.data);
        }
      } else {
        const local = getUserLocalFavorites(uid);
        setSavedLeads(local.length > 0 ? local : guestFavs);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      try {
        localStorage.removeItem(`leadradar_active_search_id_${currentUser.uid}`);
      } catch (e) {}
    }
    lastUidRef.current = null;
    setCurrentUser(null);
    setBusinesses([]);
    setSearchedZipcodes([]);
    setSavedSearches([]);
    setSavedLeads(getGuestFavorites());
    setActiveSearchId(null);
    setCachedNotice(null);
    setSelectedBusinessId(null);
    setHoveredBusinessId(null);
    setModalBusiness(null);
    setSearchError(null);
    setSelectedBatchIds(new Set());
    setLastSearchParams(null);
    setFormResetKey(prev => prev + 1);
    try {
      localStorage.removeItem('leadradar_saved_searches_history_v1');
    } catch (e) {}
    setIsPaywallOpen(false);
    await logoutUser();
  };

  const handleEraseAccount = () => {
    isCancellationCompletedRef.current = false;
    if (currentUser) {
      // Mark as 'canceling' in Supabase user_subscriptions while user is in cancellation survey
      syncUserSubscriptionToSupabase({
        id: currentUser.uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName,
        status: 'canceling',
      }).catch(() => {});
    }
    setIsConfirmCancelAccountOpen(true);
  };

  const handlePerformAccountCancellation = async (
    reason: string, 
    feedback: string, 
    passwordConfirm?: string
  ): Promise<{ success: boolean; requiresReauth?: boolean; error?: string }> => {
    try {
      const activeUser = auth.currentUser;
      const uid = activeUser?.uid || currentUser?.uid;
      const email = activeUser?.email || currentUser?.email || 'user@example.com';
      const displayName = activeUser?.displayName || currentUser?.displayName || 'User';

      // 1. Mark cancellation completed so modal close won't revert status to 'paid'
      isCancellationCompletedRef.current = true;

      // 2. CRITICAL: Immediately remove from Supabase user_subscriptions & archive in canceled_users FIRST!
      // This guarantees the deleted account does NOT stay 'paid' on user_subscriptions even if auth errors later
      if (uid || email) {
        await removeUserAccountFromSupabase(
          uid || email, 
          email, 
          reason, 
          feedback,
          stripePlan.unitAmount,
          stripePlan.currency
        );
      }

      // 3. Cancel Stripe payments
      try {
        await fetch('/api/cancel-user-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid, userEmail: email }),
        });
      } catch (e) {}

      // 4. If user is actively authenticated, attempt Firebase erasure
      if (activeUser) {
        const eraseRes = await eraseCurrentAccountAndData(activeUser, passwordConfirm);
        if (eraseRes.requiresReauth) {
          isCancellationCompletedRef.current = false;
          return eraseRes;
        }
        if (!eraseRes.success) {
          isCancellationCompletedRef.current = false;
          return eraseRes;
        }
      } else {
        await logoutUser();
      }

      handleStartFresh();
      setCurrentUser(null);
      setIsConfirmCancelAccountOpen(false);
      setIsPaywallOpen(false);
      setIsAuthModalOpen(true);
      setErasedNotice('Your account and subscription have been permanently deleted and archived.');
      return { success: true };
    } catch (e: any) {
      console.warn('Account cancellation notice:', e);
      return { success: false, error: e?.message || 'Failed to delete account' };
    }
  };

  const handleForceWipeAndSignOut = async (reason: string, feedback: string) => {
    const activeUser = auth.currentUser;
    const uid = activeUser?.uid || currentUser?.uid;
    const email = activeUser?.email || currentUser?.email || 'user@example.com';

    isCancellationCompletedRef.current = true;

    // 1. Invalidate Stripe
    try {
      await fetch('/api/cancel-user-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, userEmail: email }),
      });
    } catch (e) {}

    // 2. Remove from active user_subscriptions and archive to canceled_users in Supabase
    if (uid || email) {
      await removeUserAccountFromSupabase(
        uid || email, 
        email, 
        reason, 
        feedback,
        stripePlan.unitAmount,
        stripePlan.currency
      );
    }

    // 3. Clear user's Firestore data completely
    if (uid) {
      try {
        const searchHistoryDocs = await getDocs(collection(db, 'users', uid, 'searchHistory'));
        for (const d of searchHistoryDocs.docs) {
          await deleteDoc(d.ref).catch(() => {});
        }
        const savedLeadsDocs = await getDocs(collection(db, 'users', uid, 'savedLeads'));
        for (const d of savedLeadsDocs.docs) {
          await deleteDoc(d.ref).catch(() => {});
        }
        await deleteDoc(doc(db, 'users', uid)).catch(() => {});
      } catch (e) {}
    }

    // 4. Send a password reset email if email is present so user can recreate/reset anytime
    if (email && email.includes('@')) {
      try {
        await sendResetPassword(email);
      } catch (e) {}
    }

    // 5. Invalidate local storage & cache
    if (uid) {
      setUserPaidAccessCache(uid, false);
      saveUserLocalSearchHistory(uid, []);
      saveUserLocalFavorites(uid, []);
    }

    // 6. Sign out and start clean
    await logoutUser();
    handleStartFresh();
    setCurrentUser(null);
    setIsConfirmCancelAccountOpen(false);
    setIsPaywallOpen(false);
    setIsAuthModalOpen(true);
    setErasedNotice('Subscription canceled and data wiped. A password reset link has been sent to your email in case you wish to recreate your account.');
  };

  // Helper to re-test the paywall in test sandbox
  const handleResetPaidStatus = async () => {
    if (!currentUser) return;
    await resetUserToUnpaid(currentUser.uid);
    setCurrentUser(prev => prev ? { ...prev, hasPaidAccess: false } : null);
    setIsPaywallOpen(true);
  };

  // 1. Search Businesses API Call (Requires Logged-in & Paid User & Saves to User's Firestore History)
  const handleSearch = async (params: SearchQueryParams, targetUid?: string) => {
    const activeUid = targetUid || currentUser?.uid;

    if (!activeUid) {
      setIsAuthModalOpen(true);
      return;
    }

    if (currentUser && !currentUser.hasPaidAccess) {
      setIsPaywallOpen(true);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSelectedBusinessId(null);
    setSelectedBatchIds(new Set());
    setCachedNotice(null);
    setLastSearchParams(params);

    if (params.country) {
      setCurrentCountry(params.country);
    }

    try {
      const res = await fetch('/api/search-businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Search failed with status ${res.status}`);
      }

      const data: SearchResultResponse = await res.json();
      const discovered = data.businesses || [];
      setBusinesses(discovered);

      const searchCenter = data.center || center;
      if (data.center) {
        setCenter(data.center);
      }
      const searchCountry = data.country || params.country || currentCountry;
      if (data.country) {
        setCurrentCountry(data.country);
      }
      const actualZips = data.searchedZipcodes || params.zipcodes;
      setSearchedZipcodes(actualZips);

      if (discovered.length > 0) {
        setSelectedBusinessId(discovered[0].id);
      }

      // Generate SavedSearchRecord & Save to User's Firestore
      const sessionId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const searchTitle = `${params.category || params.keyword || 'Businesses'} in ${searchCountry} (${actualZips.join(', ')})`;

      const newSearchRecord: SavedSearchRecord = {
        id: sessionId,
        title: searchTitle,
        zipcodes: actualZips,
        country: searchCountry,
        category: params.category,
        keyword: params.keyword,
        totalFound: discovered.length,
        center: searchCenter,
        businesses: discovered,
        crawledCount: 0,
        personalEmailsCount: discovered.filter(b => b.executiveDetails?.personalEmail).length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setActiveSearchId(sessionId);
      setSavedSearches(prev => [newSearchRecord, ...prev.filter(s => s.id !== sessionId)]);
      try {
        localStorage.setItem(`leadradar_active_search_id_${activeUid}`, sessionId);
      } catch (e) {}

      // Save session to user's Firestore collection
      await saveSearchSessionToFirestore(activeUid, newSearchRecord);

    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError(err.message || 'Failed to fetch businesses. Please check postal codes/country and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Helper to update active search session when leads are enriched
  const updateCurrentSearchInHistory = (updatedBizList: BusinessItem[]) => {
    if (!activeSearchId || !currentUser) return;

    setSavedSearches(prev => {
      const idx = prev.findIndex(s => s.id === activeSearchId);
      if (idx === -1) return prev;

      const current = prev[idx];
      const updated: SavedSearchRecord = {
        ...current,
        businesses: updatedBizList,
        crawledCount: updatedBizList.filter(b => b.enrichmentStatus === 'enriched').length,
        personalEmailsCount: updatedBizList.filter(b => b.executiveDetails?.personalEmail).length,
        updatedAt: new Date().toISOString(),
      };

      const next = [...prev];
      next[idx] = updated;

      // Update in user's Firestore
      saveSearchSessionToFirestore(currentUser.uid, updated);
      return next;
    });
  };

  // Toggle Save / Favorite Business
  const handleToggleSaveLead = async (business: BusinessItem, e?: React.MouseEvent) => {
    e?.stopPropagation();

    const isAlreadySaved = savedLeads.some(l => l.id === business.id);

    if (isAlreadySaved) {
      // Remove from favorites
      setSavedLeads(prev => {
        const next = prev.filter(l => l.id !== business.id);
        if (currentUser) {
          saveUserLocalFavorites(currentUser.uid, next);
        } else {
          saveGuestFavorites(next);
        }
        return next;
      });

      if (currentUser) {
        await deleteSavedLeadFromFirestore(currentUser.uid, business.id);
      }
    } else {
      // Add to favorites
      const newLead: SavedLeadItem = {
        ...business,
        savedAt: new Date().toISOString(),
        notes: business.executiveDetails?.notes || ''
      };

      setSavedLeads(prev => {
        const next = [newLead, ...prev.filter(l => l.id !== business.id)];
        if (currentUser) {
          saveUserLocalFavorites(currentUser.uid, next);
        } else {
          saveGuestFavorites(next);
        }
        return next;
      });

      if (currentUser) {
        await saveLeadToFirestore(currentUser.uid, business);
      }
    }
  };

  const handleRemoveSavedLead = async (leadId: string) => {
    setSavedLeads(prev => {
      const next = prev.filter(l => l.id !== leadId);
      if (currentUser) {
        saveUserLocalFavorites(currentUser.uid, next);
      } else {
        saveGuestFavorites(next);
      }
      return next;
    });

    if (currentUser) {
      await deleteSavedLeadFromFirestore(currentUser.uid, leadId);
    }
  };

  // Bring the map view directly to a specific business (e.g. when clicking a favorited business)
  const handleFocusBusinessOnMap = (biz: BusinessItem) => {
    // 1. Ensure the business is present in the active businesses array so its map pin is rendered
    setBusinesses(prev => {
      const exists = prev.some(b => b.id === biz.id);
      if (!exists) {
        return [biz, ...prev];
      }
      return prev;
    });

    // 2. Select this business to highlight its pin and open floating details
    setSelectedBusinessId(biz.id);

    // 3. Center map coordinates directly on this business
    if (
      typeof biz.latitude === 'number' &&
      typeof biz.longitude === 'number' &&
      !isNaN(biz.latitude) &&
      !isNaN(biz.longitude)
    ) {
      setCenter({ lat: biz.latitude, lng: biz.longitude });
    }

    // 4. Ensure map view is visible (switch out of list-only view mode)
    if (viewMode === 'list') {
      setViewMode('split');
    }

    // 5. Close Favorites modal if open so the user immediately sees the map
    setIsSavedLeadsModalOpen(false);

    // 6. Smoothly scroll down to the map section if not already in view
    setTimeout(() => {
      const mapSection = document.getElementById('map-radar-section');
      if (mapSection) {
        mapSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 60);
  };

  // 2. Deep Crawl Single Business Executive Worldwide
  const handleCrawlBusiness = async (business: BusinessItem) => {
    // Set status to crawling
    setBusinesses(prev => {
      const updated = prev.map(b => b.id === business.id ? { ...b, enrichmentStatus: 'crawling' as const, crawlError: null } : b);
      return updated;
    });

    try {
      const res = await fetch('/api/deep-crawl-executive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: business.name,
          address: business.address,
          city: business.city,
          state: business.state,
          zipcode: business.zipcode,
          country: business.country || currentCountry,
          website: business.website,
          phone: business.phone,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract executive contacts.');
      }

      const updatedBiz: BusinessItem = {
        ...business,
        enrichmentStatus: 'enriched',
        executiveDetails: data.executiveDetails,
        crawlError: null,
      };

      setBusinesses(prev => {
        const next = prev.map(b => b.id === business.id ? updatedBiz : b);
        updateCurrentSearchInHistory(next);
        return next;
      });

      // Auto-save updated executive record to Supabase
      if (autoSyncToSupabase) {
        saveBusinessToSupabase(updatedBiz);
      }
    } catch (err: any) {
      console.error('Executive crawl error for:', business.name, err);
      setBusinesses(prev => prev.map(b => {
        if (b.id === business.id) {
          return {
            ...b,
            enrichmentStatus: 'error',
            crawlError: err.message || 'Crawl failed',
          };
        }
        return b;
      }));
    }
  };

  // 3. Batch Crawl Multiple Businesses
  const handleBatchCrawl = async () => {
    if (isBatchCrawling) return;

    // Target either selected checkboxes or all unsearched
    const targets = selectedBatchIds.size > 0
      ? businesses.filter(b => selectedBatchIds.has(b.id) && b.enrichmentStatus !== 'crawling')
      : businesses.filter(b => b.enrichmentStatus === 'unsearched' || b.enrichmentStatus === 'error');

    if (targets.length === 0) return;

    setIsBatchCrawling(true);
    cancelBatchRef.current = false;

    let completed = 0;
    let emailsFound = businesses.filter(b => b.executiveDetails?.personalEmail).length;
    const enrichedList: BusinessItem[] = [];

    setBatchProgress({
      total: targets.length,
      completed: 0,
      emailsFound,
      currentName: targets[0]?.name || '',
    });

    for (const biz of targets) {
      if (cancelBatchRef.current) break;

      setBatchProgress(prev => ({
        ...prev,
        currentName: biz.name,
      }));

      // Set item to crawling
      setBusinesses(prev => prev.map(b => b.id === biz.id ? { ...b, enrichmentStatus: 'crawling' } : b));

      try {
        const res = await fetch('/api/deep-crawl-executive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName: biz.name,
            address: biz.address,
            city: biz.city,
            state: biz.state,
            zipcode: biz.zipcode,
            country: biz.country || currentCountry,
            website: biz.website,
            phone: biz.phone,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success && data.executiveDetails) {
          if (data.executiveDetails.personalEmail) {
            emailsFound++;
          }
          const updated: BusinessItem = {
            ...biz,
            enrichmentStatus: 'enriched',
            executiveDetails: data.executiveDetails,
          };
          enrichedList.push(updated);
          setBusinesses(prev => {
            const next = prev.map(b => b.id === biz.id ? updated : b);
            updateCurrentSearchInHistory(next);
            return next;
          });
          
          if (autoSyncToSupabase) {
            saveBusinessToSupabase(updated);
          }
        } else {
          setBusinesses(prev => prev.map(b => b.id === biz.id ? {
            ...b,
            enrichmentStatus: 'error',
            crawlError: data.error || 'Failed',
          } : b));
        }
      } catch (err: any) {
        setBusinesses(prev => prev.map(b => b.id === biz.id ? {
          ...b,
          enrichmentStatus: 'error',
          crawlError: err.message,
        } : b));
      }

      completed++;
      setBatchProgress(prev => ({
        ...prev,
        completed,
        emailsFound,
      }));
    }

    if (autoSyncToSupabase && enrichedList.length > 0) {
      batchSaveBusinessesToSupabase(enrichedList);
    }

    setIsBatchCrawling(false);
  };

  // Search History Actions
  const handleSelectSavedSearch = (savedSearch: SavedSearchRecord) => {
    setBusinesses(savedSearch.businesses);
    if (savedSearch.center) {
      setCenter(savedSearch.center);
    }
    if (savedSearch.country) {
      setCurrentCountry(savedSearch.country);
    }
    setSearchedZipcodes(savedSearch.zipcodes || []);
    setActiveSearchId(savedSearch.id);
    setSelectedBatchIds(new Set());
    if (currentUser) {
      try {
        localStorage.setItem(`leadradar_active_search_id_${currentUser.uid}`, savedSearch.id);
      } catch (e) {}
    }

    if (savedSearch.businesses && savedSearch.businesses.length > 0) {
      setSelectedBusinessId(savedSearch.businesses[0].id);
    }

    setCachedNotice({
      title: savedSearch.title || `${savedSearch.category || 'Businesses'} in ${savedSearch.country}`,
      count: savedSearch.businesses.length,
      date: savedSearch.updatedAt || savedSearch.createdAt,
      zipcodes: savedSearch.zipcodes,
      country: savedSearch.country,
    });
  };

  const handleDeleteSavedSearch = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedSearches(prev => prev.filter(s => s.id !== id));
    if (activeSearchId === id) {
      setActiveSearchId(null);
      setCachedNotice(null);
      if (currentUser) {
        try {
          localStorage.removeItem(`leadradar_active_search_id_${currentUser.uid}`);
        } catch (e) {}
      }
    }
    if (currentUser) {
      await deleteSearchHistoryFromFirestore(currentUser.uid, id);
    }
    await deleteSearchSessionFromSupabase(id);
  };

  const handleRefreshSavedSearches = async () => {
    if (currentUser) {
      const res = await loadSearchHistoryFromFirestore(currentUser.uid);
      if (res.success) {
        setSavedSearches(res.data);
        setIsCloudSynced(true);
      }
    }
  };

  const handleSaveCurrentSession = async () => {
    if (businesses.length === 0 || !currentUser) return;

    const title = `${currentCountry} (${searchedZipcodes.join(', ')}) - ${businesses.length} Leads`;
    const sessionId = activeSearchId || `search_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const record: SavedSearchRecord = {
      id: sessionId,
      title,
      zipcodes: searchedZipcodes,
      country: currentCountry,
      totalFound: businesses.length,
      center,
      businesses,
      crawledCount: businesses.filter(b => b.enrichmentStatus === 'enriched').length,
      personalEmailsCount: businesses.filter(b => b.executiveDetails?.personalEmail).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setActiveSearchId(sessionId);
    setSavedSearches(prev => [record, ...prev.filter(s => s.id !== sessionId)]);
    await saveSearchSessionToFirestore(currentUser.uid, record);
  };

  const handleRescanLive = () => {
    if (cachedNotice) {
      handleSearch({
        country: cachedNotice.country || currentCountry,
        zipcodes: cachedNotice.zipcodes || searchedZipcodes,
        limit: 15,
      });
    } else if (lastSearchParams) {
      handleSearch(lastSearchParams);
    }
  };

  // Checkbox batch selection
  const handleToggleBatchCheck = (id: string) => {
    setSelectedBatchIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedBatchIds.size === businesses.length) {
      setSelectedBatchIds(new Set());
    } else {
      setSelectedBatchIds(new Set(businesses.map(b => b.id)));
    }
  };

  // Filter and sort businesses for list view
  const filteredBusinesses = useMemo(() => {
    let result = [...businesses];

    // Filter by tab
    if (filterTab === 'personal_email') {
      result = result.filter(b => Boolean(b.executiveDetails?.personalEmail));
    } else if (filterTab === 'enriched') {
      result = result.filter(b => b.enrichmentStatus === 'enriched');
    } else if (filterTab === 'pending') {
      result = result.filter(b => b.enrichmentStatus === 'unsearched' || b.enrichmentStatus === 'crawling');
    } else if (filterTab === 'favorites') {
      const savedIds = new Set(savedLeads.map(l => l.id));
      const inSearch = result.filter(b => savedIds.has(b.id));
      // Show favorites in current search, or if none in search, show all saved favorite businesses
      result = inSearch.length > 0 ? inSearch : (savedLeads as BusinessItem[]);
    }

    // Filter by keyword / text search
    if (listSearchQuery.trim()) {
      const q = listSearchQuery.toLowerCase();
      result = result.filter(b => 
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        (b.country && b.country.toLowerCase().includes(q)) ||
        b.zipcode.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q) ||
        b.executiveDetails?.executiveName?.toLowerCase().includes(q) ||
        b.executiveDetails?.personalEmail?.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'email_found') {
      result.sort((a, b) => {
        const aHas = a.executiveDetails?.personalEmail ? 1 : 0;
        const bHas = b.executiveDetails?.personalEmail ? 1 : 0;
        return bHas - aHas;
      });
    }

    return result;
  }, [businesses, filterTab, listSearchQuery, sortBy, savedLeads]);

  const totalPersonalEmails = businesses.filter(b => b.executiveDetails?.personalEmail).length;
  const totalEnriched = businesses.filter(b => b.enrichmentStatus === 'enriched').length;
  const crawledIndividuals = useMemo(() => extractAllCrawledIndividuals(businesses), [businesses]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        businesses={businesses}
        currentCountry={currentCountry}
        onExportCSV={() => exportToCSV(businesses)}
        onExportJSON={() => exportToJSON(businesses)}
        onBatchCrawlAll={handleBatchCrawl}
        isBatchCrawling={isBatchCrawling}
        selectedCount={selectedBatchIds.size}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenSaveContactsModal={() => setIsSaveContactsModalOpen(true)}
        onOpenSavedLeadsModal={() => setIsSavedLeadsModalOpen(true)}
        savedLeadsCount={savedLeads.length}
        savedSearchesCount={savedSearches.length}
        isHistorySidebarOpen={isHistorySidebarOpen}
        onToggleHistorySidebar={() => setIsHistorySidebarOpen(prev => !prev)}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onEraseAccount={handleEraseAccount}
        onOpenPaywall={() => setIsPaywallOpen(true)}
        onResetPaidStatus={handleResetPaidStatus}
      />

      {/* Erased / Clean Slate Banner */}
      {erasedNotice && (
        <div className="bg-slate-900 border-b border-indigo-500/30 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs font-semibold animate-in slide-in-from-top">
          <div className="flex items-center gap-2.5 max-w-7xl mx-auto w-full">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-slate-200">{erasedNotice}</span>
          </div>
          <button 
            type="button"
            onClick={() => setErasedNotice(null)}
            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Payment Success Toast Banner */}
      {paymentSuccessToast && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs font-semibold animate-in slide-in-from-top">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{paymentSuccessToast}</span>
          </div>
          <button 
            type="button"
            onClick={() => setPaymentSuccessToast(null)}
            className="text-white hover:text-emerald-200 text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace Layout with Search History Sidebar Column */}
      <div className="flex-1 flex flex-col lg:flex-row items-start max-w-[1600px] w-full mx-auto px-2 sm:px-4 lg:px-6 py-4 gap-4">
        {/* Search Results History Sidebar Column */}
        <SearchHistorySidebar
          savedSearches={savedSearches}
          activeSearchId={activeSearchId}
          onSelectSearch={handleSelectSavedSearch}
          onDeleteSearch={handleDeleteSavedSearch}
          onRefreshHistory={handleRefreshSavedSearches}
          isOpen={isHistorySidebarOpen}
          onToggleOpen={() => setIsHistorySidebarOpen(prev => !prev)}
          isCloudSynced={isCloudSynced}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 w-full space-y-5">
          {/* Search & Global Location Controls */}
          <ZipcodeSearchForm
            key={`${currentUser?.uid || 'guest'}_${formResetKey}`}
            onSearch={handleSearch}
            isLoading={isSearching}
            initialZipcodes={searchedZipcodes}
            initialCountry={currentCountry}
            onStartFresh={handleStartFresh}
            hasActiveResults={businesses.length > 0 || searchedZipcodes.length > 0}
          />

          {/* Cached Results from Supabase Notification Banner */}
          {cachedNotice && (
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-4 px-5 sm:px-6 shadow-sm border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shadow-inner shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">
                      {cachedNotice.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      0 Google API Calls (Supabase Stored)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300/80 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>Restored {cachedNotice.count} verified leads from past search session.</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(cachedNotice.date).toLocaleDateString()} {new Date(cachedNotice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                <button
                  type="button"
                  onClick={handleRescanLive}
                  disabled={isSearching}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                  title="Run fresh live query on Google Maps for this area"
                >
                  <RotateCcw className={`w-3.5 h-3.5 text-amber-400 ${isSearching ? 'animate-spin' : ''}`} />
                  <span>Re-scan Live</span>
                </button>
              </div>
            </div>
          )}

          {/* Batch Crawl Banner if Active */}
          <BatchProgressBanner
            isCrawling={isBatchCrawling}
            totalToCrawl={batchProgress.total}
            completedCount={batchProgress.completed}
            personalEmailsFound={batchProgress.emailsFound}
            currentBusinessName={batchProgress.currentName}
          />

          {/* Save Crawled Contacts Quick Banner if items have been crawled */}
          {crawledIndividuals.length > 0 && !isBatchCrawling && (
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-3xl p-4.5 px-6 shadow-md border border-indigo-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shadow-inner shrink-0">
                  <Contact className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{crawledIndividuals.length} Deep-Crawled Contacts Ready</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white uppercase tracking-wider">
                      {totalPersonalEmails} Direct Inboxes
                    </span>
                  </h3>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    Save all harvested decision-makers to your Supabase cloud DB, download vCard (.vcf) address book, or export CRM contacts CSV.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSaveContactsModalOpen(true)}
                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0 active:scale-95"
              >
                <Contact className="w-4 h-4" />
                <span>Save Crawled Contacts ({crawledIndividuals.length})</span>
              </button>
            </div>
          )}

          {/* Search Error Alert if any */}
          {searchError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {/* Workspace Dual View: Map & Filtered List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Map Column (5 cols on lg) */}
            <div id="map-radar-section" className={`lg:col-span-5 space-y-4 ${viewMode === 'list' ? 'hidden' : 'block'}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-indigo-600" />
                  <span>Geographic Target Area Radar</span>
                </h2>
                <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                  <Globe2 className="w-3.5 h-3.5 text-indigo-500" />
                  {currentCountry} ({searchedZipcodes.join(', ')})
                </span>
              </div>

              {/* Interactive Map Component */}
              <InteractiveMap
                businesses={businesses}
                center={center}
                selectedBusinessId={selectedBusinessId}
                hoveredBusinessId={hoveredBusinessId}
                selectedBatchIds={selectedBatchIds}
                onSelectBusiness={(biz) => {
                  handleFocusBusinessOnMap(biz);
                }}
                onHoverBusiness={setHoveredBusinessId}
                onCrawlBusiness={handleCrawlBusiness}
                isCrawlingAny={isBatchCrawling}
                currentCountry={currentCountry}
                searchedZipcodes={searchedZipcodes}
                isFavorite={(id) => savedLeads.some(l => l.id === id)}
                onToggleFavorite={handleToggleSaveLead}
              />

              {/* Strict Filter Policy Callout */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 text-xs text-slate-600 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Strict Worldwide Anti-Generic Mailbox Guarantee</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Generic company aliases (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]">contact@</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]">info@</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]">support@</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]">kontakt@</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]">sales@</code>) are automatically excluded. Only direct verified executive mailboxes are harvested.
                </p>
              </div>
            </div>

            {/* Business Directory & Contact Intelligence List Column (7 cols on lg) */}
            <div className={`${viewMode === 'map' ? 'hidden' : 'lg:col-span-7'} space-y-4`}>
              {/* List Filter Toolbar */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
                {/* Filter Tabs */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl text-xs font-semibold">
                    <button
                      onClick={() => setFilterTab('all')}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        filterTab === 'all'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({businesses.length})
                    </button>
                    <button
                      onClick={() => setFilterTab('personal_email')}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                        filterTab === 'personal_email'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-emerald-700 hover:text-emerald-900'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Direct Emails ({totalPersonalEmails})
                    </button>
                    <button
                      onClick={() => setFilterTab('enriched')}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        filterTab === 'enriched'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Enriched ({totalEnriched})
                    </button>
                    <button
                      onClick={() => setFilterTab('pending')}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        filterTab === 'pending'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Uncrawled ({businesses.filter(b => b.enrichmentStatus === 'unsearched').length})
                    </button>
                    <button
                      onClick={() => setFilterTab('favorites')}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-bold ${
                        filterTab === 'favorites'
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'text-amber-800 hover:text-amber-900 hover:bg-amber-100/60'
                      }`}
                      title="View favorite businesses"
                    >
                      <Star className={`w-3.5 h-3.5 ${filterTab === 'favorites' ? 'fill-white text-white' : 'fill-amber-400 text-amber-500'}`} />
                      Favorites ({savedLeads.length})
                    </button>
                  </div>

                  {/* View Mode Switcher */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs">
                    <button
                      onClick={() => setViewMode('split')}
                      className={`p-1.5 rounded-xl transition-colors cursor-pointer ${viewMode === 'split' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Split Map & List View"
                    >
                      <Columns className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-xl transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Full List View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('map')}
                      className={`p-1.5 rounded-xl transition-colors cursor-pointer ${viewMode === 'map' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Full Map View"
                    >
                      <MapIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-toolbar: Search Input & Batch Selector */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <div className="relative w-full">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Filter by name, country, city, executive, or email..."
                        value={listSearchQuery}
                        onChange={(e) => setListSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Select All Checkbox */}
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      {selectedBatchIds.size === businesses.length && businesses.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Select All ({selectedBatchIds.size})</span>
                    </button>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
                      >
                        <option value="default">Default Order</option>
                        <option value="email_found">Direct Email First</option>
                        <option value="rating">Highest Rated</option>
                        <option value="name">Alphabetical</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* List Results */}
              {filteredBusinesses.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                    {businesses.length === 0 ? (
                      <Sparkles className="w-7 h-7 text-amber-500 animate-pulse" />
                    ) : (
                      <Building2 className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {filterTab === 'favorites'
                        ? 'No Favorite Businesses Yet'
                        : businesses.length === 0 
                          ? 'Fresh Workspace — Ready to Search' 
                          : 'No businesses match your filter'}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
                      {filterTab === 'favorites'
                        ? 'Click the "Favorite" star button on any company card in your search results to save it to your Favorites section.'
                        : businesses.length === 0 
                          ? 'Enter any city (e.g. Miami, Berlin, Paris) or postal codes in the search bar above to begin discovering verified businesses and harvesting direct executive email addresses.'
                          : 'Try resetting your search query or switching to the "All" tab.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredBusinesses.map((biz) => (
                    <BusinessCard
                      key={biz.id}
                      business={biz}
                      isSelected={biz.id === selectedBusinessId}
                      isHovered={biz.id === hoveredBusinessId}
                      hoveredBusinessId={hoveredBusinessId}
                      onSelect={(b) => handleFocusBusinessOnMap(b)}
                      onHover={setHoveredBusinessId}
                      onCrawl={handleCrawlBusiness}
                      onViewDetails={(b) => setModalBusiness(b)}
                      isCheckedForBatch={selectedBatchIds.has(biz.id)}
                      onToggleBatchCheck={handleToggleBatchCheck}
                      isSaved={savedLeads.some(l => l.id === biz.id)}
                      isFavorite={savedLeads.some(l => l.id === biz.id)}
                      onToggleSaveLead={handleToggleSaveLead}
                      onToggleSave={handleToggleSaveLead}
                      onToggleFavorite={handleToggleSaveLead}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Non-authenticated Gate Banner */}
      {!currentUser && !isAuthLoading && (
        <div className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md text-white border-t border-slate-700 py-4 px-6 z-40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Authentication Required</h4>
              <p className="text-xs text-slate-300">Sign in to search Google Maps worldwide, crawl verified executive contacts, and access your private saved leads.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In / Create Account</span>
          </button>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          if (currentUser) {
            setIsAuthModalOpen(false);
          }
        }}
        onAuthSuccess={async (user) => {
          const isPaid = await checkUserPaidStatus(user.uid);
          const profile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            photoURL: user.photoURL,
            hasPaidAccess: isPaid,
          };
          setCurrentUser(profile);
          setIsAuthModalOpen(false);
          if (!isPaid) {
            setIsPaywallOpen(true);
          } else {
            setIsPaywallOpen(false);
          }
          loadUserData(user.uid);
        }}
      />

      {/* Stripe Member Access Paywall Modal */}
      <PaywallModal
        isOpen={isPaywallOpen}
        user={currentUser}
        onPaymentSuccess={() => {
          if (currentUser) {
            syncUserSubscriptionToSupabase({
              id: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName,
              status: 'paid',
              amount: stripePlan.unitAmount,
              currency: stripePlan.currency,
            }).catch(() => {});
          }
          setCurrentUser(prev => prev ? { ...prev, hasPaidAccess: true } : null);
          setIsPaywallOpen(false);
          setPaymentSuccessToast('Payment Verified! Full workspace access is unlocked.');
        }}
        onLogout={handleLogout}
        onEraseAccount={handleEraseAccount}
      />

      {/* Account Deletion & Payment Invalidation Confirmation Modal */}
      <ConfirmCancelAccountModal
        isOpen={isConfirmCancelAccountOpen}
        onClose={() => {
          setIsConfirmCancelAccountOpen(false);
          if (!isCancellationCompletedRef.current && currentUser) {
            syncUserSubscriptionToSupabase({
              id: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName,
              status: currentUser.hasPaidAccess ? 'paid' : 'not_paid',
              amount: currentUser.hasPaidAccess ? stripePlan.unitAmount : 0,
              currency: stripePlan.currency,
            }).catch(() => {});
          }
          isCancellationCompletedRef.current = false;
        }}
        onConfirm={handlePerformAccountCancellation}
        onForceWipeAndSignOut={handleForceWipeAndSignOut}
        user={currentUser}
      />

      {/* User's Favorites & Saved Leads Section Modal */}
      <SavedLeadsModal
        isOpen={isSavedLeadsModalOpen}
        onClose={() => setIsSavedLeadsModalOpen(false)}
        savedLeads={savedLeads}
        onRemoveLead={handleRemoveSavedLead}
        onViewDetails={(biz) => setModalBusiness(biz)}
        onInspectLead={(biz) => setModalBusiness(biz)}
        onViewOnMap={(biz) => handleFocusBusinessOnMap(biz)}
        onCrawlLead={handleCrawlBusiness}
      />

      {/* Executive Intelligence Dossier Modal */}
      <ExecutiveModal
        business={modalBusiness}
        onClose={() => setModalBusiness(null)}
        onReCrawl={handleCrawlBusiness}
        isFavorite={modalBusiness ? savedLeads.some(l => l.id === modalBusiness.id) : false}
        onToggleFavorite={(biz) => handleToggleSaveLead(biz)}
        onViewOnMap={(biz) => handleFocusBusinessOnMap(biz)}
      />

      {/* Supabase Cloud Database Management Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        businesses={businesses}
        onLoadBusinesses={(loaded) => {
          setBusinesses(loaded);
          if (loaded.length > 0) {
            setSelectedBusinessId(loaded[0].id);
            setCenter({ lat: loaded[0].latitude, lng: loaded[0].longitude });
            if (loaded[0].country) {
              setCurrentCountry(loaded[0].country);
            }
          }
        }}
        autoSync={autoSyncToSupabase}
        onToggleAutoSync={setAutoSyncToSupabase}
        stripePlan={stripePlan}
      />

      {/* Save & Export Crawled Contacts Modal */}
      <SaveContactsModal
        isOpen={isSaveContactsModalOpen}
        onClose={() => setIsSaveContactsModalOpen(false)}
        businesses={businesses}
        onOpenSupabaseModal={() => {
          setIsSaveContactsModalOpen(false);
          setIsSupabaseModalOpen(true);
        }}
      />
    </div>
  );
}
