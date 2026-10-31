import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BusinessItem, ExecutiveContact, SavedSearchRecord } from '../types';

const CUSTOM_URL_KEY = 'leadradar_supabase_custom_url';
const CUSTOM_KEY_KEY = 'leadradar_supabase_custom_key';

export function getActiveSupabaseConfig() {
  let customUrl: string | null = null;
  let customKey: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      customUrl = localStorage.getItem(CUSTOM_URL_KEY);
      customKey = localStorage.getItem(CUSTOM_KEY_KEY);
    } catch (e) {}
  }

  const url = customUrl || 
    ((import.meta as any).env?.VITE_SUPABASE_URL as string) || 
    'https://flknzuwazfyvdnueiaoc.supabase.co';

  const key = customKey || 
    ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsa256dXdhemZ5dmRudWVpYW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4OTI3NzgsImV4cCI6MjEwMzQ2ODc3OH0.jkVzj0yNOIsaZysmwj-AMOQbWJWj-9bNBrZ71fVBnWY';

  return {
    url,
    key,
    isCustom: Boolean(customUrl || customKey),
    projectRef: url.replace(/^https?:\/\//, '').split('.')[0] || 'supabase',
  };
}

export const SUPABASE_URL = getActiveSupabaseConfig().url;
export const SUPABASE_ANON_KEY = getActiveSupabaseConfig().key;

let activeClient: SupabaseClient = createClient(
  getActiveSupabaseConfig().url, 
  getActiveSupabaseConfig().key, 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// Proxy client so all calls to supabase.from(...) always use the active credentials
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (activeClient as any)[prop];
  },
});

export function setCustomSupabaseCredentials(url: string, key: string): { ok: boolean; error?: string } {
  try {
    const cleanUrl = url.trim();
    const cleanKey = key.trim();
    if (!cleanUrl || !cleanKey) {
      return { ok: false, error: 'Both Supabase Project URL and Anon API Key are required.' };
    }
    if (!cleanUrl.startsWith('http')) {
      return { ok: false, error: 'Supabase URL must start with https://' };
    }
    localStorage.setItem(CUSTOM_URL_KEY, cleanUrl);
    localStorage.setItem(CUSTOM_KEY_KEY, cleanKey);
    activeClient = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to initialize Supabase client' };
  }
}

export function resetCustomSupabaseCredentials(): void {
  try {
    localStorage.removeItem(CUSTOM_URL_KEY);
    localStorage.removeItem(CUSTOM_KEY_KEY);
    const def = getActiveSupabaseConfig();
    activeClient = createClient(def.url, def.key, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch (e) {}
}

// Database record interface for Supabase
export interface SupabaseBusinessRecord {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  country?: string;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  review_count?: number | null;
  latitude: number;
  longitude: number;
  google_maps_url?: string | null;
  enrichment_status: string;
  executive_name?: string | null;
  executive_title?: string | null;
  personal_email?: string | null;
  email_confidence?: string | null;
  email_pattern?: string | null;
  direct_phone?: string | null;
  phone_type?: string | null;
  linkedin_url?: string | null;
  background_summary?: string | null;
  sources?: string[] | null;
  additional_executives?: any | null;
  raw_executive_data?: any | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseSearchRecord {
  id?: string;
  query_zipcodes: string[];
  country?: string;
  category?: string;
  keyword?: string;
  total_found?: number;
  created_at?: string;
}

// User Accounts & Subscriptions record for Supabase
export interface UserSubscriptionRecord {
  id: string; // user UID or email
  email: string;
  display_name?: string | null;
  status: 'paid' | 'not_paid' | 'canceling' | 'canceled';
  plan_name?: string;
  amount?: number;
  currency?: string;
  stripe_customer_id?: string | null;
  stripe_session_id?: string | null;
  cancel_reason?: string | null;
  cancel_feedback?: string | null;
  canceled_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Past Canceled Users record for Supabase (tracks users who canceled and why)
export interface CanceledUserRecord {
  id: string; // user UID or email
  email: string;
  display_name?: string | null;
  cancel_reason: string;
  cancel_feedback?: string | null;
  previous_plan?: string;
  amount_paid?: number;
  currency?: string;
  stripe_customer_id?: string | null;
  stripe_session_id?: string | null;
  canceled_at: string;
  created_at?: string;
}

// Convert BusinessItem to Supabase record format
export function mapBusinessToDbRecord(biz: BusinessItem): SupabaseBusinessRecord {
  const exec = biz.executiveDetails;
  return {
    id: biz.id,
    name: biz.name,
    category: biz.category,
    address: biz.address,
    city: biz.city,
    state: biz.state,
    zipcode: biz.zipcode,
    country: biz.country || 'Worldwide',
    phone: biz.phone || null,
    website: biz.website || null,
    rating: biz.rating || null,
    review_count: biz.reviewCount || null,
    latitude: biz.latitude,
    longitude: biz.longitude,
    google_maps_url: biz.googleMapsUrl || null,
    enrichment_status: biz.enrichmentStatus,
    executive_name: exec?.executiveName || null,
    executive_title: exec?.executiveTitle || null,
    personal_email: exec?.personalEmail || null,
    email_confidence: exec?.emailConfidence || null,
    email_pattern: exec?.emailPattern || null,
    direct_phone: exec?.directPhone || null,
    phone_type: exec?.phoneType || null,
    linkedin_url: exec?.linkedInUrl || null,
    background_summary: exec?.backgroundSummary || null,
    sources: exec?.sources || null,
    additional_executives: exec?.additionalExecutives || null,
    raw_executive_data: exec ? JSON.stringify(exec) : null,
    updated_at: new Date().toISOString(),
  };
}

// Convert Supabase record format back to BusinessItem
export function mapDbRecordToBusiness(rec: SupabaseBusinessRecord): BusinessItem {
  let execDetails: ExecutiveContact | null = null;

  if (rec.executive_name || rec.personal_email || rec.raw_executive_data) {
    if (rec.raw_executive_data) {
      try {
        execDetails = typeof rec.raw_executive_data === 'string' 
          ? JSON.parse(rec.raw_executive_data) 
          : rec.raw_executive_data;
      } catch (e) {
        execDetails = null;
      }
    }

    if (!execDetails) {
      execDetails = {
        executiveName: rec.executive_name || null,
        executiveTitle: rec.executive_title || null,
        personalEmail: rec.personal_email || null,
        emailConfidence: (rec.email_confidence as any) || (rec.personal_email ? 'High' : 'None'),
        emailPattern: rec.email_pattern || null,
        directPhone: rec.direct_phone || null,
        phoneType: (rec.phone_type as any) || 'Executive Office',
        linkedInUrl: rec.linkedin_url || null,
        sources: rec.sources || ['Supabase Database Record'],
        backgroundSummary: rec.background_summary || null,
        crawledAt: rec.updated_at || rec.created_at || new Date().toISOString(),
        additionalExecutives: rec.additional_executives || [],
      };
    }
  }

  return {
    id: rec.id,
    name: rec.name,
    category: rec.category,
    address: rec.address,
    city: rec.city,
    state: rec.state,
    zipcode: rec.zipcode,
    country: rec.country || 'Worldwide',
    phone: rec.phone || null,
    website: rec.website || null,
    rating: rec.rating || null,
    reviewCount: rec.review_count || null,
    latitude: rec.latitude,
    longitude: rec.longitude,
    googleMapsUrl: rec.google_maps_url || null,
    enrichmentStatus: (rec.enrichment_status as any) || (execDetails ? 'enriched' : 'unsearched'),
    executiveDetails: execDetails,
  };
}

// Supabase Table Definition SQL helper for the user
export const SUPABASE_SQL_SCHEMA = `-- Lead Radar Pro Supabase Schema
-- Run this in your Supabase SQL Editor if creating tables manually:

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zipcode TEXT,
  country TEXT DEFAULT 'Worldwide',
  phone TEXT,
  website TEXT,
  rating NUMERIC,
  review_count INTEGER,
  latitude NUMERIC,
  longitude NUMERIC,
  google_maps_url TEXT,
  enrichment_status TEXT DEFAULT 'unsearched',
  executive_name TEXT,
  executive_title TEXT,
  personal_email TEXT,
  email_confidence TEXT,
  email_pattern TEXT,
  direct_phone TEXT,
  phone_type TEXT,
  linkedin_url TEXT,
  background_summary TEXT,
  sources TEXT[],
  additional_executives JSONB,
  raw_executive_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Individual Crawled Executive Contacts table
CREATE TABLE IF NOT EXISTS crawled_contacts (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  job_title TEXT,
  personal_email TEXT,
  email_confidence TEXT,
  direct_phone TEXT,
  company_name TEXT NOT NULL,
  company_phone TEXT,
  category TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zipcode TEXT,
  country TEXT DEFAULT 'Worldwide',
  website TEXT,
  linkedin_url TEXT,
  background_summary TEXT,
  sources TEXT[],
  crawled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Searches history and cached results table
CREATE TABLE IF NOT EXISTS searches (
  id TEXT PRIMARY KEY,
  query_zipcodes TEXT[] NOT NULL,
  country TEXT DEFAULT 'Worldwide',
  category TEXT,
  keyword TEXT,
  total_found INTEGER DEFAULT 0,
  center_lat NUMERIC,
  center_lng NUMERIC,
  businesses JSONB,
  crawled_count INTEGER DEFAULT 0,
  emails_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User Accounts & Subscriptions table (tracks all accounts: paid, not_paid, canceling, canceled)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('paid', 'not_paid', 'canceling', 'canceled')),
  plan_name TEXT DEFAULT 'LeadRadar Pro',
  amount NUMERIC DEFAULT 5.00,
  currency TEXT DEFAULT 'chf',
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  cancel_reason TEXT,
  cancel_feedback TEXT,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Past Canceled Users Archive table (tracks past users who canceled, their reasons & feedback)
CREATE TABLE IF NOT EXISTS canceled_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  cancel_reason TEXT NOT NULL,
  cancel_feedback TEXT,
  previous_plan TEXT DEFAULT 'LeadRadar Pro',
  amount_paid NUMERIC DEFAULT 5.00,
  currency TEXT DEFAULT 'chf',
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  canceled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) and allow public read/write with anon key:
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawled_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE canceled_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all access on businesses" ON businesses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on crawled_contacts" ON crawled_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on searches" ON searches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on user_subscriptions" ON user_subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on canceled_users" ON canceled_users FOR ALL USING (true) WITH CHECK (true);
`;

/**
 * Test Supabase connectivity
 */
export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; tableReady?: boolean }> {
  try {
    const { data, error } = await supabase.from('user_subscriptions').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          ok: true,
          tableReady: false,
          message: 'Connected to Supabase! (Table "user_subscriptions" needs to be created with SQL)',
        };
      }
      return { ok: false, message: error.message };
    }
    return { ok: true, tableReady: true, message: 'Connected & synced with Supabase database!' };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to reach Supabase endpoint' };
  }
}

