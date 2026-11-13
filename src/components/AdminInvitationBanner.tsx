import React, { useState } from 'react';
import { useLab } from '../context/LabContext';

/** Invitation tokens are in the URL fragment, not a query string, so the
 * secret is not included in HTTP requests, server logs, or referrer headers. */
const readInvite = (): { token: string; email: string } | null => {
  const hash = window.location.hash;
  if (!hash.startsWith('#admin-invite?')) return null;
  const parameters = new URLSearchParams(hash.slice('#admin-invite?'.length));
  const token = parameters.get('token') || '';
  const email = (parameters.get('email') || '').trim().toLowerCase();
  if (!/^[a-f\d]{64}$/.test(token) || !email.includes('@')) return null;
  return { token, email };
};

export const AdminInvitationBanner: React.FC = () => {
  const [invite, setInvite] = useState(readInvite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const { currentUser, isAuthLoading, setAuthModalMode, setShowAuthModal, acceptAdminInvitation } = useLab();
  if (!invite) return null;
  const emailMatches = currentUser?.email?.toLowerCase() === invite.email;
  const openAuth = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };
  const accept = async () => {
    setBusy(true); setError('');
    try {
      await acceptAdminInvitation(invite.token);
      setComplete(true);
      // Clear the single-use secret from the address bar after it is redeemed.
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setInvite(null);
    } catch (err: any) {
      setError(err?.message || 'Could not activate the admin invitation.');
    } finally { setBusy(false); }
  };
  if (complete) return null;
  return (
    <section className="border border-red-200 bg-white rounded-lg p-5 shadow-sm mb-5 space-y-3" aria-label="Administrator invitation">
      <h2 className="text-lg font-bold text-slate-900">Thunder Vikes Administrator Invitation</h2>
      <p className="text-sm text-slate-600">This invitation is for <strong>{invite.email}</strong>. You must use that exact email address to activate your administrator access.</p>
      {isAuthLoading ? <p className="text-sm">Checking your account...</p> : !currentUser ? (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openAuth('login')} className="bg-slate-900 text-white rounded px-4 py-2 text-sm font-bold">Sign in</button>
          <button onClick={() => openAuth('signup')} className="bg-red-700 text-white rounded px-4 py-2 text-sm font-bold">Register and choose password</button>
        </div>
      ) : !emailMatches ? (
        <p className="text-sm text-amber-800">You're signed in as <strong>{currentUser.email}</strong>. Sign out and sign in with <strong>{invite.email}</strong> to accept this invitation.</p>
      ) : (
        <button onClick={accept} disabled={busy} className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-bold">
          {busy ? 'Activating...' : 'Activate Admin Access'}
        </button>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-slate-500">Invitations expire after 72 hours and can be used once.</p>
    </section>
  );
};
