import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { z } from 'zod';

const causeSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  goalAmount: z.number().positive().optional(),
  image: z.string().url().optional(),
});

export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.payload?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('includeInactive') === '1';

    const causes = await prisma.cause.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { createdAt: 'desc' },
    });

    // Attach totals per cause
    const totals = await prisma.donation.groupBy({
      by: ['causeId'],
      _sum: { amount: true },
      _count: { _all: true },
      where: { causeId: { not: null } },
    });
    const totalsMap = new Map(
      totals.map((t) => [t.causeId, { totalAmount: t._sum.amount || 0, donationCount: t._count._all || 0 }]),
    );

    return NextResponse.json({
      causes: causes.map((c) => ({
        ...c,
        totals: totalsMap.get(c.id) || { totalAmount: 0, donationCount: 0 },
      })),
    });
  } catch (error) {
    console.error('Admin causes GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch causes' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.payload?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const parsed = causeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const created = await prisma.cause.create({ data: parsed.data });
    return NextResponse.json({ cause: created }, { status: 201 });
  } catch (error) {
    console.error('Admin causes POST error:', error);
    return NextResponse.json({ error: 'Failed to create cause' }, { status: 500 });
  }
}
