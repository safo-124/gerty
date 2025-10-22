import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const causes = await prisma.cause.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });

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
    console.error('Public causes GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch causes' }, { status: 500 });
  }
}
