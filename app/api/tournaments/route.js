import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { tournamentSchema } from '@/lib/validation';

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
          organizer: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
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

export async function POST(request) {
  try {
    const userData = getUserFromRequest(request);
    
    if (!userData || userData.role !== 'TRAINER') {
      return NextResponse.json(
        { error: 'Only trainers can create tournaments' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = tournamentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Get trainer profile
    const trainerProfile = await prisma.trainerProfile.findUnique({
      where: { userId: userData.userId },
    });

    if (!trainerProfile) {
      return NextResponse.json(
        { error: 'Trainer profile not found' },
        { status: 404 }
      );
    }

    const data = validationResult.data;
    const tournament = await prisma.tournament.create({
      data: {
        ...data,
        organizerId: trainerProfile.id,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        registrationEnd: new Date(data.registrationEnd),
      },
      include: {
        organizer: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Tournament created successfully',
      tournament,
    }, { status: 201 });
  } catch (error) {
    console.error('Create tournament error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
