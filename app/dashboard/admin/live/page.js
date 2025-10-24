'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

function fmtIdle(last) {
  if (!last) return '—';
  const ms = Date.now() - new Date(last).getTime();
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function AdminLivePage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState([]);
  const [scope, setScope] = useState('ONGOING'); // ONGOING | DONE
  const tickRef = useRef(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return router.push('/login');
    if (user.role !== 'ADMIN') return router.push('/');
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
  const res = await fetch(`/api/admin/live?status=${encodeURIComponent(scope)}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load live matches');
      setMatches(data.matches || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, scope]);

  useEffect(() => {
    load();
    const int = setInterval(load, 3000);
    tickRef.current = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => { clearInterval(int); clearInterval(tickRef.current); };
  }, [load]);

  const act = useCallback(async (id, status, result) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/live/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, ...(result ? { result } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update match');
      await load();
    } catch (e) {
      setError(e.message);
    }
  }, [token, load]);

  const remove = useCallback(async (id) => {
    if (!token) return;
    if (!confirm('Delete this finished match? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/live/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      await load();
    } catch (e) {
      setError(e.message);
    }
  }, [token, load]);

  const removeAll = useCallback(async () => {
    if (!token) return;
    if (!confirm('Delete ALL finished matches? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/admin/live?scope=FINISHED', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Bulk delete failed');
      await load();
    } catch (e) { setError(e.message); }
  }, [token, load]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Admin • Live Matches</h1>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">View:</span>
        <button className={`rounded-full px-3 py-1 border text-sm ${scope==='ONGOING' ? 'bg-purple-600 text-white' : ''}`} onClick={() => setScope('ONGOING')}>Ongoing</button>
        <button className={`rounded-full px-3 py-1 border text-sm ${scope==='DONE' ? 'bg-purple-600 text-white' : ''}`} onClick={() => setScope('DONE')}>Finished</button>
        {scope==='DONE' && (
          <Button variant="destructive" size="sm" onClick={removeAll} className="ml-2">Delete all finished</Button>
        )}
      </div>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : !matches.length ? (
        <div className="text-sm text-gray-600">No ongoing live matches right now.</div>
      ) : (
        <div className="rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Idle</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2">{m.title || 'Untitled'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{m.id}</td>
                  <td className="px-3 py-2">{m.status}</td>
                  <td className="px-3 py-2">{fmtIdle(m.lastMoveAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Link href={`/play/live/${m.id}`} className="text-purple-600 underline">View</Link>
                      {scope==='ONGOING' ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => act(m.id, 'DRAW')}>Force Draw</Button>
                          <Button variant="outline" size="sm" onClick={() => act(m.id, 'RESIGNATION', '1-0')}>End: White wins</Button>
                          <Button variant="outline" size="sm" onClick={() => act(m.id, 'RESIGNATION', '0-1')}>End: Black wins</Button>
                          <Button variant="destructive" size="sm" onClick={() => act(m.id, 'TIMEOUT')}>Close (Timeout)</Button>
                        </>
                      ) : (
                        <Button variant="destructive" size="sm" onClick={() => remove(m.id)}>Delete</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
