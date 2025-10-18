import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.payload.userId;

    // Check if user is a trainer
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'TRAINER') {
      return NextResponse.json(
        { error: 'Only trainers can access this resource' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      trainerId: userId,
    };

    if (status === 'upcoming') {
      where.status = 'SCHEDULED';
      where.scheduledAt = {
        gte: new Date(),
      };
    } else if (status === 'past') {
      where.OR = [
        { status: 'COMPLETED' },
        { status: 'CANCELLED' },
        {
          status: 'SCHEDULED',
          scheduledAt: {
            lt: new Date(),
          },
        },
      ];
    }

    // Get lessons with student details
    const lessons = await prisma.lesson.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            studentProfile: {
              select: {
                currentRating: true,
                preferredStyle: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledAt: status === 'past' ? 'desc' : 'asc',
      },
      skip,
      take: limit,
    });

    // Get total count for pagination
    const totalCount = await prisma.lesson.count({ where });

    return NextResponse.json({
      lessons,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Trainer lessons error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
