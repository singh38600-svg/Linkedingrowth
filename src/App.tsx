/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, signOut } from './firebase';
import { TabType, CreatorProfile, AuthenticatedUser, CloudSyncState, CloudSyncConflict } from './types';
import Navigation from './components/Navigation';
import HomeView from './components/HomeView';
import IdeasView from './components/IdeasView';
import PostStudioView from './components/PostStudioView';
import VisualStudioView from './components/VisualStudioView';
import CarouselBuilderView from './components/CarouselBuilderView';
import SettingsView from './components/SettingsView';
import { 
  runLocalDataMigration, 
  uploadToCloud, 
  checkCloudSyncStatus, 
  getSyncLog, 
  logSyncEvent,
  isProfileMatching,
  isPreferencesMatching,
  isBriefMatching,
  LOCAL_PROFILE_KEY,
  LOCAL_PROFILE_META_KEY,
  LOCAL_BRIEF_KEY,
  LOCAL_BRIEF_META_KEY,
  LOCAL_PREFS_KEY,
  LOCAL_PREFS_META_KEY,
  DEFAULT_PREFERENCES
} from './lib/syncEngine';

const LOCAL_STORAGE_KEY = LOCAL_PROFILE_KEY;

const DEFAULT_PROFILE: CreatorProfile = {
  fullName: 'Rohit Singh Panwar',
  linkedinUrl: '',
  linkedinHeadline: 'Vibe Coder | Ex-Capital Markets | FinTech & Quick Commerce',
  creatorPositioning: 'I explore, test and build with AI so LinkedIn professionals can work smarter, grow their careers and understand what matters without the hype.',
  primaryAudience: 'Working professionals',
  secondaryAudiences: [
    'Recruiters and HR professionals',
    'Job seekers',
    'Vibe coders',
    'Indian professionals learning AI'
  ],
  contentPillars: [
    'Practical AI Workflows',
    'AI Tools Explained',
    'AI News for Professionals',
    'AI for Careers',
    'AI for Recruitment and HR',
    'Build in Public',
    'Vibe Coding and No-Code AI',
    'AI Opinions and Lessons'
  ],
  writingStyles: [
    'Conversational',
    'Practical',
    'Curious',
    'Direct',
    'Honest',
    'Beginner-friendly'
  ],
  promotionLevel: 'Low',
  emotionalIntensity: 'Balanced',
  detailLevel: 'Standard',
  phrasesToAvoid: [
    'In today’s fast-paced world',
    'AI is changing everything',
    'Game changer',
    'We are thrilled to announce',
    'Unlock your potential',
    'Thoughts?',
    'Agree?',
    'Comment yes',
    'You won’t believe this',
    'The future is here',
    'Revolutionary',
    '10x your productivity'
  ],
  topicsToAvoid: [
    'Unrelated motivational content',
    'Politics',
    'Cryptocurrency speculation',
    'Fake AI success stories',
    'Unsupported AI claims',
    'Generic business advice',
    'Celebrity news',
    'Unrelated personal lifestyle content'
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [ideasFocusAction, setIdeasFocusAction] = useState<'focus-brief' | 'focus-ideas' | null>(null);
  const [profile, setProfile] = useState<CreatorProfile>(DEFAULT_PROFILE);

  // Secure Auth State
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [syncState, setSyncState] = useState<CloudSyncState>({
    status: 'Signed out',
    lastSuccessfulSync: null,
    pendingLocalChanges: false,
    lastSyncError: null,
    syncLog: []
  });

  // Active Conflict state
  const [activeConflict, setActiveConflict] = useState<CloudSyncConflict | null>(null);

  // Load profile from localStorage on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure all keys exist to prevent runtime crashes
        setProfile({
          fullName: parsed.fullName || DEFAULT_PROFILE.fullName,
          linkedinUrl: parsed.linkedinUrl || DEFAULT_PROFILE.linkedinUrl,
          linkedinHeadline: parsed.linkedinHeadline || DEFAULT_PROFILE.linkedinHeadline,
          creatorPositioning: parsed.creatorPositioning || DEFAULT_PROFILE.creatorPositioning,
          primaryAudience: parsed.primaryAudience || DEFAULT_PROFILE.primaryAudience,
          secondaryAudiences: parsed.secondaryAudiences || DEFAULT_PROFILE.secondaryAudiences,
          contentPillars: parsed.contentPillars || DEFAULT_PROFILE.contentPillars,
          writingStyles: parsed.writingStyles || DEFAULT_PROFILE.writingStyles,
          promotionLevel: parsed.promotionLevel || DEFAULT_PROFILE.promotionLevel,
          emotionalIntensity: parsed.emotionalIntensity || DEFAULT_PROFILE.emotionalIntensity,
          detailLevel: parsed.detailLevel || DEFAULT_PROFILE.detailLevel,
          phrasesToAvoid: parsed.phrasesToAvoid || DEFAULT_PROFILE.phrasesToAvoid,
          topicsToAvoid: parsed.topicsToAvoid || DEFAULT_PROFILE.topicsToAvoid
        });
      }
    } catch (e) {
      console.error('Failed to load profile from localStorage', e);
    }
  }, []);

  // Sync Log loader & listener
  useEffect(() => {
    runLocalDataMigration();
    setSyncState(prev => ({
      ...prev,
      syncLog: getSyncLog()
    }));

    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const authed: AuthenticatedUser = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL
        };
        setUser(authed);
        
        // Signed in! Trigger sync check
        setSyncState(prev => ({
          ...prev,
          status: 'Checking cloud'
        }));
        
        try {
          await triggerCloudSync(authed);
        } catch (err: any) {
          setSyncState(prev => ({
            ...prev,
            status: 'Sync failed',
            lastSyncError: err.message || 'Initial sync check failed.'
          }));
        }
      } else {
        setUser(null);
        setSyncState(prev => ({
          ...prev,
          status: 'Signed out'
        }));
      }
    });

    const handleLocalUpdate = () => {
      // Reload profile if local storage updated via sync download
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          setProfile(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Error reloading profile after local update event:', err);
      }
      setSyncState(prev => ({
        ...prev,
        syncLog: getSyncLog()
      }));
    };

    window.addEventListener('local-data-updated', handleLocalUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('local-data-updated', handleLocalUpdate);
    };
  }, []);

  const triggerCloudSync = async (authedUser: AuthenticatedUser) => {
    if (!authedUser) return;
    
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Could not retrieve token.');
      
      setSyncState(prev => ({ ...prev, status: 'Checking cloud' }));
      
      const statusRes = await checkCloudSyncStatus(idToken);
      
      const localProfileStr = localStorage.getItem(LOCAL_PROFILE_KEY);
      const localProfile = localProfileStr ? JSON.parse(localProfileStr) : DEFAULT_PROFILE;
      const cloudProfile = statusRes.profile.exists ? statusRes.profile.data : null;
      
      const localPrefsStr = localStorage.getItem(LOCAL_PREFS_KEY);
      const localPrefs = localPrefsStr ? JSON.parse(localPrefsStr) : DEFAULT_PREFERENCES;
      const cloudPrefs = statusRes.preferences.exists ? statusRes.preferences.data : null;
      
      const localBriefStr = localStorage.getItem(LOCAL_BRIEF_KEY);
      const localBrief = localBriefStr ? JSON.parse(localBriefStr) : null;
      const cloudBrief = statusRes.latestDailyBrief.exists ? statusRes.latestDailyBrief.data : null;
      
      // Check if Cloud is empty -> FIRST-SIGN-IN MIGRATION!
      const cloudIsEmpty = !statusRes.profile.exists && !statusRes.preferences.exists && !statusRes.latestDailyBrief.exists;
      if (cloudIsEmpty) {
        await uploadToCloud(idToken, 'creatorProfile', localProfile);
        await uploadToCloud(idToken, 'researchPreferences', localPrefs);
        if (localBrief) {
          await uploadToCloud(idToken, 'latestDailyBrief', localBrief);
        }
        
        logSyncEvent('all', 'Upload', 'Success', 'First sign-in: Provisioned cloud database with local data.');
        
        const nowStr = new Date().toISOString();
        localStorage.setItem(LOCAL_PROFILE_META_KEY, JSON.stringify({ schemaVersion: 'v1', updatedAt: nowStr, syncState: 'In sync' }));
        localStorage.setItem(LOCAL_PREFS_META_KEY, JSON.stringify({ schemaVersion: 'v1', updatedAt: nowStr, syncState: 'In sync' }));
        if (localBrief) {
          localStorage.setItem(LOCAL_BRIEF_META_KEY, JSON.stringify({ schemaVersion: 'v1', updatedAt: nowStr, syncState: 'In sync' }));
        }

        setSyncState(prev => ({
          ...prev,
          status: 'In sync',
          lastSuccessfulSync: nowStr,
          syncLog: getSyncLog()
        }));
        return;
      }
      
      // Determine individual record mismatches & conflicts
      let profileConflict = false;
      let prefsConflict = false;
      let briefConflict = false;
      
      const pMatch = cloudProfile ? isProfileMatching(localProfile, cloudProfile) : true;
      const prMatch = cloudPrefs ? isPreferencesMatching(localPrefs, cloudPrefs) : true;
      const bMatch = cloudBrief && localBrief ? isBriefMatching(localBrief, cloudBrief) : (!cloudBrief && !localBrief);
      
      // Timestamps
      const localProfileMeta = JSON.parse(localStorage.getItem(LOCAL_PROFILE_META_KEY) || '{}');
      const localPrefsMeta = JSON.parse(localStorage.getItem(LOCAL_PREFS_META_KEY) || '{}');
      const localBriefMeta = JSON.parse(localStorage.getItem(LOCAL_BRIEF_META_KEY) || '{}');
      
      const lpTime = localProfileMeta.updatedAt ? new Date(localProfileMeta.updatedAt).getTime() : 0;
      const cpTime = cloudProfile?.updatedAt ? new Date(cloudProfile.updatedAt).getTime() : 0;
      
      const lprTime = localPrefsMeta.updatedAt ? new Date(localPrefsMeta.updatedAt).getTime() : 0;
      const cprTime = cloudPrefs?.updatedAt ? new Date(cloudPrefs.updatedAt).getTime() : 0;
      
      const lbTime = localBriefMeta.updatedAt ? new Date(localBriefMeta.updatedAt).getTime() : 0;
      const cbTime = cloudBrief?.updatedAt ? new Date(cloudBrief.updatedAt).getTime() : 0;
      
      // Profile Sync Decision
      if (!pMatch && cloudProfile) {
        if (lpTime > cpTime) {
          await uploadToCloud(idToken, 'creatorProfile', localProfile);
          logSyncEvent('creatorProfile', 'Upload', 'Success', 'Updated cloud profile with newer local copy.');
        } else if (cpTime > lpTime) {
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(cloudProfile));
          setProfile(cloudProfile);
          logSyncEvent('creatorProfile', 'Download', 'Success', 'Fast-forwarded local profile to match newer cloud copy.');
        } else {
          profileConflict = true;
        }
      }
      
      // Preferences Sync Decision
      if (!prMatch && cloudPrefs) {
        if (lprTime > cprTime) {
          await uploadToCloud(idToken, 'researchPreferences', localPrefs);
          logSyncEvent('researchPreferences', 'Upload', 'Success', 'Updated cloud preferences with newer local copy.');
        } else if (cprTime > lprTime) {
          localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(cloudPrefs));
          logSyncEvent('researchPreferences', 'Download', 'Success', 'Fast-forwarded local preferences to match newer cloud copy.');
        } else {
          prefsConflict = true;
        }
      }
      
      // Brief Sync Decision
      if (!bMatch && cloudBrief) {
        if (lbTime > cbTime) {
          await uploadToCloud(idToken, 'latestDailyBrief', localBrief);
          logSyncEvent('latestDailyBrief', 'Upload', 'Success', 'Updated cloud daily brief with newer local copy.');
        } else if (cbTime > lbTime) {
          localStorage.setItem(LOCAL_BRIEF_KEY, JSON.stringify(cloudBrief));
          logSyncEvent('latestDailyBrief', 'Download', 'Success', 'Fast-forwarded local daily brief to match newer cloud copy.');
        } else {
          briefConflict = true;
        }
      }
      
      // If any true conflict detected
      if (profileConflict || prefsConflict || briefConflict) {
        const conflictType = profileConflict ? 'creatorProfile' : (prefsConflict ? 'researchPreferences' : 'latestDailyBrief');
        const dVer = conflictType === 'creatorProfile' ? localProfile : (conflictType === 'researchPreferences' ? localPrefs : localBrief);
        const cVer = conflictType === 'creatorProfile' ? cloudProfile : (conflictType === 'researchPreferences' ? cloudPrefs : cloudBrief);
        const dTime = conflictType === 'creatorProfile' ? localProfileMeta.updatedAt : (conflictType === 'researchPreferences' ? localPrefsMeta.updatedAt : localBriefMeta.updatedAt);
        const cTime = conflictType === 'creatorProfile' ? cloudProfile?.updatedAt : (conflictType === 'researchPreferences' ? cloudPrefs?.updatedAt : cloudBrief?.updatedAt);
        
        const diffs: string[] = [];
        if (conflictType === 'creatorProfile') {
          if (dVer.fullName !== cVer.fullName) diffs.push(`Full Name: "${dVer.fullName}" vs "${cVer.fullName}"`);
          if (dVer.linkedinHeadline !== cVer.linkedinHeadline) diffs.push(`Headline: "${dVer.linkedinHeadline}" vs "${cVer.linkedinHeadline}"`);
          if (dVer.creatorPositioning !== cVer.creatorPositioning) diffs.push(`Positioning differs`);
        } else if (conflictType === 'researchPreferences') {
          if (dVer.researchEnabled !== cVer.researchEnabled) diffs.push(`Research Enabled: ${dVer.researchEnabled} vs ${cVer.researchEnabled}`);
          if (dVer.preferredResearchTime !== cVer.preferredResearchTime) diffs.push(`Preferred Time: "${dVer.preferredResearchTime}" vs "${cVer.preferredResearchTime}"`);
          if (dVer.timeZone !== cVer.timeZone) diffs.push(`Time Zone: "${dVer.timeZone}" vs "${cVer.timeZone}"`);
        } else if (conflictType === 'latestDailyBrief') {
          diffs.push(`Brief Contents Differ (Summary or verified developments updated)`);
        }
        
        setActiveConflict({
          dataType: conflictType,
          deviceVersion: dVer,
          cloudVersion: cVer,
          deviceTimestamp: dTime,
          cloudTimestamp: cTime,
          differences: diffs
        });
        
        setSyncState(prev => ({
          ...prev,
          status: 'Sync conflict',
          syncLog: getSyncLog()
        }));
        
        logSyncEvent(conflictType, 'Download', 'Conflict', `Conflict found for ${conflictType} during synchronization.`);
        return;
      }
      
      const nowStr = new Date().toISOString();
      if (localProfile) {
        localStorage.setItem(LOCAL_PROFILE_META_KEY, JSON.stringify({ schemaVersion: 'v1', updatedAt: localProfileMeta.updatedAt || nowStr, syncState: 'In sync' }));
      }
      if (localPrefs) {
        localStorage.setItem(LOCAL_PREFS_META_KEY, JSON.stringify({ schemaVersion: 'v1', updatedAt: localPrefsMeta.updatedAt || nowStr, syncState: 'In sync' }));
      }
      if (localBrief) {
        localStorage.setItem(LOCAL_BRIEF_META_KEY, JSON.stringify({ schemaVersion: 'v1', updatedAt: localBriefMeta.updatedAt || nowStr, syncState: 'In sync' }));
      }
      
      setSyncState(prev => ({
        ...prev,
        status: 'In sync',
        lastSuccessfulSync: nowStr,
        syncLog: getSyncLog()
      }));
      
      window.dispatchEvent(new Event('local-data-updated'));
      
    } catch (err: any) {
      console.error('Trigger cloud sync error:', err);
      setSyncState(prev => ({
        ...prev,
        status: 'Sync failed',
        lastSyncError: err.message || 'Sync failed.',
        syncLog: getSyncLog()
      }));
    }
  };

  const handleForceSync = async (direction: 'upload' | 'download') => {
    if (!user) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Could not retrieve token.');
      
      setSyncState(prev => ({ ...prev, status: 'Checking cloud' }));
      
      const localProfileStr = localStorage.getItem(LOCAL_PROFILE_KEY);
      const localProfile = localProfileStr ? JSON.parse(localProfileStr) : DEFAULT_PROFILE;
      const localPrefsStr = localStorage.getItem(LOCAL_PREFS_KEY);
      const localPrefs = localPrefsStr ? JSON.parse(localPrefsStr) : DEFAULT_PREFERENCES;
      const localBriefStr = localStorage.getItem(LOCAL_BRIEF_KEY);
      const localBrief = localBriefStr ? JSON.parse(localBriefStr) : null;

      if (direction === 'upload') {
        await uploadToCloud(idToken, 'creatorProfile', localProfile);
        await uploadToCloud(idToken, 'researchPreferences', localPrefs);
        if (localBrief) {
          await uploadToCloud(idToken, 'latestDailyBrief', localBrief);
        }
        
        logSyncEvent('all', 'Upload', 'Success', 'Forced upload: Overwrote cloud with device data.');
      } else {
        const statusRes = await checkCloudSyncStatus(idToken);
        
        if (statusRes.profile.exists) {
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(statusRes.profile.data));
          setProfile(statusRes.profile.data);
        }
        if (statusRes.preferences.exists) {
          localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(statusRes.preferences.data));
        }
        if (statusRes.latestDailyBrief.exists) {
          localStorage.setItem(LOCAL_BRIEF_KEY, JSON.stringify(statusRes.latestDailyBrief.data));
        }
        
        logSyncEvent('all', 'Download', 'Success', 'Forced download: Overwrote local device with cloud copy.');
      }
      
      setActiveConflict(null);
      await triggerCloudSync(user);
    } catch (err: any) {
      console.error('Force sync error:', err);
      setSyncState(prev => ({
        ...prev,
        status: 'Sync failed',
        lastSyncError: err.message || 'Force sync failed.',
        syncLog: getSyncLog()
      }));
    }
  };

  const handleResolveConflict = async (resolution: 'device' | 'cloud') => {
    if (!user || !activeConflict) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Could not retrieve token.');
      
      const { dataType, deviceVersion, cloudVersion } = activeConflict;
      
      if (resolution === 'device') {
        await uploadToCloud(idToken, dataType, deviceVersion);
        logSyncEvent(dataType, 'Upload', 'Success', `Conflict resolved: Overwrote cloud copy with device copy.`);
      } else {
        const backupKey = `conflict_backup_${dataType}_${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(deviceVersion));
        
        const localKey = dataType === 'creatorProfile' ? LOCAL_PROFILE_KEY : (dataType === 'researchPreferences' ? LOCAL_PREFS_KEY : LOCAL_BRIEF_KEY);
        localStorage.setItem(localKey, JSON.stringify(cloudVersion));
        
        if (dataType === 'creatorProfile') {
          setProfile(cloudVersion);
        }
        
        logSyncEvent(dataType, 'Download', 'Success', `Conflict resolved: Overwrote local copy with cloud copy. Backup saved.`);
      }
      
      setActiveConflict(null);
      await triggerCloudSync(user);
    } catch (err: any) {
      console.error('Resolve conflict error:', err);
      setSyncState(prev => ({
        ...prev,
        status: 'Sync failed',
        lastSyncError: err.message || 'Failed to resolve conflict.',
        syncLog: getSyncLog()
      }));
    }
  };

  const handleSaveProfile = (newProfile: CreatorProfile) => {
    setProfile(newProfile);
    const nowStr = new Date().toISOString();
    try {
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProfile));
      localStorage.setItem(LOCAL_PROFILE_META_KEY, JSON.stringify({
        schemaVersion: 'v1',
        updatedAt: nowStr,
        syncState: user ? 'Local changes pending' : 'Local only'
      }));
      
      if (user) {
        triggerCloudSync(user);
      }
    } catch (e) {
      console.error('Failed to save profile to localStorage', e);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err: any) {
      console.error('Sign-out failed:', err);
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeView 
            profile={profile} 
            onFindIdeas={(focus) => {
              setIdeasFocusAction(focus);
              setActiveTab('ideas');
            }}
            onCreatePost={() => {
              setActiveTab('post-studio');
            }}
          />
        );
      case 'ideas':
        return (
          <IdeasView 
            profile={profile} 
            initialAction={ideasFocusAction}
            onClearInitialAction={() => setIdeasFocusAction(null)}
          />
        );
      case 'post-studio':
        return <PostStudioView profile={profile} setActiveTab={setActiveTab} />;
      case 'visual-studio':
        return <VisualStudioView profile={profile} setActiveTab={setActiveTab} />;
      case 'carousel-builder':
        return <CarouselBuilderView profile={profile} setActiveTab={setActiveTab} />;
      case 'settings':
        return (
          <SettingsView 
            profile={profile} 
            onSave={handleSaveProfile} 
            user={user}
            syncState={syncState}
            onTriggerSync={() => triggerCloudSync(user!)}
            onForceSync={handleForceSync}
            activeConflict={activeConflict}
            onResolveConflict={handleResolveConflict}
          />
        );
      default:
        return (
          <HomeView 
            profile={profile} 
            onFindIdeas={(focus) => {
              setIdeasFocusAction(focus);
              setActiveTab('ideas');
            }}
            onCreatePost={() => {
              setActiveTab('post-studio');
            }}
          />
        );
    }
  };

  return (
    <div id="app-root-container" className="min-h-screen bg-[#030712] text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar & Bottom Nav */}
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        profile={profile} 
        user={user}
        syncState={syncState}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main 
        id="app-main-content" 
        className="flex-1 min-h-screen md:pl-64 pb-24 md:pb-12 transition-all duration-300"
      >
        <div className="px-4 py-8 sm:px-6 md:px-10 lg:px-12 max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
