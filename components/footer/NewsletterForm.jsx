"use client";

import React, { useState } from 'react';

export default function NewsletterForm({ compact = false }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  async function subscribe(e) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage('Thanks for subscribing!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Subscription failed');
      }
    } catch (e) {
      setStatus('error');
      setMessage('Subscription failed');
    }
  }

  const wrapperCls = compact
    ? 'w-full md:w-auto rounded-lg border bg-white/70 backdrop-blur px-2 py-1.5 flex items-center gap-2'
    : 'w-full md:max-w-md rounded-2xl border bg-white/70 backdrop-blur p-3 flex items-center gap-2';
  const inputCls = compact
    ? 'flex-1 rounded-md border px-2 py-1 text-xs'
    : 'flex-1 rounded-lg border px-3 py-2 text-sm';
  const btnCls = compact
    ? 'rounded-md bg-purple-600 px-3 py-1.5 text-white text-xs hover:bg-purple-700 disabled:opacity-50'
    : 'rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50';

  return (
    <form onSubmit={subscribe} className={wrapperCls}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="Your email"
        className={inputCls}
      />
      <button disabled={status==='loading'} className={btnCls}>Subscribe</button>
      {!compact && message && (
        <span className={`ml-2 text-sm ${status==='success' ? 'text-green-600' : status==='error' ? 'text-red-600' : 'text-gray-600'}`}>{message}</span>
      )}
    </form>
  );
}
