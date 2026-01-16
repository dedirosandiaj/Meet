import React, { useState } from 'react';
import { User } from '../types';
import { storageService } from '../services/storage';
import { Lock, Check, KeyRound, RotateCcw } from 'lucide-react';

interface SetPasswordProps {
  token: string;
  mode: 'setup' | 'reset';
  onSuccess: (user: User) => void;
}

const SetPassword: React.FC<SetPasswordProps> = ({ token, mode, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // Fetch user details by TOKEN
  const user = storageService.getUserByToken(token);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('Invalid or expired token.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Set password using the user's ID found from the token
    const updatedUser = storageService.setUserPassword(user.id, password);
    if (updatedUser) {
      onSuccess(updatedUser);
    } else {
      setError('Failed to update password. User not found.');
    }
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
               <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Invalid Link</h2>
            <p className="text-slate-400">This link is invalid or has already been used.</p>
        </div>
      </div>
    );
  }

  const isReset = mode === 'reset';

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
      <div className="w-full max-w-md p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className={`p-3 rounded-xl shadow-lg mb-4 ${isReset ? 'bg-orange-600 shadow-orange-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>
            {isReset ? (
                <RotateCcw className="w-8 h-8 text-white" />
            ) : (
                <KeyRound className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isReset ? 'Reset Password' : 'Setup Account'}
          </h1>
          <p className="text-slate-400 mt-2 text-center">
            {isReset ? (
                <>Hi <span className="text-white font-medium">{user.name}</span>, please enter your new password below to secure your account.</>
            ) : (
                <>Hello <span className="text-white font-medium">{user.name}</span>.<br/>Set your password to activate your account.</>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`block w-full pl-10 pr-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-2 ${isReset ? 'focus:ring-orange-500 focus:border-orange-500' : 'focus:ring-emerald-500 focus:border-emerald-500'} text-white placeholder-slate-500 transition-all`}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`block w-full pl-10 pr-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-2 ${isReset ? 'focus:ring-orange-500 focus:border-orange-500' : 'focus:ring-emerald-500 focus:border-emerald-500'} text-white placeholder-slate-500 transition-all`}
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
            className={`w-full py-3 px-4 text-white font-medium rounded-lg shadow-lg transition-all transform hover:scale-[1.02] focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                isReset 
                ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/20 focus:ring-orange-500' 
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 focus:ring-emerald-500'
            }`}
          >
            {isReset ? 'Update Password' : 'Activate Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;