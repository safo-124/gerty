'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function AdminResourcesPage() {
  const { user, token, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ title: '', url: '', type: 'ARTICLE', description: '', studentOnly: true });
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/resources', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setItems(data.resources || []);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, [token]);

  useEffect(() => { if (!loading && user?.role === 'ADMIN') load(); }, [loading, user, load]);

  async function create() {
    try {
      const res = await fetch('/api/admin/resources', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      setForm({ title: '', url: '', type: 'ARTICLE', description: '', studentOnly: true });
      load();
    } catch (e) { alert(e.message); }
  }

  async function remove(id) {
    if (!confirm('Delete this resource?')) return;
    const res = await fetch(`/api/admin/resources/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Delete failed');
    load();
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!user || user.role !== 'ADMIN') return <div className="p-6 text-sm text-red-600">Admin only.</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Admin • Resources</h1>
      <div className="rounded-2xl border p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input value={form.title} onChange={(e)=>setForm(f=>({...f,title:e.target.value}))} className="w-full rounded-xl border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL</label>
            <input value={form.url} onChange={(e)=>setForm(f=>({...f,url:e.target.value}))} className="w-full rounded-xl border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={form.type} onChange={(e)=>setForm(f=>({...f,type:e.target.value}))} className="w-full rounded-xl border px-3 py-2">
              <option>ARTICLE</option>
              <option>VIDEO</option>
              <option>BOOK</option>
              <option>PDF</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Student Only</label>
            <input type="checkbox" checked={form.studentOnly} onChange={(e)=>setForm(f=>({...f,studentOnly:e.target.checked}))} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={form.description} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))} className="w-full rounded-xl border px-3 py-2 h-24" />
          </div>
        </div>
        <div className="pt-3"><Button onClick={create}>Create resource</Button></div>
      </div>

      {busy ? <div>Loading…</div> : err ? <div className="text-red-600 text-sm">{err}</div> : (
        <div className="rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">URL</th>
                <th className="text-left px-3 py-2">Student Only</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">
                    {editing===r.id ? (
                      <input className="rounded-xl border px-2 py-1 w-full" value={editData.title ?? r.title} onChange={(e)=>setEditData(d=>({...d,title:e.target.value}))} />
                    ) : r.title}
                  </td>
                  <td className="px-3 py-2">
                    {editing===r.id ? (
                      <select className="rounded-xl border px-2 py-1" value={editData.type ?? r.type} onChange={(e)=>setEditData(d=>({...d,type:e.target.value}))}>
                        <option>ARTICLE</option><option>VIDEO</option><option>BOOK</option><option>PDF</option>
                      </select>
                    ) : r.type}
                  </td>
                  <td className="px-3 py-2 truncate max-w-[320px]">
                    {editing===r.id ? (
                      <input className="rounded-xl border px-2 py-1 w-full" value={editData.url ?? r.url} onChange={(e)=>setEditData(d=>({...d,url:e.target.value}))} />
                    ) : <a className="text-purple-600" href={r.url} target="_blank" rel="noreferrer">{r.url}</a>}
                  </td>
                  <td className="px-3 py-2">
                    {editing===r.id ? (
                      <input type="checkbox" checked={editData.studentOnly ?? r.studentOnly} onChange={(e)=>setEditData(d=>({...d,studentOnly:e.target.checked}))} />
                    ) : (r.studentOnly ? 'Yes' : 'No')}
                  </td>
                  <td className="px-3 py-2">
                    {editing===r.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={async()=>{
                          try{
                            const payload = {};
                            if (editData.title!=null) payload.title = editData.title;
                            if (editData.url!=null) payload.url = editData.url;
                            if (editData.type!=null) payload.type = editData.type;
                            if (editData.studentOnly!=null) payload.studentOnly = !!editData.studentOnly;
                            if (editData.description!=null) payload.description = editData.description;
                            const res = await fetch(`/api/admin/resources/${r.id}`, { method:'PATCH', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body: JSON.stringify(payload)});
                            const data = await res.json(); if (!res.ok) throw new Error(data.error||'Update failed');
                            setEditing(null); setEditData({}); load();
                          } catch(e){ alert(e.message); }
                        }}>Save</Button>
                        <Button size="sm" variant="outline" onClick={()=>{setEditing(null); setEditData({});}}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button className="text-purple-700" onClick={()=>{setEditing(r.id); setEditData({ title:r.title, url:r.url, type:r.type, studentOnly:r.studentOnly, description:r.description||'' });}}>Edit</button>
                        <button onClick={()=>remove(r.id)} className="text-red-600">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
