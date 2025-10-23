"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LiveSpotlight() {
  const [state, setState] = useState({ enabled: false, rotationSeconds: 300, items: [] });

  useEffect(() => {
    let active = true;
    let timer;
    async function load() {
      try {
        const res = await fetch('/api/homepage/live', { cache: 'no-store' });
        const data = await res.json();
        if (!active) return;
        setState({ enabled: !!data.enabled, rotationSeconds: data.rotationSeconds || 300, items: data.items || [] });
        if (timer) clearInterval(timer);
        if (data.enabled) {
          timer = setInterval(load, Math.max(15, Number(data.rotationSeconds || 300)) * 1000);
        }
      } catch {
        if (!active) return;
        setState({ enabled: false, rotationSeconds: 300, items: [] });
      }
    }
    load();
    return () => { active = false; if (timer) clearInterval(timer); };
  }, []);

  if (!state.enabled || !state.items?.length) return null;

  return (
    <section className="py-10 bg-gradient-to-b from-white to-purple-50">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-purple-700">Now Playing</div>
            <h2 className="text-2xl font-bold text-gray-900">Live Spotlight</h2>
          </div>
          <Link href="/live" className="text-purple-700 hover:underline text-sm">See all</Link>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {state.items.slice(0, 2).map((m) => (
            <Link key={m.id} href={m.href} className="group rounded-2xl border bg-white p-4 shadow hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate group-hover:text-purple-700">{m.title || 'Live match'}</div>
                  <div className="text-xs text-gray-500">Last move: {new Date(m.lastMoveAt).toLocaleTimeString()}</div>
                </div>
                <div className="text-purple-700 text-sm">Watch</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
