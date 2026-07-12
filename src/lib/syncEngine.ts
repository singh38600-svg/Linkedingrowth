import { CreatorProfile, DailyResearchBrief, CloudSyncStatus, CloudSyncEvent, CloudSyncState, CloudCreatorProfile, CloudResearchPreferences, CloudDailyResearchBrief } from '../types';

export const LOCAL_PROFILE_KEY = 'ai_linkedin_creator_profile';
export const LOCAL_PROFILE_META_KEY = 'ai_linkedin_creator_profile_metadata';
export const LOCAL_BRIEF_KEY = 'saved_ai_research_brief';
export const LOCAL_BRIEF_META_KEY = 'saved_ai_research_brief_metadata';
export const LOCAL_PREFS_KEY = 'saved_morning_research_preferences';
export const LOCAL_PREFS_META_KEY = 'saved_morning_research_preferences_metadata';
export const SYNC_LOG_KEY = 'cloud_sync_log';

// Default Preferences
export const DEFAULT_PREFERENCES: CloudResearchPreferences = {
  researchEnabled: false,
  timeZone: 'Asia/Kolkata',
  preferredResearchTime: '06:00',
  primaryResearchWindow: '72 hours',
  fallbackResearchWindow: '7 days',
  minimumDevelopmentCount: 3,
  maximumDevelopmentCount: 5,
  updatedAt: new Date().toISOString(),
  schemaVersion: 'v1'
};

// 1. DENTIST-FINGERPRINTING FUNCTIONS
export function getProfileFingerprint(profile: Partial<CreatorProfile>): string {
  if (!profile) return '';
  const canonical = {
    fullName: profile.fullName || '',
    linkedinUrl: profile.linkedinUrl || '',
    linkedinHeadline: profile.linkedinHeadline || '',
    creatorPositioning: profile.creatorPositioning || '',
    primaryAudience: profile.primaryAudience || '',
    secondaryAudiences: [...(profile.secondaryAudiences || [])].sort(),
    contentPillars: [...(profile.contentPillars || [])].sort(),
    writingStyles: [...(profile.writingStyles || [])].sort(),
    promotionLevel: profile.promotionLevel || 'Low',
    emotionalIntensity: profile.emotionalIntensity || 'Balanced',
    detailLevel: profile.detailLevel || 'Standard',
    phrasesToAvoid: [...(profile.phrasesToAvoid || [])].sort(),
    topicsToAvoid: [...(profile.topicsToAvoid || [])].sort()
  };
  return JSON.stringify(canonical);
}

export function getPreferencesFingerprint(prefs: any): string {
  if (!prefs) return '';
  const canonical = {
    researchEnabled: !!prefs.researchEnabled,
    timeZone: prefs.timeZone || 'Asia/Kolkata',
    preferredResearchTime: prefs.preferredResearchTime || '06:00',
    primaryResearchWindow: prefs.primaryResearchWindow || '72 hours',
    fallbackResearchWindow: prefs.fallbackResearchWindow || '7 days',
    minimumDevelopmentCount: Number(prefs.minimumDevelopmentCount) || 3,
    maximumDevelopmentCount: Number(prefs.maximumDevelopmentCount) || 5
  };
  return JSON.stringify(canonical);
}

export function getBriefFingerprint(brief: Partial<DailyResearchBrief>): string {
  if (!brief) return '';
  const developments = (brief.developments || []).map((dev: any) => ({
    id: dev.id || '',
    headline: dev.headline || '',
    category: dev.category || '',
    whatHappened: dev.whatHappened || '',
    whyItMatters: dev.whyItMatters || '',
    sources: (dev.sources || []).map((src: any) => src.url || '').sort()
  }));

  const canonical = {
    researchedAt: brief.researchedAt || '',
    timeWindowUsed: brief.timeWindowUsed || '',
    summary: brief.summary || '',
    developments: developments
  };
  return JSON.stringify(canonical);
}

// Helper to check if two fingerprints match
export function isProfileMatching(p1: CreatorProfile, p2: CreatorProfile): boolean {
  return getProfileFingerprint(p1) === getProfileFingerprint(p2);
}

export function isPreferencesMatching(prefs1: any, prefs2: any): boolean {
  return getPreferencesFingerprint(prefs1) === getPreferencesFingerprint(prefs2);
}

export function isBriefMatching(b1: Partial<DailyResearchBrief>, b2: Partial<DailyResearchBrief>): boolean {
  return getBriefFingerprint(b1) === getBriefFingerprint(b2);
}

// 2. BACKWARDS-COMPATIBLE MIGRATION HELPER
export function runLocalDataMigration() {
  try {
    // Creator Profile migration
    const profileData = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (profileData) {
      const meta = localStorage.getItem(LOCAL_PROFILE_META_KEY);
      if (!meta) {
        const defaultMeta = {
          schemaVersion: 'v1',
          updatedAt: new Date().toISOString(),
          syncState: 'Local only'
        };
        localStorage.setItem(LOCAL_PROFILE_META_KEY, JSON.stringify(defaultMeta));
      }
    }

    // Daily Brief migration
    const briefData = localStorage.getItem(LOCAL_BRIEF_KEY);
    if (briefData) {
      const meta = localStorage.getItem(LOCAL_BRIEF_META_KEY);
      if (!meta) {
        const defaultMeta = {
          schemaVersion: 'v1',
          updatedAt: new Date().toISOString(),
          syncState: 'Local only'
        };
        localStorage.setItem(LOCAL_BRIEF_META_KEY, JSON.stringify(defaultMeta));
      }
    }

    // Preferences initialization
    const prefsData = localStorage.getItem(LOCAL_PREFS_KEY);
    if (!prefsData) {
      localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(DEFAULT_PREFERENCES));
      const defaultMeta = {
        schemaVersion: 'v1',
        updatedAt: new Date().toISOString(),
        syncState: 'Local only'
      };
      localStorage.setItem(LOCAL_PREFS_META_KEY, JSON.stringify(defaultMeta));
    }
  } catch (error) {
    console.error('Migration helper encountered an error:', error);
  }
}

// 3. LIGHTWEIGHT SYNC LOG (MAX 10 EVENTS)
export function getSyncLog(): CloudSyncEvent[] {
  try {
    const data = localStorage.getItem(SYNC_LOG_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function logSyncEvent(
  dataType: 'creatorProfile' | 'researchPreferences' | 'latestDailyBrief' | 'all',
  direction: 'Upload' | 'Download',
  outcome: 'Success' | 'Failure' | 'Conflict' | 'Cancelled',
  summary: string
) {
  try {
    const events = getSyncLog();
    const newEvent: CloudSyncEvent = {
      timestamp: new Date().toISOString(),
      dataType,
      direction,
      outcome,
      summary
    };
    
    // Put at start, limit to 10
    const updated = [newEvent, ...events].slice(0, 10);
    localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to log sync event:', e);
  }
}

// 4. API FETCH PROXIES
export async function uploadToCloud(
  idToken: string,
  dataType: 'creatorProfile' | 'researchPreferences' | 'latestDailyBrief',
  data: any
): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: idToken, dataType, data })
    });
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.errorMessage || `Server returned ${res.status}`);
    }
    
    const result = await res.json();
    return !!result.success;
  } catch (err: any) {
    console.error(`Failed to upload ${dataType} to cloud:`, err);
    throw err;
  }
}

export async function downloadFromCloud(
  idToken: string,
  dataType: 'creatorProfile' | 'researchPreferences' | 'latestDailyBrief'
): Promise<{ exists: boolean; data?: any }> {
  try {
    const res = await fetch('/api/sync/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: idToken, dataType })
    });
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.errorMessage || `Server returned ${res.status}`);
    }
    
    return await res.json();
  } catch (err: any) {
    console.error(`Failed to download ${dataType} from cloud:`, err);
    throw err;
  }
}

export async function checkCloudSyncStatus(idToken: string): Promise<any> {
  try {
    const res = await fetch('/api/sync/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: idToken })
    });
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.errorMessage || `Server returned ${res.status}`);
    }
    
    return await res.json();
  } catch (err: any) {
    console.error('Failed to check sync status:', err);
    throw err;
  }
}
