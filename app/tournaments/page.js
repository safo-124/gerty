'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'UPCOMING', label: 'Upcoming' },
  { id: 'ONGOING', label: 'Ongoing' },
  { id: 'COMPLETED', label: 'Completed' },
];

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

export default function TournamentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', '50');
      const res = await fetch(`/api/tournaments?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tournaments');
      setItems(data.tournaments || []);
    } catch (e) {
      setError(e.message || 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => items, [items]);

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tournaments</h1>
          <p className="text-sm text-gray-600">Explore upcoming, ongoing, and completed events.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-purple-200/60 bg-white/80 p-2 shadow-sm">
            {STATUS_FILTERS.map((f) => (
              <Button key={f.id} size="sm" variant={filter === f.id ? 'gradient' : 'outline'} onClick={() => setFilter(f.id)}>
                {f.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="Search tournaments" value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
            <Button variant="outline" onClick={load}>Search</Button>
          </div>
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-red-300/60 bg-red-50/80 text-red-700">
          <CardHeader>
            <CardTitle>We ran into a problem</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">Loading...</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.length === 0 && (
            <p className="text-sm text-gray-500">No tournaments found.</p>
          )}
          {filteredItems.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <CardDescription>Organized by {t.organizer?.name || 'Unknown'}</CardDescription>
                </div>
                <Badge variant={statusVariantMap[t.status] || 'secondary'}>{t.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Start</p>
                    <p className="text-sm text-gray-700">{formatDateTime(t.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Registration closes</p>
                    <p className="text-sm text-gray-700">{formatDateTime(t.registrationEnd)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Mode</p>
                    <p className="text-sm text-gray-700">{t.mode}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Registration</p>
                    <p className="text-sm text-gray-700">{t.registrationFree ? 'Free' : (t.entryFee ? `$${t.entryFee.toFixed(2)}` : 'Free')}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Participants: {t._count?.participants ?? 0}{t.maxParticipants ? ` / ${t.maxParticipants}` : ''}</p>
                  <Link className="text-sm text-purple-700 underline" href={`/tournaments/${t.id}`}>View details</Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
