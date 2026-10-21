import React, { useState } from 'react';
import { useLab } from '../context/LabContext';
import { X, Lock, Mail, User, AlertCircle, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    showAuthModal,
    setShowAuthModal,
    authModalMode,
    setAuthModalMode,
    loginWithEmail,
    signUpWithEmail,
    loginWithGoogle,
    resetPassword,
    authError,
    clearAuthError,
  } = useLab();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  if (!showAuthModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setResetSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (authModalMode === 'login') {
        await loginWithEmail(email, password);
      } else if (authModalMode === 'signup') {
        if (!displayName.trim()) {
          throw new Error('Please provide your name or maker callsign.');
        }
        await signUpWithEmail(email, password, displayName);
      } else if (authModalMode === 'reset') {
        await resetPassword(email);
        setResetSuccessMessage('Password reset link sent! Check your inbox.');
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearAuthError();
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 relative border-b border-slate-800">
          <button
            onClick={() => {
              clearAuthError();
              setShowAuthModal(false);
            }}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded bg-white/10 p-1 flex items-center justify-center border border-white/20 shrink-0">
              <img
                src="/hueneme-viking-crest.svg"
                alt="Hueneme High Vikings"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-400">
                HUENEME HIGH SCHOOL • ROOM Q10
              </div>
              <div className="text-xs text-slate-300 font-mono">
                Robotics & Coding 3D Print Exchange
              </div>
            </div>
          </div>

          <h2 className="text-xl font-extrabold uppercase tracking-tight text-white">
            {authModalMode === 'login' && 'Sign In to Print Lab'}
            {authModalMode === 'signup' && 'Create Student Account'}
            {authModalMode === 'reset' && 'Reset Lab Password'}
          </h2>
          <p className="text-xs text-slate-300 mt-1 font-normal">
            {authModalMode === 'login' && 'Access your active print requests, listings, and maker workbench.'}
            {authModalMode === 'signup' && 'Join the Robotics & Coding 3D fabrication marketplace.'}
            {authModalMode === 'reset' && 'Enter your email to receive secure recovery instructions.'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {/* Error Message */}
          {authError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Success Message */}
          {resetSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          {/* Google Sign In Option */}
          {authModalMode !== 'reset' && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink mx-3 text-[10px] font-mono text-slate-400 uppercase font-bold">OR EMAIL</span>
                <div className="grow border-t border-slate-200"></div>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {authModalMode === 'signup' && (
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Full Name / Callsign *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Leo Hayes"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-red-600 outline-hidden"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@school.edu"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-red-600 outline-hidden"
                />
              </div>
            </div>

            {authModalMode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600">
                    Password *
                  </label>
                  {authModalMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        clearAuthError();
                        setAuthModalMode('reset');
                      }}
                      className="text-[10px] font-mono uppercase text-red-600 hover:text-red-800 font-bold"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-red-600 outline-hidden"
                  />
                </div>
              </div>
            )}

            {authModalMode === 'signup' && (
              <div className="p-2.5 bg-red-50/70 border border-red-200 rounded text-[11px] text-slate-700 leading-relaxed">
                <strong>Account Role:</strong> All new signups default securely to <code className="font-mono text-red-800 font-bold">student</code> maker privileges. Teacher admin privileges are verified by lab directors.
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Communicating with Firebase...</span>
              ) : (
                <>
                  <span>
                    {authModalMode === 'login' && 'Sign In to Account'}
                    {authModalMode === 'signup' && 'Complete Registration'}
                    {authModalMode === 'reset' && 'Send Reset Link'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switchers */}
          <div className="pt-2 text-center text-xs text-slate-600 border-t border-slate-100">
            {authModalMode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    clearAuthError();
                    setAuthModalMode('signup');
                  }}
                  className="text-red-600 hover:text-red-800 font-bold uppercase tracking-wider text-[11px]"
                >
                  Sign Up Here
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    clearAuthError();
                    setAuthModalMode('login');
                  }}
                  className="text-red-600 hover:text-red-800 font-bold uppercase tracking-wider text-[11px]"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
