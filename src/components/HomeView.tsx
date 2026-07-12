import { TrendingUp, Compass, Clock, ArrowRight, PenSquare, Sparkles, Users, Layers } from 'lucide-react';
import { useState } from 'react';
import { CreatorProfile } from '../types';

interface HomeViewProps {
  profile: CreatorProfile;
  onFindIdeas: (focus: 'focus-brief' | 'focus-ideas') => void;
  onCreatePost: () => void;
}

export default function HomeView({ profile, onFindIdeas, onCreatePost }: HomeViewProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const checkValidBriefExists = (): boolean => {
    try {
      const briefStr = localStorage.getItem('saved_ai_research_brief');
      if (!briefStr) return false;
      const brief = JSON.parse(briefStr);
      return brief && Array.isArray(brief.developments) && brief.developments.length >= 3;
    } catch (e) {
      return false;
    }
  };

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good afternoon';
    } else if (hour >= 17 && hour < 22) {
      return 'Good evening';
    } else {
      return 'Welcome back';
    }
  };

  const getFirstName = (fullName: string) => {
    if (!fullName) return 'Rohit';
    const parts = fullName.trim().split(/\s+/);
    return parts[0] || 'Rohit';
  };

  const getReadablePillarName = (key: string): string => {
    switch (key) {
      case 'Practical AI Workflows':
        return 'practical AI workflows';
      case 'AI Tools Explained':
        return 'AI tools';
      case 'AI News for Professionals':
        return 'AI news';
      case 'AI for Careers':
        return 'career growth';
      case 'AI for Recruitment and HR':
        return 'recruitment insights';
      case 'Build in Public':
        return 'build-in-public stories';
      case 'Vibe Coding and No-Code AI':
        return 'vibe coding experiments';
      case 'AI Opinions and Lessons':
        return 'AI opinions';
      default:
        return key.toLowerCase();
    }
  };

  const formatActivePillars = (activeKeys: string[]) => {
    const keys = activeKeys || [];
    if (keys.length === 0) {
      return 'No active content pillars';
    }

    const mapped = keys.map(getReadablePillarName);
    const firstThree = mapped.slice(0, 3);
    
    let result = '';
    if (firstThree.length === 1) {
      result = firstThree[0];
    } else if (firstThree.length === 2) {
      result = `${firstThree[0]} and ${firstThree[1]}`;
    } else if (firstThree.length === 3) {
      result = `${firstThree[0]}, ${firstThree[1]} and ${firstThree[2]}`;
    }

    // Capitalize the first letter
    if (result.length > 0) {
      result = result.charAt(0).toUpperCase() + result.slice(1) + '.';
    }

    return result;
  };

  const greetingText = getGreetingText();
  const firstName = getFirstName(profile.fullName);
  const activePillarsText = formatActivePillars(profile.contentPillars);
  const additionalPillarsCount = (profile.contentPillars || []).length > 3 
    ? (profile.contentPillars || []).length - 3 
    : 0;

  return (
    <div id="home-view-container" className="space-y-8 max-w-4xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          id="toast-notification"
          className="fixed top-6 right-6 z-50 bg-[#0F172A] border border-blue-500/30 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-sm animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="p-1 bg-blue-500/20 text-blue-400 rounded">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-sans text-slate-300 font-semibold">Workspace Alert</p>
            <p className="text-sm font-sans text-white">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Greeting Section */}
      <header id="greeting-section" className="mb-10">
        <h1 className="text-4xl font-sans font-bold tracking-tight text-white mb-2">
          {greetingText}, {firstName}
        </h1>
        <blockquote className="text-slate-400 text-lg border-l-2 border-blue-600 pl-4">
          Create useful AI content that gives professionals a reason to follow you.
        </blockquote>
      </header>

      {/* Big Call to Action Block */}
      <section id="main-cta-card" className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-[#0F172A] to-[#020617] p-8 md:p-12 shadow-2xl">
        {/* Subtle decorative mesh backdrops */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl" />

        <div className="relative z-10 space-y-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Clock className="w-3.5 h-3.5" />
                <span>MANUAL AI WORKFLOW</span>
              </span>
              <h2 className="text-2xl md:text-3xl font-sans font-bold text-white tracking-tight">
                Build today’s AI post
              </h2>
              <p className="text-slate-400 font-sans text-base md:text-lg leading-relaxed max-w-2xl">
                Discover a valuable AI topic, test its potential and turn it into an engaging LinkedIn post.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                id="btn-find-ideas"
                onClick={() => onFindIdeas(checkValidBriefExists() ? 'focus-ideas' : 'focus-brief')}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Find Today’s Ideas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                id="btn-create-post"
                onClick={onCreatePost}
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <PenSquare className="w-4 h-4 text-slate-400" />
                <span>Create a Post</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Cards */}
      <section id="additional-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Primary Audience Card */}
        <div 
          id="card-primary-audience" 
          className="bg-[#0f172a] border border-slate-800/60 p-6 rounded-2xl flex flex-col justify-between group hover:border-slate-700/50 transition-all duration-300"
        >
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Primary Audience</span>
            </div>
            <p className="mt-3 text-slate-200 font-sans font-semibold text-sm md:text-base">
              {profile.primaryAudience || 'Working professionals'}
            </p>
          </div>
        </div>

        {/* Content Focus Card */}
        <div 
          id="card-content-focus" 
          className="bg-[#0f172a] border border-slate-800/60 p-6 rounded-2xl flex flex-col justify-between group hover:border-slate-700/50 transition-all duration-300"
        >
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Content Focus</span>
            </div>
            <div className="mt-3 text-slate-300 font-sans text-sm leading-relaxed">
              <span>{activePillarsText} </span>
              {additionalPillarsCount > 0 && (
                <span className="inline-block text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 ml-1">
                  +{additionalPillarsCount} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Growth Goal Card */}
        <div 
          id="card-growth-goal" 
          className="bg-[#0f172a] border border-slate-800/60 p-6 rounded-2xl flex flex-col justify-between group hover:border-slate-700/50 transition-all duration-300"
        >
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Growth Goal</span>
            </div>
            <p className="mt-3 text-slate-300 leading-relaxed font-sans text-sm">
              More relevant followers, connections and profile visits.
            </p>
          </div>
        </div>

        {/* Today's Status Card */}
        <div 
          id="card-todays-status" 
          className="bg-[#0f172a] border border-slate-800/60 p-6 rounded-2xl flex flex-col justify-between group hover:border-slate-700/50 transition-all duration-300"
        >
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Today’s Status</span>
            </div>
            <p className="mt-3 text-slate-500 italic font-sans text-sm">
              No research has been completed yet.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
