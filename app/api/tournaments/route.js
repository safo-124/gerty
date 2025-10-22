import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Public tournaments listing; creation is handled via admin API

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        include: {
          organizer: { select: { id: true, name: true, email: true, role: true } },
          _count: {
            select: { participants: true },
          },
        },
        orderBy: { startDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.tournament.count({ where }),
    ]);

    return NextResponse.json({
      tournaments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get tournaments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Creation is not supported on the public endpoint; use admin API instead.
export async function POST() {
  return NextResponse.json({ error: 'Use /api/admin/tournaments to create tournaments' }, { status: 405 });
}
