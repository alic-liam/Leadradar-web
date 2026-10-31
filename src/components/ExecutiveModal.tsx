import React, { useState } from 'react';
import { BusinessItem } from '../types';
import { 
  X, 
  UserCheck, 
  Mail, 
  Phone, 
  Linkedin, 
  Globe, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  Check, 
  Sparkles, 
  ExternalLink, 
  FileCheck, 
  AlertTriangle,
  Building,
  Users,
  Download,
  Database,
  Star
} from 'lucide-react';
import { extractAllCrawledIndividuals, exportSingleIndividualToVCF } from '../utils/csvExport';
import { saveBusinessToSupabase } from '../lib/supabase';

interface ExecutiveModalProps {
  business: BusinessItem | null;
  onClose: () => void;
  onReCrawl: (business: BusinessItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (business: BusinessItem) => void;
  onViewOnMap?: (business: BusinessItem) => void;
}

export const ExecutiveModal: React.FC<ExecutiveModalProps> = ({
  business,
  onClose,
  onReCrawl,
  isFavorite = false,
  onToggleFavorite,
  onViewOnMap,
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);

  if (!business || !business.executiveDetails) return null;

  const exec = business.executiveDetails;
  const hasPersonalEmail = Boolean(exec.personalEmail);

  const handleSaveContactVCF = () => {
    const individuals = extractAllCrawledIndividuals([business]);
    if (individuals.length > 0) {
      exportSingleIndividualToVCF(individuals[0]);
    }
  };

  const handleSaveToDb = async () => {
    const res = await saveBusinessToSupabase(business);
    if (res.success) {
      setSavedToDb(true);
      setTimeout(() => setSavedToDb(false), 2500);
    }
  };

  const handleCopyEmail = () => {
    if (!exec.personalEmail) return;
    navigator.clipboard.writeText(exec.personalEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPhone = () => {
    const phone = exec.directPhone || business.phone;
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyAll = () => {
    const text = [
      `Entity: ${business.name}`,
      `Executive: ${exec.executiveName || 'Executive'} (${exec.executiveTitle || 'Owner'})`,
      exec.personalEmail ? `Personal Email: ${exec.personalEmail}` : `Email: No direct personal email disclosed (generic aliases filtered)`,
      exec.directPhone ? `Direct Phone: ${exec.directPhone}` : (business.phone ? `Main Phone: ${business.phone}` : ''),
      exec.linkedInUrl ? `LinkedIn: ${exec.linkedInUrl}` : '',
      `Address: ${business.address}, ${business.city} ${business.state} ${business.zipcode}`,
      `Website: ${business.website || ''}`,
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 pb-5 flex items-start justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-amber-400 border border-slate-700 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                OSINT Executive Dossier
              </span>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-slate-400 text-xs font-mono">Crawled {new Date(exec.crawledAt).toLocaleTimeString()}</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              {business.name}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>{business.address}, {business.city} {business.state} {business.zipcode}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(business)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ${
                  isFavorite
                    ? 'bg-amber-400 text-slate-950 border-amber-300 hover:bg-amber-300'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:text-white hover:border-slate-600'
                }`}
                title={isFavorite ? 'Favorited in Favorites section (Click to remove)' : 'Click to add business to Favorites'}
              >
                <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-slate-950 text-slate-950' : 'text-amber-400'}`} />
                <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-900">
          {/* Executive Header Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                {exec.executiveName ? exec.executiveName.split(' ').map(n => n[0]).join('').slice(0, 2) : <UserCheck className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  {exec.executiveName || 'Key Decision Maker'}
                  {exec.linkedInUrl && (
                    <a
                      href={exec.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 p-0.5 rounded transition-colors"
                      title="LinkedIn Profile"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  {exec.executiveTitle || 'Owner & Principal Executive'}
                </p>
                {exec.backgroundSummary && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {exec.backgroundSummary}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={handleCopyAll}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedAll ? 'Dossier Copied' : 'Copy Dossier'}</span>
              </button>
            </div>
          </div>

          {/* Strict Anti-Generic Email Filter Section */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              Verified Direct Mailbox Channel
            </h4>

            {hasPersonalEmail ? (
              <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Mail className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-mono font-bold text-slate-900 selection:bg-emerald-200">
                        {exec.personalEmail}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Direct Officer Inbox
                        </span>
                        <span className="text-slate-300 text-xs">•</span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-bold">
                          Confidence: {exec.emailConfidence}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCopyEmail}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
                  >
                    {copiedEmail ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEmail ? 'Copied' : 'Copy Email'}</span>
                  </button>
                </div>

                {exec.emailPattern && (
                  <p className="text-xs text-slate-500 font-mono pt-1">
                    Corporate Email Syntax Pattern: <span className="font-bold text-slate-700">{exec.emailPattern}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-0.5">
                  <p className="font-bold">Strict Anti-Generic Email Filter Policy</p>
                  <p className="text-amber-800/90 leading-relaxed">
                    Generic shared aliases (such as <code className="bg-amber-100/70 px-1 rounded">contact@</code>, <code className="bg-amber-100/70 px-1 rounded">support@</code>, <code className="bg-amber-100/70 px-1 rounded">info@</code>) were discovered and intentionally excluded. No direct personal mailbox for this executive is published in public registry filings.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Direct Phone Number */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-500" />
              Direct Telecommunications
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Direct Exec Phone */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {exec.phoneType || 'Direct Executive Line'}
                  </p>
                  <p className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                    {exec.directPhone || 'Not Listed Separately'}
                  </p>
                </div>
                {exec.directPhone && (
                  <button
                    onClick={handleCopyPhone}
                    className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-500 transition-colors cursor-pointer"
                    title="Copy Phone"
                  >
                    {copiedPhone ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Main Business Phone */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Main Office Switchboard
                  </p>
                  <p className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                    {business.phone || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sources & Citations */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-indigo-500" />
              Public Verification Sources & Records
            </h4>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1.5 shadow-2xs">
              {exec.sources && exec.sources.length > 0 ? (
                exec.sources.map((src, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    <span>{src}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">Public Registry & Corporate Filings</p>
              )}
            </div>
          </div>

          {/* Additional Leadership / Executives if discovered */}
          {exec.additionalExecutives && exec.additionalExecutives.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                Additional Officers & Leadership ({exec.additionalExecutives.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {exec.additionalExecutives.map((addExec, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs shadow-2xs">
                    <p className="font-bold text-slate-900">{addExec.name}</p>
                    <p className="text-[11px] text-slate-500">{addExec.title}</p>
                    {addExec.email && (
                      <p className="text-[11px] font-mono text-emerald-700 font-medium mt-1 truncate">
                        {addExec.email}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveContactVCF}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Download vCard to save directly to phone / contacts"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Contact Card (.vcf)</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToDb}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Save to Supabase database"
            >
              {savedToDb ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Database className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{savedToDb ? 'Saved to DB!' : 'Save to Supabase'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onViewOnMap && (
              <button
                type="button"
                onClick={() => {
                  onViewOnMap(business);
                  onClose();
                }}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                title="Bring map view to this business"
              >
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>View on Map</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onReCrawl(business);
                onClose();
              }}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              Re-Crawl Dossier
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
