'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

export default function AdminBlogPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [form, setForm] = useState({ title: '', excerpt: '', coverImage: '', category: '', tags: '', content: '', published: true });
  const [posts, setPosts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    fetch('/api/blog?limit=50')
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setPosts(d.items || []))
      .catch(() => {});
  }, []);

  if (authLoading) return null;
  if (!user || user.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-600">Admins only.</div>;
  }

  async function createPost(e) {
    e.preventDefault();
    if (!form.title || !form.content) return;
    setSaving(true);
    try {
      const res = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title,
          excerpt: form.excerpt,
          coverImage: form.coverImage,
          content: form.content,
          published: form.published,
          category: form.category || undefined,
          tags: form.tags,
        }),
      });
      const data = await res.json();
      if (res.ok) {
  setForm({ title: '', excerpt: '', coverImage: '', category: '', tags: '', content: '', published: true });
        // Refresh list
        const r = await fetch('/api/blog?limit=50');
        const d = await r.json();
        setPosts(d.items || []);
      } else {
        alert(data.error || 'Failed to create');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Admin Blog</h1>
        <Link className="text-purple-700" href="/blog">View Blog</Link>
      </div>

      <form onSubmit={createPost} className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="space-y-4">
          <input className="w-full rounded-lg border p-3" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="w-full rounded-lg border p-3" placeholder="Cover image URL (optional)" value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} />
          <input className="w-full rounded-lg border p-3" placeholder="Category (optional)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className="w-full rounded-lg border p-3" placeholder="Tags: comma,separated (optional)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <textarea className="w-full rounded-lg border p-3" placeholder="Short excerpt (optional)" rows={3} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publish immediately</label>
          <button disabled={saving} className="rounded-lg bg-purple-600 px-5 py-2 text-white hover:bg-purple-700 disabled:opacity-50">{saving ? 'Saving...' : 'Publish Post'}</button>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Write in Markdown (supports GFM)</span>
            <button type="button" className="text-sm text-purple-700" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
          </div>
          <textarea className="w-full rounded-lg border p-3 h-64" placeholder="Write your content in Markdown..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          {showPreview && (
            <div className="prose max-w-none mt-4 rounded-lg border p-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.content || '*Start typing to preview...*'}</ReactMarkdown>
            </div>
          )}
        </div>
      </form>

      <h2 className="text-xl font-semibold mb-3">Published Posts</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {posts.map((p) => (
          <div key={p.slug} className="rounded-xl border p-4">
            <div className="text-sm text-gray-500">{new Date(p.publishedAt || p.createdAt).toLocaleDateString()}</div>
            <div className="font-semibold">{p.title}</div>
            <Link className="text-purple-700 text-sm" href={`/blog/${p.slug}`}>Open</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