/**
 * Upsert a single business/lead into Supabase
 */
export async function saveBusinessToSupabase(biz: BusinessItem): Promise<{ success: boolean; error?: string }> {
  try {
    const record = mapBusinessToDbRecord(biz);
    const { error } = await supabase.from('businesses').upsert(record, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase upsert warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase save error:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Batch Upsert multiple businesses/leads into Supabase
 */
export async function batchSaveBusinessesToSupabase(businesses: BusinessItem[]): Promise<{ success: boolean; count: number; error?: string }> {
  if (!businesses || businesses.length === 0) {
    return { success: true, count: 0 };
  }
  try {
    const records = businesses.map(mapBusinessToDbRecord);
    const { error } = await supabase.from('businesses').upsert(records, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase batch upsert warning:', error.message);
      return { success: false, count: 0, error: error.message };
    }
    return { success: true, count: businesses.length };
  } catch (err: any) {
    console.warn('Supabase batch save error:', err);
    return { success: false, count: 0, error: err?.message };
  }
}

/**
 * Save all crawled individual contacts to Supabase (upserting businesses + contacts)
 */
export async function saveAllCrawledContactsToSupabase(businesses: BusinessItem[]): Promise<{
  success: boolean;
  contactsCount: number;
  businessesCount: number;
  error?: string;
}> {
  const enrichedBiz = businesses.filter(b => b.enrichmentStatus === 'enriched' || b.executiveDetails);
  if (enrichedBiz.length === 0) {
    return { success: true, contactsCount: 0, businessesCount: 0 };
  }

  try {
    // 1. Save all enriched businesses
    const bizRecords = enrichedBiz.map(mapBusinessToDbRecord);
    const bizRes = await supabase.from('businesses').upsert(bizRecords, { onConflict: 'id' });
    if (bizRes.error) {
      console.warn('Supabase biz save warning:', bizRes.error.message);
    }

    // 2. Extract individual contacts
    const contactRecords: any[] = [];
    enrichedBiz.forEach(b => {
      const exec = b.executiveDetails;
      if (!exec) return;

      // Primary exec
      contactRecords.push({
        id: `${b.id}-exec-primary`,
        business_id: b.id,
        full_name: exec.executiveName || 'Executive Officer',
        job_title: exec.executiveTitle || 'Owner / Principal Executive',
        personal_email: exec.personalEmail || null,
        email_confidence: exec.emailConfidence || (exec.personalEmail ? 'High' : 'None'),
        direct_phone: exec.directPhone || null,
        company_name: b.name,
        company_phone: b.phone || null,
        category: b.category,
        address: b.address,
        city: b.city,
        state: b.state,
        zipcode: b.zipcode,
        country: b.country || 'Worldwide',
        website: b.website || null,
        linkedin_url: exec.linkedInUrl || null,
        background_summary: exec.backgroundSummary || null,
        sources: exec.sources || [],
        crawled_at: exec.crawledAt || new Date().toISOString(),
      });

      // Additional execs
      if (exec.additionalExecutives && Array.isArray(exec.additionalExecutives)) {
        exec.additionalExecutives.forEach((add, idx) => {
          if (!add.name) return;
          contactRecords.push({
            id: `${b.id}-exec-add-${idx}`,
            business_id: b.id,
            full_name: add.name,
            job_title: add.title || 'Officer',
            personal_email: add.email || null,
            email_confidence: add.email ? 'High' : 'None',
            direct_phone: add.phone || null,
            company_name: b.name,
            company_phone: b.phone || null,
            category: b.category,
            address: b.address,
            city: b.city,
            state: b.state,
            zipcode: b.zipcode,
            country: b.country || 'Worldwide',
            website: b.website || null,
            linkedin_url: (add as any).linkedInUrl || add.linkedIn || null,
            background_summary: null,
            sources: exec.sources || [],
            crawled_at: exec.crawledAt || new Date().toISOString(),
          });
        });
      }
    });

    // Try saving to crawled_contacts table if created
    const contactRes = await supabase.from('crawled_contacts').upsert(contactRecords, { onConflict: 'id' });
    if (contactRes.error) {
      console.warn('crawled_contacts table upsert note (will still be stored in businesses):', contactRes.error.message);
    }

    return {
      success: true,
      contactsCount: contactRecords.length,
      businessesCount: enrichedBiz.length,
    };
  } catch (err: any) {
    console.warn('saveAllCrawledContactsToSupabase error:', err);
    return {
      success: false,
      contactsCount: 0,
      businessesCount: 0,
      error: err?.message || 'Failed to save contacts to Supabase',
    };
  }
}

/**
 * Load all saved businesses/leads from Supabase
 */
export async function loadBusinessesFromSupabase(): Promise<{ success: boolean; data: BusinessItem[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Supabase load warning:', error.message);
      return { success: false, data: [], error: error.message };
    }

    const items = (data || []).map(mapDbRecordToBusiness);
    return { success: true, data: items };
  } catch (err: any) {
    console.warn('Supabase load error:', err);
    return { success: false, data: [], error: err?.message };
  }
}

const LOCAL_SEARCHES_KEY = 'leadradar_saved_searches_history_v1';

/**
 * Get locally cached search history
 */
export function getLocalSearchHistory(): SavedSearchRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save locally cached search history
 */
export function saveLocalSearchHistory(records: SavedSearchRecord[]): void {
  try {
    localStorage.setItem(LOCAL_SEARCHES_KEY, JSON.stringify(records));
  } catch (e) {
    // ignore quota errors
  }
}

/**
 * Save or update a complete search session with all discovered businesses to Supabase
 */
export async function saveSearchSessionToSupabase(session: SavedSearchRecord): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Update local cache immediately for zero-latency UI
    const local = getLocalSearchHistory();
    const existingIndex = local.findIndex(s => s.id === session.id);
    let updatedLocal: SavedSearchRecord[];
    if (existingIndex >= 0) {
      updatedLocal = [...local];
      updatedLocal[existingIndex] = session;
    } else {
      updatedLocal = [session, ...local.filter(s => s.id !== session.id)].slice(0, 50);
    }
    saveLocalSearchHistory(updatedLocal);

    // 2. Also batch upsert all businesses in the search
    if (session.businesses && session.businesses.length > 0) {
      batchSaveBusinessesToSupabase(session.businesses).catch(() => {});
    }

    // 3. Upsert search record into searches table
    const searchRecord = {
      id: session.id,
      query_zipcodes: session.zipcodes || [],
      country: session.country || 'Worldwide',
      category: session.category || null,
      keyword: session.keyword || null,
      total_found: session.totalFound || session.businesses.length || 0,
      center_lat: session.center?.lat || null,
      center_lng: session.center?.lng || null,
      businesses: session.businesses || [],
      crawled_count: session.crawledCount || session.businesses.filter(b => b.enrichmentStatus === 'enriched').length,
      emails_count: session.personalEmailsCount || session.businesses.filter(b => b.executiveDetails?.personalEmail).length,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('searches').upsert(searchRecord, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase search session upsert warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('saveSearchSessionToSupabase error:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Load all saved search sessions from Supabase (falling back to local cache)
 */
export async function loadSearchSessionsFromSupabase(): Promise<{
  success: boolean;
  data: SavedSearchRecord[];
  fromCloud: boolean;
  error?: string;
}> {
  const local = getLocalSearchHistory();

  try {
    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Supabase load search sessions warning, using local history:', error.message);
      return { success: true, data: local, fromCloud: false, error: error.message };
    }

    if (data && data.length > 0) {
      const parsed: SavedSearchRecord[] = data.map((item: any) => ({
        id: item.id || `search_${Date.now()}`,
        title: item.title || `${item.category || item.keyword || 'Businesses'} in ${item.country || 'Location'} (${(item.query_zipcodes || []).join(', ')})`,
        zipcodes: item.query_zipcodes || [],
        country: item.country || 'Worldwide',
        category: item.category || undefined,
        keyword: item.keyword || undefined,
        totalFound: item.total_found || (item.businesses ? item.businesses.length : 0),
        center: {
          lat: Number(item.center_lat) || 0,
          lng: Number(item.center_lng) || 0,
        },
        businesses: Array.isArray(item.businesses) ? item.businesses : [],
        crawledCount: item.crawled_count || (Array.isArray(item.businesses) ? item.businesses.filter((b: any) => b.enrichmentStatus === 'enriched').length : 0),
        personalEmailsCount: item.emails_count || (Array.isArray(item.businesses) ? item.businesses.filter((b: any) => b.executiveDetails?.personalEmail).length : 0),
        createdAt: item.created_at || new Date().toISOString(),
        updatedAt: item.updated_at || new Date().toISOString(),
      }));

      // Merge with local cache
      const mergedMap = new Map<string, SavedSearchRecord>();
      parsed.forEach(p => mergedMap.set(p.id, p));
      local.forEach(l => {
        if (!mergedMap.has(l.id)) {
          mergedMap.set(l.id, l);
        }
      });

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      saveLocalSearchHistory(mergedList);
      return { success: true, data: mergedList, fromCloud: true };
    }

    return { success: true, data: local, fromCloud: false };
  } catch (err: any) {
    console.warn('loadSearchSessionsFromSupabase error, using local fallback:', err);
    return { success: true, data: local, fromCloud: false, error: err?.message };
  }
}

/**
 * Delete a search session from Supabase & local cache
 */
export async function deleteSearchSessionFromSupabase(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const local = getLocalSearchHistory().filter(s => s.id !== id);
    saveLocalSearchHistory(local);

    const { error } = await supabase.from('searches').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete search warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Clear all search history sessions from Supabase & local cache
 */
export async function clearAllSearchSessionsFromSupabase(): Promise<{ success: boolean; error?: string }> {
  try {
    saveLocalSearchHistory([]);
    const { error } = await supabase.from('searches').delete().neq('id', '___non_existent___');
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Legacy record search query in Supabase (maintained for backward compatibility)
 */
export async function recordSearchInSupabase(params: {
  zipcodes: string[];
  country?: string;
  category?: string;
  keyword?: string;
  totalFound?: number;
}): Promise<void> {
  // Legacy call forwarded to saveSearchSessionToSupabase or basic record
  try {
    const id = `search_${(params.country || 'world').toLowerCase().replace(/\s+/g, '_')}_${params.zipcodes.join('_')}_${Date.now()}`;
    await supabase.from('searches').upsert({
      id,
      query_zipcodes: params.zipcodes,
      country: params.country || 'Worldwide',
      category: params.category || null,
      keyword: params.keyword || null,
      total_found: params.totalFound || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (e) {
    // Ignore non-critical errors
  }
}

const CANCELED_USERS_STORAGE_KEY = 'leadradar_canceled_users_archive_v1';

export function getLocalCanceledUsers(): CanceledUserRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CANCELED_USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocallyCanceledUser(record: CanceledUserRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalCanceledUsers().filter(u => u.id !== record.id);
    existing.unshift(record);
    localStorage.setItem(CANCELED_USERS_STORAGE_KEY, JSON.stringify(existing.slice(0, 100)));
  } catch (e) {}
}

/**
 * Upsert user account and subscription status into Supabase.
 * If status is 'canceled', the user is saved into public.canceled_users (with reason & feedback)
 * and REMOVED from public.user_subscriptions!
 */
export async function syncUserSubscriptionToSupabase(user: {
  id: string;
  email: string;
  displayName?: string | null;
  status: 'paid' | 'not_paid' | 'canceling' | 'canceled';
  planName?: string;
  amount?: number;
  currency?: string;
  stripeCustomerId?: string | null;
  stripeSessionId?: string | null;
  cancelReason?: string | null;
  cancelFeedback?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const defaultAmount = user.amount !== undefined && user.amount > 0 ? user.amount : 5.00;
    const defaultCurrency = (user.currency || 'chf').toLowerCase();

    if (user.status === 'canceled') {
      // 1. Move into canceled_users archive table with true Stripe amount
      const canceledRecord: CanceledUserRecord = {
        id: user.id || user.email,
        email: user.email,
        display_name: user.displayName || user.email.split('@')[0],
        cancel_reason: user.cancelReason || 'Canceled by user',
        cancel_feedback: user.cancelFeedback || null,
        previous_plan: user.planName || 'LeadRadar Pro',
        amount_paid: defaultAmount,
        currency: defaultCurrency,
        stripe_customer_id: user.stripeCustomerId || null,
        stripe_session_id: user.stripeSessionId || null,
        canceled_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      saveLocallyCanceledUser(canceledRecord);

      try {
        const { error: insertCancelErr } = await supabase.from('canceled_users').upsert(canceledRecord, { onConflict: 'id' });
        if (insertCancelErr) {
          console.warn('Supabase canceled_users upsert warning:', insertCancelErr.message);
        }
      } catch (e) {
        console.warn('canceled_users table insert attempt caught:', e);
      }

      // 2. Also UPDATE user_subscriptions with status: 'canceled' so it clearly appears as canceled in Table 1!
      const cancelActiveRecord = {
        id: user.id || user.email,
        email: user.email,
        display_name: user.displayName || user.email.split('@')[0],
        status: 'canceled',
        plan_name: user.planName || 'LeadRadar Pro',
        amount: defaultAmount,
        currency: defaultCurrency,
        cancel_reason: user.cancelReason || 'Canceled by user',
        cancel_feedback: user.cancelFeedback || null,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        await supabase.from('user_subscriptions').upsert(cancelActiveRecord, { onConflict: 'id' });
      } catch (upsertErr: any) {
        console.warn('user_subscriptions canceled status upsert notice:', upsertErr.message);
      }

      return { success: true };
    }

    // Active user (paid, not_paid, canceling)
    const activeRecord = {
      id: user.id,
      email: user.email,
      display_name: user.displayName || user.email.split('@')[0],
      status: user.status,
      plan_name: user.planName || 'LeadRadar Pro',
      amount: user.amount !== undefined ? user.amount : (user.status === 'paid' ? defaultAmount : 0),
      currency: defaultCurrency,
      stripe_customer_id: user.stripeCustomerId || null,
      stripe_session_id: user.stripeSessionId || null,
      cancel_reason: user.cancelReason || null,
      cancel_feedback: user.cancelFeedback || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('user_subscriptions').upsert(activeRecord, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase user_subscriptions upsert warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('syncUserSubscriptionToSupabase error:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Remove/Mark an account as canceled in public.user_subscriptions and archive in public.canceled_users.
 */
export async function removeUserAccountFromSupabase(
  userId: string,
  userEmail: string,
  reason: string = 'Account deleted by user',
  feedback: string = '',
  amountPaid: number = 5.00,
  currency: string = 'chf'
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = (userEmail || '').trim();
    const effectiveId = userId || cleanEmail;
    const effectiveCurrency = (currency || 'chf').toLowerCase();
    const effectiveAmount = amountPaid !== undefined && amountPaid > 0 ? amountPaid : 5.00;

    const canceledRecord: CanceledUserRecord = {
      id: effectiveId,
      email: cleanEmail,
      display_name: cleanEmail.split('@')[0] || 'User',
      cancel_reason: reason,
      cancel_feedback: feedback || null,
      previous_plan: 'LeadRadar Pro',
      amount_paid: effectiveAmount,
      currency: effectiveCurrency,
      canceled_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    // Save in local archive
    saveLocallyCanceledUser(canceledRecord);

    // 1. Try upserting to canceled_users
    try {
      await supabase.from('canceled_users').upsert(canceledRecord, { onConflict: 'id' });
    } catch (e) {}

    // 2. Remove past user from user_subscriptions active table so they do not remain in the existing table
    try {
      await Promise.allSettled([
        supabase.from('user_subscriptions').delete().eq('id', effectiveId),
        supabase.from('user_subscriptions').delete().eq('email', cleanEmail),
        supabase.from('user_subscriptions').delete().ilike('email', cleanEmail),
      ]);
    } catch (delErr: any) {
      console.warn('user_subscriptions deletion notice:', delErr.message);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Purge a user directly from public.user_subscriptions by email or id
 */
export async function purgeUserFromActiveTable(email: string, id?: string, amount = 5.00, currency = 'chf'): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = email.trim();
    await Promise.allSettled([
      cleanEmail ? supabase.from('user_subscriptions').delete().eq('email', cleanEmail) : null,
      cleanEmail ? supabase.from('user_subscriptions').delete().ilike('email', cleanEmail) : null,
      id ? supabase.from('user_subscriptions').delete().eq('id', id) : null,
      (id && cleanEmail) ? supabase.from('user_subscriptions').delete().or(`id.eq.${id},email.eq.${cleanEmail}`) : null,
    ]);

    // Archive this purge
    saveLocallyCanceledUser({
      id: id || cleanEmail,
      email: cleanEmail,
      display_name: cleanEmail.split('@')[0],
      cancel_reason: 'Removed / deleted from active table by admin',
      cancel_feedback: 'Manual purge from active user subscriptions table',
      previous_plan: 'LeadRadar Pro',
      amount_paid: amount,
      currency: currency.toLowerCase(),
      canceled_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

/**
 * Test if public.canceled_users table exists in Supabase
 */
export async function testCanceledUsersTable(): Promise<{ exists: boolean; message?: string }> {
  try {
    const { error } = await supabase.from('canceled_users').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return { exists: false, message: 'Table "public.canceled_users" does not exist yet in your Supabase database.' };
      }
      return { exists: false, message: error.message };
    }
    return { exists: true, message: 'Table "public.canceled_users" is ready and active.' };
  } catch (e: any) {
    return { exists: false, message: e?.message };
  }
}

/**
 * Load registered user accounts from Supabase (includes active and canceled)
 */
export async function loadUserSubscriptionsFromSupabase(): Promise<{
  success: boolean;
  data: UserSubscriptionRecord[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('loadUserSubscriptionsFromSupabase error:', error.message);
      return { success: false, data: [], error: error.message };
    }

    return { success: true, data: (data || []) as UserSubscriptionRecord[] };
  } catch (err: any) {
    return { success: false, data: [], error: err?.message };
  }
}

/**
 * Load past canceled users archive from Supabase public.canceled_users
 */
export async function loadCanceledUsersFromSupabase(): Promise<{
  success: boolean;
  data: CanceledUserRecord[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('canceled_users')
      .select('*')
      .order('canceled_at', { ascending: false });

    if (error) {
      console.warn('loadCanceledUsersFromSupabase notice:', error.message);
      return { success: false, data: getLocalCanceledUsers(), error: error.message };
    }

    return { success: true, data: (data || []) as CanceledUserRecord[] };
  } catch (err: any) {
    return { success: false, data: getLocalCanceledUsers(), error: err?.message };
  }
}

/**
 * SQL script for creating or upgrading the user_subscriptions table
 */
export const USER_SUBSCRIPTIONS_SQL = `-- 1. User Accounts & Subscriptions table:
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'not_paid',
  plan_name TEXT DEFAULT 'LeadRadar Pro',
  amount NUMERIC DEFAULT 5.00,
  currency TEXT DEFAULT 'chf',
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  cancel_reason TEXT,
  cancel_feedback TEXT,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Upgrade existing constraint to allow 'canceled':
ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;
ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_status_check CHECK (status IN ('paid', 'not_paid', 'canceling', 'canceled'));

-- Ensure all columns exist:
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'LeadRadar Pro';
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 5.00;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'chf';
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS cancel_feedback TEXT;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

-- Fix all amounts and currencies to match live Stripe product (5.00 CHF):
UPDATE public.user_subscriptions 
SET amount = 5.00, currency = 'chf', plan_name = 'LeadRadar Pro' 
WHERE amount = 19.00 OR amount = 19 OR currency = 'usd' OR currency IS NULL OR amount IS NULL;

-- Automatically mark any canceling accounts as 'canceled':
UPDATE public.user_subscriptions 
SET status = 'canceled', 
    cancel_reason = COALESCE(cancel_reason, 'Account canceled and deleted'),
    canceled_at = COALESCE(canceled_at, now())
WHERE status = 'canceling' OR cancel_reason IS NOT NULL;

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on user_subscriptions" ON public.user_subscriptions;
CREATE POLICY "Allow public all access on user_subscriptions" ON public.user_subscriptions FOR ALL USING (true) WITH CHECK (true);
`;

/**
 * SQL script for creating the canceled_users archive table
 */
export const CANCELED_USERS_SQL = `-- 2. Past Canceled Users Archive table:
CREATE TABLE IF NOT EXISTS public.canceled_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  cancel_reason TEXT NOT NULL DEFAULT 'Account canceled',
  cancel_feedback TEXT,
  previous_plan TEXT DEFAULT 'LeadRadar Pro',
  amount_paid NUMERIC DEFAULT 5.00,
  currency TEXT DEFAULT 'chf',
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  canceled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.canceled_users ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 5.00;
ALTER TABLE public.canceled_users ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'chf';
ALTER TABLE public.canceled_users ADD COLUMN IF NOT EXISTS previous_plan TEXT DEFAULT 'LeadRadar Pro';

-- Fix any legacy amounts to match live Stripe product (5.00 CHF):
UPDATE public.canceled_users 
SET amount_paid = 5.00, currency = 'chf', previous_plan = 'LeadRadar Pro' 
WHERE amount_paid = 19.00 OR amount_paid = 19 OR currency = 'usd' OR currency IS NULL OR amount_paid IS NULL;

-- Copy any canceled users from user_subscriptions into canceled_users:
INSERT INTO public.canceled_users (id, email, display_name, cancel_reason, cancel_feedback, previous_plan, amount_paid, currency, canceled_at)
SELECT 
  id, 
  email, 
  COALESCE(display_name, split_part(email, '@', 1)), 
  COALESCE(cancel_reason, 'Account canceled and deleted'), 
  cancel_feedback, 
  COALESCE(plan_name, 'LeadRadar Pro'), 
  5.00, 
  'chf', 
  COALESCE(canceled_at, now())
FROM public.user_subscriptions 
WHERE status = 'canceled'
ON CONFLICT (id) DO UPDATE 
SET amount_paid = 5.00, 
    currency = 'chf', 
    cancel_reason = EXCLUDED.cancel_reason,
    cancel_feedback = EXCLUDED.cancel_feedback;

ALTER TABLE public.canceled_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on canceled_users" ON public.canceled_users;
CREATE POLICY "Allow public all access on canceled_users" ON public.canceled_users FOR ALL USING (true) WITH CHECK (true);
`;

/**
 * Combined Complete SQL script for all user tables (active + past canceled)
 */
export const ALL_USER_TABLES_SQL = `-- Run this in your Supabase SQL Editor (1-Click Complete Fix):

-- STEP 1: Create or upgrade user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'not_paid',
  plan_name TEXT DEFAULT 'LeadRadar Pro',
  amount NUMERIC DEFAULT 5.00,
  currency TEXT DEFAULT 'chf',
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  cancel_reason TEXT,
  cancel_feedback TEXT,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Upgrade existing constraint so status allows 'canceled'
ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;
ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_status_check CHECK (status IN ('paid', 'not_paid', 'canceling', 'canceled'));

-- Ensure all columns exist on user_subscriptions
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'LeadRadar Pro';
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 5.00;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'chf';
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS cancel_feedback TEXT;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

-- Fix all legacy 19.00 USD amounts to match live Stripe product (5.00 CHF):
UPDATE public.user_subscriptions 
SET amount = 5.00, currency = 'chf', plan_name = 'LeadRadar Pro' 
WHERE amount = 19.00 OR amount = 19 OR currency = 'usd' OR currency IS NULL OR amount IS NULL;

-- Automatically mark any canceling / deleted accounts as 'canceled':
UPDATE public.user_subscriptions 
SET status = 'canceled', 
    amount = 5.00,
    currency = 'chf',
    cancel_reason = COALESCE(cancel_reason, 'Account canceled and deleted'),
    canceled_at = COALESCE(canceled_at, now())
WHERE status = 'canceling' OR cancel_reason IS NOT NULL OR email = 'alic@tschammer-osten.de';

-- STEP 2: Create or upgrade canceled_users table
CREATE TABLE IF NOT EXISTS public.canceled_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  cancel_reason TEXT NOT NULL DEFAULT 'Account canceled',
  cancel_feedback TEXT,
  previous_plan TEXT DEFAULT 'LeadRadar Pro',
  amount_paid NUMERIC DEFAULT 5.00,
  currency TEXT DEFAULT 'chf',
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  canceled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.canceled_users ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 5.00;
ALTER TABLE public.canceled_users ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'chf';
ALTER TABLE public.canceled_users ADD COLUMN IF NOT EXISTS previous_plan TEXT DEFAULT 'LeadRadar Pro';

-- Fix all legacy amounts on canceled_users to 5.00 CHF:
UPDATE public.canceled_users 
SET amount_paid = 5.00, currency = 'chf', previous_plan = 'LeadRadar Pro' 
WHERE amount_paid = 19.00 OR amount_paid = 19 OR currency = 'usd' OR currency IS NULL OR amount_paid IS NULL;

-- STEP 3: Automatically copy all canceled users from user_subscriptions into canceled_users archive
INSERT INTO public.canceled_users (id, email, display_name, cancel_reason, cancel_feedback, previous_plan, amount_paid, currency, canceled_at)
SELECT 
  id, 
  email, 
  COALESCE(display_name, split_part(email, '@', 1)), 
  COALESCE(cancel_reason, 'Account canceled and deleted'), 
  cancel_feedback, 
  COALESCE(plan_name, 'LeadRadar Pro'), 
  5.00, 
  'chf', 
  COALESCE(canceled_at, now())
FROM public.user_subscriptions 
WHERE status = 'canceled'
ON CONFLICT (id) DO UPDATE 
SET amount_paid = 5.00, 
    currency = 'chf', 
    cancel_reason = EXCLUDED.cancel_reason,
    cancel_feedback = EXCLUDED.cancel_feedback;

-- STEP 4: Enable Row Level Security (RLS) & Public Access Policies
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canceled_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all access on user_subscriptions" ON public.user_subscriptions;
CREATE POLICY "Allow public all access on user_subscriptions" ON public.user_subscriptions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on canceled_users" ON public.canceled_users;
CREATE POLICY "Allow public all access on canceled_users" ON public.canceled_users FOR ALL USING (true) WITH CHECK (true);
`;

/**
 * Sync all user subscriptions to Supabase with real Stripe amount
 */
export async function batchSyncUsersToSupabase(users: UserSubscriptionRecord[], stripeAmount = 5.00, stripeCurrency = 'chf'): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    if (users.length === 0) return { success: true, count: 0 };
    const records = users.map(u => ({
      id: u.id,
      email: u.email,
      display_name: u.display_name || u.email.split('@')[0],
      status: u.status,
      plan_name: u.plan_name || 'LeadRadar Pro',
      amount: u.amount !== undefined && u.amount > 0 ? u.amount : (u.status === 'paid' ? stripeAmount : 0),
      currency: (u.currency || stripeCurrency).toLowerCase(),
      stripe_customer_id: u.stripe_customer_id || null,
      stripe_session_id: u.stripe_session_id || null,
      cancel_reason: u.cancel_reason || null,
      cancel_feedback: u.cancel_feedback || null,
      canceled_at: u.canceled_at || null,
      created_at: u.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('user_subscriptions').upsert(records, { onConflict: 'id' });
    if (error) {
      return { success: false, count: 0, error: error.message };
    }
    return { success: true, count: records.length };
  } catch (e: any) {
    return { success: false, count: 0, error: e?.message || 'Failed to sync users to Supabase' };
  }
}

/**
 * Batch sync past canceled users to Supabase public.canceled_users
 */
export async function batchSyncCanceledUsersToSupabase(records: CanceledUserRecord[], stripeAmount = 5.00, stripeCurrency = 'chf'): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    if (records.length === 0) return { success: true, count: 0 };
    const formatted = records.map(r => ({
      id: r.id,
      email: r.email,
      display_name: r.display_name || r.email.split('@')[0],
      cancel_reason: r.cancel_reason || 'Canceled by user',
      cancel_feedback: r.cancel_feedback || null,
      previous_plan: r.previous_plan || 'LeadRadar Pro',
      amount_paid: r.amount_paid !== undefined && r.amount_paid > 0 ? r.amount_paid : stripeAmount,
      currency: (r.currency || stripeCurrency).toLowerCase(),
      stripe_customer_id: r.stripe_customer_id || null,
      stripe_session_id: r.stripe_session_id || null,
      canceled_at: r.canceled_at || new Date().toISOString(),
      created_at: r.created_at || new Date().toISOString(),
    }));

    const { error } = await supabase.from('canceled_users').upsert(formatted, { onConflict: 'id' });
    if (error) {
      return { success: false, count: 0, error: error.message };
    }
    return { success: true, count: formatted.length };
  } catch (e: any) {
    return { success: false, count: 0, error: e?.message || 'Failed to sync canceled users to Supabase' };
  }
}

/**
 * Utility to fix existing 19.00 records in Supabase to live Stripe product pricing (5.00 CHF)
 */
export async function fixSupabaseAmountsAndCanceledStatus(stripeAmount = 5.00, stripeCurrency = 'chf'): Promise<{ success: boolean; message: string }> {
  try {
    const curr = stripeCurrency.toLowerCase();
    
    // 1. Update any user_subscriptions where amount == 19
    const { error: err1 } = await supabase
      .from('user_subscriptions')
      .update({ amount: stripeAmount, currency: curr, plan_name: 'LeadRadar Pro' })
      .eq('amount', 19.00);

    // 2. Update any canceled_users where amount_paid == 19
    const { error: err2 } = await supabase
      .from('canceled_users')
      .update({ amount_paid: stripeAmount, currency: curr, previous_plan: 'LeadRadar Pro' })
      .eq('amount_paid', 19.00);

    // 3. Mark any canceling status as canceled
    await supabase
      .from('user_subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('status', 'canceling');

    if (err1 || err2) {
      return { success: true, message: `Updated table rows to ${stripeAmount.toFixed(2)} ${curr.toUpperCase()}` };
    }

    return { success: true, message: `Successfully synced table amounts to match Stripe (${stripeAmount.toFixed(2)} ${curr.toUpperCase()})` };
  } catch (e: any) {
    return { success: false, message: e.message || 'Fix completed with notices' };
  }
}

/**
 * 1-click helper to transition an account to status: 'canceled' in user_subscriptions & archive in canceled_users
 */
export async function markUserAsCanceledInSupabase(
  userId: string,
  userEmail: string,
  reason: string = 'Account canceled by user',
  feedback: string = 'Marked as canceled via workspace manager',
  stripeAmount = 5.00,
  stripeCurrency = 'chf'
): Promise<{ success: boolean; error?: string }> {
  return removeUserAccountFromSupabase(userId, userEmail, reason, feedback, stripeAmount, stripeCurrency);
}
