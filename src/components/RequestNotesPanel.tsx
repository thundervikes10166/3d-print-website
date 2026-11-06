import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { MessageSquareText } from 'lucide-react';
import { db } from '../lib/firebase';
import { displayRequestDateTime } from '../lib/requestWorkflow';
import { RequestStaffNote } from '../types';

interface Props {
  requestId: string;
  onAddNote: (requestId: string, note: string) => Promise<void>;
  processing?: boolean;
}

// Staff notes live under a separate, staff-only Firestore subcollection.
// Customers can read their request document but cannot read these notes.
export const RequestNotesPanel: React.FC<Props> = ({ requestId, onAddNote, processing = false }) => {
  const [notes, setNotes] = useState<RequestStaffNote[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, 'requests', requestId, 'staffNotes'), (snapshot) => {
      const rows = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as RequestStaffNote));
      rows.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
      setNotes(rows);
      setError(null);
    }, (err) => setError(err.message || 'Notes could not be loaded.'));
  }, [requestId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    setError(null);
    try {
      await onAddNote(requestId, text);
      setDraft('');
    } catch (err: any) {
      setError(err.message || 'Could not save this note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded border border-slate-200 p-3 space-y-3">
      <h5 className="text-xs font-extrabold uppercase text-slate-900 flex gap-2 items-center">
        <MessageSquareText className="h-4 w-4" /> Internal production notes
      </h5>
      <p className="text-[11px] text-slate-500">Private to staff and assigned makers. Each note records who wrote it and when.</p>
      {error && <p className="text-xs text-red-700">{error}</p>}
      {notes.length === 0 ? <p className="text-xs text-slate-500">No notes yet.</p> : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded text-xs">
              <p className="whitespace-pre-wrap break-words text-slate-800">{note.text}</p>
              <p className="mt-1 text-[10px] text-slate-500">{note.authorName || note.authorEmail || 'Unknown'} · {displayRequestDateTime(note.createdAt || note.timestamp)}</p>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor={`request-note-${requestId}`} className="block text-xs font-bold text-slate-800">Add a note</label>
        <textarea id={`request-note-${requestId}`} rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} required maxLength={2000}
          className="w-full rounded border border-slate-300 p-2 text-xs bg-white" />
        <button type="submit" disabled={processing || saving || !draft.trim()}
          className="rounded bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 text-xs font-bold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save note'}
        </button>
      </form>
    </section>
  );
};
