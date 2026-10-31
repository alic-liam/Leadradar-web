import React, { useState } from 'react';
import { 
  History, 
  Search, 
  MapPin, 
  Building2, 
  Mail, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  ChevronRight, 
  ChevronLeft,
  RefreshCw, 
  Database, 
  ExternalLink,
  Zap,
  BookmarkCheck,
  Globe2,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { SavedSearchRecord, BusinessItem } from '../types';

interface SearchHistorySidebarProps {
  savedSearches: SavedSearchRecord[];
  activeSearchId: string | null;
  onSelectSearch: (search: SavedSearchRecord) => void;
  onDeleteSearch: (id: string, e: React.MouseEvent) => void;
  onRefreshCloudHistory?: () => Promise<void>;
  onRefreshHistory?: () => Promise<void>;
  onSaveCurrentSearch?: () => void;
  isCurrentSearchSavable?: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  isCloudSynced: boolean;
  isLoading?: boolean;
}

export const SearchHistorySidebar: React.FC<SearchHistorySidebarProps> = ({
  savedSearches,
  activeSearchId,
  onSelectSearch,
  onDeleteSearch,
  onRefreshCloudHistory,
  onRefreshHistory,
  onSaveCurrentSearch,
  isCurrentSearchSavable,
  isOpen,
  onToggleOpen,
  isCloudSynced,
  isLoading = false,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const refreshFn = onRefreshHistory || onRefreshCloudHistory;
      if (refreshFn) {
        await refreshFn();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredSearches = savedSearches.filter(s => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      (s.title && s.title.toLowerCase().includes(q)) ||
      s.country.toLowerCase().includes(q) ||
      (s.category && s.category.toLowerCase().includes(q)) ||
      (s.keyword && s.keyword.toLowerCase().includes(q)) ||
      s.zipcodes.some(z => z.toLowerCase().includes(q))
    );
  });

  const totalCachedLeads = savedSearches.reduce((acc, s) => acc + (s.businesses?.length || s.totalFound || 0), 0);
  const totalCachedEmails = savedSearches.reduce((acc, s) => {
    const emailsInBiz = s.businesses?.filter(b => b.executiveDetails?.personalEmail).length || 0;
    return acc + (s.personalEmailsCount || emailsInBiz);
  }, 0);

  if (!isOpen) {
    return (
      <aside 
        className="hidden lg:flex flex-col items-center py-4 px-2 bg-white border-r border-slate-200/80 shadow-xs h-full min-h-[calc(100vh-4rem)] w-14 shrink-0 transition-all z-20"
        title="Expand Saved Searches History"
      >
        <button
          type="button"
          onClick={onToggleOpen}
          className="p-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all cursor-pointer shadow-2xs hover:shadow-xs group relative flex flex-col items-center gap-1.5"
          title="Open Saved Searches Sidebar"
        >
          <History className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold text-indigo-700 writing-vertical select-none tracking-wider">HISTORY</span>
          {savedSearches.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center font-mono">
              {savedSearches.length > 99 ? '99+' : savedSearches.length}
            </span>
          )}
        </button>

        <div className="mt-6 flex flex-col items-center gap-4 text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500" title="Supabase Cache Online" />
          <span className="text-[10px] font-mono text-slate-400 [writing-mode:vertical-lr] tracking-widest uppercase">
            {totalCachedLeads} Leads
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-full lg:w-80 xl:w-88 shrink-0 bg-white border-r border-slate-200/80 flex flex-col h-full min-h-[calc(100vh-4rem)] transition-all z-20 shadow-xs">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-200/80 bg-slate-50/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>Search History</span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold font-mono">
                  {savedSearches.length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                <Database className="w-3 h-3 text-emerald-600" />
                <span>Account Cloud Vault</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer disabled:opacity-50"
              title="Sync / Refresh from Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onToggleOpen}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Cache Summary Stats Banner */}
        <div className="grid grid-cols-2 gap-2 text-center bg-white p-2.5 rounded-2xl border border-slate-200/70 shadow-2xs">
          <div className="p-1.5 bg-slate-50 rounded-xl">
            <div className="text-xs font-bold text-slate-900 font-mono">{totalCachedLeads}</div>
            <div className="text-[10px] text-slate-500 font-medium">Cached Leads</div>
          </div>
          <div className="p-1.5 bg-emerald-50 rounded-xl">
            <div className="text-xs font-bold text-emerald-700 font-mono">{totalCachedEmails}</div>
            <div className="text-[10px] text-emerald-600 font-medium">Direct Inboxes</div>
          </div>
        </div>

        {/* Search / Filter bar for saved searches */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter past searches (zip, city, niche)..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* List of Saved Searches */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {filteredSearches.length === 0 ? (
          <div className="py-8 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">
                {filterQuery ? 'No matching searches found' : 'No Saved Searches Yet'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
                {filterQuery
                  ? 'Try searching with another zipcode, country, or category keyword.'
                  : 'Every search you run is automatically saved to your Supabase database so you never have to re-ask Google.'}
              </p>
            </div>
          </div>
        ) : (
          filteredSearches.map((item) => {
            const isActive = activeSearchId === item.id;
            const businessCount = item.businesses?.length || item.totalFound || 0;
            const emailsCount = item.personalEmailsCount || item.businesses?.filter(b => b.executiveDetails?.personalEmail).length || 0;
            const enrichedCount = item.crawledCount || item.businesses?.filter(b => b.enrichmentStatus === 'enriched').length || 0;

            const formattedDate = new Date(item.updatedAt || item.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={item.id}
                onClick={() => onSelectSearch(item)}
                className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white hover:bg-slate-50/90 border-slate-200/90 hover:border-indigo-200 shadow-2xs hover:shadow-xs'
                }`}
              >
                {/* Active Indicator Strip */}
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-600 rounded-r-full" />
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {item.category || item.keyword || 'General Businesses'}
                      </span>
                      {isActive && (
                        <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Location detail */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-1">
                      <Globe2 className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{item.country}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-mono text-slate-600 truncate">
                        {(item.zipcodes || []).slice(0, 3).join(', ')}
                        {(item.zipcodes || []).length > 3 ? ` +${item.zipcodes.length - 3}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => onDeleteSearch(item.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer shrink-0"
                    title="Delete this saved search from Supabase"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Metrics Badges */}
                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[10px]">
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold font-mono">
                    {businessCount} Leads
                  </span>

                  {emailsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold font-mono flex items-center gap-1">
                      <Mail className="w-2.5 h-2.5 text-emerald-600" />
                      <span>{emailsCount} Direct {emailsCount === 1 ? 'Inbox' : 'Inboxes'}</span>
                    </span>
                  )}

                  {enrichedCount > 0 && emailsCount === 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 font-bold font-mono">
                      {enrichedCount} Enriched
                    </span>
                  )}
                </div>

                {/* Footer Time & 0-API Load Callout */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formattedDate}</span>
                  </div>

                  <div className="flex items-center gap-1 text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>{isActive ? 'Currently Loaded' : 'Instant Load (0 API)'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/70 space-y-2 text-xs">
        {isCurrentSearchSavable && onSaveCurrentSearch && (
          <button
            type="button"
            onClick={onSaveCurrentSearch}
            className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-98"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>Save Current Search Snapshot</span>
          </button>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Supabase Auto-Cache</span>
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            {savedSearches.length} Sessions Stored
          </span>
        </div>
      </div>
    </aside>
  );
};
