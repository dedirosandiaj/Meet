import React, { useState } from 'react';
import { User, AppSettings } from '../types';
import { storageService } from '../services/storage';
import { Lock, Mail, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  appSettings: AppSettings;
}

const Login: React.FC<LoginProps> = ({ onLogin, appSettings }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Use Storage Service to validate credentials via Supabase
    const user = await storageService.login(email, password);
    
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid email, password, or account inactive.');
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
      <div className="w-full max-w-md p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 mb-4 relative flex items-center justify-center bg-slate-800/30 rounded-2xl border border-slate-700/50 p-3 shadow-lg">
             <img 
               src={appSettings.iconUrl} 
               alt="App Logo" 
               className="w-full h-full object-contain drop-shadow-md"
               onError={(e) => {e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/4406/4406234.png"}}
             />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{appSettings.title}</h1>
          <p className="text-slate-400 mt-2">Sign in to join your meetings</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-500 transition-all"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;