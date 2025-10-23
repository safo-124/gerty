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
      include: {
        trainerProfile: true,
      },
    });

    if (!user || user.role !== 'TRAINER') {
      return NextResponse.json(
        { error: 'Only trainers can access this resource' },
        { status: 403 }
      );
    }

    const trainerProfileId = user.trainerProfile.id;

    // Get total students (unique students who have booked lessons)
    const uniqueStudents = await prisma.lesson.findMany({
      where: {
        trainerId: userId,
      },
      select: {
        studentId: true,
      },
      distinct: ['studentId'],
    });

    // Get total lessons count
    const totalLessons = await prisma.lesson.count({
      where: {
        trainerId: userId,
      },
    });

    // Get completed lessons count
    const completedLessons = await prisma.lesson.count({
      where: {
        trainerId: userId,
        status: 'COMPLETED',
      },
    });

    // Get upcoming lessons count
    const upcomingLessons = await prisma.lesson.count({
      where: {
        trainerId: userId,
        status: 'SCHEDULED',
        scheduledAt: {
          gte: new Date(),
        },
      },
    });

    // Calculate total earnings (assuming hourlyRate * lesson duration for completed lessons)
    const lessonsWithDuration = await prisma.lesson.findMany({
      where: {
        trainerId: userId,
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
    const totalHours = totalMinutes / 60;
    const hourlyRate = user.trainerProfile.hourlyRate || 0;
    const totalEarnings = totalHours * hourlyRate;

    // Get trainer profile stats
    const { averageRating, totalStudents: profileStudents } = user.trainerProfile;

    return NextResponse.json({
      stats: {
        totalStudents: uniqueStudents.length,
        totalLessons,
        completedLessons,
        upcomingLessons,
        averageRating: averageRating || 0,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        hourlyRate: hourlyRate || 0,
      },
      profile: {
        title: user.trainerProfile.title,
        bio: user.trainerProfile.bio,
        specialties: user.trainerProfile.specialties,
        experience: user.trainerProfile.experience,
        rating: user.trainerProfile.rating,
        featured: user.trainerProfile.featured,
        country: user.trainerProfile.country,
      },
    });
  } catch (error) {
    console.error('Trainer stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
