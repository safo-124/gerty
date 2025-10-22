'use client';

import { useEffect, useState, useCallback, use as useUnwrap } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const statusVariantMap = {
  UPCOMING: 'success',
  ONGOING: 'secondary',
  COMPLETED: 'outline',
  CANCELLED: 'destructive',
};

export default function TournamentDetailsPage({ params }) {
  // In Next.js 15 with React 19, params is a Promise; unwrap it with React.use()
  const { id } = useUnwrap(params);
  const { token, user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tournament');
      setTournament(data.tournament);
    } catch (e) {
      setError(e.message || 'Failed to load tournament');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const canRegister = (() => {
    if (!tournament) return false;
    const now = new Date();
    const regOpen = now <= new Date(tournament.registrationEnd);
    const notFull = !tournament.maxParticipants || (tournament.participants?.length ?? 0) < tournament.maxParticipants;
    const notCompleted = tournament.status !== 'COMPLETED' && tournament.status !== 'CANCELLED';
    return regOpen && notFull && notCompleted;
  })();

  const isRegistered = !!tournament?.participants?.some((p) => p.userId === user?.id);

  const toggleRegistration = async () => {
    if (!token || !tournament) return;
    setWorking(true);
    try {
      const method = isRegistered ? 'DELETE' : 'POST';
      const res = await fetch(`/api/tournaments/${tournament.id}/register`, {
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Action failed');
      await load();
    } catch (e) {
      setError(e.message || 'Action failed');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center">Loading...</div>;
  if (!tournament) return <div className="p-6 text-red-600">{error || 'Tournament not found'}</div>;

  return (
    <div className="mx-auto max-w-5xl p-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{tournament.name}</CardTitle>
              <CardDescription>Organized by {tournament.organizer?.name || 'Unknown'}</CardDescription>
            </div>
            <Badge variant={statusVariantMap[tournament.status] || 'secondary'}>{tournament.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-[minmax(0,520px)_1fr]">
            <div className="space-y-4">
              <div className="rounded-xl border p-3 text-sm">
                <p className="font-medium text-gray-900">Overview</p>
                <p className="text-gray-700 whitespace-pre-wrap">{tournament.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Start</p>
                  <p className="text-gray-700">{formatDateTime(tournament.startDate)}</p>
                </div>
                <div className="rounded-xl border p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Registration closes</p>
                  <p className="text-gray-700">{formatDateTime(tournament.registrationEnd)}</p>
                </div>
                <div className="rounded-xl border p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Mode</p>
                  <p className="text-gray-700">{tournament.mode}</p>
                </div>
                <div className="rounded-xl border p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Registration</p>
                  <p className="text-gray-700">{tournament.registrationFree ? 'Free' : (tournament.entryFee ? `$${tournament.entryFee.toFixed(2)}` : 'Free')}</p>
                </div>
              </div>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>
              )}
              {canRegister && (
                <div>
                  <Button onClick={toggleRegistration} disabled={!token || working}>
                    {working ? 'Working...' : (isRegistered ? 'Unregister' : 'Register')}
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border p-3 text-sm">
                <p className="font-medium text-gray-900">Participants ({tournament.participants?.length ?? 0}{tournament.maxParticipants ? ` / ${tournament.maxParticipants}` : ''})</p>
                <div className="mt-2 space-y-1">
                  {tournament.participants?.length ? (
                    tournament.participants.map((p) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <span>{p.user?.name || p.userId}</span>
                        {typeof p.score === 'number' && <span className="text-xs text-gray-500">{p.score.toFixed(1)} pts</span>}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No participants yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
