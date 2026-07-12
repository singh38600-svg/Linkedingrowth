import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  PenSquare, Sparkles, Copy, Check, FileText, Lightbulb, 
  ArrowRight, ExternalLink, Bookmark, Award, Info, 
  RefreshCw, Smile, AlignLeft, ShieldAlert, CheckCircle, 
  AlertTriangle, XCircle, ChevronDown, ChevronUp, AlertCircle, HelpCircle
} from 'lucide-react';
import { CreatorProfile, WinnerSelection, GeneratedPost, PostCredibilityReport, PostClaimEvaluation, PublicationReadiness, PersonalClaimConfirmation } from '../types';

interface PostStudioViewProps {
  profile: CreatorProfile;
  setActiveTab: (tab: 'home' | 'ideas' | 'post-studio' | 'settings') => void;
}

const CTA_OPTIONS = [
  { id: 'none', label: 'None (No Call-to-Action)', text: '' },
  { id: 'save', label: 'Save for later', text: '🔖 Save this post for later if you found it useful.' },
  { id: 'share', label: 'Share with network', text: '🔄 Share this with your network to help other professionals work smarter.' },
  { id: 'profile', label: 'Visit profile', text: '🔗 Visit my profile for more practical AI workflows.' },
  { id: 'follow', label: 'Follow for daily insights', text: '🔔 Follow me for daily, zero-hype AI insights.' }
];

const LOADING_STEPS = [
  "Extracting meaningful claims...",
  "Checking factual boundaries...",
  "Reviewing personal claims...",
  "Testing the hook promise...",
  "Preparing safe rewrites..."
];

