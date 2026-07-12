import { Home, Lightbulb, Settings, Sparkles, PenSquare, Image, Layers, LogIn, LogOut, Cloud } from 'lucide-react';
import { TabType, CreatorProfile, AuthenticatedUser, CloudSyncState } from '../types';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  profile: CreatorProfile;
  user: AuthenticatedUser | null;
  syncState: CloudSyncState;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export default function Navigation({ 
  activeTab, 
  setActiveTab, 
  profile,
  user,
  syncState,
  onSignIn,
  onSignOut
}: NavigationProps) {
  const navItems = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'ideas' as TabType, label: 'Ideas', icon: Lightbulb },
    { id: 'post-studio' as TabType, label: 'Post Studio', icon: PenSquare },
    { id: 'visual-studio' as TabType, label: 'Visual Studio', icon: Image },
    { id: 'carousel-builder' as TabType, label: 'Carousel Builder', icon: Layers },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  const getFirstName = (fullName: string) => {
    if (!fullName) return 'Rohit';
    const parts = fullName.trim().split(/\s+/);
    return parts[0] || 'Rohit';
  };

  const firstName = getFirstName(profile.fullName);
  const initials = firstName ? firstName.charAt(0).toUpperCase() : 'R';

  // Helper to color sync state badge
  const getSyncBadgeStyles = (status: string) => {
    switch (status) {
      case 'In sync':
        return { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', dot: 'bg-emerald-500' };
      case 'Local changes pending':
        return { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', dot: 'bg-amber-500' };
      case 'Sync conflict':
        return { bg: 'bg-red-500/10 border-red-500/30 text-red-400', dot: 'bg-red-500' };
      case 'Checking cloud':
        return { bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400', dot: 'bg-blue-500 animate-pulse' };
      case 'Sync failed':
        return { bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400', dot: 'bg-rose-500' };
      default:
        return { bg: 'bg-slate-500/10 border-slate-500/30 text-slate-400', dot: 'bg-slate-500' };
    }
  };

  const badge = getSyncBadgeStyles(syncState.status);

  return (
    <>
      {/* Mobile Sticky Top Header Bar */}
      <header 
        id="mobile-top-bar"
        className="md:hidden flex justify-between items-center bg-[#070e1b] border-b border-slate-800/60 px-4 py-3 sticky top-0 z-30 shadow-md"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span className="font-sans font-bold text-xs text-white uppercase tracking-wider">AI Growth Engine</span>
        </div>

        {/* Mobile Compact Auth Toggle */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-2 py-1 rounded-full max-w-[160px]">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-5 h-5 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-[10px]">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span className="text-[10px] text-slate-300 font-medium truncate max-w-[80px]">
                {user.displayName || 'User'}
              </span>
              <button 
                onClick={onSignOut}
                title="Sign out"
                className="p-0.5 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-3 py-1.5 rounded-full font-semibold font-sans transition-all cursor-pointer shadow-md shadow-blue-950/30"
            >
              <LogIn className="w-3 h-3" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Desktop Left Sidebar */}
      <aside 
        id="desktop-sidebar" 
        className="hidden md:flex flex-col w-64 bg-[#070e1b] border-r border-slate-800/50 h-screen fixed left-0 top-0 text-slate-100 p-6 z-20"
      >
        {/* Brand Header */}
        <div id="sidebar-header" className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-lg tracking-tight text-white leading-none">
              AI ENGINE
            </h1>
            <span className="text-[10px] text-blue-400 font-mono tracking-wider uppercase">
              Growth Workspace
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav id="desktop-nav" className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left font-medium ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 pl-3'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                <span className="font-sans text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Info & Auth Section at Bottom of Sidebar */}
        <div id="sidebar-footer" className="mt-auto pt-4 border-t border-slate-800/50 space-y-2">
          {user ? (
            // Signed In View
            <div className="bg-slate-900/80 border border-slate-800/60 p-4 rounded-2xl space-y-3 shadow-md">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-sans font-semibold text-slate-200 truncate">{user.displayName || 'Creator'}</p>
                  <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">{user.email}</p>
                </div>
              </div>
              
              {/* Cloud Sync Status */}
              <div className="flex items-center justify-between text-[10px] font-mono border-t border-slate-800/60 pt-2 text-slate-400">
                <span className="flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sync Status:</span>
                </span>
                <div className="flex items-center gap-1.5 bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800/50">
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                  <span className="font-semibold">{syncState.status}</span>
                </div>
              </div>

              <button
                onClick={onSignOut}
                id="sidebar-signout-btn"
                className="w-full py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/20 text-slate-400 hover:text-slate-200 rounded-xl transition-all font-sans text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            // Signed Out View
            <div className="bg-slate-900/80 border border-slate-800/60 p-4 rounded-2xl text-center space-y-3 shadow-md">
              <div className="text-left space-y-1">
                <p className="text-[10px] text-blue-400 font-mono tracking-wider uppercase font-bold">Cloud Backup</p>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Sign in to protect your work and enable automatic morning research.
                </p>
              </div>
              <button
                onClick={onSignIn}
                id="sidebar-signin-btn"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-sans text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-900/20"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Sign In with Google</span>
              </button>
              <p className="text-[10px] text-slate-500 font-sans italic">
                Local mode remains fully functional
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav 
        id="mobile-bottom-nav" 
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[#070e1b]/95 backdrop-blur-md border-t border-slate-800/50 flex justify-around items-center h-16 px-4 pb-safe z-20 shadow-lg"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center w-20 h-full text-center relative focus:outline-none group"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <div className="relative flex flex-col items-center">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-blue-400 scale-110' : 'text-slate-400 group-hover:text-slate-300'}`} />
                <span className={`text-[10px] mt-1 font-sans font-medium transition-all duration-200 ${isActive ? 'text-blue-400 font-semibold' : 'text-slate-500'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </>
  );
}
