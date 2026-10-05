'use client';

import React, { useState } from 'react';
import { AuthSession, AppDataBackup } from '@/types';
import { login, signup } from '@/lib/auth';
import {
  Flame,
  Lock,
  User,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess: (session: AuthSession, freshData?: AppDataBackup) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [keepMeLoggedIn, setKeepMeLoggedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setErrorMessage('Please enter your username.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 4) {
        setErrorMessage('Password must be at least 4 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please verify and retype.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(trimmedUser, password, keepMeLoggedIn);
        if (res.success && res.session) {
          onAuthSuccess(res.session);
        } else {
          setErrorMessage(res.error || 'Authentication failed. Please check your credentials.');
        }
      } else {
        const res = await signup(trimmedUser, password, keepMeLoggedIn);
        if (res.success && res.session) {
          onAuthSuccess(res.session, res.freshData);
        } else {
          setErrorMessage(res.error || 'Failed to create account. Please try again.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillMarkCredentials = () => {
    setMode('login');
    setUsername('Mark');
    setPassword('John1234');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-emerald-500 selection:text-black">
      {/* Background Radial Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/30 mb-4 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
            <Flame className="w-7 h-7 text-emerald-400 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            VIBE 365
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 uppercase tracking-widest">
              OS
            </span>
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1 uppercase tracking-wider">
            Athletic Performance & Habit Operating System
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#0d1017]/90 border border-[#1d2334] rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative">
          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#07080c] border border-[#1a1f2e] rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-[#182030] text-emerald-400 border border-[#2b3854] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'signup'
                  ? 'bg-[#182030] text-emerald-400 border border-[#2b3854] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
                Account Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={mode === 'login' ? 'e.g. Mark' : 'Choose a username'}
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#07080c] border border-[#222a3d] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 rounded-xl text-sm text-slate-100 placeholder-slate-600 transition outline-none"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? 'Enter password' : 'At least 4 characters'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full pl-10 pr-11 py-2.5 bg-[#07080c] border border-[#222a3d] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 rounded-xl text-sm text-slate-100 placeholder-slate-600 transition outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Sign Up only) */}
            {mode === 'signup' && (
              <div className="animate-fadeIn">
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#07080c] border border-[#222a3d] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 rounded-xl text-sm text-slate-100 placeholder-slate-600 transition outline-none"
                  />
                </div>
              </div>
            )}

            {/* Keep Me Logged In Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={keepMeLoggedIn}
                  onChange={(e) => setKeepMeLoggedIn(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#2b354c] bg-[#07080c] text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-200 group-hover:text-white transition">
                    Keep me logged in
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Stay logged in on this device across browser sessions.
                  </p>
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>{mode === 'login' ? 'Authenticating...' : 'Creating Account...'}</span>
                </>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4 stroke-[2.5]" />
                  <span>Sign In to Dashboard</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Account & Enter</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Mark Credential Pill */}
          <div className="mt-6 pt-5 border-t border-[#1a1f2e] text-center">
            <p className="text-[11px] text-slate-500 mb-2">
              Primary account: <span className="text-slate-300 font-semibold">Mark</span> (password:{' '}
              <span className="text-slate-300 font-mono">John1234</span>)
            </p>
            <button
              type="button"
              onClick={handleFillMarkCredentials}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141924] hover:bg-[#1a2130] text-emerald-400 text-[11px] font-mono border border-emerald-900/40 transition active:scale-95"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Fill Mark Credentials</span>
            </button>
          </div>
        </div>

        {/* Footer Security Badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Isolated User Data</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Cloud Database Sync</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>SHA-256 Hashing</span>
          </div>
        </div>
      </div>
    </div>
  );
};
