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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all'; // all, month, year
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // Build date filter
    let dateFilter = {};
    if (period === 'month') {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      dateFilter = {
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
      };
    } else if (period === 'year') {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      dateFilter = {
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    // Get completed lessons for earnings calculation
    const completedLessons = await prisma.lesson.findMany({
      where: {
        trainerId: userId,
        status: 'COMPLETED',
        ...dateFilter,
      },
      select: {
        duration: true,
        scheduledAt: true,
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    const hourlyRate = user.trainerProfile.hourlyRate || 0;

    // Calculate total earnings
    const totalMinutes = completedLessons.reduce((sum, lesson) => sum + lesson.duration, 0);
    const totalHours = totalMinutes / 60;
    const totalEarnings = totalHours * hourlyRate;

    // Group by month for trend analysis
    const monthlyEarnings = {};
    completedLessons.forEach((lesson) => {
      const date = new Date(lesson.scheduledAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyEarnings[monthKey]) {
        monthlyEarnings[monthKey] = {
          month: monthKey,
          lessons: 0,
          minutes: 0,
          earnings: 0,
        };
      }
      
      monthlyEarnings[monthKey].lessons++;
      monthlyEarnings[monthKey].minutes += lesson.duration;
      monthlyEarnings[monthKey].earnings += (lesson.duration / 60) * hourlyRate;
    });

    // Convert to array and sort
    const earningsTrend = Object.values(monthlyEarnings).sort((a, b) => 
      a.month.localeCompare(b.month)
    );

    // Calculate average per lesson
    const avgEarningsPerLesson = completedLessons.length > 0
      ? totalEarnings / completedLessons.length
      : 0;

    return NextResponse.json({
      summary: {
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        totalLessons: completedLessons.length,
        totalHours: Math.round(totalHours * 10) / 10,
        hourlyRate,
        avgEarningsPerLesson: Math.round(avgEarningsPerLesson * 100) / 100,
      },
      trend: earningsTrend,
      period: {
        type: period,
        year,
        month: period === 'month' ? month : undefined,
      },
    });
  } catch (error) {
    console.error('Earnings fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
