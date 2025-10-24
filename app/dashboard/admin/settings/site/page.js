'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function AdminSiteSettingsPage() {
  const { user, token, loading } = useAuth();
  const [form, setForm] = useState({
    facebookUrl: '', twitterUrl: '', instagramUrl: '', youtubeUrl: '', linkedinUrl: '', tiktokUrl: '', githubUrl: '',
    contactEmail: '', footerText: '',
    homepageLiveEnabled: false,
    homepageLiveCount: 2,
    homepageLiveRotationSeconds: 300,
    homepageLiveTournamentOnly: true,
    homepageLiveTournamentIds: '',
    // About page
    aboutTitle: '',
    aboutSubtitle: '',
    aboutBio: '',
    aboutImageMain: '',
    aboutImageAlt: '',
    aboutGallery: '', // comma-separated
    aboutHighlights: '', // newline-separated
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
          homepageLiveEnabled: !!d.settings.homepageLiveEnabled,
          homepageLiveCount: Number(d.settings.homepageLiveCount ?? 2),
          homepageLiveRotationSeconds: Number(d.settings.homepageLiveRotationSeconds ?? 300),
          homepageLiveTournamentOnly: !!d.settings.homepageLiveTournamentOnly,
          homepageLiveTournamentIds: Array.isArray(d.settings.homepageLiveTournamentIds) ? d.settings.homepageLiveTournamentIds.join(',') : '',
          aboutTitle: d.settings.aboutTitle || '',
          aboutSubtitle: d.settings.aboutSubtitle || '',
          aboutBio: d.settings.aboutBio || '',
          aboutImageMain: d.settings.aboutImageMain || '',
          aboutImageAlt: d.settings.aboutImageAlt || '',
          aboutGallery: Array.isArray(d.settings.aboutGallery) ? d.settings.aboutGallery.join(',') : '',
          aboutHighlights: Array.isArray(d.settings.aboutHighlights) ? d.settings.aboutHighlights.join('\n') : '',
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
        body: JSON.stringify({
          ...form,
          homepageLiveCount: Number(form.homepageLiveCount || 2),
          homepageLiveRotationSeconds: Number(form.homepageLiveRotationSeconds || 300),
          homepageLiveTournamentIds: typeof form.homepageLiveTournamentIds === 'string'
            ? form.homepageLiveTournamentIds.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          aboutGallery: typeof form.aboutGallery === 'string'
            ? form.aboutGallery.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          aboutHighlights: typeof form.aboutHighlights === 'string'
            ? form.aboutHighlights.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean)
            : [],
        }),
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
        <div className="md:col-span-2 border-t pt-4">
          <h2 className="text-xl font-semibold mb-3">Homepage Live Spotlight</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.homepageLiveEnabled} onChange={(e) => setForm({ ...form, homepageLiveEnabled: e.target.checked })} />
              <span>Enable live spotlight</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.homepageLiveTournamentOnly} onChange={(e) => setForm({ ...form, homepageLiveTournamentOnly: e.target.checked })} />
              <span>Only show when tournaments are online</span>
            </label>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Number of matches to show</label>
              <input type="number" min={1} max={6} className="w-full rounded-lg border p-3" value={form.homepageLiveCount} onChange={(e) => setForm({ ...form, homepageLiveCount: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Rotation interval (seconds)</label>
              <input type="number" min={30} max={3600} className="w-full rounded-lg border p-3" value={form.homepageLiveRotationSeconds} onChange={(e) => setForm({ ...form, homepageLiveRotationSeconds: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Limit to Tournament IDs (comma-separated, optional)</label>
              <input className="w-full rounded-lg border p-3" placeholder="tournamentId1,tournamentId2" value={form.homepageLiveTournamentIds} onChange={(e) => setForm({ ...form, homepageLiveTournamentIds: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="md:col-span-2 border-t pt-4">
          <h2 className="text-xl font-semibold mb-3">About Page</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Title</label>
              <input className="w-full rounded-lg border p-3" value={form.aboutTitle} onChange={(e) => setForm({ ...form, aboutTitle: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Subtitle</label>
              <input className="w-full rounded-lg border p-3" value={form.aboutSubtitle} onChange={(e) => setForm({ ...form, aboutSubtitle: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Bio</label>
              <textarea rows={5} className="w-full rounded-lg border p-3" value={form.aboutBio} onChange={(e) => setForm({ ...form, aboutBio: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Main Image URL</label>
              <input className="w-full rounded-lg border p-3" value={form.aboutImageMain} onChange={(e) => setForm({ ...form, aboutImageMain: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Alt Image URL</label>
              <input className="w-full rounded-lg border p-3" value={form.aboutImageAlt} onChange={(e) => setForm({ ...form, aboutImageAlt: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Gallery URLs (comma-separated)</label>
              <input className="w-full rounded-lg border p-3" placeholder="https://.../img1.jpg, https://.../img2.jpg" value={form.aboutGallery} onChange={(e) => setForm({ ...form, aboutGallery: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Highlights (one per line)</label>
              <textarea rows={4} className="w-full rounded-lg border p-3" placeholder={"Coached 100+ students\nOpening repertoires tailored to your style"} value={form.aboutHighlights} onChange={(e) => setForm({ ...form, aboutHighlights: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          <button disabled={saving} className="rounded-lg bg-purple-600 px-5 py-2 text-white hover:bg-purple-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Settings'}</button>
        </div>
      </form>
    </div>
  );
}
