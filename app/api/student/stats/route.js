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
      include: {
        studentProfile: true,
      },
    });

    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can access this resource' },
        { status: 403 }
      );
    }

    // Get total lessons count
    const totalLessons = await prisma.lesson.count({
      where: {
        studentId: userId,
      },
    });

    // Get completed lessons count
    const completedLessons = await prisma.lesson.count({
      where: {
        studentId: userId,
        status: 'COMPLETED',
      },
    });

    // Get upcoming lessons count
    const upcomingLessons = await prisma.lesson.count({
      where: {
        studentId: userId,
        status: 'SCHEDULED',
        scheduledAt: {
          gte: new Date(),
        },
      },
    });

    // Get unique trainers (count distinct trainers)
    const lessonsWithTrainers = await prisma.lesson.findMany({
      where: {
        studentId: userId,
      },
      select: {
        trainerId: true,
      },
      distinct: ['trainerId'],
    });

    // Get enrolled tournaments count
    const enrolledTournaments = await prisma.tournamentParticipant.count({
      where: {
        userId: userId,
      },
    });

    // Get upcoming tournaments
    const upcomingTournaments = await prisma.tournamentParticipant.count({
      where: {
        userId: userId,
        tournament: {
          status: 'UPCOMING',
        },
      },
    });

    // Calculate total hours of lessons taken
    const lessonsWithDuration = await prisma.lesson.findMany({
      where: {
        studentId: userId,
        status: 'COMPLETED',
      },
      select: {
        duration: true,
      },
    });

    const totalMinutes = lessonsWithDuration.reduce(
      (sum, lesson) => sum + lesson.duration,
      0
    );
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    // Get student profile info
    const { currentRating, targetRating, preferredStyle, goals } = user.studentProfile || {};

    // Calculate progress percentage (if target rating is set)
    let progressPercentage = 0;
    if (currentRating && targetRating && targetRating > currentRating) {
      progressPercentage = Math.min(
        100,
        Math.round(((currentRating - (currentRating - 200)) / (targetRating - (currentRating - 200))) * 100)
      );
    }

    return NextResponse.json({
      stats: {
        totalLessons,
        completedLessons,
        upcomingLessons,
        uniqueTrainers: lessonsWithTrainers.length,
        enrolledTournaments,
        upcomingTournaments,
        totalHours,
        currentRating: currentRating || null,
        targetRating: targetRating || null,
        progressPercentage,
      },
      profile: {
        preferredStyle: preferredStyle || null,
        goals: goals || null,
      },
    });
  } catch (error) {
    console.error('Student stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
