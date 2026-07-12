import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, Plus, Trash2, Copy, MoveUp, MoveDown, Sparkles, Check, 
  AlertTriangle, X, RefreshCw, Eye, Smartphone, BookOpen, 
  Palette, Sliders, CheckCircle, Info, ChevronDown, ChevronUp, AlertCircle, ArrowRight, Play, Square,
  Download, FileText
} from 'lucide-react';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { 
  CreatorProfile, TabType, WinnerSelection, PostCredibilityReport, 
  LinkedInCarouselPlan, LinkedInCarouselSlide, CarouselSlideRole, 
  CarouselFactualType, CarouselLayoutTemplate, CarouselAspectRatio, 
  CarouselDesignSettings, CarouselQualityReport, SavedCarouselDraft, 
  CarouselGenerationStatus, CarouselQualityIssue,
  CarouselVisualStrategy, CarouselSlideVisualRecommendation, CarouselVisualNeed, 
  CarouselVisualImportance, CarouselArtworkType, CarouselArtworkPlacement, 
  CarouselArtworkSettings, SavedCarouselAssetMetadata, CarouselAssetGenerationStatus, 
  CarouselAssetError
} from '../types';

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

const GENERATION_STEPS = [
  "Designing learning journey...",
  "Drafting cover hook...",
  "Ensuring factual accuracy...",
  "Structuring actionable steps...",
  "Verifying mobile layout readability..."
];

