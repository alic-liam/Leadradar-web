import React, { useState } from 'react';
import { 
  BookmarkCheck, 
  Bookmark, 
  Trash2, 
  Mail, 
  Phone, 
  Globe2, 
  Building2, 
  Search, 
  FileSpreadsheet, 
  UserCheck, 
  ExternalLink, 
  MapPin, 
  Sparkles,
  ArrowRight,
  ChevronRight,
  Download,
  AlertCircle,
  Copy,
  Check,
  Tag,
  Clock,
  Layers,
  X,
  Star
} from 'lucide-react';
import { SavedLeadItem, BusinessItem } from '../types';
import { exportToCSV, exportToJSON } from '../utils/csvExport';

interface SavedLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedLeads: SavedLeadItem[];
  onRemoveLead: (leadId: string) => Promise<void>;
  onInspectLead?: (lead: BusinessItem) => void;
  onViewDetails?: (lead: BusinessItem) => void;
  onCrawlLead?: (lead: BusinessItem) => void;
  onViewOnMap?: (lead: BusinessItem) => void;
}

export const SavedLeadsModal: React.FC<SavedLeadsModalProps> = ({
  isOpen,
  onClose,
  savedLeads,
  onRemoveLead,
  onInspectLead,
  onViewDetails,
  onCrawlLead,
  onViewOnMap
}) => {
  const inspectFn = onViewDetails || onInspectLead || (() => {});
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = Array.from(new Set(savedLeads.map(l => l.category || 'General'))).filter(Boolean);

  const filteredLeads = savedLeads.filter(lead => {
    const matchesCategory = categoryFilter === 'all' || lead.category === categoryFilter;
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(q) ||
      lead.city?.toLowerCase().includes(q) ||
      lead.zipcode?.toLowerCase().includes(q) ||
      lead.executiveDetails?.executiveName?.toLowerCase().includes(q) ||
      lead.executiveDetails?.personalEmail?.toLowerCase().includes(q)
    );
  });

  const totalWithPersonalEmail = savedLeads.filter(l => l.executiveDetails?.personalEmail).length;

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleRemove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRemovingId(id);
    try {
      await onRemoveLead(id);
    } finally {
      setIsRemovingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[88vh] max-h-[850px] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Star className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Favorites Section
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-100 text-amber-800 border border-amber-300">
                  {savedLeads.length} {savedLeads.length === 1 ? 'Favorite Business' : 'Favorite Businesses'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Your curated list of favorite businesses. Click any business or &quot;View on Map&quot; to bring the map view directly to it.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {savedLeads.length > 0 && (
              <button
                type="button"
                onClick={() => exportToCSV(savedLeads, `favorites-${new Date().toISOString().slice(0, 10)}.csv`)}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Export Favorites CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Metric Bar */}
        <div className="p-4 border-b border-slate-200/80 bg-white grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved leads by company, city, executive name or email..."
              className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Categories ({savedLeads.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Quick Metrics */}
          <div className="md:col-span-3 flex items-center justify-end gap-2 text-xs">
            <span className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold font-mono flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              <span>{totalWithPersonalEmail} Direct Inboxes</span>
            </span>
          </div>
        </div>

        {/* Leads Vault Grid/List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-slate-50/50 custom-scrollbar">
          {filteredLeads.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                <Star className="w-8 h-8 fill-amber-400/40 text-amber-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {searchQuery ? 'No matching favorite businesses' : 'Your Favorites Section is Empty'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {searchQuery
                  ? 'Try searching with different keywords or clearing your category filters.'
                  : 'Click the "Favorite" star button on any company card in your search results to save it to your Favorites section.'}
              </p>
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const exec = lead.executiveDetails;
              const hasEmail = Boolean(exec?.personalEmail);

              return (
                <div
                  key={lead.id}
                  onClick={() => {
                    if (onViewOnMap) {
                      onViewOnMap(lead);
                    } else {
                      inspectFn(lead);
                    }
                  }}
                  className="group bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-400 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer relative"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left: Main Details */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {lead.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {lead.category || 'Business'}
                        </span>
                        {lead.savedAt && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(lead.savedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Location & Phone */}
                      <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lead.address || `${lead.city}, ${lead.zipcode}`}</span>
                        </span>
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{lead.phone}</span>
                          </span>
                        )}
                        {lead.website && (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-indigo-600 hover:underline"
                          >
                            <Globe2 className="w-3.5 h-3.5" />
                            <span>Website</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* Executive Details Badge Box */}
                      {exec && (exec.executiveName || exec.personalEmail) ? (
                        <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-indigo-50/40 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                              <UserCheck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {exec.executiveName || 'Key Decision Maker'} 
                                <span className="text-[11px] font-normal text-slate-500 ml-1.5">
                                  ({exec.executiveTitle || 'Executive'})
                                </span>
                              </div>
                              {exec.personalEmail && (
                                <div className="text-xs font-mono font-bold text-emerald-800 truncate flex items-center gap-1.5">
                                  <span>{exec.personalEmail}</span>
                                  <span className="px-1 py-0.2 rounded text-[9px] bg-emerald-200 text-emerald-900 font-sans">
                                    {exec.emailConfidence} Confidence
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {exec.personalEmail && (
                            <button
                              type="button"
                              onClick={(e) => handleCopy(exec.personalEmail!, e)}
                              className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 self-start sm:self-center shrink-0"
                            >
                              {copiedEmail === exec.personalEmail ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-emerald-600" />
                                  <span>Copy Email</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">Unsearched Intelligence</span>
                          {onCrawlLead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCrawlLead(lead);
                              }}
                              className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Crawl Contacts Now</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                      {onViewOnMap && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewOnMap(lead);
                          }}
                          className="w-full px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                          title="Bring the map view directly to this business"
                        >
                          <MapPin className="w-3.5 h-3.5 text-indigo-200" />
                          <span>View on Map</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="flex items-center gap-1.5 w-full justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            inspectFn(lead);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          title="View executive dossier and contacts"
                        >
                          <span>Dossier</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleRemove(lead.id, e)}
                          disabled={isRemovingId === lead.id}
                          className="px-2.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Remove from favorites"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>Unfavorite</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200/80 bg-white flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4 text-indigo-600" />
            <span>Synced to your private Firebase account in real time.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
