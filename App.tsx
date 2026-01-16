import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MeetingRoom from './components/MeetingRoom';
import SetPassword from './components/SetPassword';
import { User, AppView, Meeting } from './types';
import { storageService, initDatabase } from './services/storage';
import { Video, Calendar, HelpCircle, X, Check, ArrowRight, Database } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>('LOGIN');
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Initializing App...');
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  
  // State for pending join (from URL)
  const [pendingJoinId, setPendingJoinId] = useState<string | null>(null);
  const [pendingMeetingDetails, setPendingMeetingDetails] = useState<Meeting | null>(null);

  // State for pending user setup / reset
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [passwordMode, setPasswordMode] = useState<'setup' | 'reset'>('setup');

  // Initialize DB and Check Session on Mount
  useEffect(() => {
    const startApp = async () => {
      try {
        setLoadingMsg('Starting SQLite Engine...');
        // Initialize SQLite (Downloads WASM, Creates DB tables)
        await initDatabase();
        setLoadingMsg('Loading Session...');
        
        // Check URL Pathname for Slugs
        const path = window.location.pathname;
        
        // Regex matchers for clean routing
        const setupMatch = path.match(/\/setup\/([^/]+)/);
        const resetMatch = path.match(/\/reset\/([^/]+)/);
        const joinMatch = path.match(/\/join\/([^/]+)/);
        
        // Handle User Setup (New Account) -> /setup/:token
        if (setupMatch && setupMatch[1]) {
          setSetupToken(setupMatch[1]);
          setPasswordMode('setup');
          setView('SET_PASSWORD');
          setLoading(false);
          return;
        }

        // Handle Password Reset (Existing Account) -> /reset/:token
        if (resetMatch && resetMatch[1]) {
          setSetupToken(resetMatch[1]);
          setPasswordMode('reset');
          setView('SET_PASSWORD');
          setLoading(false);
          return;
        }

        const sessionUser = storageService.getSession();
        
        // Handle Join Link -> /join/:meetingId
        if (joinMatch && joinMatch[1]) {
          const joinId = joinMatch[1];
          // Find meeting details
          const meetings = storageService.getMeetings();
          const meeting = meetings.find(m => m.id === joinId);
          
          if (meeting) {
            if (sessionUser) {
              // If logged in, prompt to join immediately
              setPendingMeetingDetails(meeting);
            } else {
              // If not logged in, store ID to prompt after login
              setPendingJoinId(joinId);
            }
          }
        }

        if (sessionUser) {
          // Verify user still exists in DB (in case of DB clear)
          const dbUser = storageService.getUserById(sessionUser.id);
          if (dbUser) {
             setUser(dbUser);
             setView('DASHBOARD');
          } else {
             storageService.logout();
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Initialization Failed:", error);
        setLoadingMsg('Error: Failed to load database.');
      }
    };

    startApp();
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    setView('DASHBOARD');

    // Check if there was a pending join request
    if (pendingJoinId) {
      const meetings = storageService.getMeetings();
      const meeting = meetings.find(m => m.id === pendingJoinId);
      if (meeting) {
        setPendingMeetingDetails(meeting);
      }
      setPendingJoinId(null); // Clear pending ID
    }
  };

  const handleLogout = () => {
    storageService.logout();
    setUser(null);
    setView('LOGIN');
    setPendingMeetingDetails(null);
    // Reset URL to root
    window.history.pushState({}, document.title, '/');
  };

  const handleJoinMeeting = (meetingId: string) => {
    console.log(`Joining meeting ${meetingId}`);
    setCurrentMeetingId(meetingId);
    setView('MEETING');
  };

  const handleEndCall = () => {
    setCurrentMeetingId(null);
    setView('DASHBOARD');
    // Ensure URL is clean after call
    window.history.pushState({}, document.title, '/');
  };

  const handleConfirmJoin = () => {
    if (pendingMeetingDetails) {
      // Clean URL to root so refreshing doesn't trigger join modal again immediately
      window.history.pushState({}, document.title, '/');
      
      setCurrentMeetingId(pendingMeetingDetails.id);
      setPendingMeetingDetails(null);
      setView('MEETING');
    }
  };

  const handleCancelJoin = () => {
    // Clean URL
    window.history.pushState({}, document.title, '/');
    setPendingMeetingDetails(null);
  };

  const handleSetupSuccess = (userData: User) => {
    // Clean URL
    window.history.pushState({}, document.title, '/');
    setUser(userData);
    setView('DASHBOARD');
    setSetupToken(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
        <div className="relative">
           <div className="w-16 h-16 border-4 border-slate-800 border-t-blue-600 rounded-full animate-spin"></div>
           <div className="absolute inset-0 flex items-center justify-center">
             <Database className="w-6 h-6 text-slate-600" />
           </div>
        </div>
        <p className="text-slate-400 text-sm font-mono animate-pulse">{loadingMsg}</p>
      </div>
    );
  }

  // --- VIEW RENDER ---

  // 1. Meeting Room
  if (view === 'MEETING') {
    return (
      <MeetingRoom 
        user={user!} 
        meetingId={currentMeetingId || ''} 
        onEndCall={handleEndCall} 
      />
    );
  }

  // 2. Set Password (Setup or Reset)
  if (view === 'SET_PASSWORD' && setupToken) {
    return (
      <SetPassword 
        token={setupToken} 
        mode={passwordMode}
        onSuccess={handleSetupSuccess} 
      />
    );
  }

  return (
    <>
      {/* 3. Login or Dashboard */}
      {view === 'LOGIN' || !user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard 
          user={user} 
          onLogout={handleLogout} 
          onJoinMeeting={handleJoinMeeting} 
        />
      )}

      {/* 4. Global Join Confirmation Modal (Overlay) */}
      {pendingMeetingDetails && user && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 text-center">
              <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-600/20">
                <Video className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-white">Join Meeting?</h2>
              <p className="text-slate-400 text-sm mt-1">You are about to join a video call.</p>
            </div>
            
            <div className="p-6 space-y-4 bg-slate-950/30">
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                 <div className="text-sm text-slate-400">Topic</div>
                 <div className="font-semibold text-white">{pendingMeetingDetails.title}</div>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                 <div className="text-sm text-slate-400">Host</div>
                 <div className="font-semibold text-white">{pendingMeetingDetails.host}</div>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                 <div className="text-sm text-slate-400">Time</div>
                 <div className="font-semibold text-white">{pendingMeetingDetails.time}</div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex gap-3 bg-slate-900">
              <button 
                onClick={handleCancelJoin}
                className="flex-1 py-3 text-slate-300 hover:bg-slate-800 rounded-xl font-medium transition-colors border border-transparent hover:border-slate-700"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmJoin}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                Join Now <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;