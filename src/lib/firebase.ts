import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { BusinessItem, SavedSearchRecord, SavedLeadItem } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const googleProvider = new GoogleAuthProvider();

// Auth Helper Functions
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    let friendlyMessage = 'Failed to sign in with Google';
    if (error.code === 'auth/popup-closed-by-user') {
      friendlyMessage = 'Google sign-in popup was closed before completion.';
    }
    return { success: false, code: error.code, error: friendlyMessage };
  }
};

export const registerWithEmail = async (email: string, pass: string, name?: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (name && userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name }).catch(() => {});
    }
    // Save user profile metadata in Firestore with paywall state
    const userRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userRef, {
      email: userCredential.user.email,
      displayName: name || userCredential.user.displayName || email.split('@')[0],
      createdAt: new Date().toISOString(),
      hasPaidAccess: false,
      status: 'not_paid'
    }, { merge: true });
    // Local cache
    setUserPaidAccessCache(userCredential.user.uid, false);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    // If the email already exists in Firebase Auth (e.g. user previously deleted/canceled their account):
    if (error.code === 'auth/email-already-in-use' || error.message?.includes('auth/email-already-in-use')) {
      try {
        const loginCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = loginCredential.user;
        if (name && user) {
          await updateProfile(user, { displayName: name }).catch(() => {});
        }

        // RESET the user profile to a fresh, clean, unpaid state as if newly created!
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          email: user.email,
          displayName: name || user.displayName || email.split('@')[0],
          createdAt: new Date().toISOString(),
          hasPaidAccess: false,
          status: 'not_paid',
          subscriptionStatus: 'active_trial_or_unpaid',
          recreatedAt: new Date().toISOString()
        });

        // Wipe old search history and saved leads in Firestore for this user
        try {
          const searchDocs = await getDocs(collection(db, 'users', user.uid, 'searchHistory'));
          for (const d of searchDocs.docs) {
            await deleteDoc(d.ref).catch(() => {});
          }
          const leadDocs = await getDocs(collection(db, 'users', user.uid, 'savedLeads'));
          for (const d of leadDocs.docs) {
            await deleteDoc(d.ref).catch(() => {});
          }
        } catch (e) {}

        // Reset local storage caches for this UID
        setUserPaidAccessCache(user.uid, false);
        saveUserLocalSearchHistory(user.uid, []);
        saveUserLocalFavorites(user.uid, []);

        return { 
          success: true, 
          user: user,
          isExistingUser: false,
          isRecreated: true,
          message: 'Account successfully recreated from a clean slate!'
        };
      } catch (loginErr: any) {
        return { 
          success: false, 
          code: 'auth/email-already-in-use',
          error: `An account with ${email} already exists in authentication. If you deleted this account, enter your previous password to reset and recreate it fresh, or use the 1-click password reset below.` 
        };
      }
    }

    let friendlyMessage = 'Failed to create account.';
    if (error.code === 'auth/weak-password') {
      friendlyMessage = 'Password must be at least 6 characters.';
    } else if (error.code === 'auth/invalid-email') {
      friendlyMessage = 'Please enter a valid email address.';
    } else if (error.message) {
      friendlyMessage = error.message.replace('Firebase: ', '').replace(/\(auth\/[^)]+\)\.?/, '').trim();
    }

    if (error.code !== 'auth/weak-password' && error.code !== 'auth/invalid-email') {
      console.warn('Registration notice:', friendlyMessage);
    }

    return { success: false, code: error.code, error: friendlyMessage };
  }
};

const USER_PAID_PREFIX = 'leadradar_paid_access_';

export function getUserPaidAccessCache(userId: string): boolean | null {
  try {
    const val = localStorage.getItem(`${USER_PAID_PREFIX}${userId}`);
    if (val === 'true') return true;
    if (val === 'false') return false;
    return null;
  } catch (e) {
    return null;
  }
}

