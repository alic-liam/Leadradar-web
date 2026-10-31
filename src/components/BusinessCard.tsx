import React, { useState } from 'react';
import { BusinessItem } from '../types';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Globe, 
  Star, 
  ShieldCheck, 
  Mail, 
  UserCheck, 
  Copy, 
  Check, 
  ExternalLink, 
  Linkedin, 
  Sparkles, 
  AlertCircle,
  FileText,
  Clock,
  Globe2,
  Download,
  Contact,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { exportSingleIndividualToVCF, extractAllCrawledIndividuals } from '../utils/csvExport';

interface BusinessCardProps {
  business: BusinessItem;
  isSelected: boolean;
  isHovered?: boolean;
  hoveredBusinessId?: string | null;
  onSelect: (business: BusinessItem) => void;
  onHover?: (id: string | null) => void;
  onCrawl: (business: BusinessItem) => void;
  onViewDetails: (business: BusinessItem) => void;
  isCheckedForBatch: boolean;
  onToggleBatchCheck: (id: string) => void;
  isSaved?: boolean;
  isFavorite?: boolean;
  onToggleSaveLead?: (business: BusinessItem, e: React.MouseEvent) => void;
  onToggleSave?: (business: BusinessItem, e: React.MouseEvent) => void;
  onToggleFavorite?: (business: BusinessItem, e: React.MouseEvent) => void;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({
  business,
  isSelected,
  isHovered = false,
  hoveredBusinessId = null,
  onSelect,
  onHover,
  onCrawl,
  onViewDetails,
  isCheckedForBatch,
  onToggleBatchCheck,
  isSaved = false,
  isFavorite,
  onToggleSaveLead,
  onToggleSave,
  onToggleFavorite
}) => {
  const isFav = Boolean(isFavorite ?? isSaved);
  const toggleFav = onToggleFavorite || onToggleSaveLead || onToggleSave;
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const exec = business.executiveDetails;
  const isCrawling = business.enrichmentStatus === 'crawling';
  const isEnriched = business.enrichmentStatus === 'enriched';
  const hasPersonalEmail = Boolean(exec?.personalEmail);

  // When hovering over another company, previous selected isn't highlighted anymore (except if checked via top-left checkbox)
  const isCurrentHovered = isHovered || hoveredBusinessId === business.id;
  const isHighlighted = isCurrentHovered || isCheckedForBatch || (!hoveredBusinessId && isSelected);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!exec?.personalEmail) return;
    navigator.clipboard.writeText(exec.personalEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPhone = (e: React.MouseEvent, phoneToCopy: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phoneToCopy);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div
      onClick={() => onSelect(business)}
      onMouseEnter={() => onHover?.(business.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`group relative rounded-3xl border transition-all duration-150 cursor-pointer overflow-hidden ${
        isCheckedForBatch
          ? 'bg-indigo-50/40 border-indigo-500 shadow-md ring-2 ring-indigo-500/25'
          : isHighlighted
            ? 'bg-amber-50/25 border-amber-400 shadow-lg ring-2 ring-amber-400/50 scale-[1.01]'
            : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {/* Top Card Bar */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Batch Select Checkbox */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onToggleBatchCheck(business.id);
              }}
              className="pt-0.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={isCheckedForBatch}
                onChange={() => {}}
                className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-100 text-slate-700">
                  {business.category}
                </span>

                {business.country && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                    <Globe2 className="w-3 h-3 text-indigo-500" />
                    <span>{business.country}</span>
                  </span>
                )}

                {business.rating && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/50">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{business.rating.toFixed(1)}</span>
                    <span className="text-amber-600/70 font-normal">({business.reviewCount || 0})</span>
                  </span>
                )}

                <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                  {business.zipcode}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                {business.name}
              </h3>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {business.address}, {business.city}{business.state ? `, ${business.state}` : ''} {business.zipcode} {business.country ? `(${business.country})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Action Links & Favorite Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {toggleFav && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFav(business, e);
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs group/fav active:scale-95 ${
                  isFav
                    ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 shadow-amber-500/10'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50/50'
                }`}
                title={isFav ? 'Favorited in Favorites section (Click to remove)' : 'Click to add business to Favorites'}
              >
                <Star
                  className={`w-3.5 h-3.5 transition-transform group-hover/fav:scale-110 ${
                    isFav ? 'fill-amber-400 text-amber-500' : 'text-slate-400 group-hover/fav:text-amber-500'
                  }`}
                />
                <span className="text-[11px] font-bold">
                  {isFav ? 'Favorited' : 'Favorite'}
                </span>
              </button>
            )}
            {business.website && (
              <a
                href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Visit Website"
              >
                <Globe className="w-4 h-4" />
              </a>
            )}
            <a
              href={business.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(business.name + ' ' + business.address + ' ' + (business.country || ''))}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Open Google Maps"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Business Phone & Basic Meta */}
        {business.phone && (
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 font-medium font-mono text-[11px]">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>Direct Switchboard: {business.phone}</span>
            </div>
            <button
              onClick={(e) => handleCopyPhone(e, business.phone!)}
              className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer text-[11px] flex items-center gap-1"
            >
              {copiedPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>

      {/* EXECUTIVE INTELLIGENCE & DEEP CRAWL SECTION */}
      <div className="px-5 pb-5 pt-1.5">
        {isCrawling ? (
          /* Active Crawl Animation */
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <span>OSINT Grounding & Mailbox Search Active...</span>
              </div>
              <span className="text-[10px] font-mono text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full font-bold">
                Gemini Global Grounding
              </span>
            </div>
            <div className="space-y-1 text-xs text-amber-800/80 pl-3">
              <p className="flex items-center gap-1.5 animate-pulse">
                • Investigating registered executive leadership & business filings...
              </p>
              <p className="flex items-center gap-1.5 opacity-80 text-emerald-800 font-semibold">
                • Anti-generic filter: auto-excluding info@ / contact@ / support@
              </p>
            </div>
          </div>
        ) : isEnriched && exec ? (
          /* Enriched Decision Maker Result */
          <div className={`rounded-2xl p-4 border transition-all ${
            hasPersonalEmail 
              ? 'bg-emerald-50/60 border-emerald-200/80 shadow-2xs' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            {/* Header: Executive Name & Title */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs ${
                  hasPersonalEmail ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200'
                }`}>
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    {exec.executiveName || 'Executive Officer'}
                    {exec.linkedInUrl && (
                      <a
                        href={exec.linkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-indigo-600 hover:text-indigo-800 transition-colors"
                        title="View LinkedIn Profile"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    {exec.executiveTitle || 'Owner & Principal Executive'}
                  </p>
                </div>
              </div>

              {/* Confidence Badge */}
              <div className="shrink-0 flex items-center gap-1">
                {hasPersonalEmail && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 border border-emerald-300/50">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                    Personal Mailbox
                  </span>
                )}
              </div>
            </div>

            {/* Verified Personal Email */}
            {hasPersonalEmail ? (
              <div className="mt-3 bg-white rounded-xl p-3 border border-emerald-200/80 shadow-2xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-bold text-slate-900 truncate selection:bg-emerald-200">
                      {exec.personalEmail}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Direct Verified • Generic Aliases Filtered
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
                  title="Copy Personal Email"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="mt-2.5 bg-amber-50/60 rounded-xl p-2.5 border border-amber-200/60 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 leading-tight">
                  <span className="font-bold">Anti-Generic Policy:</span> Shared aliases (contact@, info@, support@) excluded. No direct personal mailbox publicly disclosed.
                </p>
              </div>
            )}

            {/* Direct Phone / Additional Info */}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-1">
                {exec.directPhone ? (
                  <span className="font-semibold text-slate-800 flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    Direct Line: {exec.directPhone}
                  </span>
                ) : (
                  <span>Switchboard On Record</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const individuals = extractAllCrawledIndividuals([business]);
                    if (individuals.length > 0) {
                      exportSingleIndividualToVCF(individuals[0]);
                    }
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Save this individual contact to your address book (.vcf)"
                >
                  <Download className="w-3 h-3 text-indigo-600" />
                  <span>Save Contact</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(business);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors cursor-pointer text-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Dossier</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Unsearched Call To Action Button */
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCrawl(business);
            }}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-black text-white rounded-2xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 group/btn"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400 group-hover/btn:scale-110 transition-transform" />
            <span>Deep Crawl Decision Maker</span>
          </button>
        )}
      </div>
    </div>
  );
};
