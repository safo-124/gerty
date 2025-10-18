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
    });

    if (!user || user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Only trainers can export student progress' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const lessons = await prisma.lesson.findMany({
      where: {
        trainerId: userId,
        ...(startDateParam || endDateParam
          ? {
              scheduledAt: {
                ...(startDateParam ? { gte: new Date(startDateParam) } : {}),
                ...(endDateParam
                  ? (() => {
                      const end = new Date(endDateParam);
                      end.setHours(23, 59, 59, 999);
                      return { lte: end };
                    })()
                  : {}),
              },
            }
          : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            studentProfile: {
              select: {
                currentRating: true,
                targetRating: true,
                preferredStyle: true,
                goals: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledAt: 'desc',
      },
    });

    const studentMap = new Map();

    lessons.forEach((lesson) => {
      const student = lesson.student;
      if (!student) {
        return;
      }
      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          id: student.id,
          name: student.name,
          email: student.email,
          rating: student.studentProfile?.currentRating || '',
          targetRating: student.studentProfile?.targetRating || '',
          preferredStyle: student.studentProfile?.preferredStyle || '',
          goals: Array.isArray(student.studentProfile?.goals)
            ? student.studentProfile.goals.join('; ')
            : student.studentProfile?.goals || '',
          totalLessons: 0,
          completedLessons: 0,
          upcomingLessons: 0,
          lastLessonDate: null,
          nextLessonDate: null,
        });
      }

      const studentStats = studentMap.get(student.id);
      studentStats.totalLessons += 1;

      if (lesson.status === 'COMPLETED') {
        studentStats.completedLessons += 1;
      }

      const lessonDate = new Date(lesson.scheduledAt);

      if (lesson.status === 'SCHEDULED' && lessonDate >= new Date()) {
        studentStats.upcomingLessons += 1;
        if (!studentStats.nextLessonDate || lessonDate < new Date(studentStats.nextLessonDate)) {
          studentStats.nextLessonDate = lessonDate.toISOString();
        }
      }

      if (!studentStats.lastLessonDate || lessonDate > new Date(studentStats.lastLessonDate)) {
        studentStats.lastLessonDate = lessonDate.toISOString();
      }
    });

    const rows = [];
    rows.push([
      'Student Name',
      'Email',
      'Current Rating',
      'Target Rating',
      'Preferred Style',
      'Goals',
      'Total Lessons',
      'Completed Lessons',
      'Upcoming Lessons',
      'Last Lesson Date',
      'Next Lesson Date',
    ]);

    const students = Array.from(studentMap.values());

    students.forEach((student) => {
      rows.push([
        student.name,
        student.email,
        student.rating,
        student.targetRating,
        student.preferredStyle,
        student.goals,
        student.totalLessons,
        student.completedLessons,
        student.upcomingLessons,
        student.lastLessonDate ? student.lastLessonDate.split('T')[0] : '',
        student.nextLessonDate ? student.nextLessonDate.split('T')[0] : '',
      ]);
    });

    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Total Students', students.length]);
    const totalLessons = students.reduce((sum, s) => sum + s.totalLessons, 0);
    rows.push(['Total Lessons', totalLessons]);

    const csvString = rows
      .map((row) => row.map((value) => formatCsvValue(value)).join(','))
      .join('\n');

    const filenameParts = ['student-progress'];
    if (startDateParam) filenameParts.push(`from-${startDateParam}`);
    if (endDateParam) filenameParts.push(`to-${endDateParam}`);
    const filename = `${filenameParts.join('_')}_${Date.now()}.csv`;

    return new NextResponse(csvString, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Student progress export error:', error);
    return NextResponse.json(
      { error: 'Failed to export student progress' },
      { status: 500 },
    );
  }
}
