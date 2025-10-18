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

    // Get unique students who have booked lessons
    const lessons = await prisma.lesson.findMany({
      where: {
        trainerId: userId,
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

    // Group by student and calculate stats
    const studentMap = new Map();

    lessons.forEach((lesson) => {
      const studentId = lesson.student.id;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          ...lesson.student,
          totalLessons: 0,
          completedLessons: 0,
          upcomingLessons: 0,
          lastLessonDate: null,
          nextLessonDate: null,
        });
      }

      const studentData = studentMap.get(studentId);
      studentData.totalLessons++;

      if (lesson.status === 'COMPLETED') {
        studentData.completedLessons++;
      }

      if (lesson.status === 'SCHEDULED' && new Date(lesson.scheduledAt) >= new Date()) {
        studentData.upcomingLessons++;
        if (!studentData.nextLessonDate || new Date(lesson.scheduledAt) < new Date(studentData.nextLessonDate)) {
          studentData.nextLessonDate = lesson.scheduledAt;
        }
      }

      if (!studentData.lastLessonDate || new Date(lesson.scheduledAt) > new Date(studentData.lastLessonDate)) {
        studentData.lastLessonDate = lesson.scheduledAt;
      }
    });

    const students = Array.from(studentMap.values());

    return NextResponse.json({
      students,
      totalStudents: students.length,
    });
  } catch (error) {
    console.error('Trainer students error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