const QUALITY_STEPS = [
  "Analyzing visual flow...",
  "Checking slide text density...",
  "Evaluating practical takeaways...",
  "Verifying claim alignments..."
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

function getOverlayBackground(safeArea: 'Top' | 'Centre' | 'Bottom' | 'Left' | 'Right', bgColor: string): string {
  const hex = bgColor.startsWith('#') ? bgColor : '#0b1329';
  const r = parseInt(hex.slice(1, 3), 16) || 11;
  const g = parseInt(hex.slice(3, 5), 16) || 19;
  const b = parseInt(hex.slice(5, 7), 16) || 41;
  
  const baseColor = `rgb(${r}, ${g}, ${b})`;
  const semiTransparent = `rgba(${r}, ${g}, ${b}, 0.7)`;
  const transparent = `rgba(${r}, ${g}, ${b}, 0.15)`;
  
  switch (safeArea) {
    case 'Top':
      return `linear-gradient(to bottom, ${transparent} 0%, ${semiTransparent} 35%, ${baseColor} 75%)`;
    case 'Bottom':
      return `linear-gradient(to top, ${transparent} 0%, ${semiTransparent} 35%, ${baseColor} 75%)`;
    case 'Left':
      return `linear-gradient(to right, ${transparent} 0%, ${semiTransparent} 35%, ${baseColor} 75%)`;
    case 'Right':
      return `linear-gradient(to left, ${transparent} 0%, ${semiTransparent} 35%, ${baseColor} 75%)`;
    case 'Centre':
    default:
      return `rgba(${r}, ${g}, ${b}, 0.65)`;
  }
}

export interface OverflowResult {
  hasOverflow: boolean;
  affectedField?: string;
}

export function checkSlideTextOverflow(
  slide: LinkedInCarouselSlide,
  designSettings: CarouselDesignSettings,
  aspectRatio: CarouselAspectRatio,
  assetsMetadata?: Record<string, SavedCarouselAssetMetadata>
): OverflowResult {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const ctx = canvas ? canvas.getContext('2d') : null;
  
  const fontScale = designSettings.fontScale || 1.0;
  const width = 1080;
  const height = aspectRatio === '1:1' ? 1080 : 1350;
  const padX = width * 0.06;
  const padY = height * 0.05;
  const topHeaderHeight = 40;
  const bottomFooterHeight = 40;
  
  const meta = assetsMetadata?.[slide.id];
  const safeArea = meta?.textSafeArea || 'Centre';
  const artworkType = meta?.artworkType || 'No generated artwork';
  const hasArtwork = artworkType !== 'No generated artwork';
  
  let availableHeight = height - (padY * 2) - topHeaderHeight - bottomFooterHeight;
  if (hasArtwork && (safeArea === 'Top' || safeArea === 'Bottom')) {
    availableHeight = availableHeight * 0.5;
  }
  
  let maxWidth = width - (padX * 2);
  if (hasArtwork && (safeArea === 'Left' || safeArea === 'Right')) {
    maxWidth = maxWidth * 0.85;
  }
  
  const scale = fontScale;

  const wrapText = (text: string, fontSize: number): string[] => {
    if (!text) return [];
    if (!ctx) {
      const maxCharsPerLine = Math.max(10, Math.floor(maxWidth / (fontSize * 0.55)));
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let currentLine = '';
      for (const word of words) {
        if ((currentLine + ' ' + word).length > maxCharsPerLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + ' ' + word : word;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    }
    
    ctx.font = `normal ${fontSize}px sans-serif`;
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (ctx.measureText(testLine).width > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  if (slide.layoutTemplate === 'Cover statement') {
    const headlineFontSize = Math.round(48 * scale);
    const bodyFontSize = Math.round(24 * scale);
    
    const headlineLines = wrapText(slide.title, headlineFontSize);
    const bodyLines = wrapText(slide.body, bodyFontSize);
    
    const headlineHeight = headlineLines.length * (headlineFontSize * 1.25);
    const bodyHeight = bodyLines.length * (bodyFontSize * 1.45);
    const cumulativeHeight = headlineHeight + 33 + bodyHeight;
    
    if (cumulativeHeight > availableHeight) {
      return { 
        hasOverflow: true, 
        affectedField: headlineHeight > bodyHeight ? 'Main Headline' : 'Supporting Line' 
      };
    }
  } else if (slide.layoutTemplate === 'Big number or phrase') {
    const bigFontSize = Math.round(120 * scale);
    const titleFontSize = Math.round(36 * scale);
    const bodyFontSize = Math.round(22 * scale);
    
    const titleLines = wrapText(slide.title, titleFontSize);
    const bodyLines = wrapText(slide.body, bodyFontSize);
    
    const bigHeight = bigFontSize * 1.1;
    const titleHeight = titleLines.length * (titleFontSize * 1.25);
    const bodyHeight = bodyLines.length * (bodyFontSize * 1.45);
    const cumulativeHeight = bigHeight + titleHeight + bodyHeight + 24;
    
    if (cumulativeHeight > availableHeight) {
      return { 
        hasOverflow: true, 
        affectedField: titleHeight > bodyHeight ? 'Slide Title' : 'Body Paragraph' 
      };
    }
  } else if (slide.layoutTemplate === 'Quote-free insight') {
    const bodyFontSize = Math.round(28 * scale);
    const authorFontSize = Math.round(18 * scale);
    
    const bodyLines = wrapText(slide.body, bodyFontSize);
    const authorLines = wrapText(slide.title, authorFontSize);
    
    const bodyHeight = bodyLines.length * (bodyFontSize * 1.45);
    const authorHeight = authorLines.length * (authorFontSize * 1.25);
    const cumulativeHeight = bodyHeight + authorHeight + 16;
    
    if (cumulativeHeight > availableHeight) {
      return { 
        hasOverflow: true, 
        affectedField: 'Body Paragraph' 
      };
    }
  } else {
    const titleFontSize = Math.round(36 * scale);
    const bodyFontSize = Math.round(22 * scale);
    const bulletFontSize = Math.round(20 * scale);
    
    const titleLines = wrapText(slide.title, titleFontSize);
    const bodyLines = wrapText(slide.body, bodyFontSize);
    
    const titleHeight = titleLines.length * (titleFontSize * 1.25);
    const bodyHeight = bodyLines.length * (bodyFontSize * 1.45);
    let cumulativeHeight = titleHeight + bodyHeight + 16;
    
    if (slide.bullets && slide.bullets.length > 0 && [
      'Three-point list', 'Checklist', 'Process steps', 'Summary'
    ].includes(slide.layoutTemplate)) {
      let bulletsHeight = 0;
      for (const bullet of slide.bullets) {
        const bulletLines = wrapText(bullet, bulletFontSize);
        bulletsHeight += bulletLines.length * (bulletFontSize * 1.45) + 8;
      }
      cumulativeHeight += bulletsHeight + 12;
    }
    
    if (cumulativeHeight > availableHeight) {
      return { 
        hasOverflow: true, 
        affectedField: titleHeight > bodyHeight ? 'Slide Title' : 'Body Paragraph' 
      };
    }
  }
  
  return { hasOverflow: false };
}

interface CarouselBuilderViewProps {
  profile: CreatorProfile;
  setActiveTab: (tab: TabType) => void;
}

export default function CarouselBuilderView({ profile, setActiveTab }: CarouselBuilderViewProps) {
  // Prerequisite states
  const [winner, setWinner] = useState<WinnerSelection | null>(null);
  const [stitchedPostText, setStitchedPostText] = useState('');
  const [credibilityReport, setCredibilityReport] = useState<PostCredibilityReport | null>(null);
  const [postFingerprint, setPostFingerprint] = useState('');
  const [isPrereqLoaded, setIsPrereqLoaded] = useState(false);

  // Carousel Builder states
  const [draft, setDraft] = useState<SavedCarouselDraft | null>(null);
  const [status, setStatus] = useState<CarouselGenerationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  // Editor states
  const [selectedSlideId, setSelectedSlideId] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'current' | 'mobile'>('current');
  const [showQualityPanel, setShowQualityPanel] = useState(false);
  const [isCheckingQuality, setIsCheckingQuality] = useState(false);

  // Exporting state variables
  const [exportQuality, setExportQuality] = useState<'standard' | 'high'>('high');
  const [exportBypassWarnings, setExportBypassWarnings] = useState(false);
  
  // Progress states
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState('');
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  
  // Missing artwork recovery state
  const [missingArtworkSlideId, setMissingArtworkSlideId] = useState<string | null>(null);
  const [missingArtworkActionResolve, setMissingArtworkActionResolve] = useState<((action: 'skip' | 'cancel') => void) | null>(null);

  // Reference photograph state
  const [referencePhoto, setReferencePhoto] = useState<string | null>(null);

  // Slide-specific custom visual inputs and prompts states
  const [customPrompts, setCustomPrompts] = useState<Record<string, string>>({});
  const [localArtworkTypes, setLocalArtworkTypes] = useState<Record<string, CarouselArtworkType>>({});
  const [localSafeAreas, setLocalSafeAreas] = useState<Record<string, 'Top' | 'Centre' | 'Bottom' | 'Left' | 'Right'>>({});
  const [localIntensities, setLocalIntensities] = useState<Record<string, 'Minimal' | 'Balanced' | 'Bold'>>({});
  const [localRohitToggles, setLocalRohitToggles] = useState<Record<string, boolean>>({});

  // Slide visual assets state (in-memory loaded from IndexedDB)
  const [loadedImages, setLoadedImages] = useState<Record<string, string>>({});
  const [generatingSlideId, setGeneratingSlideId] = useState<string>('');
  const [improvingPromptId, setImprovingPromptId] = useState<string>('');

  // Sequential generation states
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const bulkCancelledRef = useRef(false);

  // Load prerequisites
  useEffect(() => {
    const savedWinner = localStorage.getItem('selected_winner');
    if (savedWinner) {
      try {
        const parsedWinner = JSON.parse(savedWinner) as WinnerSelection;
        setWinner(parsedWinner);

        const savedDraft = localStorage.getItem(`post_draft_${parsedWinner.winnerId}`);
        if (savedDraft) {
          const draftParsed = JSON.parse(savedDraft);
          const report = draftParsed.credibilityReport as PostCredibilityReport | null;
          setCredibilityReport(report);

          // Calculate post fingerprint
          const hook = draftParsed.generatedPost?.hooks?.[draftParsed.activeHookType || 'curiosity'] || '';
          const body = draftParsed.editableBodyText || '';
          const cta = draftParsed.customCtaText || '';
          
          let stitched = '';
          if (hook) stitched += hook;
          if (body) {
            if (stitched) stitched += '\n\n';
            stitched += body;
          }
          if (cta) {
            if (stitched) stitched += '\n\n';
            stitched += cta;
          }
          setStitchedPostText(stitched);

          const fingerprint = getDraftFingerprint(hook, body, cta, parsedWinner.winnerId);
          setPostFingerprint(fingerprint);
        }
      } catch (e) {
        console.error("Failed to load carousel builder prerequisites", e);
      }
    }
    
    // Load Rohit reference photograph if any
    async function checkRefPhoto() {
      const photo = await dbStore.get("settings", "rohit_reference_photo");
      if (photo) {
        setReferencePhoto(photo);
      }
    }
    checkRefPhoto();
    
    setIsPrereqLoaded(true);
  }, []);

  // Load saved carousel draft
  useEffect(() => {
    if (winner) {
      try {
        const savedCarousel = localStorage.getItem(`carousel_draft_${winner.winnerId}`);
        if (savedCarousel) {
          const parsed = JSON.parse(savedCarousel) as SavedCarouselDraft;
          setDraft(parsed);
          if (parsed.slideContent?.length > 0) {
            setSelectedSlideId(parsed.slideContent[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to load saved carousel draft", e);
      }
    }
  }, [winner]);

  // Load generated assets from IndexedDB dynamically based on metadata list
  useEffect(() => {
    if (!draft || !draft.assetsMetadata) return;
    
    async function loadImages() {
      const keys = Object.keys(draft!.assetsMetadata || {});
      const newLoaded: Record<string, string> = { ...loadedImages };
      let changed = false;
      
      for (const slideId of keys) {
        const meta = draft!.assetsMetadata![slideId];
        if (meta && !newLoaded[slideId]) {
          const base64 = await dbStore.get("visual_drafts", meta.indexedDBKey);
          if (base64) {
            newLoaded[slideId] = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
            changed = true;
          }
        }
      }
      
      // Prune loaded images that are no longer present in metadata
      for (const slideId of Object.keys(newLoaded)) {
        if (!draft!.assetsMetadata![slideId]) {
          delete newLoaded[slideId];
          changed = true;
        }
      }
      
      if (changed) {
        setLoadedImages(newLoaded);
      }
    }
    
    loadImages();
  }, [draft?.assetsMetadata]);

  // Sync editor controls with currently selected slide and recommended values
  useEffect(() => {
    if (!draft || !selectedSlideId) return;
    const slide = draft.slideContent.find(s => s.id === selectedSlideId);
    if (!slide) return;

    const meta = draft.assetsMetadata?.[selectedSlideId];
    const rec = draft.visualStrategy?.slides.find(s => s.slideId === selectedSlideId);

    // Prompt prepopulation
    if (customPrompts[selectedSlideId] === undefined) {
      setCustomPrompts(prev => ({
        ...prev,
        [selectedSlideId]: meta?.prompt || rec?.imagePrompt || slide.visualConcept || ""
      }));
    }

    // Artwork type prepopulation
    if (localArtworkTypes[selectedSlideId] === undefined) {
      setLocalArtworkTypes(prev => ({
        ...prev,
        [selectedSlideId]: meta?.artworkType || (rec?.visualNeed as any) || 'Illustration'
      }));
    }

    // Safe area prepopulation
    if (localSafeAreas[selectedSlideId] === undefined) {
      setLocalSafeAreas(prev => ({
        ...prev,
        [selectedSlideId]: meta?.textSafeArea || rec?.textSafeArea || 'Centre'
      }));
    }

    // Intensity prepopulation
    if (localIntensities[selectedSlideId] === undefined) {
      setLocalIntensities(prev => ({
        ...prev,
        [selectedSlideId]: meta?.artworkIntensity || 'Balanced'
      }));
    }

    // Rohit Portrait toggle prepopulation
    if (localRohitToggles[selectedSlideId] === undefined) {
      setLocalRohitToggles(prev => ({
        ...prev,
        [selectedSlideId]: meta?.referencePhotoUsed ?? rec?.includeRohitRecommended ?? false
      }));
    }
  }, [selectedSlideId, draft?.assetsMetadata, draft?.visualStrategy]);

  // Helper to check if a slide's artwork is stale / outdated
  const getArtworkStatus = (slide: LinkedInCarouselSlide, metadata?: SavedCarouselAssetMetadata): 'none' | 'current' | 'outdated' => {
    if (!metadata) return 'none';
    
    const isOutdated = 
      slide.title !== metadata.originalSlideTitle ||
      slide.body !== metadata.originalSlideBody ||
      slide.visualConcept !== metadata.originalSlideVisualConcept ||
      metadata.artworkType !== metadata.originalArtworkType ||
      metadata.textSafeArea !== metadata.originalTextSafeArea ||
      (draft?.visualStrategy?.carouselVisualTheme !== metadata.originalCarouselVisualTheme) ||
      (postFingerprint !== metadata.originalPostFingerprint);
      
    return isOutdated ? 'outdated' : 'current';
  };

  // Auto-persist draft to localStorage
  const saveDraft = (updatedDraft: SavedCarouselDraft) => {
    if (!winner) return;
    setDraft(updatedDraft);
    localStorage.setItem(`carousel_draft_${winner.winnerId}`, JSON.stringify(updatedDraft));
  };

  // Live updates to the current slide
  const updateCurrentSlide = (fields: Partial<LinkedInCarouselSlide>) => {
    if (!draft) return;
    const updatedSlides = draft.slideContent.map(s => {
      if (s.id === selectedSlideId) {
        return { ...s, ...fields };
      }
      return s;
    });
    saveDraft({
      ...draft,
      slideContent: updatedSlides,
      updatedAt: new Date().toISOString()
    });
  };

  // Reorder slides
  const moveSlide = (index: number, direction: 'up' | 'down') => {
    if (!draft) return;
    const newSlides = [...draft.slideContent];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newSlides.length) return;

    const [moved] = newSlides.splice(index, 1);
    newSlides.splice(targetIdx, 0, moved);

    // Re-index slideNumber
    const reindexedSlides = newSlides.map((s, idx) => ({
      ...s,
      slideNumber: idx + 1,
      role: idx === 0 ? 'Cover' as CarouselSlideRole : (s.role === 'Cover' ? 'Insight' as CarouselSlideRole : s.role),
      layoutTemplate: idx === 0 ? 'Cover statement' as CarouselLayoutTemplate : (s.layoutTemplate === 'Cover statement' ? 'Title and body' as CarouselLayoutTemplate : s.layoutTemplate)
    }));

    saveDraft({
      ...draft,
      slideContent: reindexedSlides,
      slideOrder: reindexedSlides.map(s => s.id),
      updatedAt: new Date().toISOString()
    });
  };

  // Duplicate slide
  const duplicateSlide = (index: number) => {
    if (!draft) return;
    if (draft.slideContent.length >= 10) return;

    const source = draft.slideContent[index];
    const newId = `slide-dup-${Math.random().toString(36).substring(2, 6)}`;
    const copy: LinkedInCarouselSlide = {
      ...source,
      id: newId,
      slideNumber: index + 2,
      role: source.role === 'Cover' ? 'Insight' : source.role,
      layoutTemplate: source.layoutTemplate === 'Cover statement' ? 'Title and body' : source.layoutTemplate,
      title: `${source.title} (Copy)`
    };

    const newSlides = [...draft.slideContent];
    newSlides.splice(index + 1, 0, copy);

    // Re-index
    const reindexedSlides = newSlides.map((s, idx) => ({
      ...s,
      slideNumber: idx + 1
    }));

    saveDraft({
      ...draft,
      slideContent: reindexedSlides,
      slideOrder: reindexedSlides.map(s => s.id),
      updatedAt: new Date().toISOString()
    });
    setSelectedSlideId(newId);
  };

  // Delete slide
  const deleteSlide = (index: number) => {
    if (!draft) return;
    if (draft.slideContent.length <= 6) {
      alert("Carousels must contain at least 6 slides.");
      return;
    }

    const slideIdToDelete = draft.slideContent[index].id;
    const newSlides = draft.slideContent.filter((_, idx) => idx !== index);
    const reindexedSlides = newSlides.map((s, idx) => ({
      ...s,
      slideNumber: idx + 1,
      role: idx === 0 ? 'Cover' as CarouselSlideRole : (s.role === 'Cover' ? 'Insight' as CarouselSlideRole : s.role),
      layoutTemplate: idx === 0 ? 'Cover statement' as CarouselLayoutTemplate : (s.layoutTemplate === 'Cover statement' ? 'Title and body' as CarouselLayoutTemplate : s.layoutTemplate)
    }));

    // Remove metadata and IndexedDB record if deleted
    const updatedAssetsMetadata = { ...(draft.assetsMetadata || {}) };
    if (updatedAssetsMetadata[slideIdToDelete]) {
      dbStore.delete("visual_drafts", updatedAssetsMetadata[slideIdToDelete].indexedDBKey);
      delete updatedAssetsMetadata[slideIdToDelete];
    }

    saveDraft({
      ...draft,
      slideContent: reindexedSlides,
      slideOrder: reindexedSlides.map(s => s.id),
      assetsMetadata: updatedAssetsMetadata,
      updatedAt: new Date().toISOString()
    });

    if (selectedSlideId === slideIdToDelete) {
      setSelectedSlideId(reindexedSlides[0].id);
    }
  };

  // Add Slide
  const addSlide = () => {
    if (!draft) return;
    if (draft.slideContent.length >= 10) return;

    const nextNum = draft.slideContent.length + 1;
    const newId = `slide-added-${Math.random().toString(36).substring(2, 6)}`;
    const newSlide: LinkedInCarouselSlide = {
      id: newId,
      slideNumber: nextNum,
      role: 'Step',
      title: 'New Slide title',
      body: 'Add practical and actionable content for Rohit’s readers.',
      bullets: [],
      smallLabel: 'AI Practical Insight',
      factualType: 'General advice',
      sourceReferenceIds: [],
      visualConcept: 'Simple icon representation',
      layoutTemplate: 'Title and body',
      emphasisText: '',
      speakerNote: ''
    };

    const updatedSlides = [...draft.slideContent, newSlide];
    saveDraft({
      ...draft,
      slideContent: updatedSlides,
      slideOrder: updatedSlides.map(s => s.id),
      updatedAt: new Date().toISOString()
    });
    setSelectedSlideId(newId);
  };

  // Trigger Carousel Strategy and Slide Outline generation
  const handleGenerateCarousel = async (requestedSlideCount: number) => {
    if (!winner || !stitchedPostText || !credibilityReport) return;

    setStatus('generating');
    setErrorMessage(null);
    setLoadingStepIndex(0);

    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => (prev + 1) % GENERATION_STEPS.length);
    }, 1500);

    try {
      const res = await fetch('/api/gemini/generate-carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          postContent: stitchedPostText,
          winningIdea: winner.winningIdea,
          credibilityReport,
          requestedSlideCount,
          postFingerprint
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.errorMessage || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.plan) {
        const plan = data.plan as LinkedInCarouselPlan;
        const initialSettings: CarouselDesignSettings = {
          aspectRatio: '1:1',
          primaryColor: '#ffffff',
          accentColor: '#3b82f6', // electric blue
          backgroundColor: '#0b1329', // navy blue
          fontScale: 1.0,
          cornerRoundness: 12,
          contentDensity: 'comfortable',
          showPageNumber: true,
          showCreatorName: true,
          showProgressIndicator: true
        };

        const newDraft: SavedCarouselDraft = {
          winnerId: winner.winnerId,
          postFingerprint,
          carouselStrategy: plan,
          slideContent: plan.slides,
          slideOrder: plan.slides.map(s => s.id),
          aspectRatio: '1:1',
          designSettings: initialSettings,
          qualityReport: null,
          qualityCheckFingerprint: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          draftStatus: 'draft'
        };

        saveDraft(newDraft);
        if (plan.slides.length > 0) {
          setSelectedSlideId(plan.slides[0].id);
        }
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(data.errorMessage || "Failed to generate carousel plan.");
      }
    } catch (err: any) {
      console.error("Failed to generate carousel strategy:", err);
      setStatus('error');
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      clearInterval(interval);
    }
  };

  // Run Quality Check
  const handleQualityCheck = async () => {
    if (!draft || !credibilityReport) return;

    setIsCheckingQuality(true);
    setLoadingStepIndex(0);

    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => (prev + 1) % QUALITY_STEPS.length);
    }, 1200);

    try {
      const res = await fetch('/api/gemini/quality-check-carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carouselTitle: draft.carouselStrategy.carouselTitle,
          slides: draft.slideContent,
          credibilityReport
        })
      });

      if (!res.ok) {
        throw new Error("Quality check API error");
      }

      const data = await res.json();
      if (data.success && data.report) {
        saveDraft({
          ...draft,
          qualityReport: data.report as CarouselQualityReport,
          qualityCheckFingerprint: postFingerprint,
          updatedAt: new Date().toISOString()
        });
        setShowQualityPanel(true);
      }
    } catch (e) {
      console.error("Quality check failed", e);
    } finally {
      clearInterval(interval);
      setIsCheckingQuality(false);
    }
  };

  // Rewrite slide content
  const handleRewriteSlide = async (action: 'clearer' | 'shorter' | 'practical' | 'simpler' | 'alternative') => {
    if (!draft || !selectedSlideId) return;
    const currentSlide = draft.slideContent.find(s => s.id === selectedSlideId);
    if (!currentSlide) return;

    setStatus('rewriting_slide');
    try {
      const res = await fetch('/api/gemini/rewrite-carousel-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          slide: currentSlide,
          action,
          credibilityReport
        })
      });

      if (!res.ok) {
        throw new Error("Rewrite slide API error");
      }

      const data = await res.json();
      if (data.success && data.slide) {
        updateCurrentSlide(data.slide);
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(data.errorMessage || "Failed to rewrite slide.");
      }
    } catch (e: any) {
      console.error("Rewrite slide error", e);
      setStatus('error');
      setErrorMessage(e.message || "Failed to rewrite slide.");
    }
  };

  // Trigger Carousel Visual Direction strategy generation
  const handleAnalyzeVisualNeeds = async () => {
    if (!winner || !stitchedPostText || !credibilityReport || !draft) return;
    
    setStatus('analyzing_visual_needs');
    setErrorMessage(null);
    setLoadingStepIndex(0);
    
    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => (prev + 1) % 4);
    }, 1500);

    try {
      const res = await fetch('/api/gemini/analyze-carousel-visual-needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          carouselTitle: draft.carouselStrategy.carouselTitle,
          carouselObjective: draft.carouselStrategy.carouselObjective,
          visualNarrative: draft.carouselStrategy.visualNarrative,
          designDirection: draft.carouselStrategy.designDirection,
          slides: draft.slideContent,
          credibilityReport,
          researchBriefText: ""
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.strategy) {
        saveDraft({
          ...draft,
          visualStrategy: data.strategy,
          updatedAt: new Date().toISOString()
        });
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(data.errorMessage || "Failed to analyze slide visual needs.");
      }
    } catch (err: any) {
      console.error("Analyse visual strategy failed", err);
      setStatus('error');
      setErrorMessage(err.message || "An unexpected error occurred during visual analysis.");
    } finally {
      clearInterval(interval);
    }
  };

  // Reset visual strategy
  const handleResetVisualStrategy = () => {
    if (confirm("Are you sure you want to reset the visual strategy? Custom slide visual configurations may be reset.")) {
      saveDraft({
        ...draft!,
        visualStrategy: null,
        updatedAt: new Date().toISOString()
      });
    }
  };

  // Improve slide prompt
  const handleImprovePrompt = async (slideId: string, currentPrompt: string) => {
    if (!draft) return;
    const slide = draft.slideContent.find(s => s.id === slideId);
    if (!slide) return;

    setImprovingPromptId(slideId);
    const rec = draft.visualStrategy?.slides.find(s => s.slideId === slideId);
    
    const artworkType = localArtworkTypes[slideId] || (rec?.visualNeed as any) || 'Illustration';
    const textSafeArea = localSafeAreas[slideId] || rec?.textSafeArea || 'Centre';
    const includeRohit = localRohitToggles[slideId] ?? rec?.includeRohitRecommended ?? false;

    try {
      const res = await fetch('/api/gemini/improve-carousel-asset-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slideTitle: slide.title,
          slideBody: slide.body,
          visualConcept: slide.visualConcept,
          artworkType,
          textSafeArea,
          includeRohit,
          brandColors: {
            primary: draft.designSettings.primaryColor,
            accent: draft.designSettings.accentColor,
            background: draft.designSettings.backgroundColor
          },
          userPrompt: currentPrompt,
          negativeInstructions: rec?.negativeInstructions || ['text', 'overlay', 'words', 'logos', 'labels']
        })
      });

      if (!res.ok) throw new Error("Improve prompt API error");
      const data = await res.json();
      if (data.success && data.improvedPrompt) {
        setCustomPrompts(prev => ({
          ...prev,
          [slideId]: data.improvedPrompt
        }));
      }
    } catch (e) {
      console.error("Improve prompt failed", e);
    } finally {
      setImprovingPromptId('');
    }
  };

  // Generate single artwork using Nano Banana
  const handleGenerateArtwork = async (slideId: string) => {
    if (!draft) return;
    const slide = draft.slideContent.find(s => s.id === slideId);
    if (!slide) return;

    setGeneratingSlideId(slideId);
    
    const rec = draft.visualStrategy?.slides.find(s => s.slideId === slideId);
    const currentPrompt = customPrompts[slideId] || rec?.imagePrompt || slide.visualConcept || "";
    
    const artworkType = localArtworkTypes[slideId] || (rec?.visualNeed as any) || 'Illustration';
    const textSafeArea = localSafeAreas[slideId] || rec?.textSafeArea || 'Centre';
    const artworkIntensity = localIntensities[slideId] || 'Balanced';
    const includeRohit = localRohitToggles[slideId] ?? rec?.includeRohitRecommended ?? false;

    try {
      const res = await fetch('/api/gemini/generate-carousel-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          style: "Modern Bold",
          aspectRatio: draft.designSettings.aspectRatio,
          includeRohit: includeRohit && !!referencePhoto,
          referenceImageBase64: includeRohit ? referencePhoto : undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.errorMessage || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.visual) {
        const base64 = data.visual.base64Data;
        
        // Save base64 image in IndexedDB
        const dbKey = `carousel_asset_${winner?.winnerId}_${slideId}`;
        await dbStore.set("visual_drafts", dbKey, base64);
        
        // Build metadata
        const newMetadata: SavedCarouselAssetMetadata = {
          slideId,
          indexedDBKey: dbKey,
          prompt: currentPrompt,
          model: data.visual.modelName || "gemini-3.1-flash-image",
          generationTimestamp: new Date().toISOString(),
          artworkType,
          placement: "Full background",
          referencePhotoUsed: includeRohit && !!referencePhoto,
          assetStatus: 'current',
          settings: {
            artworkOpacity: artworkIntensity === 'Minimal' ? 25 : (artworkIntensity === 'Bold' ? 100 : 65),
            overlayDarkness: artworkIntensity === 'Minimal' ? 75 : (artworkIntensity === 'Bold' ? 15 : 35),
            scale: 1.0,
            horizontalPosition: 0,
            verticalPosition: 0,
            crop: 'cover',
            blur: 0,
            contrast: 100,
            saturation: 100
          },
          textSafeArea,
          artworkIntensity,
          originalSlideTitle: slide.title,
          originalSlideBody: slide.body,
          originalSlideVisualConcept: slide.visualConcept,
          originalArtworkType: artworkType,
          originalTextSafeArea: textSafeArea,
          originalCarouselVisualTheme: draft.visualStrategy?.carouselVisualTheme || "",
          originalPostFingerprint: postFingerprint
        };

        saveDraft({
          ...draft,
          assetsMetadata: {
            ...(draft.assetsMetadata || {}),
            [slideId]: newMetadata
          },
          updatedAt: new Date().toISOString()
        });
        
        setLoadedImages(prev => ({
          ...prev,
          [slideId]: `data:image/png;base64,${base64}`
        }));
      } else {
        alert(data.errorMessage || "Failed to generate artwork.");
      }
    } catch (err: any) {
      console.error("Failed to generate slide artwork", err);
      alert(err.message || "An unexpected error occurred during generation.");
    } finally {
      setGeneratingSlideId('');
    }
  };

  // Generate All Recommended Artworks (Sequential Queue)
  const handleGenerateAllArtwork = async () => {
    if (!draft || !draft.visualStrategy) return;
    
    const targetSlides = draft.slideContent.filter(slide => {
      const rec = draft.visualStrategy?.slides.find(s => s.slideId === slide.id);
      const meta = draft.assetsMetadata?.[slide.id];
      const isNone = !rec || rec.visualNeed === 'None';
      const isCurrent = meta && getArtworkStatus(slide, meta) === 'current';
      return !isNone && !isCurrent;
    });

    if (targetSlides.length === 0) {
      alert("All recommended slide artworks are already up-to-date!");
      return;
    }

    setBulkGenerating(true);
    setBulkProgress({ current: 0, total: targetSlides.length });
    bulkCancelledRef.current = false;

    for (let i = 0; i < targetSlides.length; i++) {
      if (bulkCancelledRef.current) {
        break;
      }

      const slide = targetSlides[i];
      setBulkProgress(prev => ({ ...prev, current: i + 1 }));

      const rec = draft.visualStrategy.slides.find(s => s.slideId === slide.id)!;
      const currentPrompt = customPrompts[slide.id] || rec.imagePrompt || slide.visualConcept || "";
      const artworkType = localArtworkTypes[slide.id] || (rec.visualNeed as any) || 'Illustration';
      const textSafeArea = localSafeAreas[slide.id] || rec.textSafeArea || 'Centre';
      const artworkIntensity = localIntensities[slide.id] || 'Balanced';
      const includeRohit = localRohitToggles[slide.id] ?? rec.includeRohitRecommended ?? false;

      try {
        const res = await fetch('/api/gemini/generate-carousel-asset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: currentPrompt,
            style: "Modern Bold",
            aspectRatio: draft.designSettings.aspectRatio,
            includeRohit: includeRohit && !!referencePhoto,
            referenceImageBase64: includeRohit ? referencePhoto : undefined
          })
        });

        if (!res.ok) {
          console.error(`Failed generation for slide ${slide.slideNumber}: Status ${res.status}`);
          continue;
        }

        const data = await res.json();
        if (data.success && data.visual) {
          const base64 = data.visual.base64Data;
          const dbKey = `carousel_asset_${winner?.winnerId}_${slide.id}`;
          await dbStore.set("visual_drafts", dbKey, base64);
          
          const newMetadata: SavedCarouselAssetMetadata = {
            slideId: slide.id,
            indexedDBKey: dbKey,
            prompt: currentPrompt,
            model: data.visual.modelName || "gemini-3.1-flash-image",
            generationTimestamp: new Date().toISOString(),
            artworkType,
            placement: "Full background",
            referencePhotoUsed: includeRohit && !!referencePhoto,
            assetStatus: 'current',
            settings: {
              artworkOpacity: artworkIntensity === 'Minimal' ? 25 : (artworkIntensity === 'Bold' ? 100 : 65),
              overlayDarkness: artworkIntensity === 'Minimal' ? 75 : (artworkIntensity === 'Bold' ? 15 : 35),
              scale: 1.0,
              horizontalPosition: 0,
              verticalPosition: 0,
              crop: 'cover',
              blur: 0,
              contrast: 100,
              saturation: 100
            },
            textSafeArea,
            artworkIntensity,
            originalSlideTitle: slide.title,
            originalSlideBody: slide.body,
            originalSlideVisualConcept: slide.visualConcept,
            originalArtworkType: artworkType,
            originalTextSafeArea: textSafeArea,
            originalCarouselVisualTheme: draft.visualStrategy.carouselVisualTheme,
            originalPostFingerprint: postFingerprint
          };

          const latestDraftRaw = localStorage.getItem(`carousel_draft_${winner.winnerId}`);
          const latestDraft = latestDraftRaw ? JSON.parse(latestDraftRaw) as SavedCarouselDraft : draft;

          const updatedDraft = {
            ...latestDraft,
            assetsMetadata: {
              ...(latestDraft.assetsMetadata || {}),
              [slide.id]: newMetadata
            },
            updatedAt: new Date().toISOString()
          };

          setDraft(updatedDraft);
          localStorage.setItem(`carousel_draft_${winner.winnerId}`, JSON.stringify(updatedDraft));

          setLoadedImages(prev => ({
            ...prev,
            [slide.id]: `data:image/png;base64,${base64}`
          }));
        }
      } catch (err) {
        console.error(`Bulk generation failed for slide ${slide.slideNumber}`, err);
      }
    }

    setBulkGenerating(false);
  };

  // Cancel sequential queue
  const handleCancelBulkGeneration = () => {
    bulkCancelledRef.current = true;
  };

  // Keep stale artwork (overwrite cached protection keys)
  const handleKeepArtwork = (slideId: string) => {
    if (!draft || !draft.assetsMetadata || !draft.assetsMetadata[slideId]) return;
    const slide = draft.slideContent.find(s => s.id === slideId);
    if (!slide) return;
    
    const meta = draft.assetsMetadata[slideId];
    const updatedMeta: SavedCarouselAssetMetadata = {
      ...meta,
      assetStatus: 'current' as const,
      originalSlideTitle: slide.title,
      originalSlideBody: slide.body,
      originalSlideVisualConcept: slide.visualConcept,
      originalArtworkType: meta.artworkType,
      originalTextSafeArea: meta.textSafeArea,
      originalCarouselVisualTheme: draft.visualStrategy?.carouselVisualTheme || "",
      originalPostFingerprint: postFingerprint
    };

    saveDraft({
      ...draft,
      assetsMetadata: {
        ...draft.assetsMetadata,
        [slideId]: updatedMeta
      },
      updatedAt: new Date().toISOString()
    });
  };

  // Remove slide artwork entirely
  const handleRemoveArtwork = async (slideId: string) => {
    if (!draft) return;
    await dbStore.delete("visual_drafts", `carousel_asset_${winner?.winnerId}_${slideId}`);
    
    const newMetadata = { ...(draft.assetsMetadata || {}) };
    delete newMetadata[slideId];

    saveDraft({
      ...draft,
      assetsMetadata: newMetadata,
      updatedAt: new Date().toISOString()
    });
  };

  // Render a slide to an HTML Canvas
  const renderSlideToCanvas = async (
    slide: LinkedInCarouselSlide,
    width: number,
    height: number,
    skipArtworkOverride: boolean = false
  ): Promise<HTMLCanvasElement> => {
    if (!draft) throw new Error("No draft loaded");
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get 2D context");

    // Wait for fonts to be ready to prevent invisible text
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready;
      } catch (e) {
        console.warn("Fonts not fully ready", e);
      }
    }

    const scaleFactor = width / 1080;
    const fontScale = draft.designSettings.fontScale || 1.0;
    const padX = width * 0.06;
    const padY = height * 0.05;
    const topHeaderHeight = 40 * scaleFactor;
    const bottomFooterHeight = 40 * scaleFactor;

    // 1. Draw Background color
    ctx.fillStyle = draft.designSettings.backgroundColor || '#0b1329';
    ctx.fillRect(0, 0, width, height);

    // 2. Load and Draw Generated Artwork
    const meta = draft.assetsMetadata?.[slide.id];
    const artworkType = meta?.artworkType || 'No generated artwork';
    const hasArtwork = artworkType !== 'No generated artwork' && !skipArtworkOverride;
    const safeArea = meta?.textSafeArea || 'Centre';

    if (hasArtwork && meta) {
      const base64 = loadedImages[slide.id] || await dbStore.get("visual_drafts", meta.indexedDBKey);
      if (base64) {
        const img = new Image();
        img.src = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load image for slide ${slide.slideNumber}`));
        });
        
        ctx.save();
        
        // Opacity
        const intensity = meta.artworkIntensity || 'Balanced';
        const opacity = (intensity === 'Minimal' ? 25 : (intensity === 'Bold' ? 100 : 65)) / 100;
        ctx.globalAlpha = opacity;

        // Adjustments
        const contrast = meta.settings?.contrast ?? 100;
        const saturation = meta.settings?.saturation ?? 100;
        const blur = (meta.settings?.blur ?? 0) * scaleFactor;
        ctx.filter = `contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;

        // Drawing with crop / scale / position
        const imgW = img.width;
        const imgH = img.height;
        const scaleVal = meta.settings?.scale ?? 1.0;
        const hPos = meta.settings?.horizontalPosition ?? 0;
        const vPos = meta.settings?.verticalPosition ?? 0;
        const cropMode = meta.settings?.crop ?? 'cover';

        let dWidth = width;
        let dHeight = height;
        if (cropMode === 'cover') {
          const ratio = Math.max(width / imgW, height / imgH) * scaleVal;
          dWidth = imgW * ratio;
          dHeight = imgH * ratio;
        } else if (cropMode === 'contain') {
          const ratio = Math.min(width / imgW, height / imgH) * scaleVal;
          dWidth = imgW * ratio;
          dHeight = imgH * ratio;
        } else {
          dWidth = width * scaleVal;
          dHeight = height * scaleVal;
        }

        const dx = (width - dWidth) / 2 + (hPos / 100) * (width / 2);
        const dy = (height - dHeight) / 2 + (vPos / 100) * (height / 2);

        ctx.drawImage(img, dx, dy, dWidth, dHeight);
        ctx.restore();

        // 3. Draw Overlay Readability Gradient
        const hex = draft.designSettings.backgroundColor.startsWith('#') ? draft.designSettings.backgroundColor : '#0b1329';
        const r = parseInt(hex.slice(1, 3), 16) || 11;
        const g = parseInt(hex.slice(3, 5), 16) || 19;
        const b = parseInt(hex.slice(5, 7), 16) || 41;
        
        const baseColor = `rgba(${r}, ${g}, ${b}, 1)`;
        const semiTransparent = `rgba(${r}, ${g}, ${b}, 0.75)`;
        const transparent = `rgba(${r}, ${g}, ${b}, 0.15)`;
        
        let gradient: CanvasGradient;
        if (safeArea === 'Top') {
          gradient = ctx.createLinearGradient(0, 0, 0, height);
          gradient.addColorStop(0, transparent);
          gradient.addColorStop(0.35, semiTransparent);
          gradient.addColorStop(0.75, baseColor);
        } else if (safeArea === 'Bottom') {
          gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, transparent);
          gradient.addColorStop(0.35, semiTransparent);
          gradient.addColorStop(0.75, baseColor);
        } else if (safeArea === 'Left') {
          gradient = ctx.createLinearGradient(0, 0, width, 0);
          gradient.addColorStop(0, transparent);
          gradient.addColorStop(0.35, semiTransparent);
          gradient.addColorStop(0.75, baseColor);
        } else if (safeArea === 'Right') {
          gradient = ctx.createLinearGradient(width, 0, 0, 0);
          gradient.addColorStop(0, transparent);
          gradient.addColorStop(0.35, semiTransparent);
          gradient.addColorStop(0.75, baseColor);
        } else {
          gradient = ctx.createLinearGradient(0, 0, 0, 0);
        }

        ctx.fillStyle = safeArea === 'Centre' ? `rgba(${r}, ${g}, ${b}, 0.65)` : gradient;
        ctx.fillRect(0, 0, width, height);
      } else {
        throw new Error(`Artwork missing for slide ${slide.slideNumber}`);
      }
    }

    // 4. Draw Progress bar
    if (draft.designSettings.showProgressIndicator) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.fillRect(0, 0, width, Math.round(5 * scaleFactor));
      
      ctx.fillStyle = draft.designSettings.accentColor;
      const progressWidth = (slide.slideNumber / draft.slideContent.length) * width;
      ctx.fillRect(0, 0, progressWidth, Math.round(5 * scaleFactor));
    }

    // 5. Draw small header label
    const labelText = (slide.smallLabel || "AI WRITER").toUpperCase();
    ctx.font = `bold ${Math.round(16 * scaleFactor)}px "Inter", "Helvetica Neue", sans-serif`;
    ctx.fillStyle = draft.designSettings.primaryColor;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(labelText, padX, padY + (draft.designSettings.showProgressIndicator ? Math.round(10 * scaleFactor) : 0));

    // 6. Factual Shield
    if (slide.factualType === 'Verified fact') {
      ctx.font = `bold ${Math.round(14 * scaleFactor)}px "Inter", sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#60a5fa'; // blue-400
      ctx.fillText("🛡️ FACTUAL", width - padX, padY + (draft.designSettings.showProgressIndicator ? Math.round(10 * scaleFactor) : 0));
    }

    // 7. Text Wrap Helpers
    let availableHeight = height - (padY * 2) - topHeaderHeight - bottomFooterHeight;
    if (hasArtwork && (safeArea === 'Top' || safeArea === 'Bottom')) {
      availableHeight = availableHeight * 0.5;
    }
    
    let maxWidth = width - (padX * 2);
    if (hasArtwork && (safeArea === 'Left' || safeArea === 'Right')) {
      maxWidth = maxWidth * 0.85;
    }

    const wrapText = (text: string, fontSize: number, isBold: boolean): string[] => {
      if (!text) return [];
      ctx.font = `${isBold ? '900' : '500'} ${fontSize}px "Inter", sans-serif`;
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        if (ctx.measureText(testLine).width > maxWidth) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    // 8. Layout rendering logic with emphasis support
    const scale = fontScale;
    const accentColor = draft.designSettings.accentColor;
    const primaryColor = draft.designSettings.primaryColor;

    const drawTextWithEmphasis = (line: string, lx: number, ly: number, fontSize: number, isBold: boolean) => {
      const fontPrefix = `${isBold ? '900' : '500'} ${fontSize}px "Inter", sans-serif`;
      const emphasis = slide.emphasisText;
      
      if (!emphasis) {
        ctx.font = fontPrefix;
        ctx.fillStyle = primaryColor;
        ctx.fillText(line, lx, ly);
        return;
      }

      const words = line.split(' ');
      let currentX = lx;
      ctx.font = fontPrefix;
      const normEmphasis = emphasis.trim().toLowerCase();

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
        const isEmphasis = cleanWord === normEmphasis || word.toLowerCase().includes(normEmphasis);

        ctx.fillStyle = isEmphasis ? accentColor : primaryColor;
        ctx.fillText(word, currentX, ly);
        currentX += ctx.measureText(word + ' ').width;
      }
    };

    // Render slides according to layoutTemplate
    let startY = padY + topHeaderHeight + 20 * scaleFactor;
    let textX = padX;
    ctx.textAlign = 'left';

    if (hasArtwork) {
      if (safeArea === 'Top') {
        startY = height - padY - bottomFooterHeight - availableHeight;
      } else if (safeArea === 'Left') {
        textX = width - padX - maxWidth;
      }
    }

    if (slide.layoutTemplate === 'Cover statement') {
      const headlineFontSize = Math.round(48 * scaleFactor * scale);
      const bodyFontSize = Math.round(24 * scaleFactor * scale);
      
      const headlineLines = wrapText(slide.title, headlineFontSize, true);
      const bodyLines = wrapText(slide.body, bodyFontSize, false);
      
      const headlineHeight = headlineLines.length * (headlineFontSize * 1.25);
      const bodyHeight = bodyLines.length * (bodyFontSize * 1.45);
      const cumulativeHeight = headlineHeight + (33 * scaleFactor) + bodyHeight;

      // Center layout
      ctx.textAlign = 'center';
      let drawY = startY + (availableHeight - cumulativeHeight) / 2;
      const centerX = width / 2;

      // Draw Headline
      headlineLines.forEach(line => {
        ctx.font = `900 ${headlineFontSize}px "Inter", sans-serif`;
        ctx.fillStyle = primaryColor;
        
        const words = line.split(' ');
        const totalWidth = ctx.measureText(line).width;
        let curX = centerX - totalWidth / 2;
        const normEmphasis = (slide.emphasisText || '').trim().toLowerCase();
        
        words.forEach(w => {
          const cleanW = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
          const isEmphasis = normEmphasis && (cleanW === normEmphasis || w.toLowerCase().includes(normEmphasis));
          ctx.fillStyle = isEmphasis ? accentColor : primaryColor;
          ctx.fillText(w, curX, drawY);
          curX += ctx.measureText(w + ' ').width;
        });
        
        drawY += headlineFontSize * 1.25;
      });

      // Draw Divider line
      drawY += 12 * scaleFactor;
      ctx.fillStyle = accentColor;
      ctx.fillRect(centerX - 24 * scaleFactor, drawY, 48 * scaleFactor, 4 * scaleFactor);
      drawY += 16 * scaleFactor;

      // Draw Body
      bodyLines.forEach(line => {
        ctx.font = `500 ${bodyFontSize}px "Inter", sans-serif`;
        ctx.fillStyle = primaryColor;
        ctx.globalAlpha = 0.85;
        ctx.fillText(line, centerX, drawY);
        drawY += bodyFontSize * 1.45;
      });
      ctx.globalAlpha = 1.0;

    } else if (slide.layoutTemplate === 'Big number or phrase') {
      const bigFontSize = Math.round(120 * scaleFactor * scale);
      const titleFontSize = Math.round(36 * scaleFactor * scale);
      const bodyFontSize = Math.round(22 * scaleFactor * scale);
      
      const titleLines = wrapText(slide.title, titleFontSize, true);
      const bodyLines = wrapText(slide.body, bodyFontSize, false);
      
      const bigHeight = bigFontSize * 1.1;
      const titleHeight = titleLines.length * (titleFontSize * 1.25);
      const bodyHeight = bodyLines.length * (bodyFontSize * 1.45);
      const cumulativeHeight = bigHeight + titleHeight + bodyHeight + (24 * scaleFactor);

      let drawY = startY + (availableHeight - cumulativeHeight) / 2;
      ctx.textAlign = 'left';

      // Draw Big phrase
      ctx.font = `900 ${bigFontSize}px "Inter", sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.fillText(slide.emphasisText || "01", textX, drawY + bigFontSize * 0.8);
      drawY += bigHeight;

      // Draw Title
      titleLines.forEach(line => {
        drawTextWithEmphasis(line, textX, drawY + titleFontSize * 0.8, titleFontSize, true);
        drawY += titleFontSize * 1.25;
      });

      // Draw Body
      drawY += 8 * scaleFactor;
      bodyLines.forEach(line => {
        ctx.font = `500 ${bodyFontSize}px "Inter", sans-serif`;
        ctx.fillStyle = primaryColor;
        ctx.globalAlpha = 0.85;
        ctx.fillText(line, textX, drawY + bodyFontSize * 0.8);
        drawY += bodyFontSize * 1.45;
      });
      ctx.globalAlpha = 1.0;

    } else if (slide.layoutTemplate === 'Quote-free insight') {
      const bodyFontSize = Math.round(28 * scaleFactor * scale);
      const authorFontSize = Math.round(18 * scaleFactor * scale);
      
      const bodyLines = wrapText(slide.body, bodyFontSize, false);
      const authorLines = wrapText(slide.title, authorFontSize, true);
      
      const bodyHeight = bodyLines.length * (bodyFontSize * 1.45);
      const authorHeight = authorLines.length * (authorFontSize * 1.25);
      const cumulativeHeight = bodyHeight + authorHeight + (16 * scaleFactor);

      let drawY = startY + (availableHeight - cumulativeHeight) / 2;
      ctx.textAlign = 'left';

      ctx.fillStyle = accentColor;
      ctx.fillRect(textX, drawY, 4 * scaleFactor, cumulativeHeight);

      const textShiftX = textX + 16 * scaleFactor;

      bodyLines.forEach(line => {
        ctx.font = `italic 500 ${bodyFontSize}px "Inter", sans-serif`;
        ctx.fillStyle = primaryColor;
        ctx.globalAlpha = 0.95;
        ctx.fillText(line, textShiftX, drawY + bodyFontSize * 0.8);
        drawY += bodyFontSize * 1.45;
      });
      ctx.globalAlpha = 1.0;

      drawY += 8 * scaleFactor;
      authorLines.forEach(line => {
        ctx.font = `900 ${authorFontSize}px "Inter", sans-serif`;
        ctx.fillStyle = primaryColor;
        ctx.globalAlpha = 0.7;
        ctx.fillText(`— ${line}`, textShiftX, drawY + authorFontSize * 0.8);
        drawY += authorFontSize * 1.25;
      });
      ctx.globalAlpha = 1.0;

    } else {
      const titleFontSize = Math.round(36 * scaleFactor * scale);
      const bodyFontSize = Math.round(22 * scaleFactor * scale);
      const bulletFontSize = Math.round(20 * scaleFactor * scale);
      
      const titleLines = wrapText(slide.title, titleFontSize, true);
      const bodyLines = wrapText(slide.body, bodyFontSize, false);
      
      let titleHeight = titleLines.length * (titleFontSize * 1.25);
      let bodyHeight = bodyLines.length * (bodyFontSize * 1.45);
      let cumulativeHeight = titleHeight + bodyHeight + (16 * scaleFactor);

      const isListTemplate = ['Three-point list', 'Checklist', 'Process steps', 'Summary'].includes(slide.layoutTemplate);
      const bulletLinesList: string[][] = [];
      if (slide.bullets && slide.bullets.length > 0 && isListTemplate) {
        let bulletsHeight = 0;
        for (const bullet of slide.bullets) {
          const bl = wrapText(bullet, bulletFontSize, false);
          bulletLinesList.push(bl);
          bulletsHeight += bl.length * (bulletFontSize * 1.45) + (8 * scaleFactor);
        }
        cumulativeHeight += bulletsHeight + (12 * scaleFactor);
      }

      let drawY = startY + (availableHeight - cumulativeHeight) / 2;
      ctx.textAlign = 'left';

      titleLines.forEach(line => {
        drawTextWithEmphasis(line, textX, drawY + titleFontSize * 0.8, titleFontSize, true);
        drawY += titleFontSize * 1.25;
      });

      drawY += 8 * scaleFactor;
      bodyLines.forEach(line => {
        ctx.font = `500 ${bodyFontSize}px "Inter", sans-serif`;
        ctx.fillStyle = primaryColor;
        ctx.globalAlpha = 0.85;
        ctx.fillText(line, textX, drawY + bodyFontSize * 0.8);
        drawY += bodyFontSize * 1.45;
      });
      ctx.globalAlpha = 1.0;

      if (bulletLinesList.length > 0) {
        drawY += 12 * scaleFactor;
        bulletLinesList.forEach((blLines, bulletIdx) => {
          const bulletSymbol = slide.layoutTemplate === 'Checklist' ? '✓' : '•';
          
          ctx.font = `bold ${bulletFontSize}px "Inter", sans-serif`;
          ctx.fillStyle = accentColor;
          ctx.fillText(bulletSymbol, textX, drawY + bulletFontSize * 0.8);
          
          const bulletTextShift = textX + 24 * scaleFactor;
          
          blLines.forEach(line => {
            ctx.font = `500 ${bulletFontSize}px "Inter", sans-serif`;
            ctx.fillStyle = primaryColor;
            ctx.globalAlpha = 0.9;
            ctx.fillText(line, bulletTextShift, drawY + bulletFontSize * 0.8);
            drawY += bulletFontSize * 1.45;
          });
          ctx.globalAlpha = 1.0;
          drawY += 4 * scaleFactor;
        });
      }
    }

    // 9. Draw Brand Footer (Page Numbers / Handle)
    ctx.font = `500 ${Math.round(14 * scaleFactor)}px monospace`;
    ctx.fillStyle = draft.designSettings.primaryColor;
    ctx.globalAlpha = 0.6;
    ctx.textBaseline = 'bottom';
    
    if (draft.designSettings.showCreatorName) {
      ctx.textAlign = 'left';
      ctx.fillText("@rohitsinghpanwar", padX, height - padY);
    }
    
    if (draft.designSettings.showPageNumber) {
      ctx.textAlign = 'right';
      ctx.fillText(`${slide.slideNumber} / ${draft.slideContent.length}`, width - padX, height - padY);
    }
    ctx.globalAlpha = 1.0;

    return canvas;
  };

  // Single Slide PNG Download
  const handleDownloadSingleSlide = async (slide: LinkedInCarouselSlide) => {
    if (!draft) return;
    
    try {
      if (slide.title.trim() === '' || slide.body.trim() === '') {
        alert("This slide has empty required fields.");
        return;
      }
      
      const overflowRes = checkSlideTextOverflow(slide, draft.designSettings, draft.designSettings.aspectRatio, draft.assetsMetadata);
      if (overflowRes.hasOverflow) {
        alert(`Slide ${slide.slideNumber} contains text that does not fit safely in field: ${overflowRes.affectedField}. Reduce Font Scale or shorten text.`);
        return;
      }

      setIsExporting(true);
      setExportStatusText(`Preparing Slide ${slide.slideNumber}...`);
      setExportProgress(10);
      setExportSuccessMessage(null);

      const meta = draft.assetsMetadata?.[slide.id];
      let skipArtwork = false;
      if (meta && meta.artworkType !== 'No generated artwork') {
        const base64 = await dbStore.get("visual_drafts", meta.indexedDBKey);
        if (!base64) {
          setExportStatusText(`Artwork for Slide ${slide.slideNumber} is missing...`);
          const action = await new Promise<'skip' | 'cancel'>((resolve) => {
            setMissingArtworkSlideId(slide.id);
            setMissingArtworkActionResolve(() => resolve);
          });
          
          setMissingArtworkSlideId(null);
          setMissingArtworkActionResolve(null);
          
          if (action === 'cancel') {
            setIsExporting(false);
            return;
          }
          skipArtwork = true;
        }
      }

      setExportStatusText(`Rendering Slide ${slide.slideNumber}...`);
      setExportProgress(40);

      const isSquare = draft.designSettings.aspectRatio === '1:1';
      const width = exportQuality === 'high' ? 2160 : 1080;
      const height = isSquare 
        ? (exportQuality === 'high' ? 2160 : 1080) 
        : (exportQuality === 'high' ? 2700 : 1350);

      const canvas = await renderSlideToCanvas(slide, width, height, skipArtwork);

      setExportProgress(80);
      setExportStatusText("Generating PNG and triggering download...");

      const dataUrl = canvas.toDataURL("image/png");
      const twoDigitNum = String(slide.slideNumber).padStart(2, '0');
      const filename = `rohit-ai-carousel-slide-${twoDigitNum}.png`;

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.click();

      setExportProgress(100);
      setIsExporting(false);
      setExportSuccessMessage("Slide PNG downloaded successfully");
      setTimeout(() => setExportSuccessMessage(null), 4000);

    } catch (e: any) {
      console.error(e);
      alert(`Export failed: ${e.message}`);
      setIsExporting(false);
    }
  };

  // Download All Slide PNGs (Sequential)
  const handleDownloadAllPNGs = async () => {
    if (!draft) return;
    
    try {
      setIsExporting(true);
      setExportProgress(0);
      setExportSuccessMessage(null);

      const isSquare = draft.designSettings.aspectRatio === '1:1';
      const width = exportQuality === 'high' ? 2160 : 1080;
      const height = isSquare 
        ? (exportQuality === 'high' ? 2160 : 1080) 
        : (exportQuality === 'high' ? 2700 : 1350);

      const total = draft.slideContent.length;
      
      alert("Your browser may ask permission to download multiple files. Use 'Download ZIP' for one combined file if preferred.");

      for (let i = 0; i < total; i++) {
        const slide = draft.slideContent[i];
        setExportStatusText(`Rendering Slide ${slide.slideNumber} of ${total}...`);
        setExportProgress(Math.round((i / total) * 90));

        const meta = draft.assetsMetadata?.[slide.id];
        let skipArtwork = false;
        if (meta && meta.artworkType !== 'No generated artwork') {
          const base64 = await dbStore.get("visual_drafts", meta.indexedDBKey);
          if (!base64) {
            setExportStatusText(`Artwork for Slide ${slide.slideNumber} is missing...`);
            const action = await new Promise<'skip' | 'cancel'>((resolve) => {
              setMissingArtworkSlideId(slide.id);
              setMissingArtworkActionResolve(() => resolve);
            });
            
            setMissingArtworkSlideId(null);
            setMissingArtworkActionResolve(null);
            
            if (action === 'cancel') {
              setIsExporting(false);
              return;
            }
            skipArtwork = true;
          }
        }

        const canvas = await renderSlideToCanvas(slide, width, height, skipArtwork);

        const dataUrl = canvas.toDataURL("image/png");
        const twoDigitNum = String(slide.slideNumber).padStart(2, '0');
        
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `rohit-ai-carousel-slide-${twoDigitNum}.png`;
        link.click();
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setExportProgress(100);
      setIsExporting(false);
      setExportSuccessMessage("All slide PNGs downloaded successfully");
      setTimeout(() => setExportSuccessMessage(null), 4000);

    } catch (e: any) {
      console.error(e);
      alert(`Batch export failed: ${e.message}`);
      setIsExporting(false);
    }
  };

  // Download All as ZIP
  const handleDownloadZIP = async () => {
    if (!draft) return;
    
    try {
      setIsExporting(true);
      setExportProgress(0);
      setExportSuccessMessage(null);
      setExportStatusText("Initializing ZIP packager...");

      const isSquare = draft.designSettings.aspectRatio === '1:1';
      const width = exportQuality === 'high' ? 2160 : 1080;
      const height = isSquare 
        ? (exportQuality === 'high' ? 2160 : 1080) 
        : (exportQuality === 'high' ? 2700 : 1350);

      const total = draft.slideContent.length;
      const zip = new JSZip();
      const folder = zip.folder("rohit-ai-linkedin-carousel");
      if (!folder) throw new Error("Could not create ZIP folder");

      for (let i = 0; i < total; i++) {
        const slide = draft.slideContent[i];
        setExportStatusText(`Rendering Slide ${slide.slideNumber} of ${total}...`);
        setExportProgress(Math.round((i / total) * 80));

        const meta = draft.assetsMetadata?.[slide.id];
        let skipArtwork = false;
        if (meta && meta.artworkType !== 'No generated artwork') {
          const base64 = await dbStore.get("visual_drafts", meta.indexedDBKey);
          if (!base64) {
            setExportStatusText(`Artwork for Slide ${slide.slideNumber} is missing...`);
            const action = await new Promise<'skip' | 'cancel'>((resolve) => {
              setMissingArtworkSlideId(slide.id);
              setMissingArtworkActionResolve(() => resolve);
            });
            
            setMissingArtworkSlideId(null);
            setMissingArtworkActionResolve(null);
            
            if (action === 'cancel') {
              setIsExporting(false);
              return;
            }
            skipArtwork = true;
          }
        }

        const canvas = await renderSlideToCanvas(slide, width, height, skipArtwork);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const twoDigitNum = String(slide.slideNumber).padStart(2, '0');
          const cleanRole = slide.role.toLowerCase().replace(/[^a-z0-9]+/g, '');
          folder.file(`${twoDigitNum}-${cleanRole}.png`, blob);
        }
      }

      setExportStatusText("Generating carousel-outline.txt...");
      let outline = `AI LINKEDIN CAROUSEL OUTLINE\n`;
      outline += `====================================\n`;
      outline += `Title: ${draft.carouselStrategy.carouselTitle}\n`;
      outline += `Total Slides: ${draft.slideContent.length}\n`;
      outline += `Created At: ${new Date().toLocaleString()}\n\n`;

      draft.slideContent.forEach((s, idx) => {
        outline += `SLIDE ${idx + 1} [Role: ${s.role} - Template: ${s.layoutTemplate}]\n`;
        outline += `------------------------------------\n`;
        outline += `Title: ${s.title}\n`;
        outline += `Body: ${s.body}\n`;
        if (s.bullets && s.bullets.length > 0) {
          outline += `Bullets:\n`;
          s.bullets.forEach(b => outline += `  - ${b}\n`);
        }
        if (s.emphasisText) outline += `Emphasis: ${s.emphasisText}\n`;
        if (s.smallLabel) outline += `Label: ${s.smallLabel}\n`;
        outline += `\n`;
      });
      folder.file("carousel-outline.txt", outline);

      setExportStatusText("Generating sources.txt...");
      let sourcesText = `VERIFIED FACTS & SOURCES\n`;
      sourcesText += `====================================\n\n`;
      if (credibilityReport && credibilityReport.claims) {
        credibilityReport.claims.forEach((claim, idx) => {
          sourcesText += `Claim ${idx + 1}:\n`;
          sourcesText += `Text: "${claim.claimText}"\n`;
          if (claim.sourceUrl) {
            sourcesText += `Source: ${claim.sourceUrl}\n`;
          }
          if (claim.supportingQuote) {
            sourcesText += `Supporting Quote: "${claim.supportingQuote}"\n`;
          }
          sourcesText += `\n`;
        });
      } else {
        sourcesText += `No external fact-checking report was generated for this carousel.\n`;
      }
      folder.file("sources.txt", sourcesText);

      setExportStatusText("Generating export-info.json...");
      const infoJson = {
        exportedAt: new Date().toISOString(),
        slideCount: total,
        aspectRatio: draft.designSettings.aspectRatio,
        exportResolution: `${width}x${height}`,
        theme: {
          backgroundColor: draft.designSettings.backgroundColor,
          primaryColor: draft.designSettings.primaryColor,
          accentColor: draft.designSettings.accentColor
        }
      };
      folder.file("export-info.json", JSON.stringify(infoJson, null, 2));

      setExportStatusText("Packaging and generating ZIP archive...");
      setExportProgress(90);

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'rohit-ai-linkedin-carousel.zip';
      link.click();
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setIsExporting(false);
      setExportSuccessMessage("Carousel ZIP archive downloaded successfully");
      setTimeout(() => setExportSuccessMessage(null), 4000);

    } catch (e: any) {
      console.error(e);
      alert(`ZIP creation failed: ${e.message}`);
      setIsExporting(false);
    }
  };

  // Multi-page LinkedIn-ready PDF Export
  const handleDownloadPDF = async () => {
    if (!draft) return;

    try {
      setIsExporting(true);
      setExportProgress(0);
      setExportSuccessMessage(null);
      setExportStatusText("Initializing PDF document...");

      const isSquare = draft.designSettings.aspectRatio === '1:1';
      const width = exportQuality === 'high' ? 2160 : 1080;
      const height = isSquare 
        ? (exportQuality === 'high' ? 2160 : 1080) 
        : (exportQuality === 'high' ? 2700 : 1350);

      const total = draft.slideContent.length;

      const pdf = new jsPDF({
        orientation: height > width ? 'portrait' : 'landscape',
        unit: 'px',
        format: [width, height]
      });

      for (let i = 0; i < total; i++) {
        const slide = draft.slideContent[i];
        setExportStatusText(`Rendering Slide ${slide.slideNumber} of ${total} into PDF...`);
        setExportProgress(Math.round((i / total) * 90));

        const meta = draft.assetsMetadata?.[slide.id];
        let skipArtwork = false;
        if (meta && meta.artworkType !== 'No generated artwork') {
          const base64 = await dbStore.get("visual_drafts", meta.indexedDBKey);
          if (!base64) {
            setExportStatusText(`Artwork for Slide ${slide.slideNumber} is missing...`);
            const action = await new Promise<'skip' | 'cancel'>((resolve) => {
              setMissingArtworkSlideId(slide.id);
              setMissingArtworkActionResolve(() => resolve);
            });
            
            setMissingArtworkSlideId(null);
            setMissingArtworkActionResolve(null);
            
            if (action === 'cancel') {
              setIsExporting(false);
              return;
            }
            skipArtwork = true;
          }
        }

        const canvas = await renderSlideToCanvas(slide, width, height, skipArtwork);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        
        if (i > 0) {
          pdf.addPage([width, height], height > width ? 'portrait' : 'landscape');
        }
        
        pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height, undefined, 'FAST');
      }

      setExportStatusText("Saving PDF...");
      setExportProgress(95);

      pdf.save("rohit-ai-linkedin-carousel.pdf");

      setExportProgress(100);
      setIsExporting(false);
      setExportSuccessMessage("LinkedIn-ready PDF exported successfully");
      setTimeout(() => setExportSuccessMessage(null), 4000);

    } catch (e: any) {
      console.error(e);
      alert(`PDF generation failed: ${e.message}`);
      setIsExporting(false);
    }
  };

  // Prerequisites loading state
  if (!isPrereqLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="font-mono text-sm">Loading Carousel Workspace...</p>
      </div>
    );
  }

  // PREREQUISITE CHECK 1: Selected Winner and post existence
  if (!winner || !stitchedPostText) {
    return (
      <div className="bg-slate-950 border border-slate-800/80 rounded-3xl p-8 max-w-lg mx-auto text-center mt-12 shadow-2xl">
        <div className="w-16 h-16 bg-blue-950/50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-800/20">
          <Layers className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-3">Complete your post first</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Create and verify a LinkedIn post before building its carousel.
        </p>
        <button
          onClick={() => setActiveTab('post-studio')}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all duration-200"
        >
          <span>Go to Post Studio</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // PREREQUISITE CHECK 2: Credibility Check validation
  const isCheckMissing = !credibilityReport;
  const isCheckFailed = credibilityReport?.overallStatus === 'Fail';
  const isCheckOutdated = !!(credibilityReport && credibilityReport.draftFingerprint !== postFingerprint);

  if (isCheckMissing || isCheckFailed || isCheckOutdated) {
    return (
      <div className="bg-slate-950 border border-slate-800/80 rounded-3xl p-8 max-w-lg mx-auto text-center mt-12 shadow-2xl">
        <div className="w-16 h-16 bg-amber-950/40 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-800/20">
          <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-white mb-3">Run a credibility check first</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          {isCheckOutdated 
            ? "The underlying LinkedIn post has changed since your last credibility check. Please verify its facts first."
            : "A successful credibility check is required to ensure your slide learning journey contains no unverified AI claims."}
        </p>
        <button
          onClick={() => setActiveTab('post-studio')}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all duration-200"
        >
          <span>Go to Post Studio</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // STATE: LOADING / GENERATING STATE
  if (status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center max-w-md mx-auto">
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center animate-pulse">
            <Sparkles className="w-10 h-10 text-blue-500 animate-spin" />
          </div>
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-2xl blur opacity-25 animate-pulse -z-10" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Generating Carousel Plan</h3>
        <div className="h-1.5 w-48 bg-slate-800 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-blue-500 rounded-full animate-[shimmer_1.5s_infinite]" style={{ width: '60%' }} />
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={loadingStepIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-xs text-blue-400 font-mono tracking-wider"
          >
            {GENERATION_STEPS[loadingStepIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    );
  }

  // STATE: DRAFT GENERATOR LAUNCHER (If no draft exists)
  if (!draft) {
    return (
      <div className="max-w-3xl mx-auto mt-6">
        {/* Post Summary & Warning Cards */}
        <div className="bg-[#0b1329]/40 border border-slate-800/80 rounded-3xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-600/10 rounded-xl border border-blue-500/10">
              <Layers className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-sans font-bold text-white tracking-tight">AI Carousel Builder</h2>
              <p className="text-slate-400 text-xs font-mono uppercase tracking-wider">Ready to transform post</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-900/60 border border-slate-800/50 p-5 rounded-2xl">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Idea</h3>
              <p className="text-sm text-slate-200 font-semibold mb-1">{winner.winningIdea.title}</p>
              <p className="text-xs text-slate-400 line-clamp-2">{winner.winningIdea.coreIdea}</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/50 p-5 rounded-2xl">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Credibility Checked</h3>
              <div className="flex items-center gap-2 mb-1">
                <div className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                  {credibilityReport.overallStatus}
                </div>
                <span className="text-xs text-slate-300 font-mono">Score: {credibilityReport.credibilityScore}/100</span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">verified {credibilityReport.verifiedClaimCount} fact claims.</p>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-6">
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              How many slides do you want in your learning journey?
            </label>
            <div className="grid grid-cols-5 gap-3 max-w-md">
              {[6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => handleGenerateCarousel(num)}
                  className="py-3 bg-slate-900/80 hover:bg-blue-600/10 hover:border-blue-500/40 border border-slate-800 rounded-xl font-bold font-sans text-sm text-slate-200 transition-all duration-200"
                >
                  {num} Slides
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3 italic">
              * LinkedIn algorithms favor highly visual, multi-step carousels between 6 and 10 slides. No fluff or duplicate ideas will be added.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // PREPARE CURRENT SLIDE DATA
  const currentSlideIdx = draft.slideContent.findIndex(s => s.id === selectedSlideId);
  const currentSlide = draft.slideContent[currentSlideIdx] || draft.slideContent[0];

  // Visual status and recommendations for selected slide
  const slideRec = draft.visualStrategy?.slides.find(s => s.slideId === selectedSlideId);
  const artworkMeta = draft.assetsMetadata?.[selectedSlideId];
  const slideArtworkStatus = getArtworkStatus(currentSlide, artworkMeta);

  // Active slide editor visual state bindings (fall back to recommended values)
  const activeArtworkType = localArtworkTypes[selectedSlideId] || (slideRec?.visualNeed as any) || 'No generated artwork';
  const activeSafeArea = localSafeAreas[selectedSlideId] || slideRec?.textSafeArea || 'Centre';
  const activeIntensity = localIntensities[selectedSlideId] || 'Balanced';
  const activeRohitToggle = localRohitToggles[selectedSlideId] ?? slideRec?.includeRohitRecommended ?? false;
  const activePrompt = customPrompts[selectedSlideId] !== undefined ? customPrompts[selectedSlideId] : (slideRec?.imagePrompt || currentSlide.visualConcept || "");

  // Responsive text styling based on safe-area mapping
  let containerClass = "flex-1 flex flex-col justify-center select-none";
  let contentClass = "space-y-3";

  if (loadedImages[selectedSlideId] && activeArtworkType !== 'No generated artwork') {
    if (activeSafeArea === 'Top') {
      containerClass = "flex-1 flex flex-col justify-end pb-3 select-none";
    } else if (activeSafeArea === 'Bottom') {
      containerClass = "flex-1 flex flex-col justify-start pt-3 select-none";
    } else if (activeSafeArea === 'Left') {
      containerClass = "flex-1 flex flex-col justify-center items-end text-right select-none";
      contentClass = "space-y-2.5 max-w-[85%] ml-auto";
    } else if (activeSafeArea === 'Right') {
      containerClass = "flex-1 flex flex-col justify-center items-start text-left select-none";
      contentClass = "space-y-2.5 max-w-[85%] mr-auto";
    }
  }

  // RENDER THE CAROUSEL EDITOR
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0b1329]/40 border border-slate-800/80 p-6 rounded-3xl">
        <div className="flex items-center gap-3">
          <Layers className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-xl font-sans font-bold text-white tracking-tight">
              {draft.carouselStrategy.carouselTitle}
            </h1>
            <p className="text-xs text-slate-400">
              Draft Persistence Active • Last edited {new Date(draft.updatedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleQualityCheck}
            disabled={isCheckingQuality}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-all font-sans text-sm"
          >
            {isCheckingQuality ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>Check Quality</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (confirm("Are you sure you want to regenerate this carousel strategy? All custom edits and generated images will be lost.")) {
                saveDraft({
                  ...draft,
                  slideContent: [],
                  assetsMetadata: {},
                  updatedAt: new Date().toISOString()
                } as any);
                setDraft(null);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 rounded-xl border border-red-900/30 transition-all font-sans text-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Visual Direction Section (Strategic Art Direction Panel) */}
      {!draft.visualStrategy ? (
        <div className="bg-[#0b1329]/40 border border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/10 rounded-xl border border-blue-500/10">
                <Sparkles className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-sans">Carousel Visual Direction</h3>
                <p className="text-xs text-slate-400">Establish stylistic brand parameters and analyze per-slide visual artwork recommendations.</p>
              </div>
            </div>
            
            <button
              onClick={handleAnalyzeVisualNeeds}
              disabled={status === 'analyzing_visual_needs'}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-medium transition-all text-sm font-sans shrink-0"
            >
              {status === 'analyzing_visual_needs' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analysing Slide Needs...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyse Slide Visual Needs</span>
                </>
              )}
            </button>
          </div>
          
          {status === 'analyzing_visual_needs' && (
            <div className="bg-slate-900/60 border border-slate-800/50 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-xs font-mono text-blue-400 font-bold uppercase tracking-wider">
                  {loadingStepIndex === 0 && "Synthesizing visual themes..."}
                  {loadingStepIndex === 1 && "Aligning art direction..."}
                  {loadingStepIndex === 2 && "Mapping safe areas..."}
                  {loadingStepIndex === 3 && "Ensuring consistency..."}
                </span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-[shimmer_1s_infinite]" style={{ width: '55%' }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#0b1329]/40 border border-slate-800/80 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-600/10 rounded-xl border border-green-500/10">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-sans">Carousel Visual Direction</h3>
                <p className="text-xs text-slate-400">Strategic theme parameters locked and aligned with creator brand.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateAllArtwork}
                disabled={bulkGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium transition-all text-sm font-sans disabled:opacity-50"
              >
                {bulkGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating Artwork ({bulkProgress.current} / {bulkProgress.total})...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate All Recommended Artwork</span>
                  </>
                )}
              </button>
              
              {bulkGenerating && (
                <button
                  onClick={handleCancelBulkGeneration}
                  className="px-3 py-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 rounded-xl border border-red-900/30 transition-all font-sans text-sm"
                >
                  Cancel
                </button>
              )}

              <button
                onClick={handleResetVisualStrategy}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl transition-all text-sm font-sans"
              >
                Reset Strategy
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">Visual theme direction</h4>
                <p className="text-lg font-extrabold text-white tracking-tight leading-snug">{draft.visualStrategy.carouselVisualTheme}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">Art Direction Guidance</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{draft.visualStrategy.artDirection}</p>
              </div>
              {draft.visualStrategy.identityUsageRecommendation && (
                <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-xl">
                  <h5 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono mb-1">Rohit Portrait Recommendation</h5>
                  <p className="text-xs text-slate-300 leading-relaxed">{draft.visualStrategy.identityUsageRecommendation}</p>
                </div>
              )}
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl space-y-3.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Sliders className="w-3.5 h-3.5" />
                <span>Cohesive Parameters</span>
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block font-mono text-[10px] uppercase">Lighting</span>
                  <span className="text-slate-200 font-semibold">{draft.visualStrategy.lightingDirection}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-mono text-[10px] uppercase">Composition</span>
                  <span className="text-slate-200 font-semibold">{draft.visualStrategy.compositionDirection}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-mono text-[10px] uppercase">Texture</span>
                  <span className="text-slate-200 font-semibold">{draft.visualStrategy.textureDirection}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-500 block font-mono text-[10px] uppercase mb-1.5">Consistency Rules</span>
                <ul className="space-y-1">
                  {draft.visualStrategy.consistencyRules.map((rule, idx) => (
                    <li key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5 leading-relaxed">
                      <span className="text-blue-500 font-bold shrink-0">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid: Three-part layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMN 1: Slide Navigator (Left Panel - 3 cols) */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
              Slides ({draft.slideContent.length})
            </h3>
            <button
              onClick={addSlide}
              disabled={draft.slideContent.length >= 10}
              className="p-1 hover:bg-blue-600/10 hover:text-blue-400 border border-transparent hover:border-blue-500/20 text-slate-400 rounded-lg transition-all"
              title="Add Slide"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {draft.slideContent.map((s, idx) => {
              const isSelected = s.id === selectedSlideId;
              const hasArtwork = !!draft.assetsMetadata?.[s.id];
              const artworkStale = hasArtwork && getArtworkStatus(s, draft.assetsMetadata?.[s.id]) === 'outdated';
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSlideId(s.id)}
                  className={`group relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-blue-600/10 border-blue-500/50 shadow-md shadow-blue-500/5' 
                      : 'bg-slate-900/40 border-slate-800/50 hover:bg-slate-900/80 hover:border-slate-800'
                  }`}
                >
                  {/* Thumbnail Badge */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold text-slate-200 truncate pr-4">
                        {s.title || "Untitled Slide"}
                      </p>
                      {hasArtwork && (
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${artworkStale ? 'bg-amber-500' : 'bg-green-500'}`} title={artworkStale ? "Artwork is outdated" : "Artwork is up-to-date"} />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">
                      {s.role}
                    </p>
                  </div>

                  {/* Navigator Controls (Up, Down, Duplicate, Delete) */}
                  <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-slate-900 border border-slate-800 px-1 py-0.5 rounded-lg transition-opacity duration-200 z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveSlide(idx, 'up'); }}
                      disabled={idx === 0}
                      className="p-0.5 hover:text-white disabled:opacity-30"
                      title="Move Up"
                    >
                      <MoveUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveSlide(idx, 'down'); }}
                      disabled={idx === draft.slideContent.length - 1}
                      className="p-0.5 hover:text-white disabled:opacity-30"
                      title="Move Down"
                    >
                      <MoveDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); duplicateSlide(idx); }}
                      disabled={draft.slideContent.length >= 10}
                      className="p-0.5 hover:text-white disabled:opacity-30"
                      title="Duplicate"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSlide(idx); }}
                      disabled={draft.slideContent.length <= 6}
                      className="p-0.5 hover:text-red-400 disabled:opacity-30"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Design presets / Custom settings panel within Left sidebar */}
          <div className="border-t border-slate-800/60 pt-4 space-y-4">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span>Theme Configuration</span>
            </h4>

            {/* Quick Presets */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  saveDraft({
                    ...draft,
                    designSettings: {
                      ...draft.designSettings,
                      backgroundColor: '#0b1329',
                      primaryColor: '#ffffff',
                      accentColor: '#3b82f6'
                    },
                    updatedAt: new Date().toISOString()
                  });
                }}
                className="py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-sans hover:bg-slate-850"
              >
                🔵 Cosmic Slate
              </button>
              <button
                onClick={() => {
                  saveDraft({
                    ...draft,
                    designSettings: {
                      ...draft.designSettings,
                      backgroundColor: '#020617',
                      primaryColor: '#f1f5f9',
                      accentColor: '#22c55e'
                    },
                    updatedAt: new Date().toISOString()
                  });
                }}
                className="py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-sans hover:bg-slate-850"
              >
                🟢 Emerald Dark
              </button>
            </div>

            {/* Color Selectors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Background</span>
                <input
                  type="color"
                  value={draft.designSettings.backgroundColor}
                  onChange={(e) => {
                    saveDraft({
                      ...draft,
                      designSettings: { ...draft.designSettings, backgroundColor: e.target.value },
                      updatedAt: new Date().toISOString()
                    });
                  }}
                  className="w-5 h-5 border border-slate-800 rounded cursor-pointer bg-transparent"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Primary Text</span>
                <input
                  type="color"
                  value={draft.designSettings.primaryColor}
                  onChange={(e) => {
                    saveDraft({
                      ...draft,
                      designSettings: { ...draft.designSettings, primaryColor: e.target.value },
                      updatedAt: new Date().toISOString()
                    });
                  }}
                  className="w-5 h-5 border border-slate-800 rounded cursor-pointer bg-transparent"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Accent Color</span>
                <input
                  type="color"
                  value={draft.designSettings.accentColor}
                  onChange={(e) => {
                    saveDraft({
                      ...draft,
                      designSettings: { ...draft.designSettings, accentColor: e.target.value },
                      updatedAt: new Date().toISOString()
                    });
                  }}
                  className="w-5 h-5 border border-slate-800 rounded cursor-pointer bg-transparent"
                />
              </div>
            </div>

            {/* Layout Sizing controls */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="flex justify-between text-[11px] text-slate-400 font-sans mb-1">
                  <span>Font Scale</span>
                  <span className="font-mono">{draft.designSettings.fontScale.toFixed(1)}x</span>
                </label>
                <input
                  type="range"
                  min="0.8"
                  max="1.4"
                  step="0.1"
                  value={draft.designSettings.fontScale}
                  onChange={(e) => {
                    saveDraft({
                      ...draft,
                      designSettings: { ...draft.designSettings, fontScale: parseFloat(e.target.value) },
                      updatedAt: new Date().toISOString()
                    });
                  }}
                  className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="flex justify-between text-[11px] text-slate-400 font-sans mb-1">
                  <span>Aspect Ratio</span>
                  <span className="font-mono text-blue-400">{draft.designSettings.aspectRatio}</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['1:1', '4:5'] as CarouselAspectRatio[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        saveDraft({
                          ...draft,
                          designSettings: { ...draft.designSettings, aspectRatio: r },
                          aspectRatio: r,
                          updatedAt: new Date().toISOString()
                        });
                      }}
                      className={`py-1 rounded text-[10px] font-mono border ${
                        draft.designSettings.aspectRatio === r
                          ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.designSettings.showPageNumber}
                    onChange={(e) => {
                      saveDraft({
                        ...draft,
                        designSettings: { ...draft.designSettings, showPageNumber: e.target.checked },
                        updatedAt: new Date().toISOString()
                      });
                    }}
                    className="rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Show page numbering</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.designSettings.showCreatorName}
                    onChange={(e) => {
                      saveDraft({
                        ...draft,
                        designSettings: { ...draft.designSettings, showCreatorName: e.target.checked },
                        updatedAt: new Date().toISOString()
                      });
                    }}
                    className="rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Show Rohit's handle</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.designSettings.showProgressIndicator}
                    onChange={(e) => {
                      saveDraft({
                        ...draft,
                        designSettings: { ...draft.designSettings, showProgressIndicator: e.target.checked },
                        updatedAt: new Date().toISOString()
                      });
                    }}
                    className="rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Show top progress bar</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Slide Editor (Centre Panel - 5 cols) */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800/80 rounded-3xl p-6 space-y-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
              Slide Editor (Slide {currentSlide.slideNumber})
            </h3>
            <span className="text-[10px] bg-blue-600/15 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold font-mono">
              {currentSlide.role}
            </span>
          </div>

          {/* Quick AI rewriting assistant widget */}
          <div className="bg-[#0b1329]/60 border border-blue-900/20 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-slate-200">AI Slide Optimizer</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['clearer', 'shorter', 'practical', 'simpler'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleRewriteSlide(opt)}
                  className="px-2.5 py-1 text-[10px] font-sans font-medium bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 rounded-lg text-slate-300 transition-all capitalize"
                >
                  ✨ Make {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 h-[550px] overflow-y-auto pr-2">
            {/* Slide Configuration Roles & Templates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 font-sans mb-1.5">Slide Role</label>
                <select
                  value={currentSlide.role}
                  onChange={(e) => updateCurrentSlide({ role: e.target.value as CarouselSlideRole })}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="Cover">Cover (Slide 1 Only)</option>
                  <option value="Problem">Problem</option>
                  <option value="Context">Context</option>
                  <option value="Insight">Insight</option>
                  <option value="Framework">Framework</option>
                  <option value="Step">Step</option>
                  <option value="Example">Example</option>
                  <option value="Comparison">Comparison</option>
                  <option value="Warning">Warning</option>
                  <option value="Limitation">Limitation</option>
                  <option value="Checklist">Checklist</option>
                  <option value="Summary">Summary</option>
                  <option value="CTA">CTA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-sans mb-1.5">Layout Template</label>
                <select
                  value={currentSlide.layoutTemplate}
                  onChange={(e) => updateCurrentSlide({ layoutTemplate: e.target.value as CarouselLayoutTemplate })}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="Cover statement">Cover statement</option>
                  <option value="Big number or phrase">Big number or phrase</option>
                  <option value="Title and body">Title and body</option>
                  <option value="Three-point list">Three-point list</option>
                  <option value="Comparison">Comparison</option>
                  <option value="Process steps">Process steps</option>
                  <option value="Quote-free insight">Quote-free insight</option>
                  <option value="Checklist">Checklist</option>
                  <option value="Summary">Summary</option>
                </select>
              </div>
            </div>

            {/* Title / Headline Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs text-slate-400 font-sans">
                  {currentSlide.role === 'Cover' ? 'Main Headline' : 'Slide Title'}
                </label>
                <span className={`text-[10px] font-mono ${
                  currentSlide.role === 'Cover' 
                    ? (currentSlide.title.split(/\s+/).length > 12 ? 'text-red-400 font-bold' : 'text-slate-500')
                    : (currentSlide.title.split(/\s+/).length > 8 ? 'text-red-400 font-bold' : 'text-slate-500')
                }`}>
                  {currentSlide.title.split(/\s+/).filter(Boolean).length} / {currentSlide.role === 'Cover' ? 12 : 8} words
                </span>
              </div>
              <input
                type="text"
                value={currentSlide.title}
                onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 text-sm text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>

            {/* Body Text */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs text-slate-400 font-sans">
                  {currentSlide.role === 'Cover' ? 'Supporting Line' : 'Body Paragraph'}
                </label>
                <span className={`text-[10px] font-mono ${
                  currentSlide.role === 'Cover'
                    ? (currentSlide.body.split(/\s+/).length > 18 ? 'text-red-400 font-bold' : 'text-slate-500')
                    : (currentSlide.body.split(/\s+/).length > 45 ? 'text-red-400 font-bold' : 'text-slate-500')
                }`}>
                  {currentSlide.body.split(/\s+/).filter(Boolean).length} / {currentSlide.role === 'Cover' ? 18 : 45} words
                </span>
              </div>
              <textarea
                value={currentSlide.body}
                onChange={(e) => updateCurrentSlide({ body: e.target.value })}
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 leading-relaxed resize-none"
              />
            </div>

            {/* Bullet points section (for list-type templates) */}
            {(currentSlide.layoutTemplate === 'Three-point list' || 
              currentSlide.layoutTemplate === 'Checklist' || 
              currentSlide.layoutTemplate === 'Process steps' || 
              currentSlide.layoutTemplate === 'Summary') && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs text-slate-400 font-sans">List Bullet Items (Max 3)</label>
                  <button
                    onClick={() => {
                      if (currentSlide.bullets.length >= 3) return;
                      updateCurrentSlide({ bullets: [...currentSlide.bullets, 'New action item'] });
                    }}
                    disabled={currentSlide.bullets.length >= 3}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 disabled:opacity-40"
                  >
                    + Add Item
                  </button>
                </div>

                {currentSlide.bullets.map((b, bIdx) => (
                  <div key={bIdx} className="flex gap-2">
                    <input
                      type="text"
                      value={b}
                      onChange={(e) => {
                        const newBullets = [...currentSlide.bullets];
                        newBullets[bIdx] = e.target.value;
                        updateCurrentSlide({ bullets: newBullets });
                      }}
                      className="flex-1 bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => {
                        updateCurrentSlide({ bullets: currentSlide.bullets.filter((_, idx) => idx !== bIdx) });
                      }}
                      className="p-1.5 bg-red-950/10 hover:bg-red-950/30 text-red-400 rounded-lg border border-red-900/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Emphasis / Highlight words */}
            <div>
              <label className="block text-xs text-slate-400 font-sans mb-1.5">Emphasis / Highlight Word or Text</label>
              <input
                type="text"
                value={currentSlide.emphasisText}
                onChange={(e) => updateCurrentSlide({ emphasisText: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 font-mono"
                placeholder="Single word or phrase to style in accent color"
              />
            </div>

            {/* Label header */}
            <div>
              <label className="block text-xs text-slate-400 font-sans mb-1.5">Top Small Label</label>
              <input
                type="text"
                value={currentSlide.smallLabel}
                onChange={(e) => updateCurrentSlide({ smallLabel: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Factual Type & Source selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 font-sans mb-1.5">Factual Safety Level</label>
                <select
                  value={currentSlide.factualType}
                  onChange={(e) => updateCurrentSlide({ factualType: e.target.value as CarouselFactualType })}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="Verified fact">🛡️ Verified fact</option>
                  <option value="Editorial interpretation">💡 Editorial interpretation</option>
                  <option value="General advice">💭 General advice</option>
                  <option value="Creator-led concept">🚀 Creator-led concept</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-sans mb-1.5">Source References</label>
                <div className="border border-slate-800 bg-slate-900 p-2.5 rounded-xl h-24 overflow-y-auto space-y-1.5">
                  {credibilityReport.claims.map((claim) => (
                    <label key={claim.id} className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentSlide.sourceReferenceIds.includes(claim.id)}
                        onChange={(e) => {
                          const newIds = e.target.checked
                            ? [...currentSlide.sourceReferenceIds, claim.id]
                            : currentSlide.sourceReferenceIds.filter(id => id !== claim.id);
                          updateCurrentSlide({ sourceReferenceIds: newIds });
                        }}
                        className="rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate" title={claim.claimText}>{claim.claimText}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Visual Concept */}
            <div>
              <label className="block text-xs text-slate-400 font-sans mb-1.5">Visual Design Concept / Metaphor</label>
              <textarea
                value={currentSlide.visualConcept}
                onChange={(e) => updateCurrentSlide({ visualConcept: e.target.value })}
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 leading-normal resize-none"
              />
            </div>

            {/* Speaker Note */}
            <div>
              <label className="block text-xs text-slate-400 font-sans mb-1.5">Speaker / Presentation Notes</label>
              <textarea
                value={currentSlide.speakerNote}
                onChange={(e) => updateCurrentSlide({ speakerNote: e.target.value })}
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 leading-normal resize-none font-mono"
              />
            </div>

            {/* ENHANCED WORKSPACE: PER-SLIDE VISUAL ARTWORK CONTROLS */}
            <div className="border-t border-slate-850 pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 font-sans uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-blue-400" />
                  <span>Slide Generated Artwork</span>
                </h4>
                {slideRec && (
                  <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    Recommended: {slideRec.visualNeed}
                  </span>
                )}
              </div>

              {/* Artwork Type dropdown selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Artwork Type</label>
                  <select
                    value={activeArtworkType}
                    onChange={(e) => {
                      setLocalArtworkTypes(prev => ({
                        ...prev,
                        [selectedSlideId]: e.target.value as CarouselArtworkType
                      }));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="No generated artwork">No generated artwork</option>
                    <option value="Background only">Background only</option>
                    <option value="Illustration">Illustration</option>
                    <option value="Editorial image">Editorial image</option>
                    <option value="Object composition">Object composition</option>
                    <option value="Interface concept">Interface concept</option>
                    <option value="Diagram asset">Diagram asset</option>
                    <option value="Rohit portrait">Rohit portrait</option>
                  </select>
                </div>

                {/* Text safe area selector */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Text-Safe Area</label>
                  <select
                    value={activeSafeArea}
                    disabled={activeArtworkType === 'No generated artwork'}
                    onChange={(e) => {
                      setLocalSafeAreas(prev => ({
                        ...prev,
                        [selectedSlideId]: e.target.value as any
                      }));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="Top">Top (Clear for artwork)</option>
                    <option value="Centre">Centre (Artwork focused)</option>
                    <option value="Bottom">Bottom (Clear for artwork)</option>
                    <option value="Left">Left (Clear for artwork)</option>
                    <option value="Right">Right (Clear for artwork)</option>
                  </select>
                </div>
              </div>

              {/* Artwork Intensity and Rohit Toggle */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Artwork Intensity</label>
                  <select
                    value={activeIntensity}
                    disabled={activeArtworkType === 'No generated artwork'}
                    onChange={(e) => {
                      setLocalIntensities(prev => ({
                        ...prev,
                        [selectedSlideId]: e.target.value as any
                      }));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="Minimal">Minimal (25% opacity)</option>
                    <option value="Balanced">Balanced (65% opacity)</option>
                    <option value="Bold">Bold (Full impact)</option>
                  </select>
                </div>

                {/* Rohit Reference photograph toggle */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Rohit Portrait Reference</label>
                  <label className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-300 cursor-pointer hover:border-slate-700 transition-all">
                    <input
                      type="checkbox"
                      checked={activeRohitToggle}
                      onChange={(e) => {
                        setLocalRohitToggles(prev => ({
                          ...prev,
                          [selectedSlideId]: e.target.checked
                        }));
                      }}
                      className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Use photo reference</span>
                  </label>
                </div>
              </div>

              {/* Warnings and validation for Reference photograph */}
              {activeRohitToggle && !referencePhoto && (
                <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-400 leading-normal">
                    No reference photograph has been uploaded. Upload one in <strong>Visual Studio</strong> first to enable identity-referenced portraits.
                  </p>
                </div>
              )}

              {/* Prompt Editor & Refiner */}
              {activeArtworkType !== 'No generated artwork' && (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-mono text-slate-500 uppercase">Nano Banana Artwork Prompt</label>
                    <button
                      onClick={() => handleImprovePrompt(selectedSlideId, activePrompt)}
                      disabled={improvingPromptId === selectedSlideId}
                      className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50"
                    >
                      {improvingPromptId === selectedSlideId ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Refining prompt...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-blue-500" />
                          <span>Improve Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  <textarea
                    value={activePrompt}
                    onChange={(e) => {
                      setCustomPrompts(prev => ({
                        ...prev,
                        [selectedSlideId]: e.target.value
                      }));
                    }}
                    rows={3}
                    placeholder="Describe background scene or metaphorical vector illustration..."
                    className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 leading-normal resize-none"
                  />

                  {/* Single Slide generation launcher */}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => {
                        const slide = draft?.slideContent.find(s => s.id === selectedSlideId);
                        if (slide) handleDownloadSingleSlide(slide);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs transition-all flex items-center gap-1.5 font-sans font-medium"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>Download Slide PNG</span>
                    </button>

                    {artworkMeta && (
                      <button
                        onClick={() => handleRemoveArtwork(selectedSlideId)}
                        className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30 rounded-lg text-xs transition-all flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Artwork</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleGenerateArtwork(selectedSlideId)}
                      disabled={generatingSlideId === selectedSlideId}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs transition-all font-sans font-medium flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {generatingSlideId === selectedSlideId ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating Art...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Artwork</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMN 3: Previews (Right Panel - 4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-950 border border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                Slide Preview
              </h3>
              
              {/* Preview Toggle Controls */}
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setPreviewMode('current')}
                  className={`px-3 py-1 text-[10px] font-sans font-medium rounded-lg transition-all ${
                    previewMode === 'current' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Current
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-3 py-1 text-[10px] font-sans font-medium rounded-lg transition-all ${
                    previewMode === 'mobile' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* STALE PROTECTION CARD */}
            {slideArtworkStatus === 'outdated' && (
              <div className="bg-amber-950/20 border border-amber-900/40 p-4 rounded-2xl space-y-2.5">
                <div className="flex items-start gap-2 text-amber-400 font-bold text-[11px] font-sans">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This artwork was created for an earlier version of the slide.</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleKeepArtwork(selectedSlideId)}
                    className="flex-1 py-1 px-2 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-850 rounded-lg text-[10px] font-medium transition-all"
                  >
                    Keep Artwork
                  </button>
                  <button
                    onClick={() => handleGenerateArtwork(selectedSlideId)}
                    className="flex-1 py-1 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-medium transition-all"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={() => handleRemoveArtwork(selectedSlideId)}
                    className="py-1 px-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30 rounded-lg text-[10px] font-medium transition-all"
                    title="Remove"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* Code-rendered Live Previews with layered image generation */}
            {previewMode === 'current' ? (
              <div className="space-y-2">
                <div 
                  className={`w-full ${draft.designSettings.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} relative overflow-hidden flex flex-col p-8 transition-all duration-300 shadow-2xl`}
                  style={{
                    backgroundColor: draft.designSettings.backgroundColor,
                    color: draft.designSettings.primaryColor,
                    borderRadius: `${draft.designSettings.cornerRoundness}px`
                  }}
                >
                  {/* Background Artwork Layer (IndexedDB base64) */}
                  {loadedImages[selectedSlideId] && activeArtworkType !== 'No generated artwork' && (
                    <div 
                      className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-300 pointer-events-none"
                      style={{
                        backgroundImage: `url(${loadedImages[selectedSlideId]})`,
                        opacity: (activeIntensity === 'Minimal' ? 25 : (activeIntensity === 'Bold' ? 100 : 65)) / 100,
                      }}
                    />
                  )}

                  {/* Background overlay gradient to guarantee 100% text readability */}
                  {loadedImages[selectedSlideId] && activeArtworkType !== 'No generated artwork' && (
                    <div 
                      className="absolute inset-0 z-10 transition-all duration-300 pointer-events-none"
                      style={{
                        background: getOverlayBackground(activeSafeArea, draft.designSettings.backgroundColor)
                      }}
                    />
                  )}

                  {/* Top Progress bar indicator */}
                  {draft.designSettings.showProgressIndicator && (
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900/40 z-20">
                      <div 
                        className="h-full transition-all duration-300"
                        style={{
                          backgroundColor: draft.designSettings.accentColor,
                          width: `${(currentSlide.slideNumber / draft.slideContent.length) * 100}%`
                        }}
                      />
                    </div>
                  )}

                  {/* Small label at top */}
                  <div className="flex justify-between items-center mb-6 relative z-20">
                    <span 
                      className="text-[10px] font-mono tracking-wider uppercase font-semibold opacity-70"
                      style={{ color: draft.designSettings.primaryColor }}
                    >
                      {currentSlide.smallLabel || "AI WRITER"}
                    </span>
                    
                    {/* Factual boundary safety shield */}
                    {currentSlide.factualType === 'Verified fact' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded border font-mono tracking-wide uppercase bg-blue-600/10 border-blue-500/20 text-blue-400">
                        🛡️ Factual
                      </span>
                    )}
                  </div>

                  {/* Main Slide Content layout variations (Responsive Safe-area layout wrapper) */}
                  <div className={`${containerClass} relative z-20`} style={{ transform: `scale(${draft.designSettings.fontScale})` }}>
                    <div className={contentClass}>
                      {currentSlide.layoutTemplate === 'Cover statement' ? (
                        <div className="text-center space-y-4">
                          <h2 className="text-2xl font-black tracking-tight leading-tight">
                            {currentSlide.title}
                          </h2>
                          <div className="h-1 w-12 mx-auto" style={{ backgroundColor: draft.designSettings.accentColor }} />
                          <p className="text-sm opacity-80 leading-relaxed font-sans font-medium px-4">
                            {currentSlide.body}
                          </p>
                        </div>
                      ) : currentSlide.layoutTemplate === 'Big number or phrase' ? (
                        <div className="space-y-4">
                          <div className="text-5xl font-black leading-none" style={{ color: draft.designSettings.accentColor }}>
                            {currentSlide.emphasisText || "01"}
                          </div>
                          <h3 className="text-lg font-black tracking-tight leading-snug">
                            {currentSlide.title}
                          </h3>
                          <p className="text-xs opacity-80 leading-relaxed font-medium">
                            {currentSlide.body}
                          </p>
                        </div>
                      ) : currentSlide.layoutTemplate === 'Quote-free insight' ? (
                        <div className="border-l-4 pl-4 space-y-3" style={{ borderColor: draft.designSettings.accentColor }}>
                          <p className="text-lg font-bold font-sans tracking-tight leading-relaxed italic opacity-95">
                            {currentSlide.body}
                          </p>
                          <h4 className="text-xs font-mono font-bold tracking-wider uppercase opacity-70">
                            — {currentSlide.title}
                          </h4>
                        </div>
                      ) : (
                        // Title and body / lists
                        <div className="space-y-3">
                          <h3 className="text-lg font-black tracking-tight leading-snug">
                            {currentSlide.title}
                          </h3>
                          
                          <p className="text-xs opacity-80 leading-relaxed font-medium">
                            {currentSlide.body}
                          </p>

                          {currentSlide.bullets?.length > 0 && (
                            <div className="space-y-2 pt-2">
                              {currentSlide.bullets.map((b, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 text-xs">
                                  <span className="font-bold shrink-0 mt-0.5" style={{ color: draft.designSettings.accentColor }}>
                                    {currentSlide.layoutTemplate === 'Checklist' ? '✓' : '•'}
                                  </span>
                                  <span className="opacity-90">{b}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Brand Footer */}
                  <div className="flex justify-between items-center mt-auto pt-6 text-[9px] font-mono opacity-60 relative z-20">
                    <div>
                      {draft.designSettings.showCreatorName && (
                        <span>@rohitsinghpanwar</span>
                      )}
                    </div>
                    <div>
                      {draft.designSettings.showPageNumber && (
                        <span>{currentSlide.slideNumber} / {draft.slideContent.length}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-mono">
                    Template: <span className="text-blue-400">{currentSlide.layoutTemplate}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Claim count: <span className="text-green-400">{currentSlide.sourceReferenceIds.length} references</span>
                  </div>
                </div>
              </div>
            ) : (
              // Mobile phone mockup preview wrapper with dynamic artwork layering
              <div className="flex justify-center py-4 bg-slate-900/60 rounded-3xl border border-slate-850">
                <div className="w-[280px] bg-black border-4 border-slate-850 rounded-[32px] overflow-hidden p-2 shadow-2xl relative">
                  {/* Top Notch */}
                  <div className="w-24 h-4 bg-black mx-auto rounded-full mb-3 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  </div>

                  {/* Inside Mobile Display */}
                  <div 
                    className="w-full aspect-[4/5] relative overflow-hidden flex flex-col p-5 select-none"
                    style={{
                      backgroundColor: draft.designSettings.backgroundColor,
                      color: draft.designSettings.primaryColor,
                      borderRadius: '16px'
                    }}
                  >
                    {/* Background Artwork Layer (IndexedDB base64) */}
                    {loadedImages[selectedSlideId] && activeArtworkType !== 'No generated artwork' && (
                      <div 
                        className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none"
                        style={{
                          backgroundImage: `url(${loadedImages[selectedSlideId]})`,
                          opacity: (activeIntensity === 'Minimal' ? 25 : (activeIntensity === 'Bold' ? 100 : 65)) / 100,
                        }}
                      />
                    )}

                    {/* Overlay */}
                    {loadedImages[selectedSlideId] && activeArtworkType !== 'No generated artwork' && (
                      <div 
                        className="absolute inset-0 z-10 pointer-events-none"
                        style={{
                          background: getOverlayBackground(activeSafeArea, draft.designSettings.backgroundColor)
                        }}
                      />
                    )}

                    <div className="flex justify-between items-center mb-2 relative z-20">
                      <span className="text-[8px] font-mono font-bold uppercase opacity-70">
                        {currentSlide.smallLabel || "AI INSIGHT"}
                      </span>
                    </div>

                    <div className={`${containerClass} relative z-20`} style={{ transform: 'scale(0.85)' }}>
                      <div className={contentClass}>
                        <h3 className="text-sm font-black tracking-tight leading-snug">
                          {currentSlide.title}
                        </h3>
                        <p className="text-[9px] opacity-80 leading-relaxed font-medium mt-1">
                          {currentSlide.body}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[7px] font-mono opacity-60 mt-auto relative z-20">
                      <span>@rohitsinghpanwar</span>
                      <span>{currentSlide.slideNumber} of {draft.slideContent.length}</span>
                    </div>
                  </div>

                  {/* Swipe instructions indicator */}
                  <div className="text-[9px] text-slate-500 font-mono text-center pt-3 select-none animate-pulse">
                    Swipe left to learn more ➔
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* QUALITY REPORT FLOATING CARD PANEL */}
          {draft.qualityReport && showQualityPanel && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <h4 className="text-xs font-bold text-slate-200">Quality Audit Report</h4>
                </div>
                <button
                  onClick={() => setShowQualityPanel(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Score header */}
              <div className="flex items-center justify-between bg-slate-900 p-3 rounded-2xl">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Audit Score</div>
                  <div className="text-xl font-bold text-white">{draft.qualityReport.score}/100</div>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  draft.qualityReport.status === 'Pass' 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {draft.qualityReport.status}
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed italic">
                "{draft.qualityReport.summary}"
              </p>

              {/* Issue list */}
              {draft.qualityReport.issues.length > 0 ? (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {draft.qualityReport.issues.map((issue, idx) => (
                    <div key={idx} className="bg-slate-900/50 border border-slate-850 p-3 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 text-amber-500 font-bold text-[10px]">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Severity: {issue.severity}</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-tight">{issue.issue}</p>
                      <p className="text-[10px] text-slate-400 border-l-2 border-slate-700 pl-2 leading-relaxed">
                        Fix: {issue.recommendedFix}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                  <p className="text-xs text-slate-400 font-medium">Pristine learning journey. No issues found!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Export Carousel Section */}
      <div className="bg-[#0b1329]/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 rounded-xl border border-blue-500/10">
              <Download className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-sans">Export Carousel</h2>
              <p className="text-xs text-slate-400">Validate quality parameters and export presentation-ready LinkedIn assets.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider pl-2 pr-1">Output Quality:</span>
            {(['standard', 'high'] as const).map((q) => (
              <button
                key={q}
                onClick={() => setExportQuality(q)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  exportQuality === q 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {q === 'high' ? 'High-Res (2K)' : 'Standard (1K)'}
              </button>
            ))}
          </div>
        </div>

        {/* Missing Artwork Recovery Modal */}
        {missingArtworkSlideId && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-amber-500">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-base font-bold text-white">Slide Artwork Is Missing</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                The optional AI artwork for Slide {draft.slideContent.find(s => s.id === missingArtworkSlideId)?.slideNumber} could not be retrieved from the local IndexedDB database. 
                Would you like to skip loading the background image and export this slide as a clean, text-led slide, or cancel the export?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => missingArtworkActionResolve?.('cancel')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs transition-all font-sans font-medium"
                >
                  Cancel Export
                </button>
                <button
                  onClick={() => missingArtworkActionResolve?.('skip')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs transition-all font-sans font-medium"
                >
                  Skip Image & Use Text-Led
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Export Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Readiness Checklist */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Export Readiness Checklist</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Check 1: Slide Count */}
              {(() => {
                const count = draft.slideContent.length;
                const pass = count >= 6 && count <= 10;
                return (
                  <div className={`p-3 rounded-xl border ${pass ? 'bg-green-950/10 border-green-900/20 text-green-400' : 'bg-red-950/10 border-red-900/20 text-red-400'} flex items-start gap-2.5`}>
                    {pass ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <X className="w-4 h-4 mt-0.5 shrink-0" />}
                    <div className="text-xs">
                      <div className="font-bold">Slide Count: {count}</div>
                      <div className="text-[10px] opacity-80">Must be between 6 and 10 slides.</div>
                    </div>
                  </div>
                );
              })()}

              {/* Check 2: Unique IDs */}
              {(() => {
                const ids = draft.slideContent.map(s => s.id);
                const unique = new Set(ids).size === ids.length;
                return (
                  <div className={`p-3 rounded-xl border ${unique ? 'bg-green-950/10 border-green-900/20 text-green-400' : 'bg-red-950/10 border-red-900/20 text-red-400'} flex items-start gap-2.5`}>
                    {unique ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <X className="w-4 h-4 mt-0.5 shrink-0" />}
                    <div className="text-xs">
                      <div className="font-bold">Unique IDs</div>
                      <div className="text-[10px] opacity-80">Every slide has a unique identifier.</div>
                    </div>
                  </div>
                );
              })()}

              {/* Check 3: Sequential Slide Numbers */}
              {(() => {
                const nums = draft.slideContent.map(s => s.slideNumber);
                const sortedNums = [...nums].sort((a,b) => a-b);
                const sequential = nums.every((n, i) => n === i + 1);
                return (
                  <div className={`p-3 rounded-xl border ${sequential ? 'bg-green-950/10 border-green-900/20 text-green-400' : 'bg-red-950/10 border-red-900/20 text-red-400'} flex items-start gap-2.5`}>
                    {sequential ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <X className="w-4 h-4 mt-0.5 shrink-0" />}
                    <div className="text-xs">
                      <div className="font-bold">Sequential Order</div>
                      <div className="text-[10px] opacity-80">Slide numbering must be 1, 2, 3...</div>
                    </div>
                  </div>
                );
              })()}

              {/* Check 4: No Empty Required Fields */}
              {(() => {
                const emptyFields = draft.slideContent.some(s => s.title.trim() === '' || s.body.trim() === '');
                const pass = !emptyFields;
                return (
                  <div className={`p-3 rounded-xl border ${pass ? 'bg-green-950/10 border-green-900/20 text-green-400' : 'bg-red-950/10 border-red-900/20 text-red-400'} flex items-start gap-2.5`}>
                    {pass ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <X className="w-4 h-4 mt-0.5 shrink-0" />}
                    <div className="text-xs">
                      <div className="font-bold">Required Fields Complete</div>
                      <div className="text-[10px] opacity-80">No slide titles or body paragraphs are empty.</div>
                    </div>
                  </div>
                );
              })()}

              {/* Check 5: Text Overflow Check */}
              {(() => {
                let overflowSlide: number | null = null;
                let overflowField = '';
                for (const slide of draft.slideContent) {
                  const check = checkSlideTextOverflow(slide, draft.designSettings, draft.designSettings.aspectRatio, draft.assetsMetadata);
                  if (check.hasOverflow) {
                    overflowSlide = slide.slideNumber;
                    overflowField = check.affectedField || '';
                    break;
                  }
                }
                const pass = overflowSlide === null;
                return (
                  <div className={`p-3 rounded-xl border ${pass ? 'bg-green-950/10 border-green-900/20 text-green-400' : 'bg-amber-950/10 border-amber-900/20 text-amber-400'} flex items-start gap-2.5`}>
                    {pass ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
                    <div className="text-xs">
                      <div className="font-bold">No Text Overflow</div>
                      <div className="text-[10px] opacity-80">
                        {pass 
                          ? "All text fits safely within designated safe-areas." 
                          : `Slide ${overflowSlide} has text overflow in ${overflowField}!`}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Check 6: Post Studio Draft Status */}
              {(() => {
                const pass = !isCheckOutdated;
                return (
                  <div className={`p-3 rounded-xl border ${pass ? 'bg-green-950/10 border-green-900/20 text-green-400' : 'bg-red-950/10 border-red-900/20 text-red-400'} flex items-start gap-2.5`}>
                    {pass ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <X className="w-4 h-4 mt-0.5 shrink-0" />}
                    <div className="text-xs">
                      <div className="font-bold">Draft Synced</div>
                      <div className="text-[10px] opacity-80">
                        {pass 
                          ? "Linked Post Studio draft is current." 
                          : "Post has changed since carousel generation!"}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right Column: Quality Blockers & Export Actions */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Validation & Output</h3>
            
            {/* Status Messages / Blockers */}
            {(() => {
              const count = draft.slideContent.length;
              const hasSlideCountError = count < 6 || count > 10;
              const hasEmptyFields = draft.slideContent.some(s => s.title.trim() === '' || s.body.trim() === '');
              const hasUniqueIdsError = new Set(draft.slideContent.map(s => s.id)).size !== draft.slideContent.length;
              const hasSequentialError = !draft.slideContent.map(s => s.slideNumber).every((n, i) => n === i + 1);
              
              const isBlockingError = hasSlideCountError || hasEmptyFields || hasUniqueIdsError || hasSequentialError || isCheckOutdated;
              
              const qualityStatus = draft.qualityReport?.status || 'Pass';
              const isQualityFailed = qualityStatus === 'Fail';
              const isQualityWarning = qualityStatus === 'Pass with warnings';

              if (isBlockingError) {
                return (
                  <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-2xl flex gap-3 text-red-400">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <div className="font-bold">Export Blocked</div>
                      <p className="opacity-90 leading-relaxed">
                        Please resolve the failing criteria in your checklist. The carousel must contain 6-10 complete slides in sequential order and be synced with Post Studio.
                      </p>
                    </div>
                  </div>
                );
              }

              if (isQualityFailed) {
                return (
                  <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-2xl flex gap-3 text-red-400">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <div className="font-bold">Export Blocked (Quality Audit Fail)</div>
                      <p className="opacity-90 leading-relaxed">
                        Your latest Quality Audit Report is marked as <strong>Fail</strong>. You must address critical instructional flow or stylistic errors before you can export.
                      </p>
                    </div>
                  </div>
                );
              }

              if (isQualityWarning && !exportBypassWarnings) {
                return (
                  <div className="p-4 bg-amber-950/20 border border-amber-900/30 rounded-2xl space-y-3 text-amber-400">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <div className="font-bold">Quality Warnings Exist</div>
                        <p className="opacity-90 leading-relaxed">
                          This carousel still has quality warnings (e.g., readability issues or layout structure warnings). Review them before exporting.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setExportBypassWarnings(true)}
                        className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg text-[10px] font-bold transition-all"
                      >
                        Acknowledge & Proceed
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="p-4 bg-green-950/15 border border-green-900/20 rounded-2xl flex gap-3 text-green-400">
                  <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <div className="font-bold">Carousel Validated</div>
                    <p className="opacity-90 leading-relaxed">
                      All systems green! Your learning journey is mathematically formatted, safe from safe-area clippings, and contains verified credibility sources.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Export Progress Bar / Status */}
            {isExporting && (
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-blue-400 font-bold animate-pulse">{exportStatusText}</span>
                  <span className="text-slate-400">{exportProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}

            {exportSuccessMessage && (
              <div className="p-4 bg-green-950/20 border border-green-900/30 rounded-2xl flex gap-2.5 text-green-400 text-xs">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{exportSuccessMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            {(() => {
              const count = draft.slideContent.length;
              const hasSlideCountError = count < 6 || count > 10;
              const hasEmptyFields = draft.slideContent.some(s => s.title.trim() === '' || s.body.trim() === '');
              const hasUniqueIdsError = new Set(draft.slideContent.map(s => s.id)).size !== draft.slideContent.length;
              const hasSequentialError = !draft.slideContent.map(s => s.slideNumber).every((n, i) => n === i + 1);
              
              const isBlockingError = hasSlideCountError || hasEmptyFields || hasUniqueIdsError || hasSequentialError || isCheckOutdated;
              
              const qualityStatus = draft.qualityReport?.status || 'Pass';
              const isBlockedByQuality = qualityStatus === 'Fail' || (qualityStatus === 'Pass with warnings' && !exportBypassWarnings);
              
              const disabled = isBlockingError || isBlockedByQuality || isExporting;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={disabled}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-xl font-sans font-bold text-sm transition-all shadow-md shadow-blue-500/10 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    onClick={handleDownloadZIP}
                    disabled={disabled}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-200 rounded-xl border border-slate-700/60 disabled:border-slate-800 font-sans font-bold text-sm transition-all disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 text-blue-400" />
                    <span>Download ZIP</span>
                  </button>

                  <button
                    onClick={handleDownloadAllPNGs}
                    disabled={disabled}
                    className="sm:col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900/60 hover:bg-slate-900 disabled:bg-slate-950 text-slate-300 rounded-xl border border-slate-800 font-sans font-semibold text-xs transition-all disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download All PNGs sequentially</span>
                  </button>
                </div>
              );
            })()}

          </div>
        </div>
      </div>
    </div>
  );
}