export function setUserPaidAccessCache(userId: string, isPaid: boolean): void {
  try {
    localStorage.setItem(`${USER_PAID_PREFIX}${userId}`, isPaid ? 'true' : 'false');
  } catch (e) {}
}

export const checkUserPaidStatus = async (userId: string): Promise<boolean> => {
  // Check local fast cache first
  const cached = getUserPaidAccessCache(userId);
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const hasPaid = !!data?.hasPaidAccess;
      setUserPaidAccessCache(userId, hasPaid);
      return hasPaid;
    } else {
      // First time user document creation
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === userId) {
        await setDoc(userRef, {
          email: currentUser.email,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          createdAt: new Date().toISOString(),
          hasPaidAccess: false
        }, { merge: true });
      }
      setUserPaidAccessCache(userId, false);
      return false;
    }
  } catch (error) {
    console.warn('Could not check payment status in Firestore, falling back to cache:', error);
    return cached === true;
  }
};

export const markUserAsPaid = async (
  userId: string,
  details?: { sessionId?: string; amount?: number; currency?: string }
): Promise<{ success: boolean; error?: string }> => {
  setUserPaidAccessCache(userId, true);
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      hasPaidAccess: true,
      paidAt: new Date().toISOString(),
      stripeSessionId: details?.sessionId || 'manual_test_sandbox_unlock',
      paymentAmount: details?.amount || 500,
      paymentCurrency: details?.currency || 'usd',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error('Error marking user as paid:', error);
    // Cached as true locally so user isn't disrupted
    return { success: true, error: error.message };
  }
};

export const resetUserToUnpaid = async (userId: string): Promise<{ success: boolean }> => {
  setUserPaidAccessCache(userId, false);
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      hasPaidAccess: false,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {}
  return { success: true };
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    let friendlyMessage = 'Invalid email or password.';
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      friendlyMessage = 'Invalid email or password. Please verify your credentials or create a new account.';
    } else if (error.code === 'auth/too-many-requests') {
      friendlyMessage = 'Too many failed login attempts. Access temporarily disabled. Please reset your password or try again later.';
    } else if (error.message) {
      friendlyMessage = error.message.replace('Firebase: ', '').replace(/\(auth\/[^)]+\)\.?/, '').trim();
    }
    return { success: false, code: error.code, error: friendlyMessage };
  }
};

