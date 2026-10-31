import React from 'react';
import { 
  Radar, 
  ShieldCheck, 
  FileSpreadsheet, 
  Zap, 
  CheckCircle2, 
  Globe2,
  Database,
  Contact,
  UserCheck,
  History,
  BookmarkCheck,
  LogOut,
  LogIn,
  User,
  Star,
  Trash2
} from 'lucide-react';
import { BusinessItem, UserProfile } from '../types';
import { extractAllCrawledIndividuals } from '../utils/csvExport';

interface NavbarProps {
  businesses: BusinessItem[];
  currentCountry?: string;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onBatchCrawlAll: () => void;
  isBatchCrawling: boolean;
  selectedCount: number;
  onOpenSupabaseModal?: () => void;
  onOpenSaveContactsModal?: () => void;
  onOpenSavedLeadsModal?: () => void;
  savedLeadsCount?: number;
  savedSearchesCount?: number;
  isHistorySidebarOpen?: boolean;
  onToggleHistorySidebar?: () => void;
  currentUser?: UserProfile | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  onOpenPaywall?: () => void;
  onResetPaidStatus?: () => void;
  onEraseAccount?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  businesses,
  currentCountry = 'Worldwide',
  onExportCSV,
  onExportJSON,
  onBatchCrawlAll,
  isBatchCrawling,
  selectedCount,
  onOpenSupabaseModal,
  onOpenSaveContactsModal,
  onOpenSavedLeadsModal,
  savedLeadsCount = 0,
  savedSearchesCount = 0,
  isHistorySidebarOpen = false,
  onToggleHistorySidebar,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onOpenPaywall,
  onResetPaidStatus,
  onEraseAccount,
}) => {
  const enrichedCount = businesses.filter(b => b.enrichmentStatus === 'enriched').length;
  const emailsFoundCount = businesses.filter(b => b.executiveDetails?.personalEmail).length;
  const crawledIndividuals = extractAllCrawledIndividuals(businesses);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-900/10 shrink-0">
            <Radar className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                LeadRadar <span className="text-indigo-600 font-bold">Global</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center gap-1">
                <Globe2 className="w-3 h-3 text-indigo-600" />
                OSINT Grounding
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block font-medium">
              Worldwide Business Discovery & Direct Executive Mailbox Intelligence
            </p>
          </div>
        </div>

        {/* Global Action & Status Badges */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Favorites Section Button */}
          {onOpenSavedLeadsModal && (
            <button
              onClick={onOpenSavedLeadsModal}
              className="px-3 py-2 bg-amber-50/90 hover:bg-amber-100 text-amber-900 border border-amber-200/90 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Open your Favorites section"
            >
              <Star className="w-4 h-4 fill-amber-400 text-amber-500 shrink-0" />
              <span className="hidden sm:inline">Favorites</span>
              {savedLeadsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-mono font-bold">
                  {savedLeadsCount}
                </span>
              )}
            </button>
          )}

          {/* Search History Sidebar Toggle Button */}
          {currentUser && onToggleHistorySidebar && (
            <button
              onClick={onToggleHistorySidebar}
              className={`px-3 py-2 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isHistorySidebarOpen
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
              title="Toggle Saved Search Results History Sidebar"
            >
              <History className={`w-4 h-4 ${isHistorySidebarOpen ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span className="hidden md:inline">Search History</span>
              {savedSearchesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-mono font-bold">
                  {savedSearchesCount}
                </span>
              )}
            </button>
          )}

          {/* Save Crawled Contacts Button */}
          {crawledIndividuals.length > 0 && (
            <button
              onClick={onOpenSaveContactsModal}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 animate-in fade-in"
              title="Save contact information of every individual deep crawled (vCard / Supabase / CSV)"
            >
              <Contact className="w-4 h-4 text-indigo-200" />
              <span className="hidden sm:inline">Save Contacts</span>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-mono font-bold">
                {crawledIndividuals.length}
              </span>
            </button>
          )}

          {/* Batch Crawl Action Button */}
          {businesses.length > 0 && (
            <button
              onClick={onBatchCrawlAll}
              disabled={isBatchCrawling}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-black disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              title="Crawl all unsearched businesses"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-400 ${isBatchCrawling ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isBatchCrawling ? 'Crawling...' : (selectedCount > 0 ? `Crawl (${selectedCount})` : 'Batch Crawl')}</span>
            </button>
          )}

          {/* Export Actions */}
          {businesses.length > 0 && (
            <button
              onClick={onExportCSV}
              className="px-3 py-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Export all businesses with executive contacts to CSV spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          {/* Supabase Database & Subscriptions Button */}
          {onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Open Supabase Cloud Database & User Subscriptions Table"
            >
              <Database className="w-4 h-4 text-emerald-600" />
              <span className="hidden lg:inline">Supabase DB</span>
            </button>
          )}

          {/* User Account / Auth Section */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1 border-l border-slate-200">
              <div 
                onClick={onOpenPaywall}
                className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200/80 text-xs cursor-pointer transition-colors"
                title={currentUser.hasPaidAccess ? "Active Subscription Access (Click to view Stripe billing info)" : "Account Unpaid - Click to complete Stripe subscription checkout"}
              >
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  {currentUser.displayName?.[0]?.toUpperCase() || currentUser.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="hidden lg:block max-w-[100px] truncate text-left">
                  <p className="font-bold text-slate-800 text-[11px] leading-tight truncate">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </p>
                  <p className="text-[9px] text-slate-400 truncate leading-tight">{currentUser.email}</p>
                </div>
                {currentUser.hasPaidAccess ? (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Paid
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                    Unpaid
                  </span>
                )}
              </div>

              {onEraseAccount && (
                <button
                  type="button"
                  onClick={onEraseAccount}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Cancel Account & Invalidate all Subscriptions"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Sign out of your account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
