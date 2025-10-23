"use client";

import React from 'react';

const platforms = [
  { key: 'facebookUrl', label: 'Facebook', icon: (cls) => (
    <svg viewBox="0 0 24 24" className={cls}><path fill="currentColor" d="M22 12a10 10 0 1 0-11.5 9.9v-7h-2v-2.9h2v-2.2c0-2 1.2-3.2 3-3.2.9 0 1.8.1 1.8.1v2h-1c-1 0-1.3.6-1.3 1.2v2h2.3L15 14.9h-2v7A10 10 0 0 0 22 12"/></svg>
  )},
  { key: 'twitterUrl', label: 'X', icon: (cls) => (
    <svg viewBox="0 0 24 24" className={cls}><path fill="currentColor" d="M3 3h4.6l4.3 6.2L16.4 3H21l-7.7 10.1L21 21h-4.6l-4.7-6.7L6 21H3l8.2-11L3 3z"/></svg>
  )},
  { key: 'instagramUrl', label: 'Instagram', icon: (cls) => (
    <svg viewBox="0 0 24 24" className={cls}><path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7m5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2.2A2.8 2.8 0 1 0 14.8 12 2.8 2.8 0 0 0 12 9.2M18 6.5a1 1 0 1 1-1 1a1 1 0 0 1 1-1"/></svg>
  )},
  { key: 'youtubeUrl', label: 'YouTube', icon: (cls) => (
    <svg viewBox="0 0 24 24" className={cls}><path fill="currentColor" d="M10 15l5.2-3L10 9v6m11-3c0 2.5-.3 4.3-.6 5.3c-.3 1-1 1.7-2 2c-1 .3-3 .6-5.3.6s-4.3-.3-5.3-.6c-1-.3-1.7-1-2-2C5.3 13.3 5 11.5 5 9s.3-4.3.6-5.3c.3-1 1-1.7 2-2C8.6 1.4 10.4 1 12.7 1s4.3.3 5.3.6c1 .3 1.7 1 2 2c.3 1 .6 2.8.6 5.3z"/></svg>
  )},
  { key: 'linkedinUrl', label: 'LinkedIn', icon: (cls) => (
    <svg viewBox="0 0 24 24" className={cls}><path fill="currentColor" d="M6.9 6.5A2.4 2.4 0 1 1 4.5 4a2.4 2.4 0 0 1 2.4 2.5M3.8 8.7h3.4V21H3.8zm6.1 0h3.2v1.7h.1c.5-1 1.9-2.2 3.9-2.2c4.2 0 5 2.8 5 6.4V21h-3.3v-5.7c0-1.4 0-3.2-1.9-3.2c-1.9 0-2.2 1.5-2.2 3.1V21H9.9z"/></svg>
  )},
  { key: 'tiktokUrl', label: 'TikTok', icon: (cls) => (
    <svg viewBox="0 0 24 24" className={cls}><path fill="currentColor" d="M13.3 3h2.6c.3 1.6 1.2 3 2.6 3.9c.9.6 1.8.9 2.8 1V10c-1.5-.1-3-.6-4.3-1.5v5.4c0 3.6-2.5 6.2-6 6.2c-3.4 0-6-2.6-6-6c0-3.6 2.8-5.7 6.2-5.7c.5 0 1 .1 1.5.2v2.8c-.5-.2-1-.3-1.5-.3c-1.7 0-3.1 1.2-3.1 3c0 1.7 1.3 3 3.1 3c1.7 0 3.1-1.3 3.1-3.1z"/></svg>
  )},
  { key: 'githubUrl', label: 'GitHub', icon: (cls) => (
    <svg viewBox="0 0 24 24" className={cls}><path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.5-3.9-1.5c-.5-1.2-1.2-1.6-1.2-1.6c-1-.6.1-.6.1-.6c1.1.1 1.7 1.2 1.7 1.2c1 .1.8-.8 1.9-1.1c-2.6-.3-5.3-1.3-5.3-5.9c0-1.3.5-2.4 1.2-3.3c-.1-.3-.5-1.6.1-3.3c0 0 1-.3 3.3 1.2c1-.3 2-.4 3.1-.4s2.1.1 3.1.4c2.3-1.6 3.3-1.2 3.3-1.2c.6 1.7.2 3 .1 3.3c.8.9 1.3 2 1.3 3.3c0 4.6-2.7 5.6-5.3 5.9c1 .8 2 2.3 2 4.6v2.7c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5"/></svg>
  )},
];

export default function SocialIcons({ settings }) {
  async function handleClick(e, key, url) {
    // fire-and-forget event; don't block navigation
    try {
      fetch('/api/analytics/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, url }),
        keepalive: true,
      });
    } catch (_) {}
  }

  return (
    <div className="flex items-center gap-3">
      {platforms.map((s) => {
        const url = settings?.[s.key];
        if (!url) return null;
        return (
          <a key={s.key} href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => handleClick(e, s.key, url)} className="group rounded-full p-2 hover:bg-purple-100">
            {s.icon('h-5 w-5 text-gray-700 group-hover:text-purple-700')}
            <span className="sr-only">{s.label}</span>
          </a>
        );
      })}
    </div>
  );
}
