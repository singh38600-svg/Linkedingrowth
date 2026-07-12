import { useState } from 'react';
import { 
  Clock, 
  Layers, 
  Calendar, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Bookmark, 
  BookmarkCheck, 
  ExternalLink,
  Users,
  Target,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { DailyResearchDevelopment } from '../types';

interface DevelopmentCardProps {
  key?: string | number;
  dev: DailyResearchDevelopment;
  onCreateGroundedIdea: (dev: DailyResearchDevelopment) => void | Promise<void>;
  onSaveDevelopment: (dev: DailyResearchDevelopment) => void;
  isSaved: boolean;
}

export default function DevelopmentCard({ dev, onCreateGroundedIdea, onSaveDevelopment, isSaved }: DevelopmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract tidy domain label for source link
  const getDomainLabel = (urlStr: string, publisher: string): string => {
    if (publisher && publisher.trim() !== '') {
      return publisher;
    }
    try {
      const url = new URL(urlStr);
      return url.hostname.replace('www.', '');
    } catch {
      return 'Official Source';
    }
  };

  return (
    <div 
      className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 hover:border-indigo-500/20 transition-all text-left relative"
    >
      {/* Top Meta info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/40">
        <div className="flex flex-wrap gap-2">
          <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] sm:text-xs font-mono px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {dev.category}
          </span>
          <span className="bg-slate-800/60 border border-slate-700/50 text-slate-300 text-[10px] sm:text-xs font-mono px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {dev.developmentDate}
          </span>
          <span className={`border text-[10px] sm:text-xs font-mono px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
            dev.sourceConfidence === 'High' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : dev.sourceConfidence === 'Medium'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-slate-800/60 border-slate-700/50 text-slate-400'
          }`}>
            <Award className="w-3 h-3" />
            Confidence: {dev.sourceConfidence}
          </span>
        </div>

        {/* Individual Save Button */}
        <button
          type="button"
          onClick={() => onSaveDevelopment(dev)}
          className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
            isSaved 
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/60' 
              : 'bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-800/80 hover:text-white'
          }`}
          title={isSaved ? "Saved to local storage" : "Save development"}
        >
          {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          <span className="text-[10px] font-semibold">{isSaved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* Headline & Core Summary */}
      <div className="space-y-2">
        <h4 className="text-base sm:text-lg font-sans font-bold text-white leading-snug tracking-tight">
          {dev.headline}
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">What Happened</span>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{dev.whatHappened}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Why It Matters</span>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{dev.whyItMatters}</p>
          </div>
        </div>
      </div>

      {/* Expandable Section */}
      {isExpanded && (
        <div className="pt-4 border-t border-slate-800/40 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/20 p-3 sm:p-4 rounded-xl border border-slate-800/40 space-y-1.5">
              <span className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Who Is Affected
              </span>
              <div className="flex flex-wrap gap-1.5">
                {dev.whoIsAffected.map((who, i) => (
                  <span key={i} className="bg-slate-800/40 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700/30">
                    {who}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-slate-950/20 p-3 sm:p-4 rounded-xl border border-slate-800/40 space-y-1.5">
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
                Practical Application
              </span>
              <p className="text-slate-300 text-xs leading-relaxed">{dev.practicalApplication}</p>
            </div>

            <div className="bg-slate-950/20 p-3 sm:p-4 rounded-xl border border-slate-800/40 space-y-1.5">
              <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Limitations & Uncertainty
              </span>
              <p className="text-slate-300 text-xs leading-relaxed">{dev.limitationsOrUncertainty}</p>
            </div>

            <div className="bg-slate-950/20 p-3 sm:p-4 rounded-xl border border-slate-800/40 space-y-1.5">
              <span className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                LinkedIn Post Opportunity
              </span>
              <p className="text-slate-300 text-xs leading-relaxed">{dev.linkedInOpportunity}</p>
            </div>
          </div>

          {/* Clean Sources links */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Verified Sources</span>
            <div className="flex flex-wrap gap-2">
              {dev.sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/30 hover:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  <span className="font-semibold">{getDomainLabel(src.url, src.publisher)}:</span>
                  <span className="text-slate-400 font-normal truncate max-w-[200px]">{src.title}</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom control buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/30 gap-4">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors focus:outline-none"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Show Less</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>Show More details</span>
            </>
          )}
        </button>

        {/* Create LinkedIn Idea Action */}
        <button
          type="button"
          onClick={() => onCreateGroundedIdea(dev)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg hover:shadow-indigo-500/15 inline-flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Create LinkedIn Idea From This Research</span>
        </button>
      </div>
    </div>
  );
}
