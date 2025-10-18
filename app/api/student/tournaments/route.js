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

    // Check if user is a student
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can access this resource' },
        { status: 403 }
      );
    }

    // Get enrolled tournaments with details
    const enrollments = await prisma.tournamentParticipant.findMany({
      where: {
        userId: userId,
      },
      include: {
        tournament: {
          include: {
            organizer: {
              select: {
                userId: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            _count: {
              select: {
                participants: true,
              },
            },
          },
        },
      },
      orderBy: {
        tournament: {
          startDate: 'asc',
        },
      },
    });

    // Format the response
    const tournaments = enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      registeredAt: enrollment.registeredAt,
      score: enrollment.score,
      rank: enrollment.rank,
      tournament: {
        id: enrollment.tournament.id,
        name: enrollment.tournament.name,
        description: enrollment.tournament.description,
        startDate: enrollment.tournament.startDate,
        endDate: enrollment.tournament.endDate,
        registrationEnd: enrollment.tournament.registrationEnd,
        status: enrollment.tournament.status,
        format: enrollment.tournament.format,
        timeControl: enrollment.tournament.timeControl,
        entryFee: enrollment.tournament.entryFee,
        prizePool: enrollment.tournament.prizePool,
        maxParticipants: enrollment.tournament.maxParticipants,
        currentParticipants: enrollment.tournament._count.participants,
        image: enrollment.tournament.image,
        organizer: enrollment.tournament.organizer.user.name,
      },
    }));

    // Separate by status
    const upcoming = tournaments.filter((t) => t.tournament.status === 'UPCOMING' || t.tournament.status === 'ONGOING');
    const past = tournaments.filter((t) => t.tournament.status === 'COMPLETED' || t.tournament.status === 'CANCELLED');

    return NextResponse.json({
      tournaments,
      upcoming,
      past,
      totalCount: tournaments.length,
    });
  } catch (error) {
    console.error('Student tournaments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
