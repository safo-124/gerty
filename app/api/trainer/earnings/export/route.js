import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function formatCsvValue(value) {
  if (value === null || value === undefined) {
    return '""';
  }
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
}

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.payload.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        trainerProfile: true,
      },
    });

    if (!user || user.role !== 'TRAINER' || !user.trainerProfile) {
      return NextResponse.json({ error: 'Only trainers can export earnings' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let dateFilter = {};
    if (startDateParam) {
      const startDate = new Date(startDateParam);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: 'Invalid start date' }, { status: 400 });
      }
      dateFilter.gte = startDate;
    }
    if (endDateParam) {
      const endDate = new Date(endDateParam);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Invalid end date' }, { status: 400 });
      }
      // include entire day
      endDate.setHours(23, 59, 59, 999);
      dateFilter.lte = endDate;
    }

    const lessons = await prisma.lesson.findMany({
      where: {
        trainerId: userId,
        status: 'COMPLETED',
        ...(Object.keys(dateFilter).length ? { scheduledAt: dateFilter } : {}),
      },
      include: {
        student: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    const hourlyRate = user.trainerProfile.hourlyRate || 0;
    const rows = [];
    let totalMinutes = 0;
    let totalEarnings = 0;

    rows.push([
      'Date',
      'Student Name',
      'Student Email',
      'Duration (minutes)',
      'Hourly Rate',
      'Lesson Earnings',
      'Lesson Title',
    ]);

    lessons.forEach((lesson) => {
      const lessonMinutes = lesson.duration;
      const lessonEarnings = ((lessonMinutes / 60) * hourlyRate);
      totalMinutes += lessonMinutes;
      totalEarnings += lessonEarnings;

      rows.push([
        new Date(lesson.scheduledAt).toISOString().split('T')[0],
        lesson.student?.name || 'Unknown',
        lesson.student?.email || 'N/A',
        lessonMinutes,
        `$${hourlyRate.toFixed(2)}`,
        `$${lessonEarnings.toFixed(2)}`,
        lesson.title,
      ]);
    });

    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Total Lessons', lessons.length]);
    rows.push(['Total Hours', (totalMinutes / 60).toFixed(2)]);
    rows.push(['Total Earnings', `$${totalEarnings.toFixed(2)}`]);

    const csvString = rows
      .map((row) => row.map((value) => formatCsvValue(value)).join(','))
      .join('\n');

    const filenameParts = ['earnings'];
    if (startDateParam) filenameParts.push(`from-${startDateParam}`);
    if (endDateParam) filenameParts.push(`to-${endDateParam}`);
    const filename = `${filenameParts.join('_') || 'earnings'}_${Date.now()}.csv`;

    return new NextResponse(csvString, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Earnings export error:', error);
    return NextResponse.json(
      { error: 'Failed to export earnings' },
      { status: 500 },
    );
  }
}
