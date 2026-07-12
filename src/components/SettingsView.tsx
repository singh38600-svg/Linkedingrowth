import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Shield, 
  Save, 
  CheckCircle2, 
  Users, 
  Layers, 
  AlertCircle, 
  Sparkles, 
  Feather, 
  Gauge, 
  Ban, 
  Plus, 
  X,
  Globe,
  Activity,
  Cpu,
  Clock,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { CreatorProfile, GeminiConnectionStatus, GeminiConnectionResult, AuthenticatedUser, CloudSyncState, CloudSyncConflict, CloudResearchPreferences } from '../types';
import { DEFAULT_PREFERENCES, LOCAL_PREFS_KEY, LOCAL_PREFS_META_KEY, uploadToCloud, logSyncEvent, getSyncLog } from '../lib/syncEngine';
import { auth } from '../firebase';

interface SettingsViewProps {
  profile: CreatorProfile;
  onSave: (newProfile: CreatorProfile) => void;
  user: AuthenticatedUser | null;
  syncState: CloudSyncState;
  onTriggerSync: () => Promise<void>;
  onForceSync: (direction: 'upload' | 'download') => Promise<void>;
  activeConflict: CloudSyncConflict | null;
  onResolveConflict: (resolution: 'device' | 'cloud') => Promise<void>;
}

const AUDIENCES = [
  'Working professionals',
  'Recruiters and HR professionals',
  'Job seekers',
  'Founders',
  'Marketers',
  'Sales professionals',
  'Freelancers',
  'Creators',
  'No-code builders',
  'Vibe coders',
  'Indian professionals learning AI'
];

const PILLARS_LIST = [
  {
    key: 'Practical AI Workflows',
    title: 'Practical AI Workflows',
    description: 'Useful AI systems that help professionals save time, research, write, communicate or automate work.'
  },
  {
    key: 'AI Tools Explained',
    title: 'AI Tools Explained',
    description: 'Tool discoveries, comparisons, useful features, free alternatives and honest limitations.'
  },
  {
    key: 'AI News for Professionals',
    title: 'AI News for Professionals',
    description: 'Important AI developments explained through practical professional implications.'
  },
  {
    key: 'AI for Careers',
    title: 'AI for Careers',
    description: 'AI for job searching, resumes, interviews, learning and career growth.'
  },
  {
    key: 'AI for Recruitment and HR',
    title: 'AI for Recruitment and HR',
    description: 'AI for sourcing, screening, outreach, interviews and recruiter productivity.'
  },
  {
    key: 'Build in Public',
    title: 'Build in Public',
    description: 'Apps, experiments, failures and lessons from building with AI.'
  },
  {
    key: 'Vibe Coding and No-Code AI',
    title: 'Vibe Coding and No-Code AI',
    description: 'Building useful applications and workflows without traditional coding expertise.'
  },
  {
    key: 'AI Opinions and Lessons',
    title: 'AI Opinions and Lessons',
    description: 'Original observations, myths, predictions and evidence-based criticism.'
  }
];

const WRITING_STYLES_LIST = [
  'Conversational',
  'Practical',
  'Curious',
  'Direct',
  'Honest',
  'Educational',
  'Personal',
  'Concise',
  'Authoritative',
  'Story-driven',
  'Data-backed',
  'Beginner-friendly'
];

