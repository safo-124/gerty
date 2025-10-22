'use client';

import { useEffect, useState, useCallback, useMemo, use as useUnwrap } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';

// react-chessboard needs a browser environment, so load dynamically
const Chessboard = dynamic(() => import('react-chessboard').then((m) => m.Chessboard), { ssr: false });

const POLL_MS = 2000;

export default function PlayGamePage({ params }) {
  // Unwrap Next.js params Promise with React.use()
  const { id } = useUnwrap(params);
  const { token, user } = useAuth();
  const [game, setGame] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const youAre = useMemo(() => {
    if (!user || !game) return '';
    if (user.id === game.whiteUserId) return 'white';
    if (user.id === game.blackUserId) return 'black';
    return '';
  }, [user, game]);

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load game');
      setGame(data.game);
    } catch (e) {
      setError(e.message || 'Failed to load game');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGame();
    const t = setInterval(fetchGame, POLL_MS);
    return () => clearInterval(t);
  }, [fetchGame]);

  const onPieceDrop = async (sourceSquare, targetSquare, piece) => {
    if (!token) {
      setError('You must be signed in to play');
      return false;
    }
    if (!game || game.status !== 'ONGOING') return false;

    // Enforce turns client-side for quick feedback
    if (youAre === 'white' && game.turn !== 'w') return false;
    if (youAre === 'black' && game.turn !== 'b') return false;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/games/${game.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ from: sourceSquare, to: targetSquare }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Illegal move');
      setGame(data.game);
      return true;
    } catch (e) {
      setError(e.message || 'Move failed');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">Loading...</div>
    );
  }

  if (!game) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error || 'Game not found'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>{game?.tournament?.name || 'Online Game'}</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Badge variant="secondary">{game.status}</Badge>
            {game.result && <span>Result: {game.result}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-[minmax(0,520px)_1fr]">
            <div className="rounded-xl border p-3">
              <Chessboard position={game.fen} onPieceDrop={onPieceDrop} boardWidth={480} arePiecesDraggable={!submitting && game.status === 'ONGOING'} />
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border p-3 text-sm">
                <p className="font-medium text-gray-900">Players</p>
                <p className="text-gray-700">White: {game.white?.name || game.whiteUserId}</p>
                <p className="text-gray-700">Black: {game.black?.name || game.blackUserId}</p>
              </div>
              <div className="rounded-xl border p-3 text-sm">
                <p className="font-medium text-gray-900">Turn</p>
                <p className="text-gray-700">{game.turn === 'w' ? 'White' : 'Black'}</p>
              </div>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchGame}>Refresh</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
