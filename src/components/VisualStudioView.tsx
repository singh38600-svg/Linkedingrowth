import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Image as ImageIcon, Camera, Trash2, ArrowRight, Download, Eye, EyeOff, Check, AlertTriangle, FileText, RefreshCw, PenSquare, Type as TypeIcon, Layers, Sliders, ChevronDown, ChevronUp, Save, CheckCircle2, Upload
} from 'lucide-react';
import { CreatorProfile, WinnerSelection, PostCredibilityReport, VisualFormatRecommendation, LinkedInVisualStyle, VisualAspectRatio, HeadlineSafeArea, GeneratedLinkedInVisual, VisualOverlaySettings, SavedVisualDraft } from '../types';

// ==========================================
// IndexedDB Helper
// ==========================================
const DB_NAME = "AI_LinkedIn_Growth_Studio_DB";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings");
      }
      if (!db.objectStoreNames.contains("visual_drafts")) {
        db.createObjectStore("visual_drafts");
      }
    };
    request.onsuccess = (event: any) => resolve(event.target.result);
    request.onerror = (event: any) => reject(event.target.error);
  });
}

const dbStore = {
  async get(storeName: string, key: string): Promise<any> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error("IDB get failed", e);
      return null;
    }
  },
  async set(storeName: string, key: string, value: any): Promise<void> {
    try {
      const db = await openDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error("IDB set failed", e);
    }
  },
  async delete(storeName: string, key: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error("IDB delete failed", e);
    }
  }
};

interface VisualStudioViewProps {
  profile: CreatorProfile;
  setActiveTab: (tab: 'home' | 'ideas' | 'post-studio' | 'settings' | 'visual-studio') => void;
}

const STRATEGY_LOADING_STEPS = [
  "Parsing post structure...",
  "Analyzing content hooks...",
  "Evaluating audience takeaway...",
  "Applying recommendation rules...",
  "Formulating visual prompt concept..."
];

const GENERATION_LOADING_STEPS = [
  "Processing reference photo...",
  "Formulating scene geometry...",
  "Applying style textures...",
  "Rendering base visual..."
];