export default function SettingsView({ 
  profile, 
  onSave,
  user,
  syncState,
  onTriggerSync,
  onForceSync,
  activeConflict,
  onResolveConflict
}: SettingsViewProps) {
  const [formData, setFormData] = useState<CreatorProfile>({ ...profile });
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Warning states
  const [pillarWarning, setPillarWarning] = useState<string | null>(null);
  const [writingStyleWarning, setWritingStyleWarning] = useState<string | null>(null);

  // Dynamic tag inputs
  const [newPhrase, setNewPhrase] = useState('');
  const [newTopic, setNewTopic] = useState('');

  // Gemini Connection states
  const [connectionStatus, setConnectionStatus] = useState<GeminiConnectionStatus>('Not tested');
  const [lastTestedAt, setLastTestedAt] = useState<string | undefined>(undefined);
  const [modelName, setModelName] = useState<string>('gemini-3.5-flash');
  const [responseTime, setResponseTime] = useState<number | undefined>(undefined);
  const [isRestored, setIsRestored] = useState<boolean>(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(undefined);

  // OpenRouter Backup states
  const [orStatus, setOrStatus] = useState<'Not tested' | 'Testing' | 'Backup Active' | 'Configuration missing' | 'Connection failed'>('Not tested');
  const [orLastTestedAt, setOrLastTestedAt] = useState<string | undefined>(undefined);
  const [orModelName, setOrModelName] = useState<string>('openrouter/free');
  const [orResponseTime, setOrResponseTime] = useState<number | undefined>(undefined);
  const [orApiErrorMessage, setOrApiErrorMessage] = useState<string | undefined>(undefined);
  const [orIsRestored, setOrIsRestored] = useState<boolean>(false);

  // Morning Research Preferences States
  const [researchPrefs, setResearchPrefs] = useState<CloudResearchPreferences>({ ...DEFAULT_PREFERENCES });
  const [prefsSaveSuccess, setPrefsSaveSuccess] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_PREFS_KEY);
      if (saved) {
        setResearchPrefs(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load research preferences from local storage:', err);
    }
  }, []);

  // Restore Gemini connection state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('gemini_connection_details');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          setConnectionStatus(parsed.status || 'Not tested');
          setLastTestedAt(parsed.testedAt);
          setModelName(parsed.modelName || 'gemini-3.5-flash');
          setResponseTime(parsed.responseTimeMs);
          setIsRestored(true);
        }
      } catch (e) {
        console.error('Error loading gemini_connection_details from localStorage', e);
      }
    }

    const orSaved = localStorage.getItem('openrouter_connection_details');
    if (orSaved) {
      try {
        const parsed = JSON.parse(orSaved);
        if (parsed) {
          setOrStatus(parsed.status || 'Not tested');
          setOrLastTestedAt(parsed.testedAt);
          setOrModelName(parsed.modelName || 'openrouter/free');
          setOrResponseTime(parsed.responseTimeMs);
          setOrIsRestored(true);
        }
      } catch (e) {
        console.error('Error loading openrouter_connection_details from localStorage', e);
      }
    }
  }, []);

  const handleTestConnection = async () => {
    if (connectionStatus === 'Testing') return;

    setConnectionStatus('Testing');
    setApiErrorMessage(undefined);
    setIsRestored(false);

    try {
      const res = await fetch('/api/gemini/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data: GeminiConnectionResult = await res.json();
      
      let nextStatus: GeminiConnectionStatus = 'Connection failed';
      if (data.success) {
        nextStatus = 'Connected';
      } else {
        if (data.errorCategory === 'configuration_missing') {
          nextStatus = 'Configuration missing';
        } else if (data.errorCategory === 'unauthorized') {
          nextStatus = 'Connection failed';
        } else if (data.errorCategory === 'quota_exceeded') {
          nextStatus = 'Quota exceeded';
        } else if (data.errorCategory === 'model_unavailable') {
          nextStatus = 'Model unavailable';
        } else {
          nextStatus = 'Connection failed';
        }
      }

      setConnectionStatus(nextStatus);
      setLastTestedAt(data.testedAt || new Date().toISOString());
      setModelName(data.modelName || 'gemini-3.5-flash');
      setResponseTime(data.responseTimeMs);
      
      if (!data.success) {
        setApiErrorMessage(data.errorMessage);
      }

      // Save to localStorage
      const toSave = {
        status: nextStatus,
        testedAt: data.testedAt || new Date().toISOString(),
        modelName: data.modelName || 'gemini-3.5-flash',
        responseTimeMs: data.responseTimeMs
      };
      localStorage.setItem('gemini_connection_details', JSON.stringify(toSave));

    } catch (err) {
      console.error('Connection test request failed', err);
      setConnectionStatus('Connection failed');
      const defaultErrorMsg = 'The connection test could not be completed. Please try again.';
      setApiErrorMessage(defaultErrorMsg);
      setLastTestedAt(new Date().toISOString());
    }
  };

  const handleTestOpenRouterBackup = async () => {
    if (orStatus === 'Testing') return;

    setOrStatus('Testing');
    setOrApiErrorMessage(undefined);
    setOrIsRestored(false);

    try {
      const res = await fetch('/api/gemini/test-openrouter-backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      
      let nextStatus: typeof orStatus = 'Connection failed';
      if (data.success) {
        nextStatus = 'Backup Active';
      } else {
        if (data.errorCategory === 'configuration_missing') {
          nextStatus = 'Configuration missing';
        } else {
          nextStatus = 'Connection failed';
        }
      }

      setOrStatus(nextStatus);
      setOrLastTestedAt(data.testedAt || new Date().toISOString());
      setOrModelName(data.modelName || 'openrouter/free');
      setOrResponseTime(data.responseTimeMs);
      
      if (!data.success) {
        setOrApiErrorMessage(data.errorMessage);
      }

      // Save to localStorage
      const toSave = {
        status: nextStatus,
        testedAt: data.testedAt || new Date().toISOString(),
        modelName: data.modelName || 'openrouter/free',
        responseTimeMs: data.responseTimeMs
      };
      localStorage.setItem('openrouter_connection_details', JSON.stringify(toSave));

    } catch (err) {
      console.error('OpenRouter backup test failed', err);
      setOrStatus('Connection failed');
      setOrApiErrorMessage('The OpenRouter backup test could not be completed. Please try again.');
      setOrLastTestedAt(new Date().toISOString());
    }
  };

  // Profile Form Helpers
  const handlePillarToggle = (pillarKey: string) => {
    const isSelected = formData.contentPillars.includes(pillarKey);
    let updated: string[];

    if (isSelected) {
      updated = formData.contentPillars.filter(p => p !== pillarKey);
    } else {
      updated = [...formData.contentPillars, pillarKey];
    }

    if (updated.length < 2) {
      setPillarWarning('You must select at least 2 content pillars to maintain strategy variety.');
    } else if (updated.length > 4) {
      setPillarWarning('Selecting more than 4 pillars weakens content targeting. 2-4 is optimal.');
    } else {
      setPillarWarning(null);
    }

    setFormData({ ...formData, contentPillars: updated });
  };

  const handleStyleToggle = (style: string) => {
    const isSelected = formData.writingStyles.includes(style);
    let updated: string[];

    if (isSelected) {
      updated = formData.writingStyles.filter(s => s !== style);
    } else {
      updated = [...formData.writingStyles, style];
    }

    if (updated.length < 2) {
      setWritingStyleWarning('Select at least 2 writing styles to preserve natural, human-sounding variations.');
    } else if (updated.length > 5) {
      setWritingStyleWarning('Selecting more than 5 styles results in erratic, inconsistent tone outputs.');
    } else {
      setWritingStyleWarning(null);
    }

    setFormData({ ...formData, writingStyles: updated });
  };

  const handleAddPhrase = () => {
    const cleaned = newPhrase.trim().toLowerCase();
    if (!cleaned) return;

    if (formData.phrasesToAvoid.includes(cleaned)) {
      setNewPhrase('');
      return;
    }

    setFormData({
      ...formData,
      phrasesToAvoid: [...formData.phrasesToAvoid, cleaned]
    });
    setNewPhrase('');
  };

  const handlePhraseKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPhrase();
    }
  };

  const handleRemovePhrase = (phraseToRemove: string) => {
    setFormData({
      ...formData,
      phrasesToAvoid: formData.phrasesToAvoid.filter(p => p !== phraseToRemove)
    });
  };

  const handleAddTopic = () => {
    const cleaned = newTopic.trim();
    if (!cleaned) return;

    if (formData.topicsToAvoid.some(t => t.toLowerCase() === cleaned.toLowerCase())) {
      setNewTopic('');
      return;
    }

    setFormData({
      ...formData,
      topicsToAvoid: [...formData.topicsToAvoid, cleaned]
    });
    setNewTopic('');
  };

  const handleTopicKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTopic();
    }
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    setFormData({
      ...formData,
      topicsToAvoid: formData.topicsToAvoid.filter(t => t !== topicToRemove)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  // Morning Research Preferences Helpers
  const handleUpdatePrefsField = (field: keyof CloudResearchPreferences, value: any) => {
    setResearchPrefs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveResearchPrefs = async () => {
    setPrefsSaveSuccess(false);

    // Validate Minimums and Maximums
    if (researchPrefs.minimumDevelopmentCount < 3) {
      alert('Minimum developments count cannot be less than 3.');
      return;
    }
    if (researchPrefs.maximumDevelopmentCount > 5) {
      alert('Maximum developments count cannot be more than 5.');
      return;
    }
    if (researchPrefs.minimumDevelopmentCount > researchPrefs.maximumDevelopmentCount) {
      alert('Minimum developments cannot exceed Maximum developments.');
      return;
    }

    const nowStr = new Date().toISOString();
    const updatedPrefs = {
      ...researchPrefs,
      updatedAt: nowStr
    };

    try {
      // Save locally
      localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(updatedPrefs));
      localStorage.setItem(LOCAL_PREFS_META_KEY, JSON.stringify({
        schemaVersion: 'v1',
        updatedAt: nowStr,
        syncState: user ? 'Local changes pending' : 'Local only'
      }));

      // Upload to Cloud if Authenticated
      if (user) {
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          await uploadToCloud(idToken, 'researchPreferences', updatedPrefs);
          logSyncEvent('researchPreferences', 'Upload', 'Success', 'Manually saved and synchronized morning research preferences.');
        }
      }

      setPrefsSaveSuccess(true);
      setTimeout(() => setPrefsSaveSuccess(false), 4000);
      
      // Dispatch update event
      window.dispatchEvent(new Event('local-data-updated'));
    } catch (err: any) {
      console.error('Failed to save research preferences:', err);
      alert(`Preferences saved locally, but cloud sync failed: ${err.message || err}`);
    }
  };

  return (
    <div id="settings-view-root" className="space-y-10">
      {/* Title Header */}
      <div id="settings-title-header" className="flex flex-col gap-2 text-left">
        <h2 className="text-3xl font-sans font-extrabold text-white tracking-tight">
          System Settings
        </h2>
        <p className="text-slate-400 font-sans text-sm">
          Fine-tune the AI Engine's writing, content pillars, targeting thresholds and cloud synchronization.
        </p>
      </div>

      {/* Sync Conflict Resolution Section */}
      {activeConflict && (
        <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-6 mb-8 space-y-6 text-left">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-lg font-sans font-bold text-red-200">Sync Conflict Detected: {activeConflict.dataType}</h3>
              <p className="text-sm text-red-300">
                Your local device data and cloud database contain conflicting updates. Please compare and choose which copy to preserve.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Device Copy card */}
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs font-mono uppercase text-blue-400 font-bold">Device Copy (Local)</span>
                <span className="text-[10px] text-slate-500">
                  {activeConflict.deviceTimestamp ? new Date(activeConflict.deviceTimestamp).toLocaleString() : 'No timestamp'}
                </span>
              </div>
              <p className="text-xs text-slate-400">This is the copy stored on your current web browser.</p>
              <button
                onClick={() => onResolveConflict('device')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                Use Device Copy
              </button>
            </div>

            {/* Cloud Copy card */}
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs font-mono uppercase text-emerald-400 font-bold">Cloud Copy (Remote)</span>
                <span className="text-[10px] text-slate-500">
                  {activeConflict.cloudTimestamp ? new Date(activeConflict.cloudTimestamp).toLocaleString() : 'No timestamp'}
                </span>
              </div>
              <p className="text-xs text-slate-400">This is the copy stored securely in Cloud Firestore.</p>
              <button
                onClick={() => onResolveConflict('cloud')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                Use Cloud Copy (Preserves local copy as backup)
              </button>
            </div>
          </div>

          {activeConflict.differences && activeConflict.differences.length > 0 && (
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Detected Differences:</p>
              <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
                {activeConflict.differences.map((diff, index) => (
                  <li key={index}>{diff}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Main Settings Form */}
      <form 
        id="creator-profile-form" 
        onSubmit={handleSubmit}
        className="bg-[#0f172a] border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 space-y-10 shadow-2xl relative overflow-hidden"
      >
        {/* Banner graphic accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />

        {saveSuccess && (
          <div 
            id="profile-save-success-alert"
            className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-left"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <p className="text-sm font-sans font-medium">Your LinkedIn Creator Profile settings have been saved successfully.</p>
          </div>
        )}

        {/* Form Section 1: Basic Bio */}
        <div id="section-basic-bio" className="space-y-6">
          <div className="flex flex-col md:flex-row items-start gap-6 pb-6 border-b border-slate-800/60">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Sliders className="w-6 h-6" />
            </div>
            <div className="space-y-1 text-left w-full flex-1">
              <h3 className="text-xl font-sans font-bold text-white tracking-tight">
                Basic Biography
              </h3>
              <p className="text-slate-400 font-sans text-sm leading-relaxed">
                Provide your official biography details, URLs and headlines exactly as they appear on your profile.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="field-full-name" className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Full Name</label>
              <input
                id="field-full-name"
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Rohit Singh Panwar"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            {/* LinkedIn Profile URL */}
            <div className="space-y-2">
              <label htmlFor="field-linkedin-url" className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">LinkedIn Profile URL</label>
              <input
                id="field-linkedin-url"
                type="url"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            {/* LinkedIn Headline */}
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="field-linkedin-headline" className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">LinkedIn Headline</label>
              <input
                id="field-linkedin-headline"
                type="text"
                required
                value={formData.linkedinHeadline}
                onChange={(e) => setFormData({ ...formData, linkedinHeadline: e.target.value })}
                placeholder="Vibe Coder | Ex-Capital Markets | FinTech & Quick Commerce"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Form Section 2: Creator Positioning */}
        <div id="section-creator-positioning" className="space-y-6 pt-4">
          <div className="flex flex-col md:flex-row items-start gap-6 pb-6 border-b border-slate-800/60">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1 text-left w-full flex-1">
              <h3 className="text-xl font-sans font-bold text-white tracking-tight">
                Creator Positioning Statement
              </h3>
              <p className="text-slate-400 font-sans text-sm leading-relaxed">
                Explain who you are, what you write about, why it matters, and what value professionals gain by following your content.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-left">
            <label htmlFor="field-creator-positioning" className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Positioning Statement</label>
            <textarea
              id="field-creator-positioning"
              required
              rows={4}
              value={formData.creatorPositioning}
              onChange={(e) => setFormData({ ...formData, creatorPositioning: e.target.value })}
              placeholder="Explain your strategic mission, goals and value prop as a creator..."
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
            />
          </div>
        </div>

        {/* Form Section 3: Target Audience */}
        <div id="section-target-audience" className="space-y-6 pt-4">
          <div className="flex flex-col md:flex-row items-start gap-6 pb-6 border-b border-slate-800/60">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1 text-left w-full flex-1">
              <h3 className="text-xl font-sans font-bold text-white tracking-tight">
                Target Audience
              </h3>
              <p className="text-slate-400 font-sans text-sm leading-relaxed">
                Select your primary and secondary target audience segments to focus and ground all system content recommendations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Primary Audience */}
            <div className="space-y-2">
              <label htmlFor="field-primary-audience" className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Primary Audience Segment</label>
              <select
                id="field-primary-audience"
                value={formData.primaryAudience}
                onChange={(e) => {
                  const val = e.target.value;
                  const newSecondary = formData.secondaryAudiences.filter(a => a !== val);
                  setFormData({
                    ...formData,
                    primaryAudience: val,
                    secondaryAudiences: newSecondary
                  });
                }}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              >
                {AUDIENCES.map(aud => (
                  <option key={`primary-aud-${aud}`} value={aud}>{aud}</option>
                ))}
              </select>
            </div>

            {/* Secondary Audience */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Secondary Audience Segments</label>
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 text-left">
                {AUDIENCES.filter(aud => aud !== formData.primaryAudience).map(aud => {
                  const isChecked = formData.secondaryAudiences.includes(aud);
                  return (
                    <label key={`secondary-aud-lbl-${aud}`} className="flex items-center gap-2 text-xs font-sans text-slate-300 hover:text-slate-100 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const updated = isChecked
                            ? formData.secondaryAudiences.filter(a => a !== aud)
                            : [...formData.secondaryAudiences, aud];
                          setFormData({ ...formData, secondaryAudiences: updated });
                        }}
                        className="rounded border-slate-800 text-blue-600 focus:ring-blue-500/40 bg-slate-950"
                      />
                      <span>{aud}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Form Section 4: Content Pillars */}
        <div id="section-content-pillars" className="space-y-6 pt-4">
          <div className="flex flex-col md:flex-row items-start gap-6 pb-6 border-b border-slate-800/60">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div className="space-y-1 text-left w-full flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-sans font-bold text-white tracking-tight">
                  Content Pillars
                </h3>
                <span className="bg-blue-950 text-blue-400 border border-blue-900 text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold">
                  Select 2-4
                </span>
              </div>
              <p className="text-slate-400 font-sans text-sm leading-relaxed">
                Identify the core topics your profile writes about. Maintain strategic narrowness to keep authority strong.
              </p>
            </div>
          </div>

          {pillarWarning && (
            <div id="pillars-count-warning" className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl flex items-center gap-3 text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs font-sans font-medium">{pillarWarning}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {PILLARS_LIST.map((pillar) => {
              const isSelected = formData.contentPillars.includes(pillar.key);
              return (
                <button
                  key={`pillar-btn-${pillar.key}`}
                  type="button"
                  onClick={() => handlePillarToggle(pillar.key)}
                  className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isSelected 
                      ? 'bg-blue-600/10 border-blue-500/40 shadow-md shadow-blue-950/20' 
                      : 'bg-slate-950/30 border-slate-800 hover:border-slate-700 hover:bg-slate-950/60'
                  }`}
                >
                  <div className="space-y-1">
                    <p className={`text-sm font-sans font-bold ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>
                      {pillar.title}
                    </p>
                    <p className="text-xs text-slate-400 font-sans leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                  <div className="flex justify-end pt-3">
                    <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-slate-900 border border-slate-800 text-slate-500'
                    }`}>
                      {isSelected ? 'Selected' : 'Select'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Section 5: Writing Styles */}
        <div id="section-writing-styles" className="space-y-6 pt-4">
          <div className="flex flex-col md:flex-row items-start gap-6 pb-6 border-b border-slate-800/60">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Feather className="w-6 h-6" />
            </div>
            <div className="space-y-1 text-left w-full flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-sans font-bold text-white tracking-tight">
                  Writing Styles
                </h3>
                <span className="bg-blue-950 text-blue-400 border border-blue-900 text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold">
                  Select 2-5
                </span>
              </div>
              <p className="text-slate-400 font-sans text-sm leading-relaxed">
                Configure your writing voice parameters. The system balances selected styles deterministically.
              </p>
            </div>
          </div>

          {writingStyleWarning && (
            <div id="writing-styles-count-warning" className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl flex items-center gap-3 text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs font-sans font-medium">{writingStyleWarning}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 bg-slate-950/30 border border-slate-800/40 p-5 rounded-2xl text-left">
            {WRITING_STYLES_LIST.map((style) => {
              const isSelected = formData.writingStyles.includes(style);
              return (
                <button
                  key={`style-chip-${style}`}
                  type="button"
                  onClick={() => handleStyleToggle(style)}
                  className={`px-4 py-2 rounded-xl text-xs font-sans font-semibold border transition-all duration-200 cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' 
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {style}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Section 6: Tone Parameters */}
        <div id="section-tone-parameters" className="space-y-6 pt-4">
          <div className="flex flex-col md:flex-row items-start gap-6 pb-6 border-b border-slate-800/60">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Gauge className="w-6 h-6" />
            </div>
            <div className="space-y-1 text-left w-full flex-1">
              <h3 className="text-xl font-sans font-bold text-white tracking-tight">
                Tone & Detail Parameters
              </h3>
              <p className="text-slate-400 font-sans text-sm leading-relaxed">
                Adjust promotion depth, emotional intensities, and structural word-count detail limits.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Promotion Level */}
            <div className="space-y-2">
              <label htmlFor="field-promotion-level" className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Promotion Level</label>
              <select
                id="field-promotion-level"
                value={formData.promotionLevel}
                onChange={(e) => setFormData({ ...formData, promotionLevel: e.target.value as any })}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              >
                <option value="Low">Low (Educational first, minimal pitching)</option>
                <option value="Balanced">Balanced (Soft, contextual recommendations)</option>
                <option value="High">High (Direct recommendations, high conversions)</option>
              </select>
            </div>

            {/* Emotional Intensity */}
            <div className="space-y-2">
              <label htmlFor="field-emotional-intensity" className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Emotional Intensity</label>
              <select
                id="field-emotional-intensity"
                value={formData.emotionalIntensity}
                onChange={(e) => setFormData({ ...formData, emotionalIntensity: e.target.value as any })}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              >
                <option value="Calm">Calm (Neutral, logical, highly critical)</option>
                <option value="Balanced">Balanced (Passionate but measured)</option>
                <option value="Strong">Strong (Urgent, inspirational, bold assertions)</option>
              </select>
            </div>

            {/* Detail Level */}
            <div className="space-y-2">
              <label htmlFor="field-detail-level" className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Detail Level</label>
              <select
                id="field-detail-level"
                value={formData.detailLevel}
                onChange={(e) => setFormData({ ...formData, detailLevel: e.target.value as any })}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              >
                <option value="Concise">Concise (Short, crisp, bullet-focused)</option>
                <option value="Standard">Standard (Polished, standard LinkedIn length)</option>
                <option value="Detailed">Detailed (Deep dives, complete workflows)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Form Section 7: Phrases to Avoid */}
        <div id="section-phrases-to-avoid" className="space-y-6 pt-4">
          <div className="flex flex-col md:flex-row items-start gap-6 pb-6 border-b border-slate-800/60">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Ban className="w-6 h-6" />
            </div>
            <div className="space-y-1 text-left w-full flex-1">
              <h3 className="text-xl font-sans font-bold text-white tracking-tight">
                Phrases to Avoid
              </h3>
              <p className="text-slate-400 font-sans text-sm leading-relaxed">
                Add corporate buzzwords, generic advice phrases, or repetitive "LinkedIn growth" jargon you want strictly blocked.
              </p>
            </div>
          </div>

          {/* Tag add field */}
          <div id="phrases-adder-input" className="flex gap-3 max-w-lg text-left">
            <input
              type="text"
              value={newPhrase}
              onChange={(e) => setNewPhrase(e.target.value)}
              onKeyDown={handlePhraseKeyDown}
              placeholder="e.g. game changer"
              className="flex-1 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
            <button
              type="button"
              onClick={handleAddPhrase}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-sm font-sans font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Phrase</span>
            </button>
          </div>

          {/* Tags Display */}
          <div id="phrases-tags-list" className="flex flex-wrap gap-2 bg-slate-950/30 border border-slate-800/40 p-5 rounded-2xl text-left">
            {formData.phrasesToAvoid.length === 0 ? (
              <span className="text-xs font-sans text-slate-500 italic">No phrases currently blocked</span>
            ) : (
              formData.phrasesToAvoid.map((phrase) => (
                <span 
                  key={`phrase-tag-${phrase}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans bg-slate-950/80 text-slate-300 border border-slate-800 hover:border-red-500/40 hover:text-red-400 group transition-all"
                >
                  <span>{phrase}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePhrase(phrase)}
                    className="text-slate-500 group-hover:text-red-400 focus:outline-none transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Form Section 8: Topics to Avoid */}
        <div id="section-topics-to-avoid" className="space-y-6 pt-4">
          <div className="flex flex-col md:flex-row items-start gap-6 pb-6 border-b border-slate-800/60">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Ban className="w-6 h-6" />
            </div>
            <div className="space-y-1 text-left w-full flex-1">
              <h3 className="text-xl font-sans font-bold text-white tracking-tight">
                Topics to Avoid
              </h3>
              <p className="text-slate-400 font-sans text-sm leading-relaxed">
                Filter out general noise, unrelated discussions, or speculative subjects.
              </p>
            </div>
          </div>

          {/* Tag add field */}
          <div id="topics-adder-input" className="flex gap-3 max-w-lg text-left">
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={handleTopicKeyDown}
              placeholder="e.g. Politics"
              className="flex-1 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
            <button
              type="button"
              onClick={handleAddTopic}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-sm font-sans font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Topic</span>
            </button>
          </div>

          {/* Tags Display */}
          <div id="topics-tags-list" className="flex flex-wrap gap-2 bg-slate-950/30 border border-slate-800/40 p-5 rounded-2xl text-left">
            {formData.topicsToAvoid.length === 0 ? (
              <span className="text-xs font-sans text-slate-500 italic">No topics currently blocked</span>
            ) : (
              formData.topicsToAvoid.map((topic) => (
                <span 
                  key={`topic-tag-${topic}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans bg-slate-950/80 text-slate-300 border border-slate-800 hover:border-red-500/40 hover:text-red-400 group transition-all"
                >
                  <span>{topic}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTopic(topic)}
                    className="text-slate-500 group-hover:text-red-400 focus:outline-none transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Action Button & Disclaimer */}
        <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
          <div className="flex items-center gap-2 text-slate-500 text-left">
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-sans">Settings are backed up to cloud automatically when signed in.</span>
          </div>

          <button
            type="submit"
            id="btn-save-profile"
            className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 text-sm flex items-center justify-center gap-2 cursor-pointer text-center"
          >
            <Save className="w-4 h-4 flex-shrink-0" />
            <span>Save Profile</span>
          </button>
        </div>
      </form>

      {/* Morning Research Preferences Card */}
      <div 
        id="morning-research-preferences-card"
        className="bg-[#0f172a] border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 space-y-8 shadow-2xl relative overflow-hidden text-left"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
        <div className="flex flex-col md:flex-row items-start gap-6 pb-6 border-b border-slate-800/60 justify-between">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-sans font-bold text-white tracking-tight">
                Morning Research Preferences
              </h3>
              <p className="text-slate-400 font-sans text-sm leading-relaxed">
                Configure how the growth engine conducts automated morning industry research.
              </p>
            </div>
          </div>
        </div>

        {/* Preferences Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Enabled Toggle */}
          <div className="col-span-1 md:col-span-2 flex items-center justify-between p-4 bg-slate-950/40 rounded-xl border border-slate-800/60">
            <div className="space-y-0.5 pr-4">
              <p className="text-sm font-semibold text-slate-200">Enable Automated Morning Research</p>
              <p className="text-xs text-slate-400">Trigger smart content ideas gathering and source verification daily.</p>
            </div>
            <button
              type="button"
              onClick={() => handleUpdatePrefsField('researchEnabled', !researchPrefs.researchEnabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all ${
                researchPrefs.researchEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-750 justify-start'
              }`}
              style={{ minHeight: '30px', minWidth: '44px' }}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Time Zone */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Time Zone</label>
            <select
              value={researchPrefs.timeZone}
              onChange={(e) => handleUpdatePrefsField('timeZone', e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
            </select>
          </div>

          {/* Preferred Time */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Preferred Research Time</label>
            <input
              type="time"
              value={researchPrefs.preferredResearchTime}
              onChange={(e) => handleUpdatePrefsField('preferredResearchTime', e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Primary Research Window */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Primary Research Window</label>
            <select
              value={researchPrefs.primaryResearchWindow}
              onChange={(e) => handleUpdatePrefsField('primaryResearchWindow', e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="24 hours">24 hours</option>
              <option value="72 hours">72 hours</option>
              <option value="7 days">7 days</option>
            </select>
          </div>

          {/* Fallback Research Window */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Fallback Research Window</label>
            <select
              value={researchPrefs.fallbackResearchWindow}
              onChange={(e) => handleUpdatePrefsField('fallbackResearchWindow', e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="72 hours">72 hours</option>
              <option value="7 days">7 days</option>
              <option value="14 days">14 days</option>
            </select>
          </div>

          {/* Minimum developments */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Minimum Developments (Min 3)</label>
            <input
              type="number"
              min={3}
              max={5}
              value={researchPrefs.minimumDevelopmentCount}
              onChange={(e) => handleUpdatePrefsField('minimumDevelopmentCount', Math.max(3, parseInt(e.target.value) || 3))}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Maximum developments */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Maximum Developments (Max 5)</label>
            <input
              type="number"
              min={3}
              max={5}
              value={researchPrefs.maximumDevelopmentCount}
              onChange={(e) => handleUpdatePrefsField('maximumDevelopmentCount', Math.min(5, parseInt(e.target.value) || 5))}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {prefsSaveSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Automated research preferences saved successfully.</span>
          </div>
        )}

        <div className="pt-6 border-t border-slate-800/60 flex justify-end w-full">
          <button
            type="button"
            onClick={handleSaveResearchPrefs}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 text-sm flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Research Preferences</span>
          </button>
        </div>
      </div>

      {/* Cloud Synchronisation & Backups Card */}
      <div 
        id="cloud-sync-card"
        className="bg-[#0f172a] border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 space-y-8 shadow-2xl relative overflow-hidden text-left"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div className="flex flex-col md:flex-row items-start gap-6 pb-6 border-b border-slate-800/60 justify-between">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-sans font-bold text-white tracking-tight">
                Cloud Synchronisation & Backups
              </h3>
              <p className="text-slate-400 font-sans text-sm leading-relaxed">
                Securely backup your AI LinkedIn profile and preferences to your private cloud storage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800/80 mt-4 md:mt-0">
            <span className="text-xs font-mono text-slate-500 uppercase">Status:</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                syncState.status === 'In sync' ? 'bg-emerald-500' :
                syncState.status === 'Checking cloud' ? 'bg-blue-500 animate-pulse' :
                syncState.status === 'Local changes pending' ? 'bg-amber-500' :
                syncState.status === 'Sync conflict' ? 'bg-red-500' :
                syncState.status === 'Sync failed' ? 'bg-rose-500' :
                'bg-slate-500'
              }`} />
              <span className="text-xs font-sans font-semibold text-slate-200">{syncState.status}</span>
            </div>
          </div>
        </div>

        {!user ? (
          <div className="bg-blue-950/20 border border-blue-500/20 p-6 rounded-2xl space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              Google Sign-In is required to activate automated morning industry research and cloud backups. Your workspace data will remain on your local device until you sign in.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield className="w-4 h-4 text-slate-500" />
              <span>We do not read or write your personal LinkedIn credentials. Only minimum metadata is stored.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sync Control Buttons */}
            <div className="flex flex-wrap gap-4 pt-2">
              <button
                type="button"
                onClick={onTriggerSync}
                disabled={syncState.status === 'Checking cloud'}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${syncState.status === 'Checking cloud' ? 'animate-spin' : ''}`} />
                <span>Synchronise Now</span>
              </button>

              <button
                type="button"
                onClick={() => onForceSync('upload')}
                disabled={syncState.status === 'Checking cloud'}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
              >
                <CloudUpload className="w-4 h-4 text-blue-400" />
                <span>Force Upload (Local ➔ Cloud)</span>
              </button>

              <button
                type="button"
                onClick={() => onForceSync('download')}
                disabled={syncState.status === 'Checking cloud'}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
              >
                <CloudDownload className="w-4 h-4 text-emerald-400" />
                <span>Force Download (Cloud ➔ Local)</span>
              </button>
            </div>

            {/* Sync Log */}
            <div className="space-y-3 pt-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Sync History Log (Last 5 Events)</h4>
              <div className="bg-slate-950/40 border border-slate-850 rounded-xl overflow-hidden">
                {syncState.syncLog.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 text-center font-sans">No synchronization events recorded yet.</p>
                ) : (
                  <div className="divide-y divide-slate-850 font-mono text-xs">
                    {syncState.syncLog.slice(0, 5).map((log, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-2 hover:bg-slate-900/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 text-[10px] uppercase">{log.dataType}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            log.direction === 'Upload' ? 'text-blue-400 bg-blue-500/10' : 'text-emerald-400 bg-emerald-500/10'
                          }`}>{log.direction}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 truncate max-w-sm sm:max-w-md text-left font-sans">{log.summary}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            log.outcome === 'Success' ? 'text-emerald-400' : (log.outcome === 'Conflict' ? 'text-amber-400' : 'text-red-400')
                          }`}>{log.outcome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Privacy Shield Guard */}
            <div className="bg-slate-950/30 border border-slate-850 p-5 rounded-2xl space-y-3 pt-4 border-l-4 border-l-blue-500 font-sans">
              <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <span>Privacy & Security Safeguards</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Only minimum essential configuration parameters (Creator Profile settings, automated Morning Research preferences, and the latest research brief metadata) are synchronized to secure, private Firestore tables. 
                <strong className="text-slate-300 block mt-1.5 font-semibold">
                  We do not read or write your personal LinkedIn account credentials. No binary image files or carousel PDFs are uploaded to Firestore.
                </strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Gemini Connection Card */}
      <div 
        id="gemini-connection-card"
        className="bg-[#0f172a] border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 space-y-8 shadow-2xl relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row items-start gap-6 pb-6 border-b border-slate-800/60 justify-between">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div className="space-y-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-sans font-bold text-white tracking-tight">
                  Gemini Connection
                </h3>
                {isRestored && (
                  <span className="bg-slate-800/80 border border-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase tracking-wider">
                    Last test result
                  </span>
                )}
              </div>
              <p className="text-slate-400 font-sans text-sm leading-relaxed">
                Verify server-side connectivity to Google Gemini.
              </p>
            </div>
          </div>

          {/* Status Indicator Badge */}
          <div className="flex items-center gap-2 bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800/80 mt-4 md:mt-0">
            <span className="text-xs font-mono text-slate-500 uppercase">Status:</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                connectionStatus === 'Connected' ? 'bg-emerald-500 animate-pulse' :
                connectionStatus === 'Testing' ? 'bg-blue-500 animate-ping' :
                connectionStatus === 'Not tested' ? 'bg-slate-500' :
                'bg-red-500'
              }`} />
              <span className={`text-xs font-sans font-semibold ${
                connectionStatus === 'Connected' ? 'text-emerald-400' :
                connectionStatus === 'Testing' ? 'text-blue-400' :
                connectionStatus === 'Not tested' ? 'text-slate-400' :
                'text-red-400'
              }`}>
                {connectionStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Status Messaging Callouts */}
        {connectionStatus === 'Connected' && (
          <div 
            id="gemini-connected-success-alert"
            className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-left"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <p className="text-sm font-sans font-medium">Gemini is connected and ready.</p>
          </div>
        )}

        {apiErrorMessage && (
          <div 
            id="gemini-error-alert"
            className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 text-left"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
            <p className="text-sm font-sans font-medium leading-relaxed">{apiErrorMessage}</p>
          </div>
        )}

        {/* Gemini Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Model Display */}
          <div className="space-y-2 bg-slate-950/30 border border-slate-800/40 p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-500">
              <Cpu className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider">Current model</span>
            </div>
            <span className="text-sm font-mono font-semibold text-slate-200 mt-2">
              {modelName}
            </span>
          </div>

          {/* Response Time Display */}
          <div className="space-y-2 bg-slate-950/30 border border-slate-800/40 p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-500">
              <Activity className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider">Response time</span>
            </div>
            <span className="text-sm font-mono font-semibold text-slate-200 mt-2">
              {responseTime !== undefined ? `${responseTime} ms` : '—'}
            </span>
          </div>

          {/* Last Tested Display */}
          <div className="space-y-2 bg-slate-950/30 border border-slate-800/40 p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider">Last tested</span>
            </div>
            <span className="text-sm font-sans font-semibold text-slate-200 mt-2 text-left">
              {lastTestedAt ? `${new Date(lastTestedAt).toLocaleTimeString()} ${new Date(lastTestedAt).toLocaleDateString()}` : '—'}
            </span>
          </div>
        </div>

        {/* Test Button Section */}
        <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 w-full">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={connectionStatus === 'Testing'}
            className={`w-full sm:w-auto px-6 py-3.5 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer ${
              connectionStatus === 'Testing' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {connectionStatus === 'Testing' ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span className="truncate">Testing...</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Test Gemini Connection</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI Provider Backup Card */}
      <div 
        id="ai-provider-backup-card"
        className="bg-[#0f172a] border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 space-y-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-indigo-500" />
        <div className="flex flex-col md:flex-row items-start gap-6 pb-6 border-b border-slate-800/60 justify-between">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-sans font-bold text-white tracking-tight">
                  AI Provider Backup
                </h3>
                {orIsRestored && (
                  <span className="bg-slate-800/80 border border-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase tracking-wider">
                    Last test result
                  </span>
                )}
              </div>
              <p className="text-slate-400 font-sans text-sm leading-relaxed">
                Configure OpenRouter free models as an automatic backup whenever Gemini reaches its request limit.
              </p>
            </div>
          </div>

          {/* Status Indicator Badge */}
          <div className="flex items-center gap-2 bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800/80 mt-4 md:mt-0">
            <span className="text-xs font-mono text-slate-500 uppercase">Status:</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                orStatus === 'Backup Active' ? 'bg-indigo-500 animate-pulse' :
                orStatus === 'Testing' ? 'bg-blue-500 animate-ping' :
                orStatus === 'Not tested' ? 'bg-slate-500' :
                'bg-red-500'
              }`} />
              <span className={`text-xs font-sans font-semibold ${
                orStatus === 'Backup Active' ? 'text-indigo-400' :
                orStatus === 'Testing' ? 'text-blue-400' :
                orStatus === 'Not tested' ? 'text-slate-400' :
                'text-red-400'
              }`}>
                {orStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Status Messaging Callouts */}
        {orStatus === 'Backup Active' && (
          <div 
            id="openrouter-connected-success-alert"
            className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 p-4 rounded-xl flex items-center gap-3 text-left"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-indigo-400" />
            <p className="text-sm font-sans font-medium">OpenRouter backup is active and functional. It will automatically step in if Gemini fails.</p>
          </div>
        )}

        {orApiErrorMessage && (
          <div 
            id="openrouter-error-alert"
            className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 text-left"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
            <p className="text-sm font-sans font-medium leading-relaxed">{orApiErrorMessage}</p>
          </div>
        )}

        {/* OpenRouter Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Model Display */}
          <div className="space-y-2 bg-slate-950/30 border border-slate-800/40 p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-500">
              <Cpu className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider">Backup model</span>
            </div>
            <span className="text-sm font-mono font-semibold text-slate-200 mt-2">
              {orModelName}
            </span>
          </div>

          {/* Response Time Display */}
          <div className="space-y-2 bg-slate-950/30 border border-slate-800/40 p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-500">
              <Activity className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider">Response time</span>
            </div>
            <span className="text-sm font-mono font-semibold text-slate-200 mt-2">
              {orResponseTime !== undefined ? `${orResponseTime} ms` : '—'}
            </span>
          </div>

          {/* Last Tested Display */}
          <div className="space-y-2 bg-slate-950/30 border border-slate-800/40 p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider">Last tested</span>
            </div>
            <span className="text-sm font-sans font-semibold text-slate-200 mt-2 text-left">
              {orLastTestedAt ? `${new Date(orLastTestedAt).toLocaleTimeString()} ${new Date(orLastTestedAt).toLocaleDateString()}` : '—'}
            </span>
          </div>
        </div>

        {/* Test Button Section */}
        <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 w-full">
          <button
            type="button"
            onClick={handleTestOpenRouterBackup}
            disabled={orStatus === 'Testing'}
            className={`w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer ${
              orStatus === 'Testing' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {orStatus === 'Testing' ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span className="truncate">Testing Backup...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Test OpenRouter Backup</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
