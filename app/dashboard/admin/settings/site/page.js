'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function AdminSiteSettingsPage() {
  const { user, token, loading } = useAuth();
  const [form, setForm] = useState({
    facebookUrl: '', twitterUrl: '', instagramUrl: '', youtubeUrl: '', linkedinUrl: '', tiktokUrl: '', githubUrl: '',
    contactEmail: '', footerText: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/settings/site', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d?.settings) setForm({
          facebookUrl: d.settings.facebookUrl || '',
          twitterUrl: d.settings.twitterUrl || '',
          instagramUrl: d.settings.instagramUrl || '',
          youtubeUrl: d.settings.youtubeUrl || '',
          linkedinUrl: d.settings.linkedinUrl || '',
          tiktokUrl: d.settings.tiktokUrl || '',
          githubUrl: d.settings.githubUrl || '',
          contactEmail: d.settings.contactEmail || '',
          footerText: d.settings.footerText || '',
        });
      })
      .catch(() => {});
  }, [token]);

  if (loading) return null;
  if (!user || user.role !== 'ADMIN') return <div className="p-8 text-center text-red-600">Admins only.</div>;

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/site', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Site Settings</h1>
      <form onSubmit={save} className="grid md:grid-cols-2 gap-6">
        {[
          ['facebookUrl', 'Facebook URL'],
          ['twitterUrl', 'X (Twitter) URL'],
          ['instagramUrl', 'Instagram URL'],
          ['youtubeUrl', 'YouTube URL'],
          ['linkedinUrl', 'LinkedIn URL'],
          ['tiktokUrl', 'TikTok URL'],
          ['githubUrl', 'GitHub URL'],
          ['contactEmail', 'Contact Email'],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="block text-sm text-gray-600 mb-1">{label}</label>
            <input className="w-full rounded-lg border p-3" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </div>
        ))}
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Footer Text</label>
          <textarea rows={3} className="w-full rounded-lg border p-3" value={form.footerText} onChange={(e) => setForm({ ...form, footerText: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <button disabled={saving} className="rounded-lg bg-purple-600 px-5 py-2 text-white hover:bg-purple-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Settings'}</button>
        </div>
      </form>
    </div>
  );
}
