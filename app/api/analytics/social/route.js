import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
  try {
    const { key, url } = await request.json();
    if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    const userAgent = request.headers.get('user-agent') || undefined;
    await prisma.socialClick.create({ data: { key, url: url || null, userAgent } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Social analytics error', e);
    return NextResponse.json({ error: 'Failed to record' }, { status: 500 });
  }
}
