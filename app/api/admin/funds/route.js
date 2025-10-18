import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.payload.userId },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const donations = await prisma.donation.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        amount: true,
        currency: true,
        message: true,
        createdAt: true,
      },
    });

    const totals = await prisma.donation.groupBy({
      by: ['currency'],
      _sum: { amount: true },
    });

    return NextResponse.json({
      donations,
      totals: totals.map((entry) => ({
        currency: entry.currency,
        amount: entry._sum.amount ?? 0,
      })),
    });
  } catch (error) {
    console.error('Admin funds GET error:', error);
    return NextResponse.json({ error: 'Failed to load donation data' }, { status: 500 });
  }
}
