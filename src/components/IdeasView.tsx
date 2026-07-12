import { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Cpu, 
  Clock, 
  RefreshCw, 
  Bookmark, 
  BookmarkCheck, 
  Trash2, 
  Users, 
  Layers, 
  Target, 
  HelpCircle,
  TrendingUp,
  BrainCircuit,
  MessageSquareQuote,
  ShieldAlert,
  Search,
  Newspaper,
  ExternalLink,
  Globe,
  Calendar,
  Award,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Activity,
  ThumbsUp,
  AlertOctagon,
  Info
} from 'lucide-react';
import { CreatorProfile, GeneratedContentIdea, ContentIdeaResponse, IdeaGenerationStatus, AIResearchResult, AIResearchResponse, ResearchStatus, GroundedLinkedInIdea, GroundedIdeaResponse, GroundedIdeaStatus, GroundedSourceReference, GrowthMechanism, GroundedPostFormat, DailyResearchBrief, DailyResearchDevelopment, DailyResearchStatus, ResearchCategory, SavedResearchDevelopment, DailyIdeaCollection, DailyContentIdea, SavedDailyIdea, DailyIdeaType, LinkedInPostFormat, IdeaGrowthMechanism, IdeaStressTest, IdeaEvaluation, IdeaCriterionScores, IdeaPenaltyScores, IdeaDecision, IdeaRiskLevel, WinnerSelection, StressTestStatus, CRITERION_WEIGHTS } from '../types';
import DevelopmentCard from './DevelopmentCard';

const CRITERION_NAMES: Record<keyof IdeaCriterionScores, string> = {
  audienceRelevance: 'Audience Relevance',
  practicalUsefulness: 'Practical Usefulness',
  originality: 'Originality of Angle',
  savePotential: 'Save Potential',
  sharePotential: 'Share Potential',
  discussionPotential: 'Discussion Potential',
  hookStrength: 'Hook Strength',
  evidenceAndCredibility: 'Evidence & Credibility',
  followerConversionPotential: 'Follower Conversion',
  profileVisitPotential: 'Profile Visit Potential',
  connectionPotential: 'Connection Potential',
  effortToImpactRatio: 'Effort to Impact Ratio',
  visualOrFormatPotential: 'Visual or Format Potential'
};

const PENALTY_NAMES: Record<keyof IdeaPenaltyScores, string> = {
  saturation: 'Topic Saturation',
  genericContent: 'Generic Content/Structure',
  credibilityRisk: 'Credibility Risk',
  misinformationRisk: 'Unsupported Claims/Misinformation',
  clickbaitGap: 'Clickbait/Hook Gap',
  executionBurden: 'Heavy Execution Burden',
  repetition: 'Angle Repetition'
};

interface IdeasViewProps {
  profile: CreatorProfile;
  initialAction?: 'focus-brief' | 'focus-ideas' | null;
  onClearInitialAction?: () => void;
}

