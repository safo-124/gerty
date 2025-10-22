'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Chessboard } from 'react-chessboard';

export default function AdminPuzzlesPage() {
  const { user, token, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ title: '', fen: '', moves: '', difficulty: 'EASY', themes: '', tags: '', source: '', rating: '', sideToMove: 'WHITE' });
  const [editing, setEditing] = useState(null); // id or null
  const [editData, setEditData] = useState({});

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/puzzles', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setItems(data.puzzles || []);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, [token]);

  useEffect(() => { if (!loading && user?.role === 'ADMIN') load(); }, [loading, user, load]);

  async function create() {
    try {
      const moves = form.moves.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
      const themes = form.themes.split(/,|\s+/).map(s => s.trim()).filter(Boolean);
      const tags = form.tags.split(/,|\s+/).map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/admin/puzzles', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: form.title, fen: form.fen, moves, difficulty: form.difficulty, themes, tags, source: form.source || null, rating: form.rating ? Number(form.rating) : null, sideToMove: form.sideToMove }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      setForm({ title: '', fen: '', moves: '', difficulty: 'EASY', themes: '', tags: '', source: '', rating: '', sideToMove: 'WHITE' });
      load();
    } catch (e) { alert(e.message); }
  }

  async function remove(id) {
    if (!confirm('Delete this puzzle?')) return;
    const res = await fetch(`/api/admin/puzzles/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Delete failed');
    load();
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!user || user.role !== 'ADMIN') return <div className="p-6 text-sm text-red-600">Admin only.</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Admin • Puzzles</h1>
      <div className="rounded-2xl border p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input value={form.title} onChange={(e)=>setForm(f=>({...f,title:e.target.value}))} className="w-full rounded-xl border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Difficulty</label>
            <select value={form.difficulty} onChange={(e)=>setForm(f=>({...f,difficulty:e.target.value}))} className="w-full rounded-xl border px-3 py-2">
              <option>EASY</option>
              <option>MEDIUM</option>
              <option>HARD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rating (optional)</label>
            <input value={form.rating} onChange={(e)=>setForm(f=>({...f,rating:e.target.value}))} className="w-full rounded-xl border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Source (optional)</label>
            <input value={form.source} onChange={(e)=>setForm(f=>({...f,source:e.target.value}))} className="w-full rounded-xl border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Side to move</label>
            <select value={form.sideToMove} onChange={(e)=>setForm(f=>({...f,sideToMove:e.target.value}))} className="w-full rounded-xl border px-3 py-2">
              <option value="WHITE">WHITE</option>
              <option value="BLACK">BLACK</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">FEN</label>
            <input value={form.fen} onChange={(e)=>setForm(f=>({...f,fen:e.target.value}))} className="w-full rounded-xl border px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Solution SAN (comma or newline separated)</label>
            <textarea value={form.moves} onChange={(e)=>setForm(f=>({...f,moves:e.target.value}))} className="w-full rounded-xl border px-3 py-2 h-28" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Themes (comma or space separated)</label>
            <input value={form.themes} onChange={(e)=>setForm(f=>({...f,themes:e.target.value}))} className="w-full rounded-xl border px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Tags (comma or space separated)</label>
            <input value={form.tags} onChange={(e)=>setForm(f=>({...f,tags:e.target.value}))} className="w-full rounded-xl border px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Preview</label>
            <div className="rounded-2xl border p-3"><Chessboard id="preview" position={form.fen || undefined} /></div>
          </div>
        </div>
        <div className="pt-3"><Button onClick={create}>Create puzzle</Button></div>
      </div>

      {busy ? <div>Loading…</div> : err ? <div className="text-red-600 text-sm">{err}</div> : (
        <div className="rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">Difficulty</th>
                <th className="text-left px-3 py-2">Moves</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">
                    {editing===p.id ? (
                      <input className="rounded-xl border px-2 py-1 w-full" value={editData.title ?? p.title} onChange={(e)=>setEditData(d=>({...d,title:e.target.value}))} />
                    ) : p.title}
                  </td>
                  <td className="px-3 py-2">
                    {editing===p.id ? (
                      <select className="rounded-xl border px-2 py-1" value={editData.difficulty ?? p.difficulty} onChange={(e)=>setEditData(d=>({...d,difficulty:e.target.value}))}>
                        <option>EASY</option><option>MEDIUM</option><option>HARD</option>
                      </select>
                    ) : p.difficulty}
                  </td>
                  <td className="px-3 py-2 text-xs truncate max-w-[320px]">
                    {editing===p.id ? (
                      <textarea className="rounded-xl border px-2 py-1 w-full h-16" value={editData.moves ?? (p.movesSan?.join(', ')||'')} onChange={(e)=>setEditData(d=>({...d,moves:e.target.value}))} />
                    ) : p.movesSan?.join(', ')}
                  </td>
                  <td className="px-3 py-2">
                    {editing===p.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={async()=>{
                          try {
                            const payload = {};
                            if (editData.title!=null) payload.title = editData.title;
                            if (editData.difficulty!=null) payload.difficulty = editData.difficulty;
                            if (editData.moves!=null) payload.moves = editData.moves.split(/\r?\n|,/).map(s=>s.trim()).filter(Boolean);
                            if (editData.fen!=null) payload.fen = editData.fen;
                            if (editData.themes!=null) payload.themes = editData.themes.split(/,|\s+/).map(s=>s.trim()).filter(Boolean);
                            if (editData.tags!=null) payload.tags = editData.tags.split(/,|\s+/).map(s=>s.trim()).filter(Boolean);
                            if (editData.source!=null) payload.source = editData.source;
                            if (editData.rating!=null) payload.rating = editData.rating;
                            if (editData.sideToMove!=null) payload.sideToMove = editData.sideToMove;
                            const res = await fetch(`/api/admin/puzzles/${p.id}`, { method:'PATCH', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body: JSON.stringify(payload)});
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error||'Update failed');
                            setEditing(null); setEditData({}); load();
                          } catch(e){ alert(e.message); }
                        }}>Save</Button>
                        <Button size="sm" variant="outline" onClick={()=>{setEditing(null); setEditData({});}}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button className="text-purple-700" onClick={()=>{setEditing(p.id); setEditData({ title:p.title, difficulty:p.difficulty, moves:p.movesSan?.join(', '), fen:p.fen, themes:p.themes?.join(' '), tags:p.tags?.join(' '), source:p.source||'', rating:p.rating??'', sideToMove:p.sideToMove||'WHITE' });}}>Edit</button>
                        <button onClick={()=>remove(p.id)} className="text-red-600">Delete</button>
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
