import React, { useState } from 'react';
import { useLab } from '../context/LabContext';
import { KeyRound, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';

export const FirebaseConfigBanner: React.FC = () => {
  const { isConfigured, firebaseConnectionError } = useLab();
  const [showHelper, setShowHelper] = useState(false);

  // If fully configured and no runtime error, render nothing
  if (isConfigured && !firebaseConnectionError) return null;

  return (
    <div className="bg-slate-900 border-b border-red-600/40 text-white text-xs px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
          <span className="font-mono text-[11px] font-bold text-amber-300 uppercase tracking-wider">
            FIREBASE_PROJECT_STATUS:
          </span>
          <span className="text-slate-200">
            {isConfigured ? (
              <>
                Connected to <strong>robotics-and-coding-exchange</strong>.
                {firebaseConnectionError ? (
                  <span className="text-rose-300 ml-1">({firebaseConnectionError})</span>
                ) : (
                  <span className="text-slate-300 ml-1">Live Firestore sync active.</span>
                )}
              </>
            ) : (
              <span className="text-amber-200">Firebase is not configured. Add the VITE_FIREBASE_* values to enable sign-in and data sync.</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <button
            onClick={() => setShowHelper(!showHelper)}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-red-400 font-mono font-bold uppercase rounded border border-slate-700 transition-colors"
          >
            {showHelper ? 'Hide Config Guide' : 'Firebase SDK Guide'}
          </button>
        </div>
      </div>

      {showHelper && (
        <div className="max-w-7xl mx-auto mt-3 p-4 bg-slate-950 rounded border border-slate-800 text-xs space-y-2 font-normal leading-relaxed text-slate-300">
          <div className="font-bold text-white font-mono text-[11px] uppercase tracking-wider">
            How to verify / update your Firebase Web API Key:
          </div>
          <p>
            Add your Firebase web app values to the <code className="font-mono text-amber-300">VITE_FIREBASE_*</code> environment variables. The app will enable sign-in and live Firestore sync after a restart.
          </p>
          <div className="pt-1 flex items-center gap-3">
            <a
              href="https://console.firebase.google.com/project/robotics-and-coding-exchange/settings/general"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-red-400 hover:underline font-mono font-bold"
            >
              <span>Open Firebase Project Settings</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
