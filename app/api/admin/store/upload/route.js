import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

function randomSuffix(len = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tokenRole = auth.payload?.role;
    if (tokenRole !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const form = await request.formData();
    const file = form.get('file');
    const filenameInput = form.get('filename');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const filenameBase = (filenameInput && typeof filenameInput === 'string' ? filenameInput : file.name || 'upload').replace(/[^a-z0-9_.-]/gi, '-');
    const key = `${Date.now()}-${randomSuffix()}-${filenameBase}`;

    const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
    if (!BLOB_TOKEN) {
      return NextResponse.json({ error: 'Blob token not configured' }, { status: 500 });
    }

    // Upload to Vercel Blob via HTTP API
    const endpoint = `https://blob.vercel-storage.com/${encodeURIComponent(key)}`;
    const contentType = file.type || 'application/octet-stream';
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${BLOB_TOKEN}`,
        'Content-Type': contentType,
        'x-vercel-filename': filenameBase,
      },
      body: file,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Blob upload failed:', res.status, text);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
    const data = await res.json().catch(() => ({}));
    // Expect { url }
    return NextResponse.json({ url: data.url || endpoint });
  } catch (error) {
    console.error('Admin store upload error:', error);
    return NextResponse.json({ error: 'Failed to upload' }, { status: 500 });
  }
}