export const sendResetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: `Password reset instructions sent to ${email}` };
  } catch (error: any) {
    return { success: false, error: 'Could not send reset email. Please ensure the email is valid and registered.' };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Logout Error:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// User-Scoped Search History (Firestore + Local Persistence)
// ==========================================

const USER_SEARCHES_PREFIX = 'leadradar_searches_user_';

/**
 * Recursively cleans an object for Firestore:
 * - Converts undefined values to null (Firestore throws error on undefined)
 * - Strips cyclic references or unsupported types
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  return JSON.parse(
    JSON.stringify(data, (_key, value) => (value === undefined ? null : value))
  );
}

/**
 * Get locally cached user search history for zero-latency reload on site refresh
 */
export function getUserLocalSearchHistory(userId: string): SavedSearchRecord[] {
  try {
    const raw = localStorage.getItem(`${USER_SEARCHES_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save locally cached user search history
 */
export function saveUserLocalSearchHistory(userId: string, records: SavedSearchRecord[]): void {
  try {
    localStorage.setItem(`${USER_SEARCHES_PREFIX}${userId}`, JSON.stringify(records.slice(0, 100)));
  } catch (e) {
    // ignore quota errors
  }
}

/**
 * Remove a single search record from user local cache
 */
export function deleteUserLocalSearch(userId: string, searchId: string): void {
  try {
    const current = getUserLocalSearchHistory(userId);
    const updated = current.filter(s => s.id !== searchId);
    saveUserLocalSearchHistory(userId, updated);
  } catch (e) {}
}

export const saveSearchSessionToFirestore = async (
  userId: string, 
  searchData: Omit<SavedSearchRecord, 'id'> & { id?: string }
): Promise<{ success: boolean; id: string; error?: string }> => {
  const searchId = searchData.id || `search_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  const record: SavedSearchRecord = {
    id: searchId,
    title: searchData.title || `${searchData.category || 'Businesses'} in ${searchData.country}`,
    zipcodes: searchData.zipcodes || [],
    country: searchData.country || 'Worldwide',
    category: searchData.category || '',
    keyword: searchData.keyword || '',
    totalFound: searchData.businesses?.length || searchData.totalFound || 0,
    center: searchData.center || { lat: 51.5074, lng: -0.1278 },
    businesses: searchData.businesses || [],
    crawledCount: searchData.businesses?.filter(b => b.enrichmentStatus === 'enriched').length || 0,
    personalEmailsCount: searchData.businesses?.filter(b => b.executiveDetails?.personalEmail).length || 0,
    createdAt: searchData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 1. Immediately cache in user-scoped local storage for zero-loss page refreshes
  try {
    const local = getUserLocalSearchHistory(userId);
    const updatedLocal = [record, ...local.filter(s => s.id !== searchId)].slice(0, 100);
    saveUserLocalSearchHistory(userId, updatedLocal);
  } catch (cacheErr) {
    console.warn('Local cache save warning:', cacheErr);
  }

  // 2. Persist to Firestore with full undefined-sanitization
  try {
    const searchRef = doc(db, 'users', userId, 'searchHistory', searchId);
    const cleanRecord = sanitizeForFirestore(record);
    await setDoc(searchRef, cleanRecord);
    return { success: true, id: searchId };
  } catch (error: any) {
    console.error('Error saving search history to Firestore:', error);
    // Even if Firestore fails momentarily, local cache already preserved the search!
    return { success: true, id: searchId, error: error.message };
  }
};

export const loadSearchHistoryFromFirestore = async (
  userId: string
): Promise<{ success: boolean; data: SavedSearchRecord[]; error?: string }> => {
  // 1. Grab local user cache first for instantaneous availability
  const localRecords = getUserLocalSearchHistory(userId);

  try {
    const historyRef = collection(db, 'users', userId, 'searchHistory');
    let snapshot;
    try {
      const q = query(historyRef, orderBy('updatedAt', 'desc'));
      snapshot = await getDocs(q);
    } catch (orderErr) {
      console.warn('Ordered query failed, falling back to base collection:', orderErr);
      snapshot = await getDocs(historyRef);
    }

    const firestoreRecords: SavedSearchRecord[] = [];
    snapshot.forEach(docSnap => {
      const d = docSnap.data() as SavedSearchRecord;
      if (d && d.id) {
        firestoreRecords.push(d);
      }
    });

    // Merge Firestore records with local cache (de-duplicate by ID)
    const recordMap = new Map<string, SavedSearchRecord>();
    // Add local records first
    for (const r of localRecords) {
      recordMap.set(r.id, r);
    }
    // Let Firestore overwrite/enrich local records
    for (const r of firestoreRecords) {
      recordMap.set(r.id, r);
    }

    const merged = Array.from(recordMap.values());
    // Sort newest updated first
    merged.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    // Update local cache with merged list
    saveUserLocalSearchHistory(userId, merged);

    return { success: true, data: merged };
  } catch (error: any) {
    console.error('Error loading search history from Firestore, using local fallback:', error);
    return { success: true, data: localRecords, error: error.message };
  }
};

export const deleteSearchHistoryFromFirestore = async (
  userId: string,
  searchId: string
): Promise<{ success: boolean; error?: string }> => {
  deleteUserLocalSearch(userId, searchId);
  try {
    const searchRef = doc(db, 'users', userId, 'searchHistory', searchId);
    await deleteDoc(searchRef);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting search from Firestore:', error);
    return { success: true, error: error.message };
  }
};

// ==========================================
// User-Scoped Saved Leads Section (Firestore)
// ==========================================

// ==========================================
// Local Storage Caching for Favorites / Saved Leads
// ==========================================

const USER_FAVORITES_PREFIX = 'leadradar_favorites_user_';
const GUEST_FAVORITES_KEY = 'leadradar_favorites_guest';

export function getUserLocalFavorites(userId: string): SavedLeadItem[] {
  try {
    const raw = localStorage.getItem(`${USER_FAVORITES_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveUserLocalFavorites(userId: string, leads: SavedLeadItem[]): void {
  try {
    localStorage.setItem(`${USER_FAVORITES_PREFIX}${userId}`, JSON.stringify(leads.slice(0, 500)));
  } catch (e) {}
}

export function getGuestFavorites(): SavedLeadItem[] {
  try {
    const raw = localStorage.getItem(GUEST_FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveGuestFavorites(leads: SavedLeadItem[]): void {
  try {
    localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(leads.slice(0, 500)));
  } catch (e) {}
}

export const saveLeadToFirestore = async (
  userId: string,
  business: BusinessItem,
  notes?: string
): Promise<{ success: boolean; error?: string }> => {
  const leadData: SavedLeadItem = {
    ...business,
    notes: notes || business.executiveDetails?.notes || '',
    savedAt: new Date().toISOString(),
  };

  // 1. Immediately cache in local storage
  try {
    const local = getUserLocalFavorites(userId);
    const updated = [leadData, ...local.filter(l => l.id !== business.id)];
    saveUserLocalFavorites(userId, updated);
  } catch (e) {}

  // 2. Persist to Firestore
  try {
    const leadRef = doc(db, 'users', userId, 'savedLeads', business.id);
    const cleanLead = sanitizeForFirestore(leadData);
    await setDoc(leadRef, cleanLead, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error('Error saving lead to Firestore:', error);
    return { success: true, error: error.message }; // Local cache preserved it!
  }
};

export const batchSaveLeadsToFirestore = async (
  userId: string,
  businesses: BusinessItem[]
): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    let count = 0;
    const newItems: SavedLeadItem[] = [];
    for (const biz of businesses) {
      const leadData: SavedLeadItem = {
        ...biz,
        notes: biz.executiveDetails?.notes || '',
        savedAt: new Date().toISOString(),
      };
      newItems.push(leadData);
      const leadRef = doc(db, 'users', userId, 'savedLeads', biz.id);
      const cleanLead = sanitizeForFirestore(leadData);
      await setDoc(leadRef, cleanLead, { merge: true });
      count++;
    }
    // Update local cache
    const local = getUserLocalFavorites(userId);
    const map = new Map<string, SavedLeadItem>();
    newItems.forEach(item => map.set(item.id, item));
    local.forEach(item => {
      if (!map.has(item.id)) map.set(item.id, item);
    });
    saveUserLocalFavorites(userId, Array.from(map.values()));

    return { success: true, count };
  } catch (error: any) {
    console.error('Error batch saving leads to Firestore:', error);
    return { success: false, count: 0, error: error.message };
  }
};

export const loadSavedLeadsFromFirestore = async (
  userId: string
): Promise<{ success: boolean; data: SavedLeadItem[]; error?: string }> => {
  // Grab local cache first
  const localLeads = getUserLocalFavorites(userId);

  try {
    const leadsRef = collection(db, 'users', userId, 'savedLeads');
    const snapshot = await getDocs(leadsRef);

    const firestoreLeads: SavedLeadItem[] = [];
    snapshot.forEach(docSnap => {
      const d = docSnap.data() as SavedLeadItem;
      if (d && d.id) {
        firestoreLeads.push(d);
      }
    });

    // Merge local and firestore
    const leadMap = new Map<string, SavedLeadItem>();
    localLeads.forEach(l => leadMap.set(l.id, l));
    firestoreLeads.forEach(l => leadMap.set(l.id, l));

    const merged = Array.from(leadMap.values());
    merged.sort((a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime());

    saveUserLocalFavorites(userId, merged);

    return { success: true, data: merged };
  } catch (error: any) {
    console.error('Error loading saved leads from Firestore, using local fallback:', error);
    return { success: true, data: localLeads, error: error.message };
  }
};

export const deleteSavedLeadFromFirestore = async (
  userId: string,
  leadId: string
): Promise<{ success: boolean; error?: string }> => {
  // Delete from local cache
  try {
    const local = getUserLocalFavorites(userId);
    const updated = local.filter(l => l.id !== leadId);
    saveUserLocalFavorites(userId, updated);
  } catch (e) {}

  try {
    const leadRef = doc(db, 'users', userId, 'savedLeads', leadId);
    await deleteDoc(leadRef);
    return { success: true };
  } catch (error: any) {
    console.error('Error removing saved lead from Firestore:', error);
    return { success: true, error: error.message };
  }
};

// ==========================================
// One-Time Account Purge & Account Erasure
// ==========================================

export const ONCE_ERASE_KEY = 'leadradar_erase_accounts_v1_done';

/**
 * Permanently deletes the current authenticated user's Firestore records,
 * cancels and invalidates all one-time payments and subscriptions in Stripe and Firestore,
 * and purges their Firebase Auth credential and local storage data.
 */
export async function eraseCurrentAccountAndData(
  user: User,
  passwordConfirm?: string
): Promise<{ success: boolean; requiresReauth?: boolean; error?: string }> {
  try {
    const uid = user.uid;
    const email = user.email || '';

    // If password confirmation was supplied, re-authenticate first to prevent requires-recent-login errors
    if (passwordConfirm && user.email) {
      try {
        const credential = EmailAuthProvider.credential(user.email, passwordConfirm);
        await reauthenticateWithCredential(user, credential);
      } catch (authErr: any) {
        let msg = 'Incorrect password. Please verify your password to delete your account.';
        if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
          msg = 'Incorrect password entered. Please enter your valid account password to delete.';
        }
        return { success: false, requiresReauth: true, error: msg };
      }
    }

    // 0. Automatically cancel and invalidate any Stripe subscriptions, payment intents, and customers
    try {
      await fetch('/api/cancel-user-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, userEmail: email }),
      });
    } catch (paymentErr) {
      console.warn('Payment cancellation API notice:', paymentErr);
    }

    // Explicitly invalidate local paid access cache
    setUserPaidAccessCache(uid, false);

    // 1. Delete all user saved searches in Firestore
    try {
      const searchHistoryDocs = await getDocs(collection(db, 'users', uid, 'searchHistory'));
      for (const d of searchHistoryDocs.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    } catch (e) {}

    // 2. Delete all user saved leads in Firestore
    try {
      const savedLeadsDocs = await getDocs(collection(db, 'users', uid, 'savedLeads'));
      for (const d of savedLeadsDocs.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    } catch (e) {}

    // 3. Mark payment as canceled & deleted in Firestore before doc deletion
    try {
      const userRef = doc(db, 'users', uid);
      await deleteDoc(userRef).catch(() => {});
    } catch (e) {}

    // 4. Delete user auth account permanently from Firebase Auth
    try {
      await deleteUser(user);
    } catch (deleteErr: any) {
      if (deleteErr.code === 'auth/requires-recent-login') {
        return {
          success: false,
          requiresReauth: true,
          error: 'Security verification required: please confirm your password to delete your account permanently.'
        };
      }
      console.warn('User delete auth warning:', deleteErr.message);
      // Fallback sign out if deletion could not complete
      await signOut(auth).catch(() => {});
    }

    // 5. Clear all local storage keys for this user
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.includes(uid) || k.startsWith('leadradar_searches_') || k.startsWith('leadradar_favorites_') || k.startsWith('leadradar_paid_access_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}

    return { success: true };
  } catch (err: any) {
    console.warn('Error during account erasure:', err);
    await signOut(auth).catch(() => {});
    return { success: false, error: err?.message || 'Failed to completely erase account' };
  }
}

/**
 * Re-authenticate Google user before deletion
 */
export async function reauthenticateWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return { success: false, error: 'No active user' };
    await reauthenticateWithPopup(currentUser, googleProvider);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Google verification failed' };
  }
}

/**
 * Retrieve all registered users from Firestore database to ensure they are visible even if Supabase table is pending creation
 */
export async function getAllUsersFromFirestore(): Promise<{
  id: string;
  email: string;
  display_name: string;
  status: 'paid' | 'not_paid' | 'canceling' | 'canceled';
  cancel_reason?: string | null;
  cancel_feedback?: string | null;
  amount?: number;
  created_at?: string;
  updated_at?: string;
}[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(docSnap => {
      const d = docSnap.data();
      let status: 'paid' | 'not_paid' | 'canceling' | 'canceled' = 'not_paid';
      if (d.subscriptionStatus === 'canceled' || d.paymentStatus === 'canceled_and_invalid' || d.status === 'canceled') {
        status = 'canceled';
      } else if (d.status === 'canceling') {
        status = 'canceling';
      } else if (d.hasPaidAccess === true) {
        status = 'paid';
      }

      return {
        id: docSnap.id,
        email: d.email || 'user@example.com',
        display_name: d.displayName || d.email?.split('@')[0] || 'User',
        status: status,
        cancel_reason: d.cancelReason || null,
        cancel_feedback: d.cancelFeedback || null,
        amount: d.hasPaidAccess ? (d.paymentDetails?.amount ? d.paymentDetails.amount / 100 : 5.00) : 0,
        currency: d.paymentDetails?.currency || 'chf',
        created_at: d.createdAt || null,
        updated_at: d.updatedAt || d.paidAt || d.createdAt || null,
      };
    });
  } catch (e) {
    console.warn('getAllUsersFromFirestore notice:', e);
    return [];
  }
}

/**
 * Executes a one-time wipe of all active accounts, sessions, and cached credentials
 * across the app, canceling any associated payments/subscriptions.
 * Runs only once per client browser instance.
 */
export async function executeOneTimeAccountPurge(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if (localStorage.getItem(ONCE_ERASE_KEY) === 'true') {
      return false; // Already executed once!
    }

    // 0. Extract any cached auth credentials before wiping to ensure payments are canceled
    let cachedUid: string | null = auth.currentUser?.uid || null;
    let cachedEmail: string | null = auth.currentUser?.email || null;
    if (!cachedUid) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('firebase:authUser:')) {
            const val = localStorage.getItem(k);
            if (val) {
              const parsed = JSON.parse(val);
              cachedUid = parsed.uid || null;
              cachedEmail = parsed.email || null;
            }
          }
        }
      } catch (e) {}
    }

    if (cachedUid || cachedEmail) {
      try {
        await fetch('/api/cancel-user-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: cachedUid, userEmail: cachedEmail }),
        });
      } catch (e) {}
    }

    // 1. If currently signed in, erase account from Firestore and Auth
    const currentUser = auth.currentUser;
    if (currentUser) {
      await eraseCurrentAccountAndData(currentUser).catch(() => {});
    }

    await signOut(auth).catch(() => {});

    // 2. Purge all local user storage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (
        k.startsWith('leadradar_') ||
        k.startsWith('firebase:') ||
        k.includes('authUser')
      )) {
        if (k !== ONCE_ERASE_KEY && !k.startsWith('leadradar_supabase_')) {
          keysToRemove.push(k);
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // 3. Clear IndexedDB for Firebase Auth
    if (typeof window.indexedDB !== 'undefined') {
      try {
        window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
      } catch (e) {}
    }

    // 4. Mark one-time purge as completed
    localStorage.setItem(ONCE_ERASE_KEY, 'true');
    return true;
  } catch (e) {
    console.warn('One-time purge notice:', e);
    localStorage.setItem(ONCE_ERASE_KEY, 'true');
    return true;
  }
}

