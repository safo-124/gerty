import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const me = await prisma.user.findUnique({ where: { id: auth.payload.userId }, select: { role: true } });
    if (!me || me.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const settings = await prisma.siteSettings.findUnique({ where: { id: 'site' } });
    if (!settings) return NextResponse.json({ settings: null });
    return NextResponse.json({ settings });
  } catch (e) {
    console.error('Site settings GET error', e);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const me = await prisma.user.findUnique({ where: { id: auth.payload.userId }, select: { role: true } });
    if (!me || me.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const data = {
      facebookUrl: body.facebookUrl ?? null,
      twitterUrl: body.twitterUrl ?? null,
      instagramUrl: body.instagramUrl ?? null,
      youtubeUrl: body.youtubeUrl ?? null,
      linkedinUrl: body.linkedinUrl ?? null,
      tiktokUrl: body.tiktokUrl ?? null,
      githubUrl: body.githubUrl ?? null,
      contactEmail: body.contactEmail ?? null,
      footerText: body.footerText ?? null,
    };

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'site' },
      update: data,
      create: { id: 'site', ...data },
    });
    return NextResponse.json({ settings });
  } catch (e) {
    console.error('Site settings PATCH error', e);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
