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
      homepageLiveEnabled: !!body.homepageLiveEnabled,
      homepageLiveCount: Math.max(1, Math.min(6, Number(body.homepageLiveCount ?? 2))),
      homepageLiveRotationSeconds: Math.max(30, Math.min(3600, Number(body.homepageLiveRotationSeconds ?? 300))),
      homepageLiveTournamentOnly: !!body.homepageLiveTournamentOnly,
      homepageLiveTournamentIds: Array.isArray(body.homepageLiveTournamentIds)
        ? body.homepageLiveTournamentIds
        : (typeof body.homepageLiveTournamentIds === 'string' && body.homepageLiveTournamentIds.trim().length)
          ? body.homepageLiveTournamentIds.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      // About page fields
      aboutTitle: body.aboutTitle ?? null,
      aboutSubtitle: body.aboutSubtitle ?? null,
      aboutBio: body.aboutBio ?? null,
      aboutImageMain: body.aboutImageMain ?? null,
      aboutImageAlt: body.aboutImageAlt ?? null,
      aboutGallery: Array.isArray(body.aboutGallery)
        ? body.aboutGallery
        : (typeof body.aboutGallery === 'string' && body.aboutGallery.trim().length)
          ? body.aboutGallery.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      aboutHighlights: Array.isArray(body.aboutHighlights)
        ? body.aboutHighlights
        : (typeof body.aboutHighlights === 'string' && body.aboutHighlights.trim().length)
          ? body.aboutHighlights.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean)
          : [],
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
