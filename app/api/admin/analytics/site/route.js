import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

function toDateKey(d) {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${d.getUTCDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`; // yyyy-mm-dd
}

export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const me = await prisma.user.findUnique({ where: { id: auth.payload.userId }, select: { role: true } });
    if (!me || me.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10), 1), 90);
    const now = new Date();
    const from = new Date(now);
    from.setUTCDate(now.getUTCDate() - days + 1);

    const [subs, clicks, totalSubs] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true },
      }),
      prisma.socialClick.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true, key: true },
      }),
      prisma.newsletterSubscriber.count(),
    ]);

    // bucket subs by day
    const subsByDay = {};
    for (const s of subs) {
      const k = toDateKey(new Date(s.createdAt));
      subsByDay[k] = (subsByDay[k] || 0) + 1;
    }

    // bucket clicks by day and key
    const clicksByDay = {};
    const clicksByKey = {};
    for (const c of clicks) {
      const dk = toDateKey(new Date(c.createdAt));
      clicksByDay[dk] ||= {};
      clicksByDay[dk][c.key] = (clicksByDay[dk][c.key] || 0) + 1;
      clicksByKey[c.key] = (clicksByKey[c.key] || 0) + 1;
    }

    // create full day range
    const daysArr = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setUTCDate(from.getUTCDate() + i);
      const key = toDateKey(d);
      daysArr.push({ date: key, subscribers: subsByDay[key] || 0, clicks: clicksByDay[key] || {} });
    }

    // top socials
    const socialTotals = Object.entries(clicksByKey)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const last7Subs = daysArr.slice(-7).reduce((acc, d) => acc + d.subscribers, 0);
    const last7Clicks = daysArr.slice(-7).reduce((acc, d) => acc + Object.values(d.clicks).reduce((a, v) => a + v, 0), 0);

    return NextResponse.json({
      totalSubscribers: totalSubs,
      last7Subs,
      last7Clicks,
      days: daysArr,
      socialTotals,
    });
  } catch (e) {
    console.error('Site analytics GET error', e);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