export default function IdeasView({ profile, initialAction, onClearInitialAction }: IdeasViewProps) {
  const [highlightBriefBtn, setHighlightBriefBtn] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!initialAction) return;

    if (initialAction === 'focus-brief') {
      // Scroll to Daily AI Research Brief
      setTimeout(() => {
        const element = document.getElementById('daily-research-brief-card');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);

      setHighlightBriefBtn(true);
      setToastMessage("Start by building today’s verified AI research brief.");

      const timer = setTimeout(() => {
        setHighlightBriefBtn(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else if (initialAction === 'focus-ideas') {
      // Scroll to Daily AI Content Ideas
      setTimeout(() => {
        const element = document.getElementById('daily-content-ideas-card');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }

    if (onClearInitialAction) {
      onClearInitialAction();
    }
  }, [initialAction, onClearInitialAction]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [status, setStatus] = useState<IdeaGenerationStatus>('idle');
  const [generatedIdea, setGeneratedIdea] = useState<GeneratedContentIdea | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Saved Idea State
  const [savedIdea, setSavedIdea] = useState<GeneratedContentIdea | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Daily AI Research Brief State
  const [briefStatus, setBriefStatus] = useState<DailyResearchStatus>('idle');
  const [briefResult, setBriefResult] = useState<DailyResearchBrief | null>(null);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [savedBrief, setSavedBrief] = useState<DailyResearchBrief | null>(null);
  const [savedDevelopments, setSavedDevelopments] = useState<SavedResearchDevelopment[]>([]);
  const [briefSaveSuccess, setBriefSaveSuccess] = useState<string | null>(null);
  const [devSaveSuccess, setDevSaveSuccess] = useState<string | null>(null);

  // Live AI Research State
  const [researchStatus, setResearchStatus] = useState<ResearchStatus>('idle');
  const [researchResult, setResearchResult] = useState<AIResearchResult | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [savedResearch, setSavedResearch] = useState<AIResearchResult | null>(null);
  const [researchSaveSuccessMessage, setResearchSaveSuccessMessage] = useState<string | null>(null);

  // Grounded LinkedIn Idea State
  const [groundedStatus, setGroundedStatus] = useState<GroundedIdeaStatus>('idle');
  const [groundedIdea, setGroundedIdea] = useState<GroundedLinkedInIdea | null>(null);
  const [groundedError, setGroundedError] = useState<string | null>(null);
  const [savedGroundedIdea, setSavedGroundedIdea] = useState<GroundedLinkedInIdea | null>(null);
  const [groundedSaveSuccessMessage, setGroundedSaveSuccessMessage] = useState<string | null>(null);

  // Daily Content Ideas State
  const [collectionStatus, setCollectionStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [collectionSubtask, setCollectionSubtask] = useState<string>('');
  const [collectionResult, setCollectionResult] = useState<DailyIdeaCollection | null>(null);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [rejectedIdeaIds, setRejectedIdeaIds] = useState<string[]>([]);
  const [savedCollectionIdeas, setSavedCollectionIdeas] = useState<SavedDailyIdea[]>([]);
  const [individualLoadingStates, setIndividualLoadingStates] = useState<Record<string, boolean>>({});
  const [collectionSaveSuccessMessage, setCollectionSaveSuccessMessage] = useState<string | null>(null);

  // Idea Stress Test State
  const [stressTestStatus, setStressTestStatus] = useState<StressTestStatus>('idle');
  const [stressTest, setStressTest] = useState<IdeaStressTest | null>(null);
  const [stressTestError, setStressTestError] = useState<string | null>(null);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [winnerSelection, setWinnerSelection] = useState<WinnerSelection | null>(null);
  const [improvingIdeaId, setImprovingIdeaId] = useState<string | null>(null);
  const [expandedEvaluationId, setExpandedEvaluationId] = useState<string | null>(null);

  // Load saved idea and research from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('saved_ai_test_idea');
    if (saved) {
      try {
        setSavedIdea(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved_ai_test_idea', e);
      }
    }

    const savedRes = localStorage.getItem('saved_ai_research');
    if (savedRes) {
      try {
        setSavedResearch(JSON.parse(savedRes));
      } catch (e) {
        console.error('Failed to parse saved_ai_research', e);
      }
    }

    const savedGrounded = localStorage.getItem('saved_grounded_idea');
    if (savedGrounded) {
      try {
        setSavedGroundedIdea(JSON.parse(savedGrounded));
      } catch (e) {
        console.error('Failed to parse saved_grounded_idea', e);
      }
    }

    const savedBriefStr = localStorage.getItem('saved_ai_research_brief');
    if (savedBriefStr) {
      try {
        setSavedBrief(JSON.parse(savedBriefStr));
      } catch (e) {
        console.error('Failed to parse saved_ai_research_brief', e);
      }
    }

    const savedDevsStr = localStorage.getItem('saved_ai_developments');
    if (savedDevsStr) {
      try {
        setSavedDevelopments(JSON.parse(savedDevsStr));
      } catch (e) {
        console.error('Failed to parse saved_ai_developments', e);
      }
    }

    const savedCollectionStr = localStorage.getItem('saved_daily_ideas_collection');
    if (savedCollectionStr) {
      try {
        setCollectionResult(JSON.parse(savedCollectionStr));
        setCollectionStatus('success');
      } catch (e) {
        console.error('Failed to parse saved_daily_ideas_collection', e);
      }
    }

    const savedIndivStr = localStorage.getItem('saved_individual_ideas');
    if (savedIndivStr) {
      try {
        setSavedCollectionIdeas(JSON.parse(savedIndivStr));
      } catch (e) {
        console.error('Failed to parse saved_individual_ideas', e);
      }
    }

    const savedRejectedStr = localStorage.getItem('rejected_idea_ids');
    if (savedRejectedStr) {
      try {
        setRejectedIdeaIds(JSON.parse(savedRejectedStr));
      } catch (e) {
        console.error('Failed to parse rejected_idea_ids', e);
      }
    }

    const savedSTStr = localStorage.getItem('saved_stress_test');
    if (savedSTStr) {
      try {
        const st = JSON.parse(savedSTStr);
        setStressTest(st);
      } catch (e) {
        console.error('Failed to parse saved_stress_test', e);
      }
    }

    const savedSelWinnerStr = localStorage.getItem('selected_winner');
    if (savedSelWinnerStr) {
      try {
        const sel = JSON.parse(savedSelWinnerStr);
        setWinnerSelection(sel);
        setSelectedWinnerId(sel.winnerId);
      } catch (e) {
        console.error('Failed to parse selected_winner', e);
      }
    }
  }, []);

  // Watch for collection or rejection changes to mark stress test as stale/outdated
  useEffect(() => {
    if (stressTest && collectionResult) {
      const activeIdeas = collectionResult.ideas.filter(idea => !rejectedIdeaIds.includes(idea.id));
      const evaluatedIds = stressTest.evaluations.map(e => e.ideaId);

      // 1. Is collection different? (Timestamp matches?)
      const isCollectionIdMatch = stressTest.collectionId === collectionResult.generatedAt;

      // 2. Do the list of active idea IDs match the evaluated idea IDs exactly?
      const isIdeasSetMatch = activeIdeas.length === evaluatedIds.length && 
                              activeIdeas.every(ai => evaluatedIds.includes(ai.id));

      if ((!isCollectionIdMatch || !isIdeasSetMatch) && !stressTest.isStale) {
        const updatedST = {
          ...stressTest,
          isStale: true
        };
        setStressTest(updatedST);
        localStorage.setItem('saved_stress_test', JSON.stringify(updatedST));
      }
    }
  }, [collectionResult, rejectedIdeaIds, stressTest]);

  // Cycle through stress test stages during evaluation
  useEffect(() => {
    let interval: any;
    const stages: StressTestStatus[] = [
      'checking_audience',
      'testing_usefulness',
      'reviewing_credibility',
      'applying_penalties',
      'selecting_winners'
    ];
    
    if (stages.includes(stressTestStatus)) {
      interval = setInterval(() => {
        setStressTestStatus(prev => {
          const currentIdx = stages.indexOf(prev);
          if (currentIdx !== -1) {
            const nextIdx = (currentIdx + 1) % stages.length;
            return stages[nextIdx];
          }
          return prev;
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [stressTestStatus]);

  const handleGenerateIdea = async () => {
    if (status === 'generating') return;

    setStatus('generating');
    setErrorMessage(null);
    setGeneratedIdea(null);

    // Frontend pre-check: verify active content pillars exist
    if (!profile.contentPillars || profile.contentPillars.length === 0) {
      setStatus('error');
      setErrorMessage('No active AI content pillars selected. Please open the Engine Settings tab and select at least one content pillar.');
      return;
    }

    try {
      const res = await fetch('/api/gemini/generate-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profile })
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data: ContentIdeaResponse = await res.json();

      if (data.success && data.idea) {
        setGeneratedIdea(data.idea);
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(data.errorMessage || 'An error occurred during content generation. Please verify your settings and try again.');
      }
    } catch (err) {
      console.error('Idea generation failed', err);
      setStatus('error');
      setErrorMessage('The connection to the server could not be established. Please check if your Gemini API key is configured properly in the AI Studio Secrets panel.');
    }
  };

  const handleSaveIdea = () => {
    if (!generatedIdea) return;
    
    const ideaToSave: GeneratedContentIdea = {
      ...generatedIdea,
      savedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem('saved_ai_test_idea', JSON.stringify(ideaToSave));
      setSavedIdea(ideaToSave);
      setSaveSuccessMessage('Idea saved successfully');
      
      // Auto-dismiss save success toast after 4 seconds
      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 4000);
    } catch (e) {
      console.error('Failed to save idea', e);
    }
  };

  const handleDeleteSavedIdea = () => {
    try {
      localStorage.removeItem('saved_ai_test_idea');
      setSavedIdea(null);
    } catch (e) {
      console.error('Failed to delete saved idea', e);
    }
  };

  const handleRunResearch = async () => {
    if (researchStatus === 'searching') return;

    setResearchStatus('searching');
    setResearchError(null);
    setResearchResult(null);

    try {
      const res = await fetch('/api/gemini/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data: AIResearchResponse = await res.json();

      if (data.success && data.result) {
        setResearchResult(data.result);
        setResearchStatus('success');
      } else {
        setResearchStatus('error');
        setResearchError(data.errorMessage || 'Live research could not be completed. Please try again.');
      }
    } catch (err) {
      console.error('Live AI Research failed', err);
      setResearchStatus('error');
      setResearchError('The connection to the server could not be established. Please check if your Gemini API key is configured properly in the AI Studio Secrets panel.');
    }
  };

  const handleSaveResearch = () => {
    if (!researchResult) return;

    const researchToSave: AIResearchResult = {
      ...researchResult,
      savedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem('saved_ai_research', JSON.stringify(researchToSave));
      setSavedResearch(researchToSave);
      setResearchSaveSuccessMessage('Research result saved successfully');

      // Auto-dismiss save success toast after 4 seconds
      setTimeout(() => {
        setResearchSaveSuccessMessage(null);
      }, 4000);
    } catch (e) {
      console.error('Failed to save research', e);
    }
  };

  const handleDeleteSavedResearch = () => {
    try {
      localStorage.removeItem('saved_ai_research');
      setSavedResearch(null);
    } catch (e) {
      console.error('Failed to delete saved research', e);
    }
  };

  const handleBuildBrief = async () => {
    if (briefStatus === 'searching' || briefStatus === 'verifying' || briefStatus === 'duplicates' || briefStatus === 'preparing') return;

    setBriefStatus('searching');
    setBriefError(null);
    setBriefResult(null);

    // Progressive loading updates
    const stages: DailyResearchStatus[] = ['searching', 'verifying', 'duplicates', 'preparing'];
    let stageIdx = 0;
    const interval = setInterval(() => {
      if (stageIdx < stages.length - 1) {
        stageIdx++;
        setBriefStatus(stages[stageIdx]);
      }
    }, 2500);

    try {
      const res = await fetch('/api/gemini/research-brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearInterval(interval);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.errorMessage || `HTTP error ${res.status}`);
      }

      const data = await res.json();

      if (data.success && data.brief) {
        setBriefResult(data.brief);
        setBriefStatus('success');
      } else {
        setBriefStatus('error');
        setBriefError(data.errorMessage || 'Not enough reliable AI developments were found for a complete brief. Try again later.');
      }
    } catch (err: any) {
      clearInterval(interval);
      console.error('Daily Research Brief failed', err);
      setBriefStatus('error');
      setBriefError(err.message || 'The connection to the server could not be established. Please check if your Gemini API key is configured properly in the AI Studio Secrets panel.');
    }
  };

  const handleSaveBrief = () => {
    if (!briefResult) return;

    const briefToSave: DailyResearchBrief = {
      ...briefResult,
      savedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem('saved_ai_research_brief', JSON.stringify(briefToSave));
      setSavedBrief(briefToSave);
      setBriefSaveSuccess('Research brief saved successfully');

      setTimeout(() => {
        setBriefSaveSuccess(null);
      }, 4000);
    } catch (e) {
      console.error('Failed to save research brief', e);
    }
  };

  const handleSaveDevelopment = (dev: DailyResearchDevelopment) => {
    // Check duplicates
    const alreadySaved = savedDevelopments.some(item => {
      if (item.id === dev.id) return true;
      const itemFirstUrl = item.sources?.[0]?.url;
      const devFirstUrl = dev.sources?.[0]?.url;
      if (itemFirstUrl && devFirstUrl && itemFirstUrl === devFirstUrl) return true;
      return false;
    });

    if (alreadySaved) {
      setDevSaveSuccess('Development already saved');
      setTimeout(() => setDevSaveSuccess(null), 3000);
      return;
    }

    if (savedDevelopments.length >= 10) {
      setBriefError('Maximum of 10 saved developments reached. Delete some saved developments first.');
      return;
    }

    const devToSave: SavedResearchDevelopment = {
      ...dev,
      savedAt: new Date().toISOString(),
      researchedAt: briefResult?.researchedAt || new Date().toISOString(),
      timeWindowUsed: briefResult?.timeWindowUsed || '72 hours'
    };

    const newList = [devToSave, ...savedDevelopments];
    try {
      localStorage.setItem('saved_ai_developments', JSON.stringify(newList));
      setSavedDevelopments(newList);
      setDevSaveSuccess('Development saved successfully');

      setTimeout(() => {
        setDevSaveSuccess(null);
      }, 4000);
    } catch (e) {
      console.error('Failed to save development', e);
    }
  };

  const handleDeleteSavedDevelopment = (devId: string) => {
    const newList = savedDevelopments.filter(item => item.id !== devId);
    try {
      localStorage.setItem('saved_ai_developments', JSON.stringify(newList));
      setSavedDevelopments(newList);
    } catch (e) {
      console.error('Failed to delete saved development', e);
    }
  };

  const handleDeleteSavedBrief = () => {
    try {
      localStorage.removeItem('saved_ai_research_brief');
      setSavedBrief(null);
    } catch (e) {
      console.error('Failed to delete saved research brief', e);
    }
  };

  const handleCreateGroundedIdeaFromDevelopment = async (dev: DailyResearchDevelopment) => {
    const mockResearchResult: AIResearchResult = {
      status: 'found',
      headline: dev.headline,
      developmentDate: dev.developmentDate,
      category: dev.category,
      whatHappened: dev.whatHappened,
      whyItMatters: dev.whyItMatters,
      whoIsAffected: dev.whoIsAffected,
      practicalApplication: dev.practicalApplication,
      limitationsOrUncertainty: dev.limitationsOrUncertainty,
      linkedInOpportunity: dev.linkedInOpportunity,
      sourceConfidence: dev.sourceConfidence,
      sources: dev.sources,
      researchedAt: briefResult?.researchedAt || new Date().toISOString()
    };

    // Populate active researchResult so standard layout aligns
    setResearchResult(mockResearchResult);

    if (groundedStatus === 'generating') return;

    setGroundedStatus('generating');
    setGroundedError(null);
    setGroundedIdea(null);

    try {
      if (!profile.contentPillars || profile.contentPillars.length === 0) {
        setGroundedStatus('error');
        setGroundedError('No active AI content pillars selected. Please open the Settings tab and select at least one content pillar.');
        return;
      }

      const res = await fetch('/api/gemini/grounded-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile,
          research: mockResearchResult
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.errorMessage || `HTTP error ${res.status}`);
      }

      const data: GroundedIdeaResponse = await res.json();

      if (data.success && data.idea) {
        setGroundedIdea(data.idea);
        setGroundedStatus('success');
        
        setTimeout(() => {
          document.getElementById('grounded-idea-card')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        setGroundedStatus('error');
        setGroundedError(data.errorMessage || 'The grounded idea could not be verified. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to create grounded idea', err);
      setGroundedStatus('error');
      setGroundedError(err.message || 'The grounded idea could not be verified. Please try again.');
    }
  };

  const getJaccardSimilarityClient = (s1: string, s2: string): number => {
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
    const w1 = new Set(clean(s1));
    const w2 = new Set(clean(s2));
    if (w1.size === 0 && w2.size === 0) return 1;
    if (w1.size === 0 || w2.size === 0) return 0;
    const intersection = new Set([...w1].filter(x => w2.has(x)));
    const union = new Set([...w1, ...w2]);
    return intersection.size / union.size;
  };

  const handleCreateGroundedIdea = async (isAnotherAngle: boolean = false) => {
    if (groundedStatus === 'generating') return;

    setGroundedStatus('generating');
    setGroundedError(null);
    if (!isAnotherAngle) {
      setGroundedIdea(null);
    }

    try {
      const activeResearch = researchResult || savedResearch;
      if (!activeResearch || activeResearch.status !== 'found') {
        setGroundedStatus('error');
        setGroundedError('No verified research result is available. Please run research first.');
        return;
      }

      if (!profile.contentPillars || profile.contentPillars.length === 0) {
        setGroundedStatus('error');
        setGroundedError('No active AI content pillars selected. Please open the Settings tab and select at least one content pillar.');
        return;
      }

      const previousIdea = isAnotherAngle && groundedIdea ? {
        title: groundedIdea.title,
        coreAngle: groundedIdea.coreAngle,
        suggestedHook: groundedIdea.suggestedHook,
        uniqueAngle: groundedIdea.uniqueAngle
      } : undefined;

      const res = await fetch('/api/gemini/grounded-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile,
          research: activeResearch,
          previousIdea
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.errorMessage || `HTTP error ${res.status}`);
      }

      const data: GroundedIdeaResponse = await res.json();

      if (data.success && data.idea) {
        if (isAnotherAngle && groundedIdea) {
          const simTitle = getJaccardSimilarityClient(data.idea.title, groundedIdea.title);
          const simCoreAngle = getJaccardSimilarityClient(data.idea.coreAngle, groundedIdea.coreAngle);
          const simHook = getJaccardSimilarityClient(data.idea.suggestedHook, groundedIdea.suggestedHook);
          const simUnique = getJaccardSimilarityClient(data.idea.uniqueAngle, groundedIdea.uniqueAngle);

          if (simTitle > 0.65 || simCoreAngle > 0.65 || simHook > 0.65 || simUnique > 0.65) {
            setGroundedStatus('error');
            setGroundedError('The new angle was too similar. Please generate again.');
            return;
          }
        }

        setGroundedIdea(data.idea);
        setGroundedStatus('success');
      } else {
        setGroundedStatus('error');
        setGroundedError(data.errorMessage || 'The grounded idea could not be verified. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to create grounded idea', err);
      setGroundedStatus('error');
      setGroundedError(err.message || 'The grounded idea could not be verified. Please try again.');
    }
  };

  const handleSaveGroundedIdea = () => {
    if (!groundedIdea) return;

    const activeResearch = researchResult || savedResearch;
    const ideaToSave = {
      ...groundedIdea,
      researchHeadline: activeResearch?.headline || groundedIdea.researchHeadline,
      generatedAt: groundedIdea.generatedAt || new Date().toISOString(),
      savedAt: new Date().toISOString(),
      type: 'grounded-research-idea' as const
    };

    try {
      localStorage.setItem('saved_grounded_idea', JSON.stringify(ideaToSave));
      setSavedGroundedIdea(ideaToSave);
      setGroundedSaveSuccessMessage('Grounded idea saved successfully');

      setTimeout(() => {
        setGroundedSaveSuccessMessage(null);
      }, 4000);
    } catch (e) {
      console.error('Failed to save grounded idea', e);
    }
  };

  const handleDeleteSavedGroundedIdea = () => {
    try {
      localStorage.removeItem('saved_grounded_idea');
      setSavedGroundedIdea(null);
    } catch (e) {
      console.error('Failed to delete saved grounded idea', e);
    }
  };

  const handleGenerateDailyIdeas = async (isNew: boolean = false) => {
    if (collectionStatus === 'generating') return;

    setCollectionStatus('generating');
    setCollectionError(null);
    setCollectionSubtask('Constructing core ideas...');

    // Progressive loading indicators
    const subtasks = [
      'Constructing core ideas...',
      'Checking pillar coverage...',
      'Ensuring variety & diversity...',
      'Polishing hooks...',
      'Verifying factual constraints...'
    ];
    let subtaskIdx = 0;
    const subtaskInterval = setInterval(() => {
      if (subtaskIdx < subtasks.length - 1) {
        subtaskIdx++;
        setCollectionSubtask(subtasks[subtaskIdx]);
      }
    }, 2800);

    const activeBrief = briefResult || savedBrief;

    try {
      const activePillars = (profile.contentPillars || []).filter(Boolean);
      if (activePillars.length === 0) {
        clearInterval(subtaskInterval);
        setCollectionStatus('error');
        setCollectionError('No active AI content pillars selected. Please open the Settings tab and select at least one content pillar.');
        return;
      }

      if (!activeBrief || !activeBrief.developments || activeBrief.developments.length < 3) {
        clearInterval(subtaskInterval);
        setCollectionStatus('error');
        setCollectionError('A verified AI Research Brief with at least three developments is required to generate today’s content ideas.');
        return;
      }

      // Prepare exclusions if generating a new collection
      let excludedCollection: { titles: string[]; coreAngles: string[] } | undefined = undefined;
      if (isNew && collectionResult?.ideas) {
        excludedCollection = {
          titles: collectionResult.ideas.map(id => id.title),
          coreAngles: collectionResult.ideas.map(id => id.coreIdea)
        };
      }

      const res = await fetch('/api/gemini/ideas-collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile,
          brief: activeBrief,
          excludedCollection
        })
      });

      clearInterval(subtaskInterval);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.errorMessage || `HTTP error ${res.status}`);
      }

      const data = await res.json();

      if (data.success && data.collection) {
        setCollectionResult(data.collection);
        setCollectionStatus('success');
        setRejectedIdeaIds([]);
        localStorage.setItem('saved_daily_ideas_collection', JSON.stringify(data.collection));
        localStorage.removeItem('rejected_idea_ids');
        
        // Reset Stress Test and Selected Winner
        setStressTest(null);
        setStressTestStatus('idle');
        setStressTestError(null);
        setSelectedWinnerId(null);
        setWinnerSelection(null);
        localStorage.removeItem('saved_stress_test');
        localStorage.removeItem('selected_winner');
      } else {
        setCollectionStatus('error');
        setCollectionError(data.errorMessage || 'An error occurred during ideas generation. Please try again.');
      }
    } catch (err: any) {
      clearInterval(subtaskInterval);
      console.error('Failed to generate daily ideas collection', err);
      setCollectionStatus('error');
      setCollectionError(err.message || 'An unexpected connection error occurred. Please try again.');
    }
  };

  const handleGenerateAlternativeIdea = async (idea: DailyContentIdea) => {
    if (individualLoadingStates[idea.id]) return;

    setIndividualLoadingStates(prev => ({ ...prev, [idea.id]: true }));

    const activeBrief = briefResult || savedBrief;

    try {
      if (!activeBrief) {
        throw new Error('No active AI Research Brief found to generate grounded alternative.');
      }

      const res = await fetch('/api/gemini/idea-alternative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile,
          brief: activeBrief,
          targetIdea: idea,
          allExistingIdeas: collectionResult?.ideas || []
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.errorMessage || `HTTP error ${res.status}`);
      }

      const data = await res.json();

      if (data.success && data.idea && collectionResult) {
        const updatedIdeas = collectionResult.ideas.map(item => 
          item.id === idea.id ? data.idea : item
        );
        const updatedCollection = {
          ...collectionResult,
          ideas: updatedIdeas
        };
        setCollectionResult(updatedCollection);
        localStorage.setItem('saved_daily_ideas_collection', JSON.stringify(updatedCollection));
      } else {
        alert(data.errorMessage || 'Failed to generate alternative idea. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to generate alternative idea', err);
      alert(err.message || 'Failed to generate alternative idea due to connection issues.');
    } finally {
      setIndividualLoadingStates(prev => ({ ...prev, [idea.id]: false }));
    }
  };

  const handleToggleSaveIndividualIdea = (idea: DailyContentIdea) => {
    const isAlreadySaved = savedCollectionIdeas.some(item => item.id === idea.id);
    let updated: SavedDailyIdea[];

    if (isAlreadySaved) {
      updated = savedCollectionIdeas.filter(item => item.id !== idea.id);
      setCollectionSaveSuccessMessage('Idea removed from saved collection');
    } else {
      const ideaToSave: SavedDailyIdea = {
        ...idea,
        savedAt: new Date().toISOString(),
        generatedAt: collectionResult?.generatedAt || new Date().toISOString(),
        researchBriefTimestamp: collectionResult?.researchBriefTimestamp || new Date().toISOString()
      };
      updated = [...savedCollectionIdeas, ideaToSave];
      setCollectionSaveSuccessMessage('Idea saved to collection successfully');
    }

    setSavedCollectionIdeas(updated);
    localStorage.setItem('saved_individual_ideas', JSON.stringify(updated));

    setTimeout(() => {
      setCollectionSaveSuccessMessage(null);
    }, 4000);
  };

  const handleRejectIdeaSlot = (ideaId: string) => {
    const updated = [...rejectedIdeaIds, ideaId];
    setRejectedIdeaIds(updated);
    localStorage.setItem('rejected_idea_ids', JSON.stringify(updated));
  };

  const handleReclaimIdeaSlot = (ideaId: string) => {
    const updated = rejectedIdeaIds.filter(id => id !== ideaId);
    setRejectedIdeaIds(updated);
    localStorage.setItem('rejected_idea_ids', JSON.stringify(updated));
  };

  const handleSaveAllCollectionIdeas = () => {
    if (!collectionResult?.ideas) return;

    const unrejectedIdeas = collectionResult.ideas.filter(idea => !rejectedIdeaIds.includes(idea.id));
    const newlySaved: SavedDailyIdea[] = [];

    const updated = [...savedCollectionIdeas];
    for (const idea of unrejectedIdeas) {
      if (!updated.some(item => item.id === idea.id)) {
        const ideaToSave: SavedDailyIdea = {
          ...idea,
          savedAt: new Date().toISOString(),
          generatedAt: collectionResult?.generatedAt || new Date().toISOString(),
          researchBriefTimestamp: collectionResult?.researchBriefTimestamp || new Date().toISOString()
        };
        updated.push(ideaToSave);
        newlySaved.push(ideaToSave);
      }
    }

    setSavedCollectionIdeas(updated);
    localStorage.setItem('saved_individual_ideas', JSON.stringify(updated));
    setCollectionSaveSuccessMessage(`Saved ${newlySaved.length} new ideas to your collection successfully!`);

    setTimeout(() => {
      setCollectionSaveSuccessMessage(null);
    }, 4000);
  };

  const handleClearCollectionResult = () => {
    if (collectionResult?.ideas) {
      const hasUnsaved = collectionResult.ideas.some(idea => 
        !rejectedIdeaIds.includes(idea.id) && !savedCollectionIdeas.some(item => item.id === idea.id)
      );

      if (hasUnsaved) {
        const confirmClear = window.confirm('You have unsaved ideas in this collection. Are you sure you want to clear this collection?');
        if (!confirmClear) return;
      }
    }

    setCollectionResult(null);
    setCollectionStatus('idle');
    setRejectedIdeaIds([]);
    localStorage.removeItem('saved_daily_ideas_collection');
    localStorage.removeItem('rejected_idea_ids');
  };

  const handleRunStressTest = async () => {
    if (!collectionResult) return;
    const activeIdeas = collectionResult.ideas.filter(idea => !rejectedIdeaIds.includes(idea.id));
    if (activeIdeas.length < 7) return;

    setStressTestStatus('checking_audience');
    setStressTestError(null);

    try {
      const res = await fetch('/api/gemini/stress-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile,
          activeIdeas,
          collectionId: collectionResult.generatedAt
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.errorMessage || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.result) {
        setStressTest(data.result);
        setStressTestStatus('success');
        localStorage.setItem('saved_stress_test', JSON.stringify(data.result));
      } else {
        setStressTestStatus('error');
        setStressTestError(data.errorMessage || 'The stress test did not pass validation. Please run it again.');
      }
    } catch (err: any) {
      console.error('Stress test failed', err);
      setStressTestStatus('error');
      setStressTestError(err.message || 'The stress test did not pass validation. Please run it again.');
    }
  };

  const handleSelectWinner = (winnerId: string) => {
    if (selectedWinnerId && selectedWinnerId !== winnerId) {
      const confirmChange = window.confirm("Choosing another winner will replace your previous selection. Do you want to continue?");
      if (!confirmChange) return;
    }

    const winningIdea = collectionResult?.ideas.find(i => i.id === winnerId);
    const evaluation = stressTest?.evaluations.find(e => e.ideaId === winnerId);

    if (!winningIdea || !evaluation) return;

    const selection: WinnerSelection = {
      winnerId,
      winningIdea,
      evaluation,
      selectedAt: new Date().toISOString()
    };

    setSelectedWinnerId(winnerId);
    setWinnerSelection(selection);
    localStorage.setItem('selected_winner', JSON.stringify(selection));
    alert('Winner selected successfully');
  };

  const handleImproveIdea = async (winnerId: string) => {
    const targetIdea = collectionResult?.ideas.find(i => i.id === winnerId);
    const evaluation = stressTest?.evaluations.find(e => e.ideaId === winnerId);

    if (!targetIdea || !evaluation) return;

    const confirmImprove = window.confirm("Are you sure you want to improve this idea using AI? This will update the idea in your current collection and mark your current stress test as outdated.");
    if (!confirmImprove) return;

    setImprovingIdeaId(winnerId);

    try {
      const res = await fetch('/api/gemini/improve-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile,
          targetIdea,
          evaluation
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.errorMessage || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.idea && collectionResult) {
        const updatedIdeas = collectionResult.ideas.map(item => 
          item.id === winnerId ? data.idea : item
        );
        const updatedCollection = {
          ...collectionResult,
          ideas: updatedIdeas
        };
        
        // Update collection
        setCollectionResult(updatedCollection);
        localStorage.setItem('saved_daily_ideas_collection', JSON.stringify(updatedCollection));

        // Mark stress test as stale/outdated
        if (stressTest) {
          const updatedST = {
            ...stressTest,
            isStale: true
          };
          setStressTest(updatedST);
          localStorage.setItem('saved_stress_test', JSON.stringify(updatedST));
        }

        // Reset selection if the improved idea was selected
        if (selectedWinnerId === winnerId) {
          setSelectedWinnerId(null);
          setWinnerSelection(null);
          localStorage.removeItem('selected_winner');
        }

        alert('This idea changed. Run the stress test again before selecting winners.');
      } else {
        alert(data.errorMessage || 'Failed to improve idea. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to improve idea', err);
      alert(err.message || 'An unexpected connection error occurred. Please try again.');
    } finally {
      setImprovingIdeaId(null);
    }
  };

  const activeIdeas = collectionResult?.ideas.filter(idea => !rejectedIdeaIds.includes(idea.id)) || [];
  const isProfileValid = !!profile && !!profile.fullName;

  return (
    <div id="ideas-view-container" className="space-y-8 max-w-4xl mx-auto pb-40 md:pb-24">
      {/* Title Header */}
      <div id="ideas-header" className="space-y-2">
        <h2 className="text-3xl font-sans font-bold text-white tracking-tight md:text-4xl">
          AI Ideas Lab
        </h2>
        <p className="text-slate-400 font-sans text-base max-w-xl leading-relaxed">
          Create and test professional LinkedIn post ideas engineered for viral AI content.
        </p>
      </div>

      {/* Save Success Toast */}
      {saveSuccessMessage && (
        <div 
          id="toast-save-success"
          className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-500/30 text-emerald-400 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-md"
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span className="text-sm font-sans font-semibold">{saveSuccessMessage}</span>
        </div>
      )}

      {/* Research Save Success Toast */}
      {researchSaveSuccessMessage && (
        <div 
          id="toast-research-save-success"
          className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-500/30 text-emerald-400 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-md"
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span className="text-sm font-sans font-semibold">{researchSaveSuccessMessage}</span>
        </div>
      )}

      {/* Grounded Idea Save Success Toast */}
      {groundedSaveSuccessMessage && (
        <div 
          id="toast-grounded-save-success"
          className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-500/30 text-emerald-400 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-md"
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span className="text-sm font-sans font-semibold">{groundedSaveSuccessMessage}</span>
        </div>
      )}

      {/* Informational Focus Toast */}
      {toastMessage && (
        <div 
          id="toast-focus-info"
          className="fixed top-20 md:top-6 left-6 right-6 md:left-auto md:right-6 z-50 bg-[#0F172A] border border-blue-500/30 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-sm md:max-w-md mx-auto md:mx-0 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-sans text-slate-300 font-semibold">Ideas Lab Notice</p>
            <p className="text-sm font-sans text-white font-medium">{toastMessage}</p>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold px-1 py-0.5 cursor-pointer ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Daily AI Research Brief Card */}
      <div 
        id="daily-research-brief-card"
        className="bg-[#0f172a] border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-10 space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden text-left"
      >
        {/* Glowing background accent */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -ml-32 -mt-32 pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/60 relative z-10">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Newspaper className="w-6 h-6" />
            </div>
            <div className="space-y-0.5 text-left">
              <h3 className="text-lg md:text-xl font-sans font-bold text-white tracking-tight">
                Daily AI Research Brief
              </h3>
              <p className="text-slate-400 font-sans text-xs md:text-sm leading-normal">
                Discover five important AI developments that could become useful LinkedIn content for professionals.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleBuildBrief}
              disabled={briefStatus === 'searching' || briefStatus === 'verifying' || briefStatus === 'duplicates' || briefStatus === 'preparing'}
              className={`px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center gap-2 ${
                highlightBriefBtn 
                  ? 'ring-4 ring-indigo-400 ring-offset-2 ring-offset-[#0f172a] scale-105 border-indigo-400 duration-500 animate-pulse' 
                  : ''
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${(briefStatus === 'searching' || briefStatus === 'verifying' || briefStatus === 'duplicates' || briefStatus === 'preparing') ? 'animate-spin' : ''}`} />
              <span>{briefResult ? 'Rebuild Daily Brief' : "Build Today’s Research Brief"}</span>
            </button>

            {briefResult && (
              <button
                type="button"
                onClick={handleSaveBrief}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700/50 transition-colors flex items-center gap-1.5"
              >
                <Bookmark className="w-4 h-4" />
                <span>Save Brief</span>
              </button>
            )}
          </div>
        </div>

        {/* Saved Success Toasts inside the card or as inline feedback */}
        {(briefSaveSuccess || devSaveSuccess) && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{briefSaveSuccess || devSaveSuccess}</span>
          </div>
        )}

        {/* Dynamic Display Area */}
        {(briefStatus === 'searching' || briefStatus === 'verifying' || briefStatus === 'duplicates' || briefStatus === 'preparing') && (
          <div id="brief-loading-state" className="py-14 flex flex-col items-center justify-center space-y-4 text-center relative z-10 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-600/10 border-t-indigo-500 animate-spin flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-200 font-sans font-semibold text-base">
                {briefStatus === 'searching' && "Scanning recent AI developments (72h window)…"}
                {briefStatus === 'verifying' && "Reviewing recent AI developments…"}
                {briefStatus === 'duplicates' && "Filtering duplicates & verifying sources…"}
                {briefStatus === 'preparing' && "Assembling editorial summary and professional angles…"}
              </p>
              <p className="text-slate-500 font-sans text-xs max-w-sm mx-auto">
                {briefStatus === 'searching' && "Gathering the latest AI papers, releases, and updates using live Google Search grounding."}
                {briefStatus === 'verifying' && "Evaluating article credibility, matching release dates, and reviewing original product documentation."}
                {briefStatus === 'duplicates' && "De-duplicating overlapping stories and identifying primary source confidence."}
                {briefStatus === 'preparing' && "Applying professional context, drafting practical applications, and structuring the final brief."}
              </p>
            </div>
          </div>
        )}

        {briefStatus === 'error' && briefError && (
          <div id="brief-error-state" className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 text-left relative z-10">
            <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-sm font-sans font-bold text-red-400">Brief Generation Notice</h4>
              <p className="text-xs sm:text-sm font-sans text-red-300 leading-relaxed">
                {briefError}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleBuildBrief}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Generating Brief</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {briefStatus === 'idle' && !briefResult && (
          <div id="brief-idle-state" className="py-12 flex flex-col items-center justify-center text-center space-y-6 relative z-10">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
              <Newspaper className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md">
              <h4 className="text-base font-sans font-bold text-slate-200">Generate Today's Brief</h4>
              <p className="text-xs sm:text-sm font-sans text-slate-400 leading-relaxed">
                Analyze AI announcements, model releases, research breakthroughs, and professional tools with live server-side Google Search grounding.
              </p>
            </div>
          </div>
        )}

        {briefStatus === 'success' && briefResult && (
          <div id="brief-result-container" className="space-y-8 relative z-10 animate-in fade-in duration-300 text-left">
            {/* Editorial Dashboard Header */}
            <div className="bg-slate-950/50 p-5 sm:p-6 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Timeframe: {briefResult.timeWindowUsed}
                </span>
                <span className="text-slate-400 text-xs font-sans">
                  Compiled at: {new Date(briefResult.researchedAt).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-200 font-sans text-sm leading-relaxed border-t border-slate-800/40 pt-3">
                <strong className="text-white">Editorial Summary:</strong> {briefResult.summary}
              </p>
            </div>

            {/* List of Developments */}
            <div className="space-y-6">
              <h4 className="text-white font-sans font-bold text-base border-b border-slate-800 pb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Verified Developments ({briefResult.developments.length})
              </h4>
              
              <div className="space-y-6">
                {briefResult.developments.map((dev) => (
                  <DevelopmentCard 
                    key={dev.id} 
                    dev={dev} 
                    onCreateGroundedIdea={handleCreateGroundedIdeaFromDevelopment}
                    onSaveDevelopment={handleSaveDevelopment}
                    isSaved={savedDevelopments.some(item => item.id === dev.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Collapsible / Tidy sections for saved Brief / Developments */}
        {(savedBrief || savedDevelopments.length > 0) && (
          <div className="mt-8 pt-8 border-t border-slate-800 space-y-6">
            <h4 className="text-slate-200 font-sans font-bold text-sm text-left">Saved Briefs & Developments</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Saved Brief Button */}
              {savedBrief && (
                <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between text-left">
                  <div className="space-y-1">
                    <span className="text-white text-xs font-sans font-semibold flex items-center gap-1">
                      <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Daily Research Brief
                    </span>
                    <p className="text-slate-400 text-[10px]">
                      Saved {new Date(savedBrief.savedAt || '').toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBriefResult(savedBrief);
                        setBriefStatus('success');
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700/50 transition-colors"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSavedBrief}
                      className="p-1.5 bg-slate-800 hover:bg-red-950/50 text-slate-400 hover:text-red-400 border border-slate-700/50 hover:border-red-500/30 rounded-lg transition-colors"
                      title="Delete Saved Brief"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Saved Developments Count */}
              {savedDevelopments.length > 0 && (
                <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl space-y-3 text-left col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-xs font-sans font-semibold flex items-center gap-1.5">
                      <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Saved Individual Developments ({savedDevelopments.length} / 10)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                    {savedDevelopments.map((dev) => (
                      <div key={dev.id} className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/50 flex flex-col justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                              {dev.category}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {dev.developmentDate}
                            </span>
                          </div>
                          <h5 className="text-xs font-sans font-bold text-white line-clamp-1">{dev.headline}</h5>
                          <p className="text-[11px] text-slate-400 line-clamp-2">{dev.whatHappened}</p>
                        </div>
                        <div className="flex gap-2 justify-end border-t border-slate-900 pt-2">
                          <button
                            type="button"
                            onClick={() => handleCreateGroundedIdeaFromDevelopment(dev)}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded"
                          >
                            Create Idea
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSavedDevelopment(dev.id)}
                            className="p-1 text-slate-500 hover:text-red-400"
                            title="Delete Saved Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Daily AI Content Ideas Card */}
      <div 
        id="daily-content-ideas-card"
        className="bg-[#0f172a] border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-10 space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden text-left"
      >
        {/* Glowing background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-600/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/60 relative z-10">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-600/10 text-fuchsia-400 border border-fuchsia-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Lightbulb className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-0.5 text-left">
              <h3 className="text-lg md:text-xl font-sans font-bold text-white tracking-tight">
                Daily AI Content Ideas
              </h3>
              <p className="text-slate-400 font-sans text-xs md:text-sm leading-normal">
                Turn today’s AI developments and your creator positioning into ten useful LinkedIn content opportunities.
              </p>
            </div>
          </div>

          {collectionResult && collectionStatus === 'success' && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleGenerateDailyIdeas(true)}
                disabled={collectionStatus === 'generating'}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs sm:text-sm font-bold rounded-xl border border-slate-700/50 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Generate New Collection</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAllCollectionIdeas}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-lg flex items-center gap-1.5"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save All Ideas</span>
              </button>
              <button
                type="button"
                onClick={handleClearCollectionResult}
                className="px-3 py-2 bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/20 text-xs font-semibold rounded-xl transition-all"
                title="Clear Collection"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Global Collection Save Success Toast */}
        {collectionSaveSuccessMessage && (
          <div 
            id="toast-collection-save-success"
            className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-500/30 text-emerald-400 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-md"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span className="text-sm font-sans font-semibold">{collectionSaveSuccessMessage}</span>
          </div>
        )}

        {/* Verification Check & Generate trigger */}
        {collectionStatus === 'idle' && !collectionResult && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 relative z-10">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-fuchsia-400 shadow-lg">
              <Lightbulb className="w-8 h-8" />
            </div>
            
            {/* Conditional Warning banner or validation text */}
            {(!profile.contentPillars || profile.contentPillars.filter(Boolean).length === 0 || !(briefResult || savedBrief) || (briefResult || savedBrief)!.developments?.length < 3) ? (
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl max-w-md text-left flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="text-xs font-sans font-bold text-amber-400 uppercase tracking-wider">Prerequisites Required</h5>
                  <p className="text-xs sm:text-sm font-sans text-amber-300 leading-relaxed">
                    Build or restore today’s verified AI Research Brief before generating ideas. Ensure you have saved your Creator Profile and selected active content pillars.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-w-md">
                <h4 className="text-base font-sans font-bold text-slate-200">Generate Today's Content Ideas</h4>
                <p className="text-xs sm:text-sm font-sans text-slate-400 leading-relaxed">
                  Generate exactly ten highly customized, verified AI-focused LinkedIn content ideas based on today's Research Brief and your saved positioning.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleGenerateDailyIdeas(false)}
              disabled={
                collectionStatus === 'generating' ||
                !profile.contentPillars || profile.contentPillars.filter(Boolean).length === 0 ||
                !(briefResult || savedBrief) || (briefResult || savedBrief)!.developments?.length < 3
              }
              className="px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-xl transition-all shadow-lg text-sm flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
              <span>Generate 10 Content Ideas</span>
            </button>
          </div>
        )}

        {/* Loading / Generating State */}
        {collectionStatus === 'generating' && (
          <div id="ideas-collection-loading-state" className="py-14 flex flex-col items-center justify-center space-y-4 text-center relative z-10 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full border-4 border-fuchsia-600/10 border-t-fuchsia-500 animate-spin flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-fuchsia-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-200 font-sans font-semibold text-base">
                Generating daily idea collection...
              </p>
              <p className="text-fuchsia-400 font-mono text-xs uppercase tracking-widest font-semibold">
                {collectionSubtask}
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {collectionStatus === 'error' && collectionError && (
          <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 text-left relative z-10">
            <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-sm font-sans font-bold text-red-400">Generation Notice</h4>
              <p className="text-xs sm:text-sm font-sans text-red-300 leading-relaxed">
                {collectionError}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleGenerateDailyIdeas(false)}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Generating Ideas</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success State / Display Collection */}
        {collectionStatus === 'success' && collectionResult && (
          <div className="space-y-8 relative z-10 animate-in fade-in duration-300 text-left">
            {/* Collection Editorial Summary */}
            <div className="bg-slate-950/50 p-5 sm:p-6 rounded-2xl border border-slate-800/80 space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-fuchsia-400">Collection Strategy</h4>
              <p className="text-slate-200 font-sans text-sm leading-relaxed">
                {collectionResult.collectionSummary}
              </p>
            </div>

            {/* List of 10 Ideas */}
            <div className="space-y-6">
              <h4 className="text-white font-sans font-bold text-base border-b border-slate-850 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-fuchsia-400" />
                  Proposed Post Blueprints ({collectionResult.ideas.length - rejectedIdeaIds.length} Active / {collectionResult.ideas.length} Total)
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  Saved: {savedCollectionIdeas.length} ideas
                </span>
              </h4>

              <div className="space-y-6">
                {collectionResult.ideas.map((idea, index) => {
                  const isRejected = rejectedIdeaIds.includes(idea.id);
                  const isSaved = savedCollectionIdeas.some(item => item.id === idea.id);
                  const isLoading = !!individualLoadingStates[idea.id];

                  if (isRejected) {
                    return (
                      <div 
                        key={idea.id}
                        className="bg-slate-950/30 border border-slate-900/50 p-4 rounded-xl flex items-center justify-between text-left animate-in fade-in duration-200"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-slate-500 font-semibold uppercase">Idea #{index + 1} - Rejected</span>
                          <h5 className="text-xs font-sans font-bold text-slate-400 line-clamp-1">{idea.title}</h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleReclaimIdeaSlot(idea.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700/50 transition-colors"
                        >
                          Reclaim Idea
                        </button>
                      </div>
                    );
                  }

                  // Render full active idea card
                  return (
                    <div 
                      key={idea.id}
                      className="bg-[#0b1329]/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-6 relative overflow-hidden text-left"
                    >
                      {/* Metadata Pills */}
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-fuchsia-600/15 border border-fuchsia-500/20 text-fuchsia-400 text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                          {idea.ideaType}
                        </span>
                        <span className="bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          <Users className="w-3 h-3" />
                          Audience: {idea.primaryAudience}
                        </span>
                        <span className="bg-pink-600/10 border border-pink-500/20 text-pink-400 text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          <Layers className="w-3 h-3" />
                          Pillar: {idea.contentPillar}
                        </span>
                        <span className="bg-slate-850 border border-slate-800 text-slate-300 text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          <Target className="w-3 h-3" />
                          Format: {idea.recommendedFormat}
                        </span>
                        <span className="bg-slate-850 border border-slate-800 text-slate-300 text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          <TrendingUp className="w-3 h-3" />
                          Growth: {idea.growthMechanism}
                        </span>
                      </div>

                      {/* Title & Hook */}
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Proposed Title</span>
                          <h4 className="text-base sm:text-lg font-sans font-bold text-white tracking-tight leading-normal">
                            {idea.title}
                          </h4>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-fuchsia-400/80">Suggested Hook</span>
                          <p className="text-sm font-sans font-medium text-slate-200 italic leading-relaxed pl-3 border-l-2 border-fuchsia-500">
                            "{idea.suggestedHook}"
                          </p>
                        </div>
                      </div>

                      {/* Details Area */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        {/* EDITORIAL INTERPRETATION SECTION */}
                        <div className="bg-purple-950/10 border border-purple-500/10 p-4 sm:p-5 rounded-xl space-y-4 md:col-span-2">
                          <div className="flex items-center gap-2 pb-2 border-b border-purple-500/10">
                            <span className="bg-purple-600/20 text-purple-400 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                              Editorial interpretation
                            </span>
                            <span className="text-xs text-slate-400">Positioning, commentary and takeaways engineered for Rohit</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1 sm:col-span-2">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Core Angle</span>
                              <p className="text-sm font-sans text-slate-300 leading-relaxed">
                                {idea.coreIdea}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Problem Solved</span>
                              <p className="text-sm font-sans text-slate-300 leading-relaxed">
                                {idea.problemSolved}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Reader Payoff</span>
                              <p className="text-sm font-sans text-slate-300 leading-relaxed">
                                {idea.readerPayoff}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Action Required From Rohit</span>
                              <p className="text-sm font-sans text-slate-300 leading-relaxed">
                                {idea.actionRequiredFromRohit}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Credibility Requirement</span>
                              <p className="text-sm font-sans text-slate-300 leading-relaxed">
                                {idea.credibilityRequirement}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* VERIFIED FACTS SECTION (Research-grounded only) */}
                        {idea.ideaType === 'Research-grounded' && (
                          <div className="bg-blue-950/10 border border-blue-500/15 p-4 sm:p-5 rounded-xl md:col-span-2 space-y-4 animate-in fade-in duration-300">
                            <div className="flex items-center gap-2 pb-2 border-b border-blue-500/10">
                              <span className="bg-blue-600/20 text-blue-400 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                                Verified facts
                              </span>
                              <span className="text-xs text-slate-400">Strict boundaries of underlying source research</span>
                            </div>

                            <div className="space-y-3">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Factual Boundary</span>
                                <p className="text-sm font-sans text-slate-300 leading-relaxed">
                                  {idea.factBoundary}
                                </p>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Uncertainty or Limitations to Mention</span>
                                <p className="text-sm font-sans text-slate-300 leading-relaxed">
                                  {idea.uncertaintyToMention}
                                </p>
                              </div>

                              {idea.sourceReferences && idea.sourceReferences.length > 0 && (
                                <div className="space-y-2 pt-1 border-t border-slate-900">
                                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Verified Sources</span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {idea.sourceReferences.map((src, i) => (
                                      <div key={i} className="flex items-center justify-between gap-2 p-2 bg-slate-950/60 rounded-lg border border-slate-900">
                                        <div className="text-left space-y-0.5 min-w-0 flex-1">
                                          <p className="text-xs font-sans font-bold text-white truncate">{src.title}</p>
                                          <p className="text-[10px] font-sans text-slate-400 truncate">Publisher: {src.publisher}</p>
                                        </div>
                                        <a 
                                          href={src.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          referrerPolicy="no-referrer"
                                          className="p-1.5 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors flex-shrink-0"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-4 border-t border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                        <button
                          type="button"
                          onClick={() => handleToggleSaveIndividualIdea(idea)}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                            isSaved 
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Saved Idea</span>
                            </>
                          ) : (
                            <>
                              <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                              <span>Save Idea</span>
                            </>
                          )}
                        </button>

                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleGenerateAlternativeIdea(idea)}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1.5"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            <span>{isLoading ? 'Regenerating...' : 'Generate Alternative'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectIdeaSlot(idea.id)}
                            className="px-3 py-2 bg-slate-900 hover:bg-red-950/20 text-slate-400 hover:text-red-400 border border-slate-800 text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1"
                          >
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* IDEA STRESS TEST WORKFLOW */}
      {collectionResult && collectionStatus === 'success' && (
        <div 
          id="idea-stress-test-container"
          className="bg-slate-950/40 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-10 space-y-8 shadow-2xl relative overflow-hidden"
        >
          {/* Decorative Glowing Accent */}
          <div className="absolute top-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl -ml-40 -mt-40 pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/60 relative z-10">
            <div className="flex gap-4 items-center text-left">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-lg md:text-xl font-sans font-bold text-white tracking-tight">
                  Editor-in-Chief Idea Stress Test
                </h3>
                <p className="text-slate-400 font-sans text-xs md:text-sm leading-normal">
                  Evaluate, score, and rank your 10 ideas against the rigorous editor framework to select the 3 strongest winners.
                </p>
              </div>
            </div>

            {/* Run Stress Test Action Button */}
            <div className="flex-shrink-0 text-left sm:text-right">
              {activeIdeas.length >= 7 ? (
                <button
                  type="button"
                  id="run-stress-test-btn"
                  disabled={stressTestStatus !== 'idle' && stressTestStatus !== 'success' && stressTestStatus !== 'error'}
                  onClick={handleRunStressTest}
                  className="w-full sm:w-auto px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-sans font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-cyan-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Stress Test These 10 Ideas</span>
                </button>
              ) : (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-sans max-w-xs leading-relaxed">
                  Restore or regenerate enough ideas before running the stress test.
                </div>
              )}
            </div>
          </div>

          {/* LOADING STATE & WORKFLOW CYCLER */}
          {['checking_audience', 'testing_usefulness', 'reviewing_credibility', 'applying_penalties', 'selecting_winners'].includes(stressTestStatus) && (
            <div id="stress-test-loading" className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-14 h-14 rounded-full border-4 border-cyan-500/10 border-t-cyan-400 animate-spin flex items-center justify-center">
                <BrainCircuit className="w-6 h-6 text-cyan-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-slate-200 font-sans font-semibold text-base">
                  Stress-testing ten AI content ideas…
                </p>
                <div className="text-cyan-400 font-sans font-medium text-xs uppercase tracking-wider h-5 flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
                  {stressTestStatus === 'checking_audience' && 'Checking audience relevance'}
                  {stressTestStatus === 'testing_usefulness' && 'Testing usefulness and originality'}
                  {stressTestStatus === 'reviewing_credibility' && 'Reviewing credibility and risk'}
                  {stressTestStatus === 'applying_penalties' && 'Applying penalties'}
                  {stressTestStatus === 'selecting_winners' && 'Selecting the three strongest ideas'}
                </div>
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {stressTestStatus === 'error' && stressTestError && (
            <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 text-left">
              <AlertOctagon className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="text-sm font-sans font-bold text-red-400">Stress Test Failed</h4>
                <p className="text-xs sm:text-sm font-sans text-red-300 leading-relaxed">
                  {stressTestError}
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleRunStressTest}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Stress Test</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STALE WARNING BAR */}
          {stressTest && stressTest.isStale && (
            <div id="stress-test-stale-warning" className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-left">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-sans text-amber-300 leading-relaxed">
                The idea collection changed after this evaluation. Run the stress test again for accurate rankings.
              </p>
            </div>
          )}

          {/* SUCCESS RESULTS DISPLAY */}
          {stressTest && (
            <div className="space-y-12 text-left relative z-10 animate-in fade-in duration-500">
              
              {/* TOP 3 WINNERS COMPONENT */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h4 className="text-lg font-sans font-bold text-white tracking-tight">Top 3 Winner Ideas</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {stressTest.winners.map((winner, index) => {
                    const matchedIdea = collectionResult.ideas.find(i => i.id === winner.ideaId);
                    const evaluation = stressTest.evaluations.find(e => e.ideaId === winner.ideaId);
                    if (!matchedIdea || !evaluation) return null;

                    const isSelected = selectedWinnerId === winner.ideaId;
                    const isImproving = improvingIdeaId === winner.ideaId;

                    return (
                      <div 
                        key={winner.ideaId}
                        className={`bg-slate-900/60 rounded-2xl border p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 shadow-lg ${
                          isSelected 
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-950/5' 
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-4">
                          {/* Rank Badge & Score */}
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                              index === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              index === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' :
                              'bg-amber-700/20 text-amber-600 border border-amber-700/30'
                            }`}>
                              {index === 0 ? '🏆 1st Place' : index === 1 ? '🥈 2nd Place' : '🥉 3rd Place'}
                            </span>
                            <div className="text-right">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">Calculated Score</span>
                              <span className="text-lg font-mono font-black text-white">{evaluation.calculatedScore}</span>
                            </div>
                          </div>

                          {/* Idea Meta */}
                          <div className="space-y-1.5">
                            <h5 className="font-sans font-extrabold text-white text-base leading-snug tracking-tight">
                              {matchedIdea.title}
                            </h5>
                            <span className="inline-block bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded">
                              {matchedIdea.ideaType}
                            </span>
                          </div>

                          {/* Suggested Hook */}
                          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900/80 space-y-1">
                            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">Suggested Hook</span>
                            <p className="text-xs font-sans text-slate-300 italic leading-relaxed">
                              "{matchedIdea.suggestedHook}"
                            </p>
                          </div>

                          {/* Growth Mechanism & Format */}
                          <div className="grid grid-cols-2 gap-2 text-left">
                            <div className="bg-slate-950/30 p-2 rounded-lg border border-slate-900/40">
                              <span className="text-[9px] font-mono font-bold uppercase text-slate-500 tracking-wider block">Format</span>
                              <span className="text-xs font-sans font-semibold text-slate-300 truncate block">{matchedIdea.suggestedFormat}</span>
                            </div>
                            <div className="bg-slate-950/30 p-2 rounded-lg border border-slate-900/40">
                              <span className="text-[9px] font-mono font-bold uppercase text-slate-500 tracking-wider block">Mechanism</span>
                              <span className="text-xs font-sans font-semibold text-slate-300 truncate block">{matchedIdea.growthMechanism}</span>
                            </div>
                          </div>

                          {/* Source References */}
                          {matchedIdea.ideaType === 'Research-grounded' && matchedIdea.sourceReferences && matchedIdea.sourceReferences.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[9px] font-mono font-bold uppercase text-slate-500 tracking-wider block">Source Material</span>
                              <div className="flex flex-col gap-1">
                                {matchedIdea.sourceReferences.map((src, i) => (
                                  <a 
                                    key={i} 
                                    href={src.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    referrerPolicy="no-referrer"
                                    className="text-[10px] font-sans text-cyan-400 hover:underline truncate flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                                    <span>{src.title} ({src.publisher})</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Main Weakness & Recommendation */}
                          <div className="space-y-2 pt-2 border-t border-slate-800/60">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-mono font-bold uppercase text-red-400 tracking-wider block">Main Weakness</span>
                              <p className="text-xs font-sans text-slate-400 leading-relaxed">
                                {evaluation.weakness}
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider block">Improvement Recommendation</span>
                              <p className="text-xs font-sans text-slate-300 leading-relaxed font-medium">
                                {evaluation.recommendation}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Winner Actions */}
                        <div className="pt-5 border-t border-slate-800/60 mt-5 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={stressTest.isStale}
                              onClick={() => handleSelectWinner(winner.ideaId)}
                              className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                                isSelected 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black' 
                                  : stressTest.isStale 
                                    ? 'bg-slate-900 text-slate-500 border border-slate-800/40 opacity-50 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-transparent'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Selected</span>
                                </>
                              ) : (
                                <span>Choose Winner</span>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={isImproving}
                              onClick={() => handleImproveIdea(winner.ideaId)}
                              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition-all inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <RefreshCw className={`w-3 h-3 ${isImproving ? 'animate-spin' : ''}`} />
                              <span>{isImproving ? 'Improve AI' : 'Improve AI'}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setExpandedEvaluationId(winner.ideaId);
                              const element = document.getElementById(`eval-item-${winner.ideaId}`);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                            className="w-full py-2 text-center text-[11px] font-sans font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            View Full Evaluation Detail ↓
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SAVED WINNER BANNER */}
              {winnerSelection && (
                <div id="winner-selection-summary" className="bg-emerald-950/20 border border-emerald-500/30 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
                  <div className="flex gap-3.5 items-center text-left">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h5 className="font-sans font-bold text-emerald-400 text-sm">Selected LinkedIn Content Winner</h5>
                        <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">Ready</span>
                      </div>
                      <p className="text-slate-200 font-sans font-semibold text-base">
                        "{winnerSelection.winningIdea.title}"
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">
                        Selected: {new Date(winnerSelection.selectedAt).toLocaleString()} | Calculated Score: {winnerSelection.evaluation.calculatedScore}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* DETAILED RANKED LIST OF ALL EVALUATED IDEAS */}
              <div className="space-y-6 pt-4 border-t border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <h4 className="text-lg font-sans font-bold text-white tracking-tight">Full Idea Stress Test Evaluations</h4>
                </div>

                <div className="space-y-3">
                  {stressTest.evaluations.map((evalItem, index) => {
                    const matchedIdea = collectionResult.ideas.find(i => i.id === evalItem.ideaId);
                    if (!matchedIdea) return null;

                    const isExpanded = expandedEvaluationId === evalItem.ideaId;
                    const isPassed = evalItem.calculatedScore >= 60;
                    const hasSeverePenalties = evalItem.penaltyScore > 0;

                    return (
                      <div 
                        key={evalItem.ideaId}
                        id={`eval-item-${evalItem.ideaId}`}
                        className={`bg-slate-900/40 rounded-xl border transition-all duration-300 overflow-hidden ${
                          isExpanded 
                            ? 'border-slate-700 bg-slate-900/60 shadow-xl' 
                            : 'border-slate-800/80 hover:border-slate-700/60 bg-slate-900/20'
                        }`}
                      >
                        {/* Header Panel */}
                        <button
                          type="button"
                          onClick={() => setExpandedEvaluationId(isExpanded ? null : evalItem.ideaId)}
                          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer transition-colors hover:bg-slate-800/20"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Rank Badge */}
                            <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-black text-slate-300 text-sm flex-shrink-0">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-sm font-sans font-bold text-white truncate">
                                {matchedIdea.title}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-slate-800 border border-slate-700/50 text-slate-400 text-[10px] font-mono px-2 py-0.5 rounded">
                                  {matchedIdea.ideaType}
                                </span>
                                {stressTest.winners.some(w => w.ideaId === evalItem.ideaId) && (
                                  <span className="bg-amber-500/10 text-amber-400 text-[9px] font-mono px-1.5 py-0.2 rounded border border-amber-500/20 uppercase tracking-wider font-semibold">
                                    ★ Top 3 Winner
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Score & Expand control */}
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="text-right">
                              <span className="text-[9px] font-mono font-bold uppercase text-slate-500 tracking-wider block">Final Score</span>
                              <span className={`text-base font-mono font-black ${
                                isPassed ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {evalItem.calculatedScore}
                              </span>
                            </div>

                            <div className="text-slate-500">
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                          </div>
                        </button>

                        {/* Expanded Panel Details */}
                        {isExpanded && (
                          <div className="p-5 sm:p-6 bg-slate-950/40 border-t border-slate-800/80 space-y-6 text-left text-slate-300 text-xs leading-relaxed animate-in slide-in-from-top-2 duration-300">
                            
                            {/* Framework Decisional Verdict */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                                isPassed 
                                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' 
                                  : 'bg-red-500/5 border-red-500/20 text-red-300'
                              }`}>
                                {isPassed ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                ) : (
                                  <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0" />
                                )}
                                <div className="space-y-1">
                                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Editor Decisional Verdict</span>
                                  <p className="font-sans font-bold">
                                    {isPassed ? 'PASSED: Strong content potential.' : 'FAILED: Relevance / original / depth gaps.'}
                                  </p>
                                  <p className="text-[11px] text-slate-400 leading-normal">
                                    {isPassed 
                                      ? 'Exhibits robust professional relevance, practical usefulness, and strong hook clarity.' 
                                      : 'Does not meet the standard quality threshold of 60 points required for safe publication.'}
                                  </p>
                                </div>
                              </div>

                              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                                hasSeverePenalties 
                                  ? 'bg-amber-500/5 border-amber-500/20 text-amber-300' 
                                  : 'bg-slate-900 border-slate-800 text-slate-400'
                              }`}>
                                {hasSeverePenalties ? (
                                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                ) : (
                                  <CheckCircle2 className="w-5 h-5 text-slate-500 flex-shrink-0" />
                                )}
                                <div className="space-y-1">
                                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Penalty Quality Check</span>
                                  <p className="font-sans font-bold">
                                    {hasSeverePenalties ? `PENALTY APPLIED: -${evalItem.penaltyScore} Points` : 'NO PENALTIES APPLIED'}
                                  </p>
                                  <p className="text-[11px] text-slate-400 leading-normal">
                                    {hasSeverePenalties 
                                      ? 'Quality risks detected. Strict penalties applied to adjust calculated score.' 
                                      : 'Successfully passed all quality check filters with clean professional language.'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Criterion Breakdown Section */}
                            <div className="space-y-3">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-800">
                                13 Criterion Score Card
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 pt-1">
                                {(Object.keys(evalItem.criterionScores) as Array<keyof IdeaCriterionScores>).map(criterion => {
                                  const rawScore = evalItem.criterionScores[criterion];
                                  const weight = CRITERION_WEIGHTS[criterion];
                                  const weightedCont = Number((rawScore * weight).toFixed(2));
                                  const criterionLabel = CRITERION_NAMES[criterion] || criterion;

                                  return (
                                    <div key={criterion} className="flex items-center justify-between gap-4 p-2 bg-slate-900/30 rounded-lg border border-slate-900">
                                      <span className="font-sans font-semibold text-slate-300">{criterionLabel}</span>
                                      <div className="flex items-center gap-2 font-mono">
                                        <span className="text-slate-400 text-[10px]">({rawScore} × {weight}w) =</span>
                                        <span className="font-bold text-white text-xs">+{weightedCont}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Penalties Section */}
                            <div className="space-y-3 pt-2">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-800">
                                Specific Quality Penalties (Capped at -25 points total)
                              </span>
                              
                              {evalItem.penaltyScore === 0 ? (
                                <p className="text-xs text-slate-500 font-sans italic">No negative quality traits or clickbait patterns detected.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                  {(Object.keys(evalItem.penalties) as Array<keyof IdeaPenaltyScores>).map(penaltyKey => {
                                    const applied = evalItem.penalties[penaltyKey];
                                    if (!applied) return null;
                                    const penaltyLabel = PENALTY_NAMES[penaltyKey] || penaltyKey;

                                    return (
                                      <div key={penaltyKey} className="flex items-center justify-between gap-4 p-2.5 bg-red-950/15 rounded-lg border border-red-500/10 text-red-400 font-mono">
                                        <span className="font-sans font-semibold text-left">{penaltyLabel}</span>
                                        <span className="font-bold">-5 Points</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Boundary and Weaknesses */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-slate-800/60">
                              <div className="space-y-1 bg-slate-900/30 p-3 rounded-lg border border-slate-900">
                                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Factual Preservations</span>
                                <p className="font-sans text-xs text-slate-300">
                                  {evalItem.factPreserved ? '✓ Strict factual source boundaries successfully respected and preserved.' : '✗ Potential factual drifting. Verification recommended.'}
                                </p>
                              </div>

                              <div className="space-y-1 bg-slate-900/30 p-3 rounded-lg border border-slate-900">
                                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Credibility Risk</span>
                                <p className="font-sans text-xs text-slate-300">
                                  {evalItem.credibilityRiskDetails || '✓ No outstanding technical, product, or company credibility risks.'}
                                </p>
                              </div>

                              <div className="space-y-1 sm:col-span-2">
                                <span className="text-[10px] font-mono font-bold uppercase text-red-400 tracking-wider">Major Weakness Quote</span>
                                <p className="font-sans text-xs text-slate-300 leading-relaxed italic bg-slate-900/30 p-3 rounded-lg border border-slate-900">
                                  "{evalItem.weakness}"
                                </p>
                              </div>

                              <div className="space-y-1 sm:col-span-2">
                                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider">Improvement Action Recommendation</span>
                                <p className="font-sans text-xs text-slate-200 leading-relaxed font-semibold bg-slate-900/30 p-3 rounded-lg border border-slate-900">
                                  "{evalItem.recommendation}"
                                </p>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Live AI Research Test Card */}
      <div 
        id="live-research-card"
        className="bg-[#0f172a] border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-10 space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden"
      >
        {/* Glowing background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/60 relative z-10">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-600/10 text-fuchsia-400 border border-fuchsia-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Search className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-0.5 text-left">
              <h3 className="text-lg md:text-xl font-sans font-bold text-white tracking-tight">
                Live AI Research Test
              </h3>
              <p className="text-slate-400 font-sans text-xs md:text-sm leading-normal">
                Find one important recent AI development and explain why it matters to LinkedIn professionals.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Display Area */}
        {researchStatus === 'searching' && (
          <div 
            id="research-loading-state" 
            className="py-12 flex flex-col items-center justify-center space-y-4 text-center relative z-10"
          >
            <div className="w-14 h-14 rounded-full border-4 border-fuchsia-600/10 border-t-fuchsia-500 animate-spin flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-fuchsia-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-200 font-sans font-semibold text-base">
                Searching for a reliable AI development…
              </p>
              <p className="text-slate-500 font-sans text-xs">
                Querying official company announcements and tech publications via Google Search grounding
              </p>
            </div>
          </div>
        )}

        {researchStatus === 'error' && researchError && (
          <div 
            id="research-error-state" 
            className="p-5 sm:p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 text-left relative z-10"
          >
            <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-sm font-sans font-bold text-red-400">Research Failed</h4>
              <p className="text-xs sm:text-sm font-sans text-red-300 leading-relaxed">
                {researchError}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRunResearch}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Live Research</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {researchStatus === 'idle' && !researchResult && (
          <div 
            id="research-idle-state"
            className="py-10 flex flex-col items-center justify-center text-center space-y-6 relative z-10"
          >
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <Newspaper className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md">
              <h4 className="text-base font-sans font-bold text-slate-200">Initiate Live Research</h4>
              <p className="text-xs sm:text-sm font-sans text-slate-400 leading-relaxed">
                Analyze AI developments from the last 72 hours (up to 7 days if required) with Google Search grounding, ensuring high credibility and zero hallucination.
              </p>
            </div>
          </div>
        )}

        {researchStatus === 'success' && researchResult && (
          <div 
            id="research-result-container"
            className="space-y-6 relative z-10 animate-in fade-in slide-in-from-top-4 duration-300 text-left"
          >
            {researchResult.status === 'no_reliable_result' ? (
              <div className="p-5 sm:p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-sans font-bold text-amber-400">Notice</h4>
                  <p className="text-xs sm:text-sm font-sans text-amber-300 leading-relaxed">
                    No sufficiently reliable AI development was found in the selected time window. Try again later.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Headline Section */}
                <div className="bg-slate-950/40 p-4 sm:p-6 rounded-2xl border border-slate-800/80 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {researchResult.category && (
                      <span className="bg-fuchsia-600/10 border border-fuchsia-500/20 text-fuchsia-400 text-[10px] sm:text-xs font-mono font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {researchResult.category}
                      </span>
                    )}
                    {researchResult.freshness && (
                      <span className="bg-slate-800/80 border border-slate-700/50 text-slate-300 text-[10px] sm:text-xs font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {researchResult.freshness}
                      </span>
                    )}
                    {researchResult.developmentDate && (
                      <span className="bg-slate-800/80 border border-slate-700/50 text-slate-300 text-[10px] sm:text-xs font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {researchResult.developmentDate}
                      </span>
                    )}
                    {researchResult.sourceConfidence && (
                      <span className={`border text-[10px] sm:text-xs font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        researchResult.sourceConfidence === 'High' 
                          ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400' 
                          : researchResult.sourceConfidence === 'Medium'
                          ? 'bg-amber-600/10 border-amber-500/20 text-amber-400'
                          : 'bg-rose-600/10 border-rose-500/20 text-rose-400'
                      }`}>
                        <Award className="w-3 h-3" />
                        Confidence: {researchResult.sourceConfidence}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xl sm:text-2xl font-sans font-bold text-white tracking-tight leading-tight">
                    {researchResult.headline}
                  </h4>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* What Happened */}
                  <div className="bg-slate-950/20 border border-slate-800/40 p-5 rounded-2xl space-y-2 md:col-span-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">What Happened</span>
                    <p className="text-sm font-sans text-slate-200 leading-relaxed">
                      {researchResult.whatHappened}
                    </p>
                  </div>

                  {/* Why It Matters */}
                  <div className="bg-slate-950/20 border border-slate-800/40 p-5 rounded-2xl space-y-2 md:col-span-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 font-semibold text-fuchsia-400/80">Why It Matters to Professionals</span>
                    <p className="text-sm font-sans text-slate-200 leading-relaxed">
                      {researchResult.whyItMatters}
                    </p>
                  </div>

                  {/* Who Is Affected */}
                  <div className="bg-slate-950/20 border border-slate-800/40 p-5 rounded-2xl space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Who is Affected</span>
                    <ul className="space-y-1.5 pt-1">
                      {researchResult.whoIsAffected?.map((affected, i) => (
                        <li key={i} className="text-sm font-sans text-slate-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full mt-1.5 flex-shrink-0" />
                          <span>{affected}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Practical Application */}
                  <div className="bg-slate-950/20 border border-slate-800/40 p-5 rounded-2xl space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Practical Application</span>
                    <p className="text-sm font-sans text-slate-300 leading-relaxed">
                      {researchResult.practicalApplication}
                    </p>
                  </div>

                  {/* Limitations or Uncertainty */}
                  <div className="bg-slate-950/20 border border-slate-800/40 p-5 rounded-2xl space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Limitations or Uncertainty</span>
                    <p className="text-sm font-sans text-slate-300 leading-relaxed">
                      {researchResult.limitationsOrUncertainty}
                    </p>
                  </div>

                  {/* LinkedIn Opportunity */}
                  <div className="bg-slate-950/20 border border-slate-800/40 p-5 rounded-2xl space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">LinkedIn Content Opportunity</span>
                    <p className="text-sm font-sans text-slate-300 leading-relaxed">
                      {researchResult.linkedInOpportunity}
                    </p>
                  </div>

                  {/* Grounded Sources */}
                  <div className="bg-slate-950/30 border border-slate-800/60 p-5 rounded-2xl space-y-3 md:col-span-2">
                    <div className="flex items-center gap-2 text-slate-400 pb-1 border-b border-slate-800/50">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider">Grounded Sources</span>
                    </div>
                    <div className="space-y-3">
                      {researchResult.sources?.map((src, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-900/80">
                          <div className="space-y-1">
                            <h5 className="text-sm font-sans font-bold text-white leading-tight">
                              {src.title}
                            </h5>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>{src.publisher}</span>
                              <span>•</span>
                              <span>{src.publishedDate}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded">
                              {src.sourceType}
                            </span>
                            <a 
                              href={src.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              referrerPolicy="no-referrer"
                              className="p-1.5 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
                              title="Visit Source"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Save and Create Idea actions */}
                <div className="pt-6 border-t border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handleSaveResearch}
                    className="w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer text-center"
                  >
                    <Bookmark className="w-4 h-4 flex-shrink-0" />
                    <span>Save Research Result</span>
                  </button>

                  {researchResult.status === 'found' && researchResult.sources && researchResult.sources.length > 0 && (
                    <button
                      type="button"
                      id="btn-create-grounded-idea"
                      disabled={groundedStatus === 'generating'}
                      onClick={() => handleCreateGroundedIdea(false)}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer text-center select-none"
                    >
                      <Sparkles className="w-4 h-4 flex-shrink-0 animate-pulse text-yellow-300" />
                      <span>Create LinkedIn Idea From This Research</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trigger Button Row */}
        <div className="pt-6 border-t border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 w-full">
          <button
            type="button"
            id="btn-research-development"
            onClick={handleRunResearch}
            disabled={researchStatus === 'searching'}
            className={`w-full sm:w-auto px-6 py-3.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer text-center select-none ${
              researchStatus === 'searching' ? 'opacity-55 cursor-not-allowed' : ''
            }`}
          >
            {researchStatus === 'searching' ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span>Searching Grounded Web...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 flex-shrink-0 animate-pulse text-yellow-300" />
                <span>{researchResult ? 'Research Another Development' : 'Research One AI Development'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Saved Research Display Panel */}
      {savedResearch && (
        <div 
          id="saved-research-panel"
          className="bg-slate-950/40 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-10 space-y-6 text-left relative overflow-hidden animate-in fade-in duration-300"
        >
          {/* header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-sans font-bold text-white tracking-tight">
                Saved AI Research Result
              </h3>
            </div>
            {savedResearch.savedAt && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Saved at {new Date(savedResearch.savedAt).toLocaleTimeString()} {new Date(savedResearch.savedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {savedResearch.status === 'found' && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {savedResearch.category && (
                  <span className="bg-fuchsia-600/10 border border-fuchsia-500/20 text-fuchsia-400 text-[10px] font-mono font-semibold px-2 py-0.5 rounded uppercase tracking-wider">
                    {savedResearch.category}
                  </span>
                )}
                {savedResearch.freshness && (
                  <span className="bg-slate-800/80 border border-slate-700/50 text-slate-300 text-[10px] font-mono font-semibold px-2 py-0.5 rounded">
                    {savedResearch.freshness}
                  </span>
                )}
                {savedResearch.developmentDate && (
                  <span className="bg-slate-800/80 border border-slate-700/50 text-slate-300 text-[10px] font-mono font-semibold px-2 py-0.5 rounded">
                    {savedResearch.developmentDate}
                  </span>
                )}
              </div>

              <h4 className="text-lg font-sans font-bold text-white tracking-tight">
                {savedResearch.headline}
              </h4>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">What Happened</span>
                <p className="text-sm font-sans text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-900">
                  {savedResearch.whatHappened}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Why It Matters</span>
                <p className="text-sm font-sans text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-900">
                  {savedResearch.whyItMatters}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Who is Affected</span>
                  <ul className="space-y-1 pt-1">
                    {savedResearch.whoIsAffected?.map((affected, i) => (
                      <li key={i} className="text-sm font-sans text-slate-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>{affected}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Practical Application</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">{savedResearch.practicalApplication}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Limitations or Uncertainty</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">{savedResearch.limitationsOrUncertainty}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">LinkedIn Content Opportunity</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">{savedResearch.linkedInOpportunity}</p>
                </div>
              </div>

              {/* Sources */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Grounded Sources</span>
                <div className="space-y-2">
                  {savedResearch.sources?.map((src, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 p-2.5 bg-slate-950/60 rounded-lg border border-slate-900">
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-sans font-bold text-white leading-normal">
                          {src.title}
                        </h5>
                        <p className="text-[10px] text-slate-500">
                          {src.publisher} • {src.publishedDate}
                        </p>
                      </div>
                      <a 
                        href={src.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        referrerPolicy="no-referrer"
                        className="p-1 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action footer */}
          <div className="pt-4 border-t border-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <button
              onClick={handleDeleteSavedResearch}
              className="px-4 py-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Delete Saved Research</span>
            </button>

            {savedResearch.status === 'found' && savedResearch.sources && savedResearch.sources.length > 0 && (
              <button
                type="button"
                id="btn-create-grounded-idea-saved"
                disabled={groundedStatus === 'generating'}
                onClick={() => handleCreateGroundedIdea(false)}
                className="px-5 py-2.5 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all shadow-lg text-xs flex items-center justify-center gap-2 cursor-pointer select-none"
              >
                <Sparkles className="w-4 h-4 flex-shrink-0 animate-pulse text-yellow-300" />
                <span>Create LinkedIn Idea From This Research</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grounded Idea Generation Loading / Error states */}
      {groundedStatus === 'generating' && (
        <div 
          id="grounded-idea-loading"
          className="bg-[#0f172a] border border-slate-800 rounded-2xl sm:rounded-3xl p-8 text-center space-y-4 animate-pulse relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-600/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
          <div className="w-12 h-12 rounded-full border-4 border-fuchsia-600/10 border-t-fuchsia-500 animate-spin flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5 text-fuchsia-400" />
          </div>
          <div className="space-y-1">
            <p className="text-slate-200 font-sans font-semibold">Turning verified research into a LinkedIn idea…</p>
            <p className="text-slate-500 font-sans text-xs">Aligning with audience settings, applying constraints and preventing duplicate angles</p>
          </div>
        </div>
      )}

      {groundedStatus === 'error' && groundedError && (
        <div 
          id="grounded-idea-error"
          className="p-5 sm:p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 text-left"
        >
          <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="text-sm font-sans font-bold text-red-400">Generation Failed</h4>
            <p className="text-xs sm:text-sm font-sans text-red-300 leading-relaxed">
              {groundedError}
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleCreateGroundedIdea(false)}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Generation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grounded LinkedIn Idea Display Card */}
      {groundedIdea && (
        <div 
          id="grounded-idea-card"
          className="bg-[#0b1329] border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-10 space-y-8 shadow-2xl relative overflow-hidden"
        >
          {/* Glowing background accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/60 relative z-10">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-xl bg-pink-600/10 text-pink-400 border border-pink-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                <Lightbulb className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-0.5 text-left">
                <h3 className="text-lg md:text-xl font-sans font-bold text-white tracking-tight">
                  Grounded LinkedIn Idea
                </h3>
                <p className="text-slate-400 font-sans text-xs md:text-sm">
                  Factual AI development paired with customized strategic commentary.
                </p>
              </div>
            </div>
          </div>

          {/* Metadata Pills */}
          <div className="flex flex-wrap gap-2.5">
            <span className="bg-fuchsia-600/10 border border-fuchsia-500/20 text-fuchsia-400 text-[10px] sm:text-xs font-mono font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-fuchsia-400" />
              Audience: {groundedIdea.primaryAudience}
            </span>
            <span className="bg-pink-600/10 border border-pink-500/20 text-pink-400 text-[10px] sm:text-xs font-mono font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-pink-400" />
              Pillar: {groundedIdea.contentPillar}
            </span>
            <span className="bg-slate-850 border border-slate-800 text-slate-300 text-[10px] sm:text-xs font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-slate-400" />
              Format: {groundedIdea.recommendedFormat}
            </span>
            <span className="bg-slate-850 border border-slate-800 text-slate-300 text-[10px] sm:text-xs font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              Growth: {groundedIdea.growthMechanism}
            </span>
          </div>

          {/* Grid Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            
            {/* Title & Hook */}
            <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-850 space-y-4 md:col-span-2">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Proposed Idea Title</span>
                <h4 className="text-lg font-sans font-bold text-white tracking-tight leading-normal">
                  {groundedIdea.title}
                </h4>
              </div>
              <div className="space-y-1 pt-1 border-t border-slate-900">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-fuchsia-400/80">Suggested Hook (Editorial interpretation)</span>
                <p className="text-sm font-sans font-medium text-slate-200 italic leading-relaxed pl-3 border-l-2 border-fuchsia-500">
                  "{groundedIdea.suggestedHook}"
                </p>
              </div>
            </div>

            {/* VERIFIED FACTS SECTION */}
            <div className="bg-blue-950/10 border border-blue-500/20 p-5 rounded-2xl md:col-span-2 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-500/10">
                <span className="bg-blue-600/20 text-blue-400 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  Verified facts
                </span>
                <span className="text-xs text-slate-400">Strict boundaries of underlying source research</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Research Development Used</span>
                  <p className="text-sm font-sans font-bold text-white leading-relaxed">
                    {groundedIdea.researchHeadline}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Factual Boundary</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">
                    {groundedIdea.factBoundary}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Uncertainty or Limitations to Mention</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">
                    {groundedIdea.uncertaintyToMention}
                  </p>
                </div>
              </div>
            </div>

            {/* EDITORIAL INTERPRETATION SECTION */}
            <div className="bg-purple-950/10 border border-purple-500/20 p-5 rounded-2xl md:col-span-2 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-purple-500/10">
                <span className="bg-purple-600/20 text-purple-400 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  Editorial interpretation
                </span>
                <span className="text-xs text-slate-400">Positioning, commentary and takeaways engineered for Rohit</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Core Angle</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">
                    {groundedIdea.coreAngle}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Professional Problem Address</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">
                    {groundedIdea.professionalProblem}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Reader Takeaway</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">
                    {groundedIdea.readerTakeaway}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Practical Value</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">
                    {groundedIdea.practicalValue}
                  </p>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Unique Angle</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">
                    {groundedIdea.uniqueAngle}
                  </p>
                </div>
              </div>
            </div>

            {/* Verified Sources references list */}
            <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-850 md:col-span-2 space-y-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Verified Sources Linked</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {groundedIdea.sourceReferences?.map((src, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <div className="space-y-0.5">
                      <p className="text-xs font-sans font-bold text-white truncate max-w-[200px]" title={src.title}>
                        {src.title}
                      </p>
                      <p className="text-[10px] text-slate-500">{src.publisher}</p>
                    </div>
                    <a 
                      href={src.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      referrerPolicy="no-referrer"
                      className="p-1.5 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors flex-shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grounded Idea Card footer buttons */}
          <div className="pt-6 border-t border-slate-850 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
            <button
              type="button"
              disabled={groundedStatus === 'generating'}
              onClick={() => handleCreateGroundedIdea(true)}
              className="w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer text-center select-none"
            >
              <RefreshCw className={`w-4 h-4 flex-shrink-0 ${groundedStatus === 'generating' ? 'animate-spin' : ''}`} />
              <span>Generate Another Angle</span>
            </button>

            <button
              type="button"
              onClick={handleSaveGroundedIdea}
              className="w-full sm:w-auto px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer text-center animate-pulse"
            >
              <Bookmark className="w-4 h-4 flex-shrink-0" />
              <span>Save Grounded Idea</span>
            </button>
          </div>
        </div>
      )}

      {/* Saved Grounded LinkedIn Idea Card */}
      {savedGroundedIdea && !groundedIdea && (
        <div 
          id="saved-grounded-idea-card"
          className="bg-[#0b1329]/60 border border-emerald-500/20 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-10 space-y-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/60 relative z-10">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                <BookmarkCheck className="w-6 h-6" />
              </div>
              <div className="space-y-0.5 text-left">
                <h3 className="text-lg md:text-xl font-sans font-bold text-white tracking-tight">
                  Saved Grounded LinkedIn Idea
                </h3>
                <p className="text-slate-400 font-sans text-xs md:text-sm">
                  Most recently saved source-grounded idea.
                </p>
              </div>
            </div>
          </div>

          {/* Metadata Pills */}
          <div className="flex flex-wrap gap-2.5">
            <span className="bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-mono font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Audience: {savedGroundedIdea.primaryAudience}
            </span>
            <span className="bg-pink-600/10 border border-pink-500/20 text-pink-400 text-[10px] sm:text-xs font-mono font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Pillar: {savedGroundedIdea.contentPillar}
            </span>
            <span className="bg-slate-850 border border-slate-800 text-slate-300 text-[10px] sm:text-xs font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Format: {savedGroundedIdea.recommendedFormat}
            </span>
            <span className="bg-slate-850 border border-slate-800 text-slate-300 text-[10px] sm:text-xs font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Growth: {savedGroundedIdea.growthMechanism}
            </span>
          </div>

          {/* Grid Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            
            {/* Title & Hook */}
            <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-850 space-y-4 md:col-span-2">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Proposed Idea Title</span>
                <h4 className="text-lg font-sans font-bold text-white tracking-tight leading-normal">
                  {savedGroundedIdea.title}
                </h4>
              </div>
              <div className="space-y-1 pt-1 border-t border-slate-900">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-fuchsia-400/80">Suggested Hook (Editorial interpretation)</span>
                <p className="text-sm font-sans font-medium text-slate-200 italic leading-relaxed pl-3 border-l-2 border-fuchsia-500">
                  "{savedGroundedIdea.suggestedHook}"
                </p>
              </div>
            </div>

            {/* VERIFIED FACTS SECTION */}
            <div className="bg-blue-950/10 border border-blue-500/20 p-5 rounded-2xl md:col-span-2 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-500/10">
                <span className="bg-blue-600/20 text-blue-400 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  Verified facts
                </span>
                <span className="text-xs text-slate-400">Strict boundaries of underlying source research</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Research Development Used</span>
                  <p className="text-sm font-sans font-bold text-white leading-relaxed">
                    {savedGroundedIdea.researchHeadline}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Factual Boundary</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">
                    {savedGroundedIdea.factBoundary}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Uncertainty or Limitations to Mention</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">
                    {savedGroundedIdea.uncertaintyToMention}
                  </p>
                </div>
              </div>
            </div>

            {/* EDITORIAL INTERPRETATION SECTION */}
            <div className="bg-purple-950/10 border border-purple-500/20 p-5 rounded-2xl md:col-span-2 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-purple-500/10">
                <span className="bg-purple-600/20 text-purple-400 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  Editorial interpretation
                </span>
                <span className="text-xs text-slate-400">Positioning, commentary and takeaways engineered for Rohit</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Core Angle</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">
                    {savedGroundedIdea.coreAngle}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Professional Problem Address</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">
                    {savedGroundedIdea.professionalProblem}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Reader Takeaway</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">
                    {savedGroundedIdea.readerTakeaway}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Practical Value</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">
                    {savedGroundedIdea.practicalValue}
                  </p>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Unique Angle</span>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed">
                    {savedGroundedIdea.uniqueAngle}
                  </p>
                </div>
              </div>
            </div>

            {/* Verified Sources references list */}
            <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-850 md:col-span-2 space-y-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Verified Sources Linked</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {savedGroundedIdea.sourceReferences?.map((src, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <div className="space-y-0.5">
                      <p className="text-xs font-sans font-bold text-white truncate max-w-[200px]" title={src.title}>
                        {src.title}
                      </p>
                      <p className="text-[10px] text-slate-500">{src.publisher}</p>
                    </div>
                    <a 
                      href={src.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      referrerPolicy="no-referrer"
                      className="p-1.5 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors flex-shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Saved Grounded Idea Card footer buttons */}
          <div className="pt-4 border-t border-slate-800/40 flex items-center justify-end w-full">
            <button
              onClick={handleDeleteSavedGroundedIdea}
              className="px-4 py-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Delete Saved Grounded Idea</span>
            </button>
          </div>
        </div>
      )}

      {/* Generator Control Card */}
      <div 
        id="ideas-generator-card"
        className="bg-[#0f172a] border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-10 space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden"
      >
        {/* Glowing background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/60 relative z-10">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Lightbulb className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-0.5 text-left">
              <h3 className="text-lg md:text-xl font-sans font-bold text-white tracking-tight">
                Today’s AI Idea Test
              </h3>
              <p className="text-slate-400 font-sans text-xs md:text-sm leading-normal">
                Generate one useful AI-focused LinkedIn post idea based on your saved creator profile.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Display Area based on state */}
        {status === 'generating' && (
          <div 
            id="generator-loading-state" 
            className="py-12 flex flex-col items-center justify-center space-y-4 text-center relative z-10"
          >
            <div className="w-14 h-14 rounded-full border-4 border-blue-600/10 border-t-blue-500 animate-spin flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-blue-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-200 font-sans font-semibold text-base">
                Creating an idea for your audience…
              </p>
              <p className="text-slate-500 font-sans text-xs">
                Refining blueprint against content pillars and voice restrictions
              </p>
            </div>
          </div>
        )}

        {status === 'error' && errorMessage && (
          <div 
            id="generator-error-state" 
            className="p-5 sm:p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 text-left relative z-10"
          >
            <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-sm font-sans font-bold text-red-400">Generation Failed</h4>
              <p className="text-xs sm:text-sm font-sans text-red-300 leading-relaxed">
                {errorMessage}
              </p>
              <div className="pt-2">
                <button
                  onClick={handleGenerateIdea}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Idea Generation</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Initial Empty State (if idle and no active generated idea is loaded) */}
        {status === 'idle' && !generatedIdea && (
          <div 
            id="generator-idle-state"
            className="py-10 flex flex-col items-center justify-center text-center space-y-6 relative z-10"
          >
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md">
              <h4 className="text-base font-sans font-bold text-slate-200">Ready to engineer AI hooks?</h4>
              <p className="text-xs sm:text-sm font-sans text-slate-400 leading-relaxed">
                Click the generate button below. The system will consult your custom positioning, primary audiences, active AI pillars, and negative topics/phrases lists to build an optimized post idea.
              </p>
            </div>
          </div>
        )}

        {/* Generated Idea Result Card */}
        {status === 'success' && generatedIdea && (
          <div 
            id="generator-result-card"
            className="space-y-6 relative z-10 animate-in fade-in slide-in-from-top-4 duration-300"
          >
            {/* Header section of blueprint */}
            <div className="bg-slate-950/40 p-4 sm:p-6 rounded-2xl border border-slate-800/80 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] sm:text-xs font-mono font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {generatedIdea.contentPillar}
                </span>
                <span className="bg-slate-800/80 border border-slate-700/50 text-slate-300 text-[10px] sm:text-xs font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  {generatedIdea.recommendedFormat}
                </span>
              </div>
              <h4 className="text-xl sm:text-2xl font-sans font-bold text-white tracking-tight leading-tight">
                {generatedIdea.title}
              </h4>
            </div>

            {/* Bento Grid Layout of Blueprint Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              
              {/* Core Idea Column */}
              <div className="bg-slate-950/20 border border-slate-800/40 p-5 rounded-2xl space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-blue-400/80">
                  <BrainCircuit className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">The Core AI Idea</span>
                </div>
                <p className="text-sm font-sans text-slate-200 leading-relaxed">
                  {generatedIdea.coreIdea}
                </p>
              </div>

              {/* Target Audience */}
              <div className="bg-slate-950/20 border border-slate-800/40 p-5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">Target Audience</span>
                </div>
                <p className="text-sm font-sans text-slate-300">
                  {generatedIdea.primaryAudience}
                </p>
              </div>

              {/* Expected Growth Mechanism */}
              <div className="bg-slate-950/20 border border-slate-800/40 p-5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <TrendingUp className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">Growth Trigger</span>
                </div>
                <p className="text-sm font-sans text-slate-300">
                  {generatedIdea.expectedGrowthMechanism}
                </p>
              </div>

              {/* Problem Solved */}
              <div className="bg-slate-950/20 border border-slate-800/40 p-5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <HelpCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">Problem Solved</span>
                </div>
                <p className="text-sm font-sans text-slate-300 leading-relaxed">
                  {generatedIdea.problemSolved}
                </p>
              </div>

              {/* Why Useful */}
              <div className="bg-slate-950/20 border border-slate-800/40 p-5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">Why It is Useful</span>
                </div>
                <p className="text-sm font-sans text-slate-300 leading-relaxed">
                  {generatedIdea.whyUseful}
                </p>
              </div>

              {/* Suggested Hook */}
              <div className="bg-slate-950/40 border border-blue-900/30 p-5 rounded-2xl space-y-3 md:col-span-2">
                <div className="flex items-center gap-2 text-blue-400">
                  <MessageSquareQuote className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">Suggested Post Hook</span>
                </div>
                <p className="text-sm font-mono font-medium text-slate-100 bg-slate-950/80 p-3.5 rounded-xl border border-slate-850 select-all leading-normal">
                  "{generatedIdea.suggestedHook}"
                </p>
              </div>

              {/* Unique Angle */}
              <div className="bg-slate-950/20 border border-slate-800/40 p-5 rounded-2xl space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <Sparkles className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">Unique Angle</span>
                </div>
                <p className="text-sm font-sans italic text-slate-300 leading-relaxed">
                  {generatedIdea.uniqueAngle}
                </p>
              </div>

            </div>

            {/* Generated Idea Specific Actions */}
            <div className="pt-6 border-t border-slate-850 flex flex-col sm:flex-row items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={handleSaveIdea}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <Bookmark className="w-4 h-4 flex-shrink-0" />
                <span>Save Idea</span>
              </button>
            </div>
          </div>
        )}

        {/* Trigger Button Row (for generation) */}
        <div className="pt-6 border-t border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 w-full">
          <button
            type="button"
            id="btn-generate-idea"
            onClick={handleGenerateIdea}
            disabled={status === 'generating'}
            className={`w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer text-center select-none ${
              status === 'generating' ? 'opacity-55 cursor-not-allowed' : ''
            }`}
          >
            {status === 'generating' ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span>Creating Blueprint...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 flex-shrink-0 animate-pulse text-yellow-300" />
                <span>{generatedIdea ? 'Generate Another Idea' : 'Generate Test Idea'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Saved Idea Display Panel (persistent & restored on mount) */}
      {savedIdea && (
        <div 
          id="saved-idea-panel"
          className="bg-slate-950/40 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-10 space-y-6 text-left relative overflow-hidden animate-in fade-in duration-300"
        >
          {/* subtle header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-sans font-bold text-white tracking-tight">
                Saved AI Content Blueprint
              </h3>
            </div>
            {savedIdea.savedAt && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Saved at {new Date(savedIdea.savedAt).toLocaleTimeString()} {new Date(savedIdea.savedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <div className="space-y-5">
            {/* Title & tags */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-semibold px-2 py-0.5 rounded uppercase tracking-wider">
                  {savedIdea.contentPillar}
                </span>
                <span className="bg-slate-800/80 border border-slate-700/50 text-slate-300 text-[10px] font-mono font-semibold px-2 py-0.5 rounded">
                  {savedIdea.recommendedFormat}
                </span>
              </div>
              <h4 className="text-lg font-sans font-bold text-white tracking-tight">
                {savedIdea.title}
              </h4>
            </div>

            {/* Core Idea */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Core Idea</span>
              <p className="text-sm font-sans text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-900">
                {savedIdea.coreIdea}
              </p>
            </div>

            {/* Details Split Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Target Audience</span>
                <p className="text-sm font-sans text-slate-300">{savedIdea.primaryAudience}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Problem Solved</span>
                <p className="text-sm font-sans text-slate-300 leading-relaxed">{savedIdea.problemSolved}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Why Useful</span>
                <p className="text-sm font-sans text-slate-300 leading-relaxed">{savedIdea.whyUseful}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Expected Growth Trigger</span>
                <p className="text-sm font-sans text-slate-300">{savedIdea.expectedGrowthMechanism}</p>
              </div>
            </div>

            {/* Monospace hook preview */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 font-semibold">Suggested Post Hook</span>
              <p className="text-xs sm:text-sm font-mono font-medium text-slate-200 bg-slate-950/80 p-3 rounded-lg border border-slate-850 leading-relaxed">
                "{savedIdea.suggestedHook}"
              </p>
            </div>

            {/* Unique Angle */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Unique Angle</span>
              <p className="text-sm font-sans italic text-slate-300 leading-relaxed">{savedIdea.uniqueAngle}</p>
            </div>
          </div>

          {/* Delete action footer */}
          <div className="pt-4 border-t border-slate-800/40 flex items-center justify-end w-full">
            <button
              onClick={handleDeleteSavedIdea}
              className="px-4 py-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Delete Saved Blueprint</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
