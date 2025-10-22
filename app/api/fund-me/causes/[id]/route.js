import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const cause = await prisma.cause.findUnique({ where: { id } });
    if (!cause || !cause.active) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [aggregates, donations] = await Promise.all([
      prisma.donation.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
        where: { causeId: id },
      }),
      prisma.donation.findMany({
        where: { causeId: id },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
    ]);

    return NextResponse.json({
      cause,
      totals: {
        totalAmount: aggregates._sum.amount || 0,
        donationCount: aggregates._count._all || 0,
      },
      donations,
    });
  } catch (error) {
    console.error('Public cause GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch cause' }, { status: 500 });
  }
}
