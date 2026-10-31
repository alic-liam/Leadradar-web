export interface ExecutiveContact {
  executiveName: string | null;
  executiveTitle: string | null;
  personalEmail: string | null;
  emailConfidence: 'High' | 'Medium' | 'Low' | 'None';
  emailPattern?: string | null;
  directPhone: string | null;
  phoneType?: 'Direct Mobile' | 'Executive Office' | 'Direct Extension' | 'Main Line' | 'Unknown';
  linkedInUrl?: string | null;
  sources: string[];
  backgroundSummary?: string | null;
  crawledAt: string;
  notes?: string | null;
  additionalExecutives?: Array<{
    name: string;
    title: string;
    email?: string | null;
    phone?: string | null;
    linkedIn?: string | null;
  }>;
}

export interface BusinessItem {
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
  reviewCount?: number | null;
  latitude: number;
  longitude: number;
  googleMapsUrl?: string | null;
  placeId?: string | null;
  enrichmentStatus: 'unsearched' | 'crawling' | 'enriched' | 'not_found' | 'error';
  executiveDetails?: ExecutiveContact | null;
  crawlError?: string | null;
}

export interface SearchQueryParams {
  zipcodes: string[];
  country?: string;
  keyword?: string;
  category?: string;
  radiusMiles?: number;
  limit?: number;
}

export interface SearchResultResponse {
  businesses: BusinessItem[];
  center: {
    lat: number;
    lng: number;
  };
  totalFound: number;
  searchedZipcodes: string[];
  country?: string;
  source?: string;
}

export interface SavedSearchRecord {
  id: string;
  title?: string;
  zipcodes: string[];
  country: string;
  category?: string;
  keyword?: string;
  totalFound: number;
  center: {
    lat: number;
    lng: number;
  };
  businesses: BusinessItem[];
  crawledCount?: number;
  personalEmailsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavedLeadItem extends BusinessItem {
  savedAt?: string;
  notes?: string | null;
  tags?: string[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  hasPaidAccess?: boolean;
  paidAt?: string | null;
  stripeSessionId?: string | null;
}
