import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const isMissingDonationTable = (error) => {
  if (!error) return false;
  if (error.code === 'P2021' || error.code === 'P2010') return true;
  const message = typeof error.message === 'string' ? error.message : '';
  return message.includes('Donation') && message.includes('doesn') && message.includes('exist');
};
import { donationSchema } from '@/lib/validation';

export async function GET() {
  try {
    const [donations, aggregates] = await Promise.all([
      prisma.donation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      prisma.donation.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({
      donations,
      summary: {
        totalAmount: aggregates._sum.amount || 0,
        totalDonations: aggregates._count._all || 0,
      },
    });
  } catch (error) {
    console.error('Fund Me donations GET error:', error);
    if (isMissingDonationTable(error)) {
      return NextResponse.json({
        donations: [],
        summary: {
          totalAmount: 0,
          totalDonations: 0,
        },
        fallback: true,
        message:
          'Donation storage is not ready yet. Run: npx prisma migrate dev --name add_donations_and_trainer_approval',
      });
    }
    return NextResponse.json({ error: 'Unable to load donations at this time' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const parsed = donationSchema.parse({
      ...payload,
      amount: typeof payload.amount === 'string' ? Number(payload.amount) : payload.amount,
      currency:
        typeof payload.currency === 'string' && payload.currency.trim().length > 0
          ? payload.currency.trim().toUpperCase()
          : undefined,
    });

    if (Number.isNaN(parsed.amount)) {
      return NextResponse.json({ error: 'Donation amount must be a valid number' }, { status: 400 });
    }

    const donation = await prisma.donation.create({
      data: {
        name: parsed.name,
        email: parsed.email || null,
        amount: parsed.amount,
        currency: parsed.currency || 'USD',
        message: parsed.message || null,
      },
    });

    return NextResponse.json({
      donation,
      message: 'Thank you for supporting our outreach efforts!',
    }, { status: 201 });
  } catch (error) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }

    console.error('Fund Me donation POST error:', error);
    return NextResponse.json({ error: 'Unable to process donation' }, { status: 500 });
  }
}
