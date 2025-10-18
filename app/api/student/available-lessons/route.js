import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.payload.userId;

    // Verify user is a student
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true }
    });

    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can browse lessons' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build filter
    const where = {
      status: 'PENDING', // Only show open slots
      studentId: null, // Not yet booked
      scheduledAt: {
        gte: new Date() // Future lessons only
      }
    };

    if (trainerId) {
      where.trainerId = trainerId;
    }

    if (startDate) {
      where.scheduledAt.gte = new Date(startDate);
    }

    if (endDate) {
      where.scheduledAt.lte = new Date(endDate);
    }

    // Fetch available lessons
    const lessons = await prisma.lesson.findMany({
      where,
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
            trainerProfile: {
              select: {
                title: true,
                bio: true,
                rating: true,
                hourlyRate: true,
                experience: true,
                specialties: true,
                profileImage: true,
              }
            }
          }
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });

    return NextResponse.json({ lessons });

  } catch (error) {
    console.error('Available lessons error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available lessons' },
      { status: 500 }
    );
  }
}