export default function VisualStudioView({ profile, setActiveTab }: VisualStudioViewProps) {
  // Prerequisite states
  const [winner, setWinner] = useState<WinnerSelection | null>(null);
  const [stitchedPostText, setStitchedPostText] = useState('');
  const [credibilityReport, setCredibilityReport] = useState<PostCredibilityReport | null>(null);
  const [isPrereqMet, setIsPrereqMet] = useState(false);
  const [isCheckingPrereq, setIsCheckingPrereq] = useState(true);

  // Strategy Analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<VisualFormatRecommendation | null>(null);

  // Identity Reference Photo states
  const [referencePhoto, setReferencePhoto] = useState<string | null>(null);
  const [includeRohit, setIncludeRohit] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Generation Controls states
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<LinkedInVisualStyle>('Minimal statement card');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<VisualAspectRatio>('1:1');
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generationStepIndex, setGenerationStepIndex] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedVisual, setGeneratedVisual] = useState<GeneratedLinkedInVisual | null>(null);

  // Overlay Settings states
  const [showOverlay, setShowOverlay] = useState(true);
  const [headlineText, setHeadlineText] = useState('');
  const [supportingText, setSupportingText] = useState('');
  const [headlineSafeArea, setHeadlineSafeArea] = useState<HeadlineSafeArea>('Bottom 1/3');
  const [overlayOpacity, setOverlayOpacity] = useState(25); // dark scrim opacity 0-100
  const [textBgOpacity, setTextBgOpacity] = useState(0); // panel background opacity 0-100
  const [headlineColor, setHeadlineColor] = useState('#FFFFFF');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Section accordions
  const [isRefPhotoOpen, setIsRefPhotoOpen] = useState(true);
  const [isPromptControlsOpen, setIsPromptControlsOpen] = useState(true);
  const [isOverlayControlsOpen, setIsOverlayControlsOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Initialise and load settings, drafts, and prerequisites
  useEffect(() => {
    async function loadPrereqs() {
      setIsCheckingPrereq(true);
      const savedWinner = localStorage.getItem('selected_winner');
      if (savedWinner) {
        try {
          const parsedWinner: WinnerSelection = JSON.parse(savedWinner);
          setWinner(parsedWinner);

          // Get draft post
          const savedDraft = localStorage.getItem(`post_draft_${parsedWinner.winnerId}`);
          if (savedDraft) {
            const draftParsed = JSON.parse(savedDraft);
            
            // Reconstruct the stitched text
            const hookText = draftParsed.generatedPost?.hooks?.[draftParsed.activeHookType] || '';
            const bodyText = draftParsed.editableBodyText || '';
            
            let ctaText = '';
            if (draftParsed.customCtaText) {
              ctaText = draftParsed.customCtaText;
            } else if (draftParsed.selectedCtaId && draftParsed.selectedCtaId !== 'none') {
              const CTA_OPTIONS = [
                { id: 'save', text: '🔖 Save this post for later if you found it useful.' },
                { id: 'share', text: '🔄 Share this with your network to help other professionals work smarter.' },
                { id: 'profile', text: '🔗 Visit my profile for more practical AI workflows.' },
                { id: 'follow', text: '🔔 Follow me for daily, zero-hype AI insights.' }
              ];
              const matched = CTA_OPTIONS.find(c => c.id === draftParsed.selectedCtaId);
              if (matched) ctaText = matched.text;
            }

            let fullText = '';
            if (hookText) fullText += hookText;
            if (bodyText) {
              if (fullText) fullText += '\n\n';
              fullText += bodyText;
            }
            if (ctaText) {
              if (fullText) fullText += '\n\n';
              fullText += ctaText;
            }

            setStitchedPostText(fullText);
            setCredibilityReport(draftParsed.credibilityReport || null);

            // Determine if prereqs are met
            const hasPost = fullText.trim().length > 0;
            const hasReport = !!draftParsed.credibilityReport;
            
            // Credibility report fingerprint check (skip state mismatch warning block if the report exists)
            const overallStatus = draftParsed.credibilityReport?.overallStatus || '';
            const isReadinessOk = overallStatus === 'Pass' || overallStatus === 'Pass with warnings';

            if (hasPost && hasReport && isReadinessOk) {
              setIsPrereqMet(true);

              // Load existing saved visual draft from IndexedDB if exists
              const savedVisual: SavedVisualDraft = await dbStore.get("visual_drafts", parsedWinner.winnerId);
              if (savedVisual) {
                setRecommendation(savedVisual.recommendation);
                setGeneratedVisual(savedVisual.visual);
                setCustomPrompt(savedVisual.promptUsed);
                setSelectedStyle(savedVisual.styleUsed);
                setSelectedAspectRatio(savedVisual.aspectRatioUsed);
                
                // Overlay settings
                setShowOverlay(savedVisual.overlaySettings.showOverlay);
                setHeadlineText(savedVisual.overlaySettings.headlineText);
                setSupportingText(savedVisual.overlaySettings.supportingText || '');
                setHeadlineSafeArea(savedVisual.overlaySettings.headlineSafeArea);
                setOverlayOpacity(savedVisual.overlaySettings.overlayOpacity);
                setTextBgOpacity(savedVisual.overlaySettings.textBgOpacity);
                setHeadlineColor(savedVisual.overlaySettings.headlineColor || '#FFFFFF');
              }
            } else {
              setIsPrereqMet(false);
            }
          } else {
            setIsPrereqMet(false);
          }
        } catch (e) {
          console.error("Failed to check prerequisites:", e);
          setIsPrereqMet(false);
        }
      } else {
        setIsPrereqMet(false);
      }
      setIsCheckingPrereq(false);
    };

    loadPrereqs();

    // Load reference photo from DB
    async function loadRefPhoto() {
      const storedPhoto = await dbStore.get("settings", "rohit_reference_photo");
      if (storedPhoto) {
        setReferencePhoto(storedPhoto);
      }
    }
    loadRefPhoto();
  }, []);

  // 2. Refresh Canvas overlay drawing in the web preview whenever settings change
  useEffect(() => {
    if (!generatedVisual) return;
    
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = `data:image/png;base64,${generatedVisual.base64Data}`;
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw base image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (showOverlay) {
        // Draw standard dark overlay/scrim
        ctx.fillStyle = `rgba(15, 23, 42, ${overlayOpacity / 100})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate safe area position (Y coord)
        let y = canvas.height / 2;
        if (headlineSafeArea === 'Top 1/3') {
          y = canvas.height * 0.25;
        } else if (headlineSafeArea === 'Bottom 1/3') {
          y = canvas.height * 0.75;
        }

        // Draw panel backdrop if enabled
        if (textBgOpacity > 0) {
          ctx.fillStyle = `rgba(15, 23, 42, ${textBgOpacity / 100})`;
          const padX = canvas.width * 0.08;
          const padY = canvas.height * 0.07;
          ctx.fillRect(padX, y - padY, canvas.width - (padX * 2), padY * 2);
        }

        // Configure font size proportionally to canvas width
        const headSize = Math.floor(canvas.width * 0.05);
        ctx.font = `bold ${headSize}px "Inter", sans-serif`;
        ctx.fillStyle = headlineColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw wrapped headline
        const text = headlineText || "";
        const subText = supportingText || "";
        const wrapOffset = subText ? 15 : 0;
        
        wrapText(ctx, text, canvas.width / 2, y - wrapOffset, canvas.width * 0.8, headSize * 1.2);

        // Draw supporting text
        if (subText) {
          const subSize = Math.floor(canvas.width * 0.03);
          ctx.font = `${subSize}px "JetBrains Mono", monospace`;
          ctx.fillStyle = "rgba(226, 232, 240, 0.85)";
          ctx.fillText(subText, canvas.width / 2, y + (canvas.height * 0.08));
        }
      }
    };
  }, [generatedVisual, showOverlay, headlineText, supportingText, headlineSafeArea, overlayOpacity, textBgOpacity, headlineColor]);

  // Wrap text canvas utility
  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(" ");
    let line = "";
    const lines: string[] = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(line);
        line = words[n] + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    let currentY = y - ((lines.length - 1) * lineHeight) / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i].trim(), x, currentY);
      currentY += lineHeight;
    }
  }

  // 3. Handlers
  const handleGoToPostStudio = () => {
    setActiveTab('post-studio');
  };

  const handleAnalyzeVisualFormat = async () => {
    if (!winner || !credibilityReport) return;
    setIsAnalyzing(true);
    setAnalysisStepIndex(0);
    setAnalysisError(null);

    const stepInterval = setInterval(() => {
      setAnalysisStepIndex((prev) => (prev + 1) % STRATEGY_LOADING_STEPS.length);
    }, 1600);

    try {
      const response = await fetch('/api/gemini/analyze-visual-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile,
          winningIdea: winner.winningIdea,
          hook: stitchedPostText.split('\n\n')[0] || '',
          bodyText: stitchedPostText,
          credibilityReport
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.errorMessage || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.recommendation) {
        setRecommendation(data.recommendation);
        setCustomPrompt(data.recommendation.imagePromptDraft);
        setHeadlineText(data.recommendation.headlineSuggestion || '');
        setSupportingText(data.recommendation.supportingTextSuggestion || '');
        setSelectedStyle(data.recommendation.recommendedStyle as LinkedInVisualStyle || 'Minimal statement card');
        setSelectedAspectRatio(data.recommendation.recommendedAspectRatio as VisualAspectRatio || '1:1');
        
        // Auto enable Rohit reference if recommended
        if (data.recommendation.includeRohitRecommendation && referencePhoto) {
          setIncludeRohit(true);
        } else {
          setIncludeRohit(false);
        }
      } else {
        setAnalysisError(data.errorMessage || 'Failed to complete visual analysis. Please check your connection and try again.');
      }
    } catch (err: any) {
      console.error("Analysis failed", err);
      setAnalysisError(err.message || 'An unexpected error occurred during visual format recommendation.');
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
    }
  };

  // Upload photo handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setReferencePhoto(base64);
        await dbStore.set("settings", "rohit_reference_photo", base64);
        setIncludeRohit(true); // Auto check when upload succeeds
      }
      setIsUploadingPhoto(false);
    };
    reader.onerror = () => {
      setIsUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setReferencePhoto(null);
    setIncludeRohit(false);
    await dbStore.delete("settings", "rohit_reference_photo");
  };

  // Improve prompt helper
  const handleRefinePrompt = async () => {
    if (!customPrompt.trim()) return;
    setIsImprovingPrompt(true);
    try {
      const response = await fetch('/api/gemini/improve-visual-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userPrompt: customPrompt,
          style: selectedStyle,
          aspectRatio: selectedAspectRatio,
          includeRohit,
          negativeInstructions: recommendation?.negativeInstructions || []
        })
      });

      if (!response.ok) {
        throw new Error('Could not refine prompt. Please try again.');
      }

      const data = await response.json();
      if (data.success && data.improvedPrompt) {
        setCustomPrompt(data.improvedPrompt);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsImprovingPrompt(false);
    }
  };

  // Image generation
  const handleGenerateImage = async () => {
    if (!customPrompt.trim()) return;
    setIsGeneratingImage(true);
    setGenerationStepIndex(0);
    setGenerationError(null);

    const stepInterval = setInterval(() => {
      setGenerationStepIndex((prev) => (prev + 1) % GENERATION_LOADING_STEPS.length);
    }, 1800);

    try {
      const response = await fetch('/api/gemini/generate-visual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: customPrompt,
          style: selectedStyle,
          aspectRatio: selectedAspectRatio,
          includeRohit,
          referenceImageBase64: includeRohit ? referencePhoto : undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.errorMessage || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.visual) {
        setGeneratedVisual(data.visual);
      } else {
        setGenerationError(data.errorMessage || 'Failed to generate visual. Verify your API settings.');
      }
    } catch (err: any) {
      console.error("Generation failed", err);
      setGenerationError(err.message || 'Image generation service failed. Please try again later.');
    } finally {
      clearInterval(stepInterval);
      setIsGeneratingImage(false);
    }
  };

  // Save draft
  const handleSaveDraft = async () => {
    if (!winner || !recommendation || !generatedVisual) return;
    setIsSavingDraft(true);
    setSaveSuccess(false);

    try {
      const overlaySettings: VisualOverlaySettings = {
        showOverlay,
        headlineText,
        supportingText,
        headlineSafeArea,
        overlayOpacity,
        textBgOpacity,
        headlineColor
      };

      const draft: SavedVisualDraft = {
        draftId: winner.winnerId,
        winnerId: winner.winnerId,
        recommendation,
        visual: generatedVisual,
        promptUsed: customPrompt,
        styleUsed: selectedStyle,
        aspectRatioUsed: selectedAspectRatio,
        overlaySettings,
        savedAt: new Date().toISOString()
      };

      await dbStore.set("visual_drafts", winner.winnerId, draft);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error("Save draft failed", e);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Download logic
  const handleDownloadPng = () => {
    if (!generatedVisual) return;
    
    // Download logic is handled by standard canvas exports to get pristine PNGs
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `rohit_linkedin_visual_${winner?.winnerId || 'draft'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  // Helper aspect ratio height
  const getAspectRatioClasses = () => {
    if (selectedAspectRatio === '16:9') return 'aspect-video';
    if (selectedAspectRatio === '4:5') return 'aspect-[4/5]';
    return 'aspect-square';
  };

  // Render Check State
  if (isCheckingPrereq) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm font-mono tracking-wider uppercase">Loading Workspace Prerequisites...</span>
      </div>
    );
  }

  // PREREQ NOT MET SCREEN
  if (!isPrereqMet) {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center animate-in fade-in duration-500">
        <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-8 sm:p-10 space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl" />
          
          <div className="mx-auto w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-sans font-extrabold text-white tracking-tight">Visual Studio Locked</h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
              Please complete all required steps in the Post Studio before designing visuals.
            </p>
          </div>

          {/* CHECKLIST */}
          <div className="bg-slate-900/40 border border-slate-900/70 rounded-2xl p-5 text-left space-y-3.5 max-w-md mx-auto text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">1. Selected Winner Idea</span>
              {winner ? (
                <span className="text-emerald-400 flex items-center gap-1">✔ PASSED</span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">✘ REQUIRED</span>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-900/60 pt-3">
              <span className="text-slate-400">2. Active Post Draft in Studio</span>
              {stitchedPostText.trim().length > 0 ? (
                <span className="text-emerald-400 flex items-center gap-1">✔ PASSED</span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">✘ REQUIRED</span>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-900/60 pt-3">
              <span className="text-slate-400">3. Credibility Report Done</span>
              {credibilityReport ? (
                <span className="text-emerald-400 flex items-center gap-1">✔ PASSED</span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">✘ REQUIRED</span>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-900/60 pt-3">
              <span className="text-slate-400">4. Publication Readiness</span>
              {credibilityReport ? (
                ['Pass', 'Pass with warnings'].includes(credibilityReport.overallStatus) ? (
                  <span className="text-emerald-400 uppercase">Ready ({credibilityReport.publicationRecommendation})</span>
                ) : (
                  <span className="text-amber-400 uppercase">FAILED ({credibilityReport.publicationRecommendation})</span>
                )
              ) : (
                <span className="text-rose-400">NO REPORT</span>
              )}
            </div>
          </div>

          <button
            onClick={handleGoToPostStudio}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 text-sm flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            <span>Go to Post Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // MAIN ACTIVE VIEW
  return (
    <div id="visual-studio-container" className="space-y-10 max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div className="text-left">
          <span className="text-[10px] text-blue-400 font-mono tracking-widest uppercase font-bold">Workspace Navigation / Visual Studio</span>
          <h1 className="text-3xl font-sans font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
            <ImageIcon className="w-7 h-7 text-blue-500" />
            <span>Visual Studio</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Analyze, construct, and refine elite professional visual resources for your LinkedIn post.
          </p>
        </div>
        
        <div className="flex gap-2.5">
          <button
            onClick={handleGoToPostStudio}
            className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Back to Draft</span>
          </button>
          
          {generatedVisual && (
            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-950/20 border border-blue-900/50 hover:border-blue-800 transition-all cursor-pointer"
            >
              {isSavingDraft ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saveSuccess ? 'Saved Draft!' : 'Save Draft'}</span>
            </button>
          )}
        </div>
      </header>

      {/* CORE SPLIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Controls and Strategy */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* STEP 1: STRATEGY ANALYSIS */}
          <section className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 sm:p-7 space-y-5 text-left">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-mono text-xs font-bold border border-blue-500/20">1</span>
              <h3 className="font-sans font-bold text-lg text-white">Analyze Visual strategy</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              We will evaluate your hook, content pillars, audience demographic, and credibility constraints to determine the exact visual format required.
            </p>

            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[140px] text-center space-y-3"
                >
                  <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-sans font-bold text-white">Analysing Post Content</p>
                    <p className="text-xs font-mono text-slate-400 animate-pulse">{STRATEGY_LOADING_STEPS[analysisStepIndex]}</p>
                  </div>
                </motion.div>
              ) : recommendation ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/35 border border-slate-900/70 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">FORMAT RECOMMENDATION:</span>
                      <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        recommendation.recommendedFormat === 'Text only' ? 'bg-slate-900 border border-slate-700 text-slate-300' :
                        recommendation.recommendedFormat === 'Carousel' ? 'bg-indigo-950/40 border border-indigo-900/50 text-indigo-300' :
                        'bg-blue-950/40 border border-blue-900/50 text-blue-300'
                      }`}>
                        {recommendation.recommendedFormat}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500 font-mono">CONFIDENCE:</span>
                      <span className={`font-semibold ${
                        recommendation.confidence === 'High' ? 'text-emerald-400' :
                        recommendation.confidence === 'Medium' ? 'text-amber-400' : 'text-slate-400'
                      }`}>{recommendation.confidence}</span>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-sm">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono tracking-wider uppercase text-slate-500 block">Strategic Explanation</span>
                      <p className="text-slate-300 font-sans leading-relaxed text-xs">{recommendation.reason}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-0.5 bg-slate-900/25 p-2.5 rounded-xl border border-slate-900/40">
                        <span className="text-[9px] font-mono tracking-wider uppercase text-slate-500 block">Visual Objective</span>
                        <p className="text-slate-200 text-xs font-semibold">{recommendation.visualObjective}</p>
                      </div>
                      <div className="space-y-0.5 bg-slate-900/25 p-2.5 rounded-xl border border-slate-900/40">
                        <span className="text-[9px] font-mono tracking-wider uppercase text-slate-500 block">Primary Subject</span>
                        <p className="text-slate-200 text-xs font-semibold">{recommendation.primarySubject}</p>
                      </div>
                    </div>

                    <div className="bg-slate-900/25 p-3 rounded-xl border border-slate-900/40 space-y-1">
                      <span className="text-[9px] font-mono tracking-wider uppercase text-slate-500 block">Visual Concept Metaphor</span>
                      <p className="text-slate-300 text-xs leading-relaxed">{recommendation.visualConcept}</p>
                    </div>

                    {recommendation.includeRohitRecommendation && (
                      <div className="bg-blue-950/10 border border-blue-900/20 p-3 rounded-xl flex gap-2.5 text-xs text-left">
                        <Camera className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-300 block mb-0.5">Rohit Identity Match Recommended</span>
                          <p className="text-slate-400 leading-normal">{recommendation.includeRohitReason}</p>
                        </div>
                      </div>
                    )}

                    {recommendation.recommendedFormat === 'Carousel' && (
                      <div className="bg-amber-950/15 border border-amber-900/25 p-3 rounded-xl flex gap-2.5 text-xs text-left">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-300 block mb-0.5">Carousel Recommendation Note</span>
                          <p className="text-slate-400 leading-normal">{recommendation.carouselReason}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={handleAnalyzeVisualFormat}
                      className="text-[11px] font-mono tracking-wider text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Re-analyze Draft</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <button
                  onClick={handleAnalyzeVisualFormat}
                  className="w-full py-4 px-6 bg-slate-900/50 hover:bg-slate-900 text-white font-sans font-bold rounded-2xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <Sparkles className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span>Analyze Best Visual Format</span>
                </button>
              )}
            </AnimatePresence>

            {analysisError && (
              <p className="text-xs text-rose-400 bg-rose-950/15 border border-rose-900/25 p-3 rounded-xl">{analysisError}</p>
            )}
          </section>

          {/* STEP 2: IDENTITY REFERENCE PHOTO */}
          <section className="bg-slate-950/60 border border-slate-900 rounded-3xl overflow-hidden">
            <button 
              onClick={() => setIsRefPhotoOpen(!isRefPhotoOpen)}
              className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-slate-900/20"
            >
              <div className="flex items-center gap-2 text-left">
                <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-mono text-xs font-bold border border-blue-500/20">2</span>
                <h3 className="font-sans font-bold text-lg text-white">Rohit's Identity Reference photo</h3>
              </div>
              {isRefPhotoOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {isRefPhotoOpen && (
              <div className="px-6 pb-6 pt-1 space-y-5 text-left border-t border-slate-900/40">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload a clear, well-lit reference photograph of Rohit to preserve facial features and recognizable ethnicity during AI generation. All photographs are stored locally inside your browser's IndexedDB.
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {referencePhoto ? (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 w-24 h-24 shrink-0">
                      <img src={referencePhoto} alt="Rohit Reference" className="w-full h-full object-cover" />
                      <button
                        onClick={handleRemovePhoto}
                        className="absolute inset-0 bg-slate-950/80 text-rose-400 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity text-xs font-bold cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-800 hover:border-slate-600 rounded-xl w-24 h-24 flex flex-col items-center justify-center gap-1 bg-slate-950 cursor-pointer transition-colors group shrink-0"
                    >
                      <Upload className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-400 font-mono uppercase">Upload</span>
                    </div>
                  )}

                  <div className="space-y-3 flex-1">
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-300">
                        {referencePhoto ? "Photograph Ready" : "No Photograph Loaded"}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Supported formats: PNG, JPEG. Clear face-centered images are ideal.
                      </p>
                    </div>

                    {referencePhoto && (
                      <label className="flex items-center gap-2.5 cursor-pointer bg-slate-900/40 border border-slate-800 hover:bg-slate-900/80 px-3 py-2 rounded-xl transition-all max-w-xs">
                        <input 
                          type="checkbox"
                          checked={includeRohit}
                          onChange={(e) => setIncludeRohit(e.target.checked)}
                          className="accent-blue-500 rounded cursor-pointer"
                        />
                        <span className="text-xs font-medium text-slate-300">Use photo as Face Reference</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* STEP 3: BASE VISUAL GENERATION */}
          <section className="bg-slate-950/60 border border-slate-900 rounded-3xl overflow-hidden">
            <button 
              onClick={() => setIsPromptControlsOpen(!isPromptControlsOpen)}
              className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-slate-900/20"
            >
              <div className="flex items-center gap-2 text-left">
                <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-mono text-xs font-bold border border-blue-500/20">3</span>
                <h3 className="font-sans font-bold text-lg text-white">Nano Banana 2 Generation Controls</h3>
              </div>
              {isPromptControlsOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {isPromptControlsOpen && (
              <div className="px-6 pb-6 pt-1 space-y-6 text-left border-t border-slate-900/40">
                
                {/* PROMPT EDITOR */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">Image Prompt</label>
                    {customPrompt && (
                      <button
                        onClick={handleRefinePrompt}
                        disabled={isImprovingPrompt || isGeneratingImage}
                        className="text-[10px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{isImprovingPrompt ? 'Refining...' : 'Refine with Gemini'}</span>
                      </button>
                    )}
                  </div>

                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Describe the visual concept in detail..."
                    rows={4}
                    className="w-full text-xs font-sans text-slate-200 bg-slate-950 border border-slate-800 rounded-xl p-3.5 focus:border-blue-500 focus:outline-none placeholder-slate-600 resize-y leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Tip: Do not specify text or headlines to render in the prompt. We overlay clean, crisp text through code after generation.
                  </p>
                </div>

                {/* STYLE SELECTOR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block">Style Direction</label>
                    <select
                      value={selectedStyle}
                      onChange={(e) => setSelectedStyle(e.target.value as LinkedInVisualStyle)}
                      className="w-full text-xs font-sans text-slate-200 bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Professional portrait">Professional portrait</option>
                      <option value="Editorial photography">Editorial photography</option>
                      <option value="Product mockup">Product mockup</option>
                      <option value="Conceptual illustration">Conceptual illustration</option>
                      <option value="Infographic background">Infographic background</option>
                      <option value="Minimal statement card">Minimal statement card</option>
                      <option value="Screenshot-led composition">Screenshot-led composition</option>
                    </select>
                  </div>

                  {/* ASPECT RATIO */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block">Aspect Ratio</label>
                    <div className="flex gap-2">
                      {(['1:1', '4:5', '16:9'] as VisualAspectRatio[]).map((ratio) => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setSelectedAspectRatio(ratio)}
                          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            selectedAspectRatio === ratio 
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/10' 
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTON */}
                <button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !customPrompt.trim()}
                  className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-900 disabled:border-slate-800 disabled:text-slate-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-900/20 text-sm flex items-center justify-center gap-2 cursor-pointer border border-transparent"
                >
                  {isGeneratingImage ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating Visual...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Professional Visual</span>
                    </>
                  )}
                </button>

                {/* GENERATION STATUS STEPS */}
                <AnimatePresence>
                  {isGeneratingImage && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4 flex items-center gap-3"
                    >
                      <RefreshCw className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">Nano Banana 2 in progress</p>
                        <p className="text-[11px] font-mono text-slate-400">{GENERATION_LOADING_STEPS[generationStepIndex]}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {generationError && (
                  <p className="text-xs text-rose-400 bg-rose-950/15 border border-rose-900/25 p-3 rounded-xl">{generationError}</p>
                )}
              </div>
            )}
          </section>

          {/* STEP 4: OVERLAY CONTROLS */}
          {generatedVisual && (
            <section className="bg-slate-950/60 border border-slate-900 rounded-3xl overflow-hidden">
              <button 
                onClick={() => setIsOverlayControlsOpen(!isOverlayControlsOpen)}
                className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-slate-900/20"
              >
                <div className="flex items-center gap-2 text-left">
                  <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-mono text-xs font-bold border border-blue-500/20">4</span>
                  <h3 className="font-sans font-bold text-lg text-white">Headline Overlay & Customization</h3>
                </div>
                {isOverlayControlsOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>

              {isOverlayControlsOpen && (
                <div className="px-6 pb-6 pt-1 space-y-5 text-left border-t border-slate-900/40">
                  
                  {/* OVERLAY TOGGLE */}
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <span className="text-xs font-bold text-slate-300">Display Headline Overlay</span>
                    <button
                      type="button"
                      onClick={() => setShowOverlay(!showOverlay)}
                      className={`p-1.5 rounded-lg border cursor-pointer transition-all ${
                        showOverlay 
                          ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' 
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      {showOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>

                  {showOverlay && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      
                      {/* HEADLINE INPUT */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Headline suggestion (Overlay)</label>
                        <input
                          type="text"
                          value={headlineText}
                          onChange={(e) => setHeadlineText(e.target.value)}
                          placeholder="Enter overlay headline text..."
                          className="w-full text-xs font-sans text-slate-200 bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* SUPPORTING TEXT INPUT */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Supporting Subtitle (Mono Font)</label>
                        <input
                          type="text"
                          value={supportingText}
                          onChange={(e) => setSupportingText(e.target.value)}
                          placeholder="Optional short subtitle label..."
                          className="w-full text-xs font-sans text-slate-200 bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* SAFE AREA POSITION */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">Position (Safe Area)</label>
                          <select
                            value={headlineSafeArea}
                            onChange={(e) => setHeadlineSafeArea(e.target.value as HeadlineSafeArea)}
                            className="w-full text-xs font-sans text-slate-200 bg-slate-950 border border-slate-800 rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                          >
                            <option value="Top 1/3">Top 1/3 (Negative Space)</option>
                            <option value="Center">Center (Framed Cover)</option>
                            <option value="Bottom 1/3">Bottom 1/3 (Lower Third)</option>
                          </select>
                        </div>

                        {/* HEADLINE COLOR */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">Text Color</label>
                          <div className="flex gap-2">
                            {['#FFFFFF', '#3B82F6', '#F59E0B', '#EF4444', '#10B981'].map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setHeadlineColor(color)}
                                style={{ backgroundColor: color }}
                                className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                                  headlineColor === color ? 'border-white scale-110 shadow-lg' : 'border-slate-900 hover:scale-105'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* SLIDERS GRID */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1.5">
                        {/* OVERLAY OPACITY SLIDER */}
                        <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-slate-400">Dark Scrim Opacity</span>
                            <span className="text-slate-300 font-bold">{overlayOpacity}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="80"
                            value={overlayOpacity}
                            onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                            className="w-full accent-blue-500 h-1 rounded-lg cursor-pointer bg-slate-800 mt-2"
                          />
                        </div>

                        {/* PANEL BACKDROP SLIDER */}
                        <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-slate-400">Text Backdrop Plate</span>
                            <span className="text-slate-300 font-bold">{textBgOpacity}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="90"
                            value={textBgOpacity}
                            onChange={(e) => setTextBgOpacity(Number(e.target.value))}
                            className="w-full accent-blue-500 h-1 rounded-lg cursor-pointer bg-slate-800 mt-2"
                          />
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}
            </section>
          )}

        </div>

        {/* RIGHT COLUMN: Realtime Canvas Preview and Details */}
        <div className="lg:col-span-5 space-y-8 sticky top-6">
          
          {/* STAGE DISPLAY CONTAINER */}
          <div className="bg-slate-950 border border-slate-900 rounded-3xl p-5 sm:p-6 space-y-5 text-left relative shadow-xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-500" />
                <span className="font-sans font-bold text-sm text-slate-200">Prerender Canvas Stage</span>
              </div>
              
              {generatedVisual && (
                <span className="text-[9px] bg-slate-900 text-slate-400 font-mono py-0.5 px-2 rounded border border-slate-800">
                  {selectedAspectRatio} ratio
                </span>
              )}
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-2xl overflow-hidden flex items-center justify-center relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
              {generatedVisual ? (
                <div className={`w-full ${getAspectRatioClasses()} relative overflow-hidden flex items-center justify-center max-h-[460px]`}>
                  {/* Real-time HTML5 Offscreen Canvas is drawn in hidden or styled viewport, but to guarantee high accuracy, we render a real HTML canvas directly inside the UI preview */}
                  <canvas 
                    ref={previewCanvasRef} 
                    width={1024} 
                    height={1024} 
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square flex flex-col items-center justify-center gap-3.5 p-12 text-center text-slate-500">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400">Prerender stage Empty</p>
                    <p className="text-[11px] text-slate-600 max-w-[200px] leading-normal">
                      Analyze strategy and generate a base image using Nano Banana 2 above.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* BUTTON ROW */}
            {generatedVisual && (
              <div className="space-y-3 pt-1">
                <button
                  onClick={handleDownloadPng}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-sans font-bold text-xs rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400 group-hover:translate-y-0.5 transition-transform" />
                  <span>Download Finished PNG</span>
                </button>

                <p className="text-[10px] text-slate-500 text-center leading-normal">
                  Images download at full resolution (1K resolution) with code-rendered text overlays.
                </p>
              </div>
            )}
          </div>

          {/* DRAFT POST SUMMARY CARD */}
          <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-5 sm:p-6 text-left space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="font-sans font-bold text-sm text-slate-200">Active Post Summary</span>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="bg-slate-900/30 p-3 rounded-xl border border-slate-900/60 max-h-[160px] overflow-y-auto font-sans text-slate-300">
                <span className="font-bold text-blue-400 block mb-1">Hook Text</span>
                <p>{stitchedPostText.split('\n\n')[0]}</p>
              </div>

              {credibilityReport && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-900/20 p-2.5 rounded-xl border border-slate-900/50">
                    <span className="text-[9px] font-mono text-slate-500 block">CREDIBILITY STATUS</span>
                    <span className={`font-semibold ${
                      credibilityReport.overallStatus === 'Pass' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>{credibilityReport.overallStatus}</span>
                  </div>
                  <div className="bg-slate-900/20 p-2.5 rounded-xl border border-slate-900/50">
                    <span className="text-[9px] font-mono text-slate-500 block">SCORE</span>
                    <span className="font-semibold text-slate-300">{credibilityReport.credibilityScore}/100</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
