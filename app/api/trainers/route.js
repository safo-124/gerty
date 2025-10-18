import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const specialty = searchParams.get('specialty') || '';
    const minRating = searchParams.get('minRating');
    const maxRate = searchParams.get('maxRate');
    const featured = searchParams.get('featured') === 'true';
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      ...(search && {
        OR: [
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { title: { contains: search, mode: 'insensitive' } },
          { bio: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(specialty && {
        specialties: { has: specialty },
      }),
      ...(minRating && {
        rating: { gte: parseInt(minRating) },
      }),
      ...(maxRate && {
        hourlyRate: { lte: parseFloat(maxRate) },
      }),
      ...(featured && { featured: true }),
    };

    // Get trainers with pagination
    const [trainers, total] = await Promise.all([
      prisma.trainerProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reviews: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
        orderBy: [
          { featured: 'desc' },
          { averageRating: 'desc' },
          { totalStudents: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.trainerProfile.count({ where }),
    ]);

    return NextResponse.json({
      trainers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get trainers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