function getDraftFingerprint(hook: string, body: string, cta: string, winnerId: string): string {
  const raw = `${hook}||${body}||${cta}||${winnerId}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString();
}

export default function PostStudioView({ profile, setActiveTab }: PostStudioViewProps) {
  // Winner State
  const [winner, setWinner] = useState<WinnerSelection | null>(null);
  
  // Generation States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Studio Interactive States
  const [activeHookType, setActiveHookType] = useState<'curiosity' | 'practicalResult' | 'contrarian'>('curiosity');
  const [editableBodyText, setEditableBodyText] = useState('');
  const [selectedCtaId, setSelectedCtaId] = useState('none');
  const [customCtaText, setCustomCtaText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Credibility and Fact Check States
  const [isCheckingCredibility, setIsCheckingCredibility] = useState(false);
  const [credibilityReport, setCredibilityReport] = useState<PostCredibilityReport | null>(null);
  const [credibilityCheckError, setCredibilityCheckError] = useState<string | null>(null);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [personalConfirmations, setPersonalConfirmations] = useState<Record<string, string>>({});
  const [expandedClaims, setExpandedClaims] = useState<Record<string, boolean>>({});
  const [copiedClaimId, setCopiedClaimId] = useState<string | null>(null);

  // Dialog Modals States
  const [showConfirmModal, setShowConfirmModal] = useState<{ claimId: string; claimText: string } | null>(null);
  const [showCopyWarningModal, setShowCopyWarningModal] = useState(false);

  // Humanization / Adjustment States
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

  // Load winner and drafts on mount
  useEffect(() => {
    const savedWinner = localStorage.getItem('selected_winner');
    if (savedWinner) {
      try {
        const parsed = JSON.parse(savedWinner);
        setWinner(parsed);
        
        // Also check if there is a saved draft for this specific winner
        const savedDraft = localStorage.getItem(`post_draft_${parsed.winnerId}`);
        if (savedDraft) {
          const draftParsed = JSON.parse(savedDraft);
          setGeneratedPost(draftParsed.generatedPost);
          setActiveHookType(draftParsed.activeHookType || 'curiosity');
          setEditableBodyText(draftParsed.editableBodyText || '');
          setSelectedCtaId(draftParsed.selectedCtaId || 'none');
          setCredibilityReport(draftParsed.credibilityReport || null);
          setPersonalConfirmations(draftParsed.personalConfirmations || {});
          setCustomCtaText(draftParsed.customCtaText || '');
        }
      } catch (e) {
        console.error('Failed to parse selected_winner or post draft', e);
      }
    }
  }, []);

  // Update customCtaText when selectedCtaId changes, unless customCtaText is overridden
  useEffect(() => {
    const matched = CTA_OPTIONS.find(c => c.id === selectedCtaId);
    if (matched) {
      setCustomCtaText(matched.text);
    }
  }, [selectedCtaId]);

  // Save drafts dynamically
  useEffect(() => {
    if (winner && generatedPost) {
      const draft = {
        generatedPost,
        activeHookType,
        editableBodyText,
        selectedCtaId,
        credibilityReport,
        personalConfirmations,
        customCtaText
      };
      localStorage.setItem(`post_draft_${winner.winnerId}`, JSON.stringify(draft));
    }
  }, [winner, generatedPost, activeHookType, editableBodyText, selectedCtaId, credibilityReport, personalConfirmations, customCtaText]);

  // Navigate to Ideas page
  const handleGoToIdeas = () => {
    setActiveTab('ideas');
  };

  // Generate LinkedIn Post
  const handleGeneratePost = async () => {
    if (!winner) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedPost(null);
    setCredibilityReport(null);
    setPersonalConfirmations({});

    try {
      const res = await fetch('/api/gemini/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile,
          winningIdea: winner.winningIdea,
          evaluation: winner.evaluation
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.errorMessage || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.post) {
        setGeneratedPost(data.post);
        setEditableBodyText(data.post.body);
        setActiveHookType('curiosity');
        setSelectedCtaId('none');
        setCustomCtaText('');
      } else {
        setGenerationError(data.errorMessage || 'Failed to generate LinkedIn post. Please run again.');
      }
    } catch (err: any) {
      console.error('Failed to generate post', err);
      setGenerationError(err.message || 'The post did not pass validation. Please run again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Humanize / Adjust Post
  const handleAdjustPost = async (adjustmentType: 'human' | 'conversational' | 'direct' | 'beginner') => {
    if (!winner || !generatedPost) return;

    setIsAdjusting(true);
    setAdjustmentError(null);

    // Prepare full current text to adjust
    const activeHook = generatedPost.hooks[activeHookType];
    const fullTextToAdjust = `${activeHook}\n\n${editableBodyText}`;

    try {
      const res = await fetch('/api/gemini/adjust-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile,
          postContent: fullTextToAdjust,
          adjustmentType,
          winningIdea: winner.winningIdea
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.errorMessage || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.adjustedText) {
        const lines = data.adjustedText.split('\n\n');
        if (lines.length > 1) {
          const firstLine = lines[0];
          const remainingLines = lines.slice(1).join('\n\n');
          
          const updatedHooks = {
            ...generatedPost.hooks,
            [activeHookType]: firstLine
          };
          
          setGeneratedPost({
            ...generatedPost,
            hooks: updatedHooks
          });
          setEditableBodyText(remainingLines);
        } else {
          const updatedHooks = {
            ...generatedPost.hooks,
            [activeHookType]: ''
          };
          setGeneratedPost({
            ...generatedPost,
            hooks: updatedHooks
          });
          setEditableBodyText(data.adjustedText);
        }
      } else {
        setAdjustmentError(data.errorMessage || 'Failed to adjust post. Please try another styling.');
      }
    } catch (err: any) {
      console.error('Failed to adjust post', err);
      setAdjustmentError(err.message || 'Post adjustment failed due to safety limits or connection errors.');
    } finally {
      setIsAdjusting(false);
    }
  };

  // Get current active hook text
  const getActiveHook = () => {
    if (!generatedPost) return '';
    return generatedPost.hooks[activeHookType] || '';
  };

  // Get current active CTA text
  const getActiveCtaText = () => {
    if (customCtaText) return customCtaText;
    const matched = CTA_OPTIONS.find(c => c.id === selectedCtaId);
    return matched ? matched.text : '';
  };

  // Stitch full post
  const getStitchedPost = () => {
    const hook = getActiveHook();
    const body = editableBodyText;
    const cta = getActiveCtaText();

    let text = '';
    if (hook) text += hook;
    if (body) {
      if (text) text += '\n\n';
      text += body;
    }
    if (cta) {
      if (text) text += '\n\n';
      text += cta;
    }
    return text;
  };

  // Trigger Credibility Check
  const handleCheckCredibility = async () => {
    if (!winner || !generatedPost) return;

    setIsCheckingCredibility(true);
    setCredibilityCheckError(null);
    setLoadingStepIndex(0);

    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1500);

    try {
      const activeHook = getActiveHook();
      const bodyText = editableBodyText;
      const ctaText = getActiveCtaText();

      const res = await fetch('/api/gemini/credibility-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile,
          winningIdea: winner.winningIdea,
          winnerId: winner.winnerId,
          hook: activeHook,
          body: bodyText,
          cta: ctaText
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.errorMessage || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.report) {
        setCredibilityReport(data.report);
      } else {
        setCredibilityCheckError(data.errorMessage || 'Failed to analyze draft. Please try again.');
      }
    } catch (err: any) {
      console.error('Credibility check error', err);
      setCredibilityCheckError(err.message || 'Failed to verify credibility. Please run the check again.');
    } finally {
      clearInterval(interval);
      setIsCheckingCredibility(false);
    }
  };

  // Calculate Draft Fingerprint
  const currentFingerprint = getDraftFingerprint(
    getActiveHook(),
    editableBodyText,
    getActiveCtaText(),
    winner ? winner.winnerId : ''
  );

  const isReportStale = !!(credibilityReport && credibilityReport.draftFingerprint !== currentFingerprint);

  // Publication Readiness
  const getPublicationReadiness = (): PublicationReadiness => {
    if (!credibilityReport) return 'Draft not checked';
    if (isReportStale) return 'Credibility check outdated';
    if (credibilityReport.overallStatus === 'Fail') return 'Changes required';
    if (credibilityReport.overallStatus === 'Pass with warnings') return 'Ready with warnings';
    return 'Ready to publish';
  };

  // Copy Post with Safe Warning modal
  const handleCopyPostClick = () => {
    const text = getStitchedPost();
    if (!text) return;

    const readiness = getPublicationReadiness();
    if (readiness === 'Changes required' || readiness === 'Credibility check outdated') {
      setShowCopyWarningModal(true);
    } else {
      executeCopy();
    }
  };

  const executeCopy = () => {
    const text = getStitchedPost();
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        setShowCopyWarningModal(false);
      })
      .catch((err) => {
        console.error('Failed to copy text', err);
      });
  };

  // Claim Actions
  const handleApplyClaimRewrite = (claim: PostClaimEvaluation) => {
    if (!generatedPost || !claim.suggestedRewrite) return;

    if (claim.location === 'Hook') {
      const currentHookText = generatedPost.hooks[activeHookType];
      const updatedHooks = {
        ...generatedPost.hooks,
        [activeHookType]: currentHookText.includes(claim.claimText)
          ? currentHookText.replace(claim.claimText, claim.suggestedRewrite)
          : claim.suggestedRewrite
      };
      setGeneratedPost({ ...generatedPost, hooks: updatedHooks });
    } else if (claim.location === 'CTA') {
      setCustomCtaText(claim.suggestedRewrite);
    } else {
      if (editableBodyText.includes(claim.claimText)) {
        setEditableBodyText(editableBodyText.replace(claim.claimText, claim.suggestedRewrite));
      } else {
        setEditableBodyText(prev => prev + '\n\n' + claim.suggestedRewrite);
      }
    }
  };

  const handleCopyClaimRewrite = (claimId: string, rewriteText: string) => {
    navigator.clipboard.writeText(rewriteText).then(() => {
      setCopiedClaimId(claimId);
      setTimeout(() => setCopiedClaimId(null), 1500);
    });
  };

  const handleConfirmPersonally = (claimId: string) => {
    setPersonalConfirmations(prev => ({
      ...prev,
      [claimId]: new Date().toISOString()
    }));
    setShowConfirmModal(null);
  };

  const handleRemoveClaim = (claim: PostClaimEvaluation) => {
    const cleanRemove = (original: string, toRemove: string) => {
      let result = original.replace(toRemove, '');
      result = result.replace(/ {2,}/g, ' ');
      result = result.replace(/\n{3,}/g, '\n\n');
      return result.trim();
    };

    if (claim.location === 'Hook') {
      const updatedHooks = {
        ...generatedPost.hooks,
        [activeHookType]: cleanRemove(generatedPost.hooks[activeHookType], claim.claimText)
      };
      setGeneratedPost({ ...generatedPost, hooks: updatedHooks });
    } else if (claim.location === 'CTA') {
      setCustomCtaText(cleanRemove(getActiveCtaText(), claim.claimText));
    } else {
      setEditableBodyText(cleanRemove(editableBodyText, claim.claimText));
    }
  };

  const toggleClaimExpand = (claimId: string) => {
    setExpandedClaims(prev => ({
      ...prev,
      [claimId]: !prev[claimId]
    }));
  };

  const handleApplySaferHook = (suggestedHook: string) => {
    if (!generatedPost) return;
    const updatedHooks = {
      ...generatedPost.hooks,
      [activeHookType]: suggestedHook
    };
    setGeneratedPost({ ...generatedPost, hooks: updatedHooks });
  };

  const handleInsertUncertainty = (suggestedText: string) => {
    setEditableBodyText(prev => `${prev}\n\n${suggestedText}`);
  };

  // Render Status Badge
  const renderStatusBadge = (status: 'Pass' | 'Pass with warnings' | 'Fail') => {
    switch (status) {
      case 'Pass':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono font-bold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Pass</span>
          </div>
        );
      case 'Pass with warnings':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-mono font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Pass with Warnings</span>
          </div>
        );
      case 'Fail':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-mono font-bold">
            <XCircle className="w-3.5 h-3.5" />
            <span>Fail</span>
          </div>
        );
    }
  };

  // Empty State
  if (!winner) {
    return (
      <div id="post-studio-empty-state" className="max-w-xl mx-auto text-center py-16 px-4 space-y-8 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
          <PenSquare className="w-8 h-8 text-slate-500" />
        </div>
        
        <div className="space-y-3">
          <h2 className="text-2xl font-sans font-extrabold text-white tracking-tight">
            Select a winning idea first
          </h2>
          <p className="text-slate-400 font-sans text-sm leading-relaxed max-w-sm mx-auto">
            Choose one of the Top 3 Winner Ideas from the Idea Stress Test before creating a post.
          </p>
        </div>

        <button
          onClick={handleGoToIdeas}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/25 text-sm flex items-center gap-2 mx-auto cursor-pointer"
        >
          <span>Go to Ideas</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const { winningIdea, evaluation } = winner;
  const wordCount = getStitchedPost().split(/\s+/).filter(Boolean).length;
  const isPostCheckable = generatedPost && editableBodyText.trim().length > 0;

  return (
    <div id="post-studio-container" className="space-y-10 max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div className="text-left">
          <span className="text-[10px] text-blue-400 font-mono tracking-widest uppercase font-bold">Workspace Navigation / Post Studio</span>
          <h1 className="text-3xl font-sans font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
            <PenSquare className="w-7 h-7 text-blue-500" />
            <span>Post Studio</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Transform Rohit's stress-tested winner idea into a pristine, high-utility LinkedIn post.
          </p>
        </div>
        
        <button
          onClick={handleGoToIdeas}
          className="self-start md:self-auto text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Change selected idea</span>
        </button>
      </header>

      {/* SELECTED WINNER SUMMARY CARD */}
      <section className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase block">Active Stress Test Winner</span>
              <h3 className="font-sans font-bold text-lg text-white leading-tight">
                {winningIdea.title}
              </h3>
            </div>
          </div>
          <span className="self-start sm:self-auto inline-block bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono px-2.5 py-1 rounded-lg">
            {winningIdea.ideaType}
          </span>
        </div>

        {/* METADATA GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
          <div className="space-y-1 text-left">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase block">Primary Audience</span>
            <p className="text-slate-200 font-sans font-semibold">{winningIdea.primaryAudience}</p>
          </div>
          <div className="space-y-1 text-left">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase block">Content Pillar</span>
            <p className="text-slate-200 font-sans font-semibold">{winningIdea.contentPillar}</p>
          </div>
          <div className="space-y-1 text-left">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase block">Recommended Format</span>
            <p className="text-slate-200 font-sans font-semibold">{winningIdea.recommendedFormat}</p>
          </div>
          <div className="md:col-span-2 lg:col-span-3 space-y-1 bg-slate-900/30 p-3.5 rounded-xl border border-slate-900/55 text-left">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase block">Core Angle & Insight</span>
            <p className="text-slate-300 font-sans leading-relaxed">{winningIdea.coreIdea}</p>
          </div>
          <div className="md:col-span-2 lg:col-span-3 space-y-1 bg-slate-900/30 p-3.5 rounded-xl border border-slate-900/55 text-left">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase block">Reader Payoff</span>
            <p className="text-slate-300 font-sans leading-relaxed">{winningIdea.readerPayoff}</p>
          </div>
          <div className="md:col-span-2 lg:col-span-3 space-y-1 bg-slate-900/30 p-3.5 rounded-xl border border-slate-900/55 text-left">
            <span className="text-[10px] text-amber-500 font-mono tracking-wider uppercase block">Factual Boundary & Uncertainties</span>
            <p className="text-slate-300 font-sans leading-relaxed text-xs">
              <span className="font-semibold block text-slate-400 mb-0.5">Facts Boundary:</span>
              {winningIdea.factBoundary || 'No strict facts boundary declared.'}
            </p>
            {winningIdea.uncertaintyToMention && (
              <p className="text-slate-300 font-sans leading-relaxed text-xs mt-2 pt-2 border-t border-slate-900/40">
                <span className="font-semibold block text-slate-400 mb-0.5">Required Uncertainty Limits:</span>
                {winningIdea.uncertaintyToMention}
              </p>
            )}
          </div>
        </div>

        {/* DETAILS ACCORDION FOR SOURCES */}
        <div className="pt-4 border-t border-slate-900 flex flex-wrap gap-4 justify-between items-center text-xs text-left">
          <div className="flex items-center gap-2 text-slate-400">
            <Info className="w-4 h-4 text-slate-500" />
            <span>Factual boundary context successfully connected.</span>
          </div>
          
          {winningIdea.sourceReferences && winningIdea.sourceReferences.length > 0 && (
            <div className="flex items-center gap-1.5 bg-blue-500/5 border border-blue-500/10 px-3 py-1.5 rounded-lg text-blue-400">
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="font-mono font-bold">{winningIdea.sourceReferences.length} Connected Source URLs</span>
            </div>
          )}
        </div>
      </section>

      {/* GENERATION TRIGGER STATE */}
      {!generatedPost && !isGenerating && (
        <div className="bg-slate-950/40 border border-slate-900 rounded-3xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-600/10 border border-blue-600/20 rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-blue-400" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h4 className="font-sans font-bold text-lg text-white">Generate Rohit's Post Draft</h4>
            <p className="text-slate-400 text-xs font-sans leading-relaxed">
              Weave stress-test corrections, limitations, and your profile's detail guidelines ({profile.detailLevel}) into a complete structured draft.
            </p>
          </div>

          {generationError && (
            <div className="max-w-md mx-auto bg-red-950/20 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-left">
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-mono font-bold text-red-400 uppercase block">Generation Warning</span>
                <p className="text-xs font-sans text-slate-300 leading-normal mt-1">{generationError}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleGeneratePost}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition-all shadow-xl shadow-blue-900/30 text-sm flex items-center gap-2 mx-auto cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>Generate LinkedIn Post</span>
          </button>
        </div>
      )}

      {/* LOADING STATE */}
      {isGenerating && (
        <div className="bg-slate-950/40 border border-slate-900 rounded-3xl p-16 text-center space-y-6 animate-pulse">
          <div className="w-16 h-16 border-2 border-t-blue-500 border-r-transparent border-slate-800 rounded-full flex items-center justify-center mx-auto animate-spin" />
          <div className="space-y-2 max-w-sm mx-auto">
            <h4 className="font-sans font-bold text-base text-white">Ghostwriting your post...</h4>
            <p className="text-slate-500 text-xs font-mono uppercase tracking-wider">
              Enforcing zero-hype & factual bounds
            </p>
          </div>
        </div>
      )}

      {/* ACTIVE STUDIO INTERACTION PLATFORM */}
      {generatedPost && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* CONTROL SUITE (HOOK LAB & CONTROLS) - 7 COLS */}
          <div className="lg:col-span-7 space-y-8 text-left">
            
            {/* HOOK LAB SELECTOR */}
            <div className="bg-slate-950/50 border border-slate-900 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Smile className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-sans font-extrabold uppercase tracking-widest text-slate-400">
                  Hook Lab
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {/* Curiosity */}
                <button
                  onClick={() => setActiveHookType('curiosity')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    activeHookType === 'curiosity' 
                      ? 'bg-blue-600/10 border-blue-500 shadow-md' 
                      : 'bg-slate-900/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/10">
                      Curiosity hook
                    </span>
                    {activeHookType === 'curiosity' && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                  </div>
                  <p className="text-xs font-sans text-slate-300 leading-relaxed italic">
                    "{generatedPost.hooks.curiosity}"
                  </p>
                </button>

                {/* Practical Result */}
                <button
                  onClick={() => setActiveHookType('practicalResult')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    activeHookType === 'practicalResult' 
                      ? 'bg-emerald-600/10 border-emerald-500 shadow-md' 
                      : 'bg-slate-900/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">
                      Practical result hook
                    </span>
                    {activeHookType === 'practicalResult' && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </div>
                  <p className="text-xs font-sans text-slate-300 leading-relaxed italic">
                    "{generatedPost.hooks.practicalResult}"
                  </p>
                </button>

                {/* Contrarian */}
                <button
                  onClick={() => setActiveHookType('contrarian')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    activeHookType === 'contrarian' 
                      ? 'bg-amber-600/10 border-amber-500 shadow-md' 
                      : 'bg-slate-900/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10">
                      Contrarian hook
                    </span>
                    {activeHookType === 'contrarian' && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                  </div>
                  <p className="text-xs font-sans text-slate-300 leading-relaxed italic">
                    "{generatedPost.hooks.contrarian}"
                  </p>
                </button>
              </div>
            </div>

            {/* EDITABLE POST BODY */}
            <div className="bg-slate-950/50 border border-slate-900 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-between justify-between gap-2 pb-2">
                <div className="flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-sans font-extrabold uppercase tracking-widest text-slate-400">
                    Draft Body Editor
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  {editableBodyText.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>

              <textarea
                value={editableBodyText}
                onChange={(e) => setEditableBodyText(e.target.value)}
                rows={11}
                className="w-full bg-[#030712] border border-slate-900 rounded-2xl p-4 text-sm font-sans text-slate-200 leading-relaxed focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all placeholder-slate-600"
                placeholder="The rest of your post details..."
              />
            </div>

            {/* CTA SELECTION */}
            <div className="bg-slate-950/50 border border-slate-900 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-sans font-extrabold uppercase tracking-widest text-slate-400">
                  Choose Call to Action
                </h4>
              </div>

              <div className="relative">
                <select
                  value={selectedCtaId}
                  onChange={(e) => setSelectedCtaId(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-900 text-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-800 transition-all cursor-pointer"
                >
                  {CTA_OPTIONS.map((cta) => (
                    <option key={cta.id} value={cta.id}>
                      {cta.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCtaId !== 'none' && (
                <div className="p-3.5 bg-[#030712] rounded-xl border border-slate-900 text-xs font-sans text-slate-300">
                  <textarea
                    value={customCtaText}
                    onChange={(e) => setCustomCtaText(e.target.value)}
                    rows={2}
                    className="w-full bg-transparent text-xs font-sans text-slate-300 italic focus:outline-none leading-relaxed"
                    placeholder="Customize your CTA text..."
                  />
                </div>
              )}
            </div>

            {/* HUMANIZATION REVISIONS SUITE */}
            <div className="bg-slate-950/50 border border-slate-900 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-sans font-extrabold uppercase tracking-widest text-slate-400">
                  AI Humanization Adjustments
                </h4>
              </div>

              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Click any prompt style below to recalibrate tone, fix structural flow, and strip clinical markers while preserving formatting.
              </p>

              {adjustmentError && (
                <p className="text-xs text-red-400 font-sans italic bg-red-950/10 p-3 rounded-xl border border-red-500/10">
                  ⚠️ {adjustmentError}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <button
                  disabled={isAdjusting}
                  onClick={() => handleAdjustPost('human')}
                  className="px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800/60 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isAdjusting ? 'animate-spin' : ''}`} />
                  <span>More Human</span>
                </button>

                <button
                  disabled={isAdjusting}
                  onClick={() => handleAdjustPost('conversational')}
                  className="px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800/60 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isAdjusting ? 'animate-spin' : ''}`} />
                  <span>More Conversational</span>
                </button>

                <button
                  disabled={isAdjusting}
                  onClick={() => handleAdjustPost('direct')}
                  className="px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800/60 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isAdjusting ? 'animate-spin' : ''}`} />
                  <span>More Direct</span>
                </button>

                <button
                  disabled={isAdjusting}
                  onClick={() => handleAdjustPost('beginner')}
                  className="px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800/60 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isAdjusting ? 'animate-spin' : ''}`} />
                  <span>Beginner-friendly</span>
                </button>
              </div>
            </div>

            {/* MAIN FACT CHECK & CREDIBILITY WORKSPACE AREA */}
            <div id="credibility-panel-container" className="space-y-6">
              {/* STALE REPORT BANNER */}
              {isReportStale && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-semibold text-amber-300">Draft Changed Since Last Verification</h5>
                    <p className="text-xs text-slate-300 mt-1">
                      This post changed after the credibility check. Run the check again before publishing.
                    </p>
                  </div>
                </div>
              )}

              {/* REPORT DISPLAY */}
              {credibilityReport && (
                <div className="bg-slate-950/50 border border-slate-900 rounded-3xl p-6 space-y-8">
                  {/* OVERALL SUMMARY HEADER */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-900">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase font-bold block">
                        Factual Credibility Audit
                      </span>
                      <h4 className="text-lg font-bold text-white">Verification Results</h4>
                      <p className="text-xs text-slate-400 font-mono">
                        Audited on {new Date(credibilityReport.checkedAt).toLocaleDateString()} at {new Date(credibilityReport.checkedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      {renderStatusBadge(credibilityReport.overallStatus)}
                      <div className="flex flex-col items-center justify-center px-4 py-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
                        <span className="text-[9px] text-slate-500 font-mono tracking-wider block">SCORE</span>
                        <span className={`text-xl font-mono font-black ${
                          credibilityReport.credibilityScore >= 85 ? 'text-emerald-400' :
                          credibilityReport.credibilityScore >= 65 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {credibilityReport.credibilityScore}/100
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* HIGH LEVEL TALLY STRIP */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-900/30 p-3.5 rounded-2xl border border-slate-900/40 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">VERIFIED</span>
                      <span className="text-sm font-bold text-emerald-400">{credibilityReport.verifiedClaimCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">WARNINGS</span>
                      <span className="text-sm font-bold text-amber-400">{credibilityReport.warningClaimCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">HIGH RISK</span>
                      <span className="text-sm font-bold text-red-400">{credibilityReport.highRiskClaimCount}</span>
                    </div>
                  </div>

                  {/* SUMMARY SECTION */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">
                      Executive Summary
                    </h5>
                    <p className="text-sm font-sans text-slate-300 leading-relaxed bg-[#030712] border border-slate-900 rounded-2xl p-4">
                      {credibilityReport.summary}
                    </p>
                  </div>

                  {/* DETAILED CLAIM-BY-CLAIM CARDS */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">
                      Claim-by-Claim Verification ({credibilityReport.claims.length})
                    </h5>

                    {credibilityReport.claims.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No complex factual assertions found in this post.</p>
                    ) : (
                      <div className="space-y-3.5">
                        {credibilityReport.claims.map((claim) => {
                          const isExpanded = !!expandedClaims[claim.id];
                          const isConfirmed = !!personalConfirmations[claim.id];

                          return (
                            <div 
                              key={claim.id} 
                              className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                                claim.riskLevel === 'High' ? 'bg-red-950/5 border-red-500/20' :
                                claim.riskLevel === 'Medium' ? 'bg-amber-950/5 border-amber-500/20' : 'bg-slate-900/10 border-slate-900'
                              }`}
                            >
                              {/* COLLAPSED HEADER PANEL */}
                              <div 
                                onClick={() => toggleClaimExpand(claim.id)}
                                className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-900/30 transition-all select-none"
                              >
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-900/90 border border-slate-800 px-1.5 py-0.5 rounded uppercase">
                                      {claim.location}
                                    </span>
                                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                      claim.riskLevel === 'High' ? 'text-red-400 bg-red-500/10 border-red-500/10' :
                                      claim.riskLevel === 'Medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/10' : 'text-slate-400 bg-slate-900 border-slate-800'
                                    }`}>
                                      {claim.riskLevel} Risk
                                    </span>
                                    <span className="text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                                      {claim.classification}
                                    </span>
                                    {isConfirmed && (
                                      <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-1.5 py-0.5 rounded">
                                        ✓ Verified by Rohit
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-200 font-sans font-medium leading-relaxed truncate">
                                    "{claim.claimText}"
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border uppercase font-bold ${
                                    claim.recommendedAction === 'Keep' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10' :
                                    claim.recommendedAction === 'Remove' ? 'text-red-400 bg-red-500/10 border-red-500/10' : 'text-amber-400 bg-amber-500/10 border-amber-500/10'
                                  }`}>
                                    {claim.recommendedAction}
                                  </span>
                                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                </div>
                              </div>

                              {/* EXPANDED CONTENT PANEL */}
                              {isExpanded && (
                                <div className="p-4 border-t border-slate-900 bg-slate-950/40 space-y-4 animate-in slide-in-from-top duration-150">
                                  {/* Explanation */}
                                  <div className="space-y-1">
                                    <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase block">Review Analysis</span>
                                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{claim.explanation}</p>
                                  </div>

                                  {/* Attached Sources */}
                                  {claim.sourceReferences && claim.sourceReferences.length > 0 && (
                                    <div className="space-y-1.5">
                                      <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase block">Supporting Verified Sources</span>
                                      <div className="space-y-1">
                                        {claim.sourceReferences.map((ref, idx) => (
                                          <a 
                                            key={idx}
                                            href={ref.url}
                                            target="_blank"
                                            rel="noopener noreferrer referrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/5 hover:bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/10 transition-all"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>{ref.title || 'Verified Research URL'}</span>
                                            {ref.publisher && <span className="text-slate-500 text-[10px]">({ref.publisher})</span>}
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Suggested Rewrite Display */}
                                  {claim.suggestedRewrite && (
                                    <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1.5 text-left">
                                      <span className="text-[9px] text-blue-400 font-mono font-bold tracking-wider uppercase block">Suggested Rewrite</span>
                                      <p className="text-xs text-slate-200 italic font-sans">"{claim.suggestedRewrite}"</p>
                                    </div>
                                  )}

                                  {/* Action Controls Footer */}
                                  <div className="pt-3 border-t border-slate-900 flex flex-wrap gap-2 justify-end">
                                    {claim.suggestedRewrite && (
                                      <>
                                        <button
                                          onClick={() => handleApplyClaimRewrite(claim)}
                                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                        >
                                          <span>Apply Suggested Rewrite</span>
                                        </button>
                                        <button
                                          onClick={() => handleCopyClaimRewrite(claim.id, claim.suggestedRewrite || '')}
                                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                        >
                                          {copiedClaimId === claim.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                          <span>{copiedClaimId === claim.id ? 'Copied' : 'Copy Rewrite'}</span>
                                        </button>
                                      </>
                                    )}

                                    {claim.requiresRohitConfirmation && !isConfirmed && (
                                      <button
                                        onClick={() => setShowConfirmModal({ claimId: claim.id, claimText: claim.claimText })}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        <span>Confirm Personally</span>
                                      </button>
                                    )}

                                    {claim.recommendedAction === 'Remove' || claim.riskLevel === 'High' ? (
                                      <button
                                        onClick={() => handleRemoveClaim(claim)}
                                        className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-500/10 font-semibold text-xs rounded-lg transition-all cursor-pointer"
                                      >
                                        Remove Claim Text
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleRemoveClaim(claim)}
                                        className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-slate-400 font-semibold text-xs rounded-lg transition-all cursor-pointer"
                                      >
                                        Remove Statement
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* HOOK ASSESSMENT CARD */}
                  {credibilityReport.hookAssessment && (
                    <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Smile className="w-4 h-4 text-blue-400" />
                          <h5 className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">
                            Hook Promise Verification
                          </h5>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          credibilityReport.hookAssessment.status === 'Pass' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10' :
                          credibilityReport.hookAssessment.status === 'Warning' ? 'text-amber-400 bg-amber-500/10 border-amber-500/10' : 'text-red-400 bg-red-500/10 border-red-500/10'
                        }`}>
                          {credibilityReport.hookAssessment.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {credibilityReport.hookAssessment.explanation}
                      </p>

                      {credibilityReport.hookAssessment.suggestedRewrite && (
                        <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-2">
                          <span className="text-[9px] text-blue-400 font-mono font-bold tracking-wider block">Recommended Safer Hook</span>
                          <p className="text-xs text-slate-200 italic">"{credibilityReport.hookAssessment.suggestedRewrite}"</p>
                          <button
                            onClick={() => handleApplySaferHook(credibilityReport.hookAssessment.suggestedRewrite || '')}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] rounded-md transition-all cursor-pointer"
                          >
                            Apply Safer Hook
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* UNCERTAINTY ASSESSMENT CARD */}
                  {credibilityReport.uncertaintyAssessment && (
                    <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-indigo-400" />
                          <h5 className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">
                            Required Uncertainty & Limitations
                          </h5>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          credibilityReport.uncertaintyAssessment.status === 'Adequate' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10' :
                          credibilityReport.uncertaintyAssessment.status === 'Not required' ? 'text-slate-400 bg-slate-900 border-slate-800' : 'text-amber-400 bg-amber-500/10 border-amber-500/10'
                        }`}>
                          {credibilityReport.uncertaintyAssessment.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {credibilityReport.uncertaintyAssessment.explanation}
                      </p>

                      {credibilityReport.uncertaintyAssessment.status === 'Missing' && credibilityReport.uncertaintyAssessment.suggestedText && (
                        <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-2">
                          <span className="text-[9px] text-amber-500 font-mono font-bold tracking-wider block">Suggested Caveat Context</span>
                          <p className="text-xs text-slate-200 italic">"{credibilityReport.uncertaintyAssessment.suggestedText}"</p>
                          <button
                            onClick={() => handleInsertUncertainty(credibilityReport.uncertaintyAssessment.suggestedText || '')}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[10px] rounded-md transition-all cursor-pointer"
                          >
                            Insert Caveat naturally in Post
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SOURCE ASSESSMENT CARD */}
                  {credibilityReport.sourceAssessment && (
                    <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-emerald-400" />
                          <h5 className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">
                            Factual Research Coverage
                          </h5>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                          {credibilityReport.sourceAssessment.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {winningIdea.ideaType === 'Research-grounded' 
                          ? credibilityReport.sourceAssessment.explanation 
                          : "Evergreen/creator-led concept. Live source citations were not strictly required for the core thesis."}
                      </p>
                    </div>
                  )}

                  {/* RECOMMENDATION BLOCK */}
                  <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-2">
                    <h5 className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">
                      Publisher Recommendation
                    </h5>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {credibilityReport.publicationRecommendation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* REALISTIC PREVIEW BOARD - 5 COLS */}
          <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-6 text-left">
            
            {/* PUBLICATION READINESS COMPONENT */}
            <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 space-y-4">
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase font-bold block">
                Publication Readiness
              </span>

              {getPublicationReadiness() === 'Draft not checked' && (
                <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-bold text-slate-200">Not Audited</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Verify this draft before exporting. Audit checks for overpromises, missing caveats, and matches claims against verified research.
                  </p>
                </div>
              )}

              {getPublicationReadiness() === 'Credibility check outdated' && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-bold text-amber-300">Draft Changed</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    The post has manual modifications since the last credibility audit. Please re-run the verification to confirm accuracy.
                  </p>
                </div>
              )}

              {getPublicationReadiness() === 'Changes required' && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="text-sm font-bold text-red-300">Changes Required</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    This draft has unresolved high-risk claims or hook overpromises. Resolve issues before publishing.
                  </p>
                </div>
              )}

              {getPublicationReadiness() === 'Ready with warnings' && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-bold text-amber-300">Ready with Warnings</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Minor recommendations (e.g. clarification edits or unconfirmed personal claims) exist, but the post is safe to publish.
                  </p>
                </div>
              )}

              {getPublicationReadiness() === 'Ready to publish' && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-bold text-emerald-300">Ready to Publish</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Factual coverage matches verified bounds, required caveats are included, and the hook is highly credible!
                  </p>
                </div>
              )}
            </div>

            {/* THE MOCKUP CONTAINER */}
            <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 space-y-5">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase font-bold">
                  LinkedIn Desktop Mockup
                </span>
                
                <button
                  onClick={handleCopyPostClick}
                  className="text-xs text-blue-400 hover:text-blue-300 font-sans flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/5 hover:bg-blue-500/10 rounded-lg border border-blue-500/10 transition-all cursor-pointer"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Draft</span>
                    </>
                  )}
                </button>
              </div>

              {/* BRANDED HEADER (ROHIT) */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-sm shadow">
                  {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'R'}
                </div>
                <div>
                  <h5 className="font-sans font-bold text-sm text-white leading-snug">
                    {profile.fullName || 'Rohit Singh Panwar'}
                  </h5>
                  <p className="text-[10px] text-slate-400 truncate max-w-xs leading-normal">
                    {profile.linkedinHeadline || 'Vibe Coder | AI Growth strategist'}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-slate-500 font-mono">1h • </span>
                    <span className="text-[8px] bg-slate-900 border border-slate-800 text-slate-400 px-1 py-0.5 rounded-sm uppercase font-black tracking-wider">
                      Public
                    </span>
                  </div>
                </div>
              </div>

              {/* POST BODY STITCHED TEXT PREVIEW */}
              <div className="bg-[#030712] border border-slate-950 p-4 rounded-2xl min-h-[350px] relative">
                <div className="text-xs font-sans text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                  {getStitchedPost() || (
                    <span className="text-slate-600 italic">Post is empty. Select a hook or edit the body...</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono uppercase tracking-wider pt-1">
                <span>Total Words: {wordCount}</span>
                <span>Characters: {getStitchedPost().length}</span>
              </div>
            </div>

            {/* RUN AUDIT ACTION AREA */}
            <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 text-left space-y-4">
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase font-bold block">
                Verification Audit Core
              </span>
              
              <button
                disabled={!isPostCheckable || isCheckingCredibility}
                onClick={handleCheckCredibility}
                className={`w-full py-3.5 px-4 rounded-xl font-bold font-sans text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isPostCheckable && !isCheckingCredibility
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isCheckingCredibility ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-200" />
                    <span>{LOADING_STEPS[loadingStepIndex]}</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-blue-200" />
                    <span>Run Credibility Check</span>
                  </>
                )}
              </button>

              {!isPostCheckable && (
                <p className="text-[11px] text-slate-500 italic leading-relaxed text-center">
                  Verify draft is generated and has body content before executing.
                </p>
              )}

              {credibilityCheckError && (
                <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3 text-left">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <span className="font-mono font-bold text-red-400 block uppercase mb-1">Check Failed</span>
                    {credibilityCheckError}
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* DIALOG MODAL: ROHIT STATEMENT CONFIRMATION */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 max-w-md w-full space-y-6 text-left shadow-2xl">
            <div className="space-y-2">
              <span className="text-[10px] text-amber-500 font-mono tracking-widest uppercase font-bold block">
                Rohit Personal Confirmation
              </span>
              <h4 className="text-lg font-bold text-white leading-snug">Personal Verification Required</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                This claim references Rohit's personal experience or direct result:
              </p>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs italic text-slate-300 font-sans my-3">
                "{showConfirmModal.claimText}"
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                By marking this as personally confirmed, you represent that Rohit Singh Panwar has verified this specific statement as truthful, accurate, and completely free of artificial overstatements.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmPersonally(showConfirmModal.claimId)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                I Confirm Personally
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG MODAL: STALE OR FAIL COPY WARNING */}
      {showCopyWarningModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 max-w-md w-full space-y-5 text-left shadow-2xl">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-extrabold text-white leading-snug">Unresolved Credibility Risks</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans mt-2">
                This draft has unresolved credibility warnings, high-risk claims, or is currently out of sync with the latest verification audit.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                Publishing overpromised hooks or unsupported assertions damages professional credibility and trust on LinkedIn.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 justify-end pt-3">
              <button
                onClick={() => setShowCopyWarningModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer order-last sm:order-first"
              >
                Cancel & Review Draft
              </button>
              <button
                onClick={executeCopy}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Copy to Clipboard Anyway
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
