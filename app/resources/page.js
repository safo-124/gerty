'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function ResourcesPage() {
  const { user, token, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'STUDENT') { setErr('Please sign in as a student to access resources.'); setBusy(false); return; }
    (async () => {
      try {
        const res = await fetch('/api/resources', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setItems(data.resources || []);
      } catch (e) {
        setErr(e.message);
      } finally { setBusy(false); }
    })();
  }, [loading, user, token]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Student Resources</h1>
      {busy ? <div>Loading…</div> : err ? <div className="text-red-600 text-sm">{err}</div> : (
        <ul className="space-y-3">
          {items.map(r => (
            <li key={r.id} className="rounded-2xl border p-4">
              <div className="font-medium">{r.title}</div>
              {r.description && <div className="text-xs text-gray-600 mb-1">{r.description}</div>}
              <a className="text-purple-600 text-sm" href={r.url} target="_blank" rel="noreferrer">Open</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
