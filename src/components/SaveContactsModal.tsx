import React, { useState } from 'react';
import { 
  X, 
  UserCheck, 
  Mail, 
  Phone, 
  Database, 
  Download, 
  Check, 
  Copy, 
  Sparkles, 
  ExternalLink, 
  Linkedin, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Contact,
  UploadCloud,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { BusinessItem } from '../types';
import { 
  extractAllCrawledIndividuals, 
  CrawledIndividualContact,
  exportIndividualsToVCF,
  exportIndividualsToCSV,
  exportSingleIndividualToVCF
} from '../utils/csvExport';
import { saveAllCrawledContactsToSupabase } from '../lib/supabase';

interface SaveContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: BusinessItem[];
  onOpenSupabaseModal?: () => void;
}

export const SaveContactsModal: React.FC<SaveContactsModalProps> = ({
  isOpen,
  onClose,
  businesses,
  onOpenSupabaseModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyWithEmail, setOnlyWithEmail] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [dbSuccessMsg, setDbSuccessMsg] = useState<string | null>(null);
  const [dbErrorMsg, setDbErrorMsg] = useState<string | null>(null);
  const [copiedEmails, setCopiedEmails] = useState(false);
  const [copiedIndividualId, setCopiedIndividualId] = useState<string | null>(null);

  if (!isOpen) return null;

  const individuals = extractAllCrawledIndividuals(businesses);

  const filteredIndividuals = individuals.filter(ind => {
    if (onlyWithEmail && !ind.personalEmail) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ind.fullName.toLowerCase().includes(q) ||
      ind.jobTitle.toLowerCase().includes(q) ||
      ind.companyName.toLowerCase().includes(q) ||
      (ind.personalEmail && ind.personalEmail.toLowerCase().includes(q)) ||
      (ind.city && ind.city.toLowerCase().includes(q)) ||
      (ind.country && ind.country.toLowerCase().includes(q))
    );
  });

  const withEmailCount = individuals.filter(i => Boolean(i.personalEmail)).length;
  const withPhoneCount = individuals.filter(i => Boolean(i.directPhone)).length;

  const handleSaveToSupabase = async () => {
    setIsSavingToDb(true);
    setDbSuccessMsg(null);
    setDbErrorMsg(null);

    const res = await saveAllCrawledContactsToSupabase(businesses);
    setIsSavingToDb(false);

    if (res.success) {
      setDbSuccessMsg(
        `Successfully saved ${res.contactsCount} individual contact(s) across ${res.businessesCount} businesses into your Supabase database!`
      );
    } else {
      setDbErrorMsg(res.error || 'Failed to save contacts to Supabase. Check database connection.');
    }
  };

  const handleExportVCF = () => {
    exportIndividualsToVCF(filteredIndividuals, `crawled_contacts_addressbook_${filteredIndividuals.length}.vcf`);
  };

  const handleExportCSV = () => {
    exportIndividualsToCSV(filteredIndividuals, `crawled_contacts_book_${filteredIndividuals.length}.csv`);
  };

  const handleCopyAllEmails = () => {
    const emails = filteredIndividuals
      .filter(i => i.personalEmail)
      .map(i => `${i.fullName} <${i.personalEmail}>`)
      .join(', ');

    if (!emails) return;
    navigator.clipboard.writeText(emails);
    setCopiedEmails(true);
    setTimeout(() => setCopiedEmails(false), 2000);
  };

  const handleCopySingleEmail = (ind: CrawledIndividualContact) => {
    if (!ind.personalEmail) return;
    navigator.clipboard.writeText(ind.personalEmail);
    setCopiedIndividualId(ind.id);
    setTimeout(() => setCopiedIndividualId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 pb-5 flex items-start justify-between border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-inner shrink-0">
              <Contact className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-indigo-400" />
                  Deep-Crawled Contact Book
                </span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-slate-400 text-xs font-mono">{individuals.length} Individuals Crawled</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Save & Export Crawled Individual Contacts
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

        {/* Action Banner: Instant Multi-Destination Saving */}
        <div className="bg-slate-50 p-5 border-b border-slate-200/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Action 1: Save All to Supabase */}
            <button
              type="button"
              onClick={handleSaveToSupabase}
              disabled={isSavingToDb || individuals.length === 0}
              className="p-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-2xl font-bold text-xs shadow-xs hover:shadow-md transition-all flex flex-col items-start gap-1 cursor-pointer active:scale-95 text-left"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 font-bold">
                  {isSavingToDb ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Database className="w-4 h-4 text-emerald-200" />
                  )}
                  <span>Save to Supabase DB</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
              </div>
              <span className="text-[11px] text-emerald-100 font-normal">
                Persist all {individuals.length} contacts to cloud database
              </span>
            </button>

            {/* Action 2: Download vCard Address Book (.vcf) */}
            <button
              type="button"
              onClick={handleExportVCF}
              disabled={filteredIndividuals.length === 0}
              className="p-3.5 bg-slate-900 hover:bg-slate-800 active:bg-black disabled:opacity-50 text-white rounded-2xl font-bold text-xs shadow-xs hover:shadow-md transition-all flex flex-col items-start gap-1 cursor-pointer active:scale-95 text-left"
            >
              <div className="flex items-center gap-1.5 font-bold">
                <Download className="w-4 h-4 text-amber-400" />
                <span>Download vCard (.vcf)</span>
              </div>
              <span className="text-[11px] text-slate-300 font-normal">
                Import to Apple/Google Contacts, iPhone, Outlook
              </span>
            </button>

            {/* Action 3: Download Contacts CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredIndividuals.length === 0}
              className="p-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 disabled:opacity-50 text-slate-800 border border-slate-200 rounded-2xl font-bold text-xs shadow-2xs hover:shadow-md transition-all flex flex-col items-start gap-1 cursor-pointer active:scale-95 text-left"
            >
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>Export Contacts CSV</span>
              </div>
              <span className="text-[11px] text-slate-500 font-normal">
                Tabular CSV formatted for CRM outreach
              </span>
            </button>

            {/* Action 4: Copy All Emails */}
            <button
              type="button"
              onClick={handleCopyAllEmails}
              disabled={withEmailCount === 0}
              className="p-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 disabled:opacity-50 text-slate-800 border border-slate-200 rounded-2xl font-bold text-xs shadow-2xs hover:shadow-md transition-all flex flex-col items-start gap-1 cursor-pointer active:scale-95 text-left"
            >
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                {copiedEmails ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-500" />
                )}
                <span>{copiedEmails ? 'Emails Copied!' : 'Copy All Emails'}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-normal">
                {withEmailCount} verified personal inboxes
              </span>
            </button>
          </div>

          {/* Database sync status toast */}
          {dbSuccessMsg && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2.5 text-emerald-800 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{dbSuccessMsg}</span>
            </div>
          )}

          {dbErrorMsg && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-amber-900 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">{dbErrorMsg}</p>
                {onOpenSupabaseModal && (
                  <button
                    onClick={onOpenSupabaseModal}
                    className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Open Supabase Config & Schema Helper</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filter and Search Toolbar */}
        <div className="p-4 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search crawled people by name, title, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyWithEmail}
                onChange={(e) => setOnlyWithEmail(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span>Only with direct personal email ({withEmailCount})</span>
            </label>

            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl">
              Showing {filteredIndividuals.length} of {individuals.length}
            </span>
          </div>
        </div>

        {/* Individual Contacts List View */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
          {filteredIndividuals.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No crawled individual contacts found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {individuals.length === 0 
                  ? 'Deep crawl businesses in your workspace to harvest verified decision-makers, direct personal inboxes, and executive phone lines.'
                  : 'No contacts match the current search filter. Try disabling filters above.'}
              </p>
            </div>
          ) : (
            filteredIndividuals.map((ind) => {
              const hasEmail = Boolean(ind.personalEmail);
              return (
                <div 
                  key={ind.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Person Details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 ${
                      hasEmail ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
                    }`}>
                      {ind.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) || 'EX'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {ind.fullName}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {ind.jobTitle}
                        </span>
                        {ind.linkedInUrl && (
                          <a
                            href={ind.linkedInUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 transition-colors p-0.5"
                            title="LinkedIn Profile"
                          >
                            <Linkedin className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Company & Location */}
                      <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">{ind.companyName}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500">{ind.city}{ind.state ? `, ${ind.state}` : ''} ({ind.country})</span>
                      </p>

                      {/* Email & Phone Badges */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {hasEmail ? (
                          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-xl border border-emerald-200 text-xs font-mono font-bold">
                            <Mail className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="truncate">{ind.personalEmail}</span>
                            <button
                              type="button"
                              onClick={() => handleCopySingleEmail(ind)}
                              className="ml-1 text-emerald-600 hover:text-emerald-800 cursor-pointer"
                              title="Copy Email"
                            >
                              {copiedIndividualId === ind.id ? (
                                <Check className="w-3 h-3 text-emerald-700" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60 font-medium">
                            Anti-generic: Generic aliases filtered
                          </span>
                        )}

                        {ind.directPhone ? (
                          <div className="flex items-center gap-1 text-slate-700 text-xs font-mono font-medium bg-slate-100 px-2.5 py-1 rounded-xl">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>{ind.directPhone}</span>
                          </div>
                        ) : ind.companyPhone ? (
                          <div className="flex items-center gap-1 text-slate-500 text-xs font-mono bg-slate-50 px-2.5 py-1 rounded-xl">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>Switchboard: {ind.companyPhone}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Single Person Save Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => exportSingleIndividualToVCF(ind)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title="Download vCard for this individual"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Save vCard</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Ready for 1-click import into iOS, Android, macOS, Google Contacts & Supabase.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
