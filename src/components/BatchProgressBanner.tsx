import React from 'react';
import { Zap, ShieldCheck, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface BatchProgressBannerProps {
  isCrawling: boolean;
  totalToCrawl: number;
  completedCount: number;
  personalEmailsFound: number;
  currentBusinessName?: string;
  onCancel?: () => void;
}

export const BatchProgressBanner: React.FC<BatchProgressBannerProps> = ({
  isCrawling,
  totalToCrawl,
  completedCount,
  personalEmailsFound,
  currentBusinessName,
  onCancel,
}) => {
  if (!isCrawling) return null;

  const percent = totalToCrawl > 0 ? Math.round((completedCount / totalToCrawl) * 100) : 0;

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3.5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Zap className="w-5 h-5 animate-pulse text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Global OSINT Intelligence Deep Crawl
              </h3>
              <span className="text-[10px] font-mono font-bold bg-slate-800 text-amber-400 px-2 py-0.5 rounded-full border border-slate-700">
                {completedCount} / {totalToCrawl} ({percent}%)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Target: <span className="font-semibold text-white">{currentBusinessName || 'Querying registry filings...'}</span></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{personalEmailsFound} Direct Mailboxes Found</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300 font-medium bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Generic Aliases Auto-Excluded</span>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
        <div
          className="bg-gradient-to-r from-amber-400 to-emerald-400 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.max(percent, 4)}%` }}
        ></div>
      </div>
    </div>
  );
};
