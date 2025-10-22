'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LiveBoard from '@/components/LiveBoard';

export default function PuzzleSolvePage({ params }) {
  const { id } = use(params);
  const { user, token, loading } = useAuth();
  const [puzzle, setPuzzle] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [fen, setFen] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'STUDENT') { setMsg('Please sign in as a student.'); setBusy(false); return; }
    (async () => {
      try {
        const res = await fetch(`/api/puzzles/${id}/attempt`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        setPuzzle(data.puzzle);
        setAttempt(data.attempt);
        setFen(data.puzzle.fen);
      } catch (e) {
        setMsg(e.message);
      } finally {
        setBusy(false);
      }
    })();
  }, [loading, user, token, id]);

  const onMove = useCallback(async (from, to) => {
    if (!attempt) return false;
    try {
      const res = await fetch(`/api/puzzles/${id}/move`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ attemptId: attempt.id, from, to }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      if (!data.correct) { alert('Incorrect. Try again.'); return false; }
      // Apply auto moves by updating FEN from server
      setFen(data.fen);
      setAttempt((a) => a ? { ...a, progress: data.progress, status: data.solved ? 'SOLVED' : 'ATTEMPTING' } : a);
      if (data.solved) setMsg('Solved!');
      return true;
    } catch (e) {
      alert(e.message);
      return false;
    }
  }, [attempt, id, token]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Puzzle</h1>
      {busy ? <div>Loading…</div> : (
        !puzzle ? <div className="text-red-600 text-sm">{msg || 'Not available'}</div> : (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border p-3">
              <LiveBoard
                fen={fen}
                onMove={(from, to) => onMove(from, to)}
                arePiecesDraggable={true}
                boardOrientation={'white'}
              />
            </div>
            <div className="rounded-2xl border p-4 text-sm space-y-2">
              <div><span className="font-medium">Title:</span> {puzzle.title}</div>
              <div><span className="font-medium">Difficulty:</span> {puzzle.difficulty}</div>
              {attempt?.status === 'SOLVED' && <div className="text-green-700">Solved!</div>}
              {msg && <div className="text-yellow-700">{msg}</div>}
            </div>
          </div>
        )
      )}
    </div>
  );
}
