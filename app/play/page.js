'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function PlayHome() {
  const [creating, setCreating] = useState(false);
  const [links, setLinks] = useState(null);
  const [title, setTitle] = useState('');
  const [aiCreating, setAiCreating] = useState(false);
  const [aiLinks, setAiLinks] = useState(null);
  const [aiSide, setAiSide] = useState('white');
  const [aiLevel, setAiLevel] = useState(1);
  const [tcMin, setTcMin] = useState(5);
  const [tcInc, setTcInc] = useState(0);

  async function createMatch() {
    setCreating(true);
    try {
      const res = await fetch('/api/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, tc: Math.max(0, Math.floor(tcMin * 60)), inc: Math.max(0, Math.floor(tcInc)) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      // Append time control to links as query params
      const tc = Math.max(0, Math.floor(tcMin * 60));
      const inc = Math.max(0, Math.floor(tcInc));
      const addTC = (u) => `${u}${u.includes('?') ? '&' : '?'}tc=${tc}&inc=${inc}`;
      setLinks({
        whiteUrl: addTC(data.links.whiteUrl),
        blackUrl: addTC(data.links.blackUrl),
        spectatorUrl: addTC(data.links.spectatorUrl),
      });
    } catch (e) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function createAIMatch() {
    setAiCreating(true);
    setAiLinks(null);
    try {
      const res = await fetch('/api/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, ai: true, aiLevel, humanSide: aiSide, tc: Math.max(0, Math.floor(tcMin * 60)), inc: Math.max(0, Math.floor(tcInc)) }),
      });
  const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      // Determine the human link by side
  const tc = Math.max(0, Math.floor(tcMin * 60));
  const inc = Math.max(0, Math.floor(tcInc));
  const addTC = (u) => `${u}${u.includes('?') ? '&' : '?'}tc=${tc}&inc=${inc}`;
  const link = aiSide === 'white' ? data.links.whiteUrl : data.links.blackUrl;
  setAiLinks({ playerUrl: addTC(link), spectatorUrl: addTC(data.links.spectatorUrl), ai: data.ai });
    } catch (e) {
      alert(e.message);
    } finally {
      setAiCreating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-3">Play chess instantly</h1>
      <p className="text-sm text-gray-600 mb-6">Create a live match and share the link. No account needed.</p>

      <div className="rounded-2xl border p-4 bg-white/60 dark:bg-gray-900/60 backdrop-blur">
        <label className="block text-sm font-medium mb-2">Title (optional)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Friendly match"
          className="w-full rounded-xl border px-3 py-2 mb-4 bg-white/80 dark:bg-gray-800/60"
        />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Minutes</label>
            <input type="number" min="0" value={tcMin} onChange={(e) => setTcMin(Number(e.target.value))} className="w-full rounded-xl border px-3 py-2 bg-white/80 dark:bg-gray-800/60" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Increment (sec)</label>
            <input type="number" min="0" value={tcInc} onChange={(e) => setTcInc(Number(e.target.value))} className="w-full rounded-xl border px-3 py-2 bg-white/80 dark:bg-gray-800/60" />
          </div>
        </div>
        <Button onClick={createMatch} disabled={creating} variant="gradient">
          {creating ? 'Creating…' : 'Create live match'}
        </Button>
      </div>

      {links && (
        <div className="mt-6 rounded-2xl border p-4">
          <h2 className="font-semibold mb-2">Share links</h2>
          <ul className="space-y-2 text-sm">
            <li><span className="font-medium">White:</span> <a href={links.whiteUrl} className="text-purple-600 break-all">{links.whiteUrl}</a></li>
            <li><span className="font-medium">Black:</span> <a href={links.blackUrl} className="text-purple-600 break-all">{links.blackUrl}</a></li>
            <li><span className="font-medium">Spectator:</span> <a href={links.spectatorUrl} className="text-purple-600 break-all">{links.spectatorUrl}</a></li>
          </ul>
        </div>
      )}

      <div className="mt-8 rounded-2xl border p-4 bg-white/60 dark:bg-gray-900/60 backdrop-blur">
        <h2 className="font-semibold mb-3">Play vs AI</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Your side</label>
            <div className="flex gap-3 text-sm">
              <label className="inline-flex items-center gap-1">
                <input type="radio" name="aiside" value="white" checked={aiSide === 'white'} onChange={() => setAiSide('white')} /> White
              </label>
              <label className="inline-flex items-center gap-1">
                <input type="radio" name="aiside" value="black" checked={aiSide === 'black'} onChange={() => setAiSide('black')} /> Black
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Difficulty</label>
            <select value={aiLevel} onChange={(e) => setAiLevel(Number(e.target.value))} className="w-full rounded-xl border px-3 py-2 bg-white/80 dark:bg-gray-800/60">
              <option value={1}>Level 1 (Casual)</option>
              <option value={2}>Level 2 (Challenging)</option>
              <option value={3}>Level 3 (Tough)</option>
            </select>
          </div>
          <div className="mt-2 md:mt-0">
            <Button onClick={createAIMatch} disabled={aiCreating} variant="gradient">
              {aiCreating ? 'Starting…' : 'Start AI match'}
            </Button>
          </div>
        </div>
        {aiLinks && (
          <div className="mt-4 text-sm">
            <div className="mb-2">Playing vs AI{aiLinks.ai?.level ? ` (Level ${aiLinks.ai.level})` : ''}.</div>
            <div className="space-y-2">
              <div><span className="font-medium">Your link:</span> <a href={aiLinks.playerUrl} className="text-purple-600 break-all">{aiLinks.playerUrl}</a></div>
              <div><span className="font-medium">Spectator link:</span> <a href={aiLinks.spectatorUrl} className="text-purple-600 break-all">{aiLinks.spectatorUrl}</a></div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-sm text-gray-600">
        Or browse <a className="text-purple-600" href="/live">live matches</a> to watch.</div>
    </div>
  );
}
