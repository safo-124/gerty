import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  const { valid, payload } = await verifyAuth(request);
  if (!valid || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const resources = await prisma.resource.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ resources });
}

export async function POST(request) {
  try {
    const { valid, payload } = await verifyAuth(request);
    if (!valid || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const { title, url, type = 'ARTICLE', description = '', studentOnly = true } = body || {};
    if (!title || !url) return NextResponse.json({ error: 'title and url are required' }, { status: 400 });
    const resource = await prisma.resource.create({ data: { title, url, type, description, studentOnly: !!studentOnly } });
    return NextResponse.json({ resource });
  } catch (e) {
    console.error('Admin create resource error:', e);
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
  }
}
