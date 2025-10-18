import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request) {
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
      return NextResponse.json({ error: 'Only students can book lessons' }, { status: 403 });
    }

    const body = await request.json();
    const { lessonId } = body;

    if (!lessonId) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

    // Fetch the lesson
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        trainer: {
          include: {
            trainerProfile: true
          }
        }
      }
    });

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Check if lesson is still available
    if (lesson.status !== 'PENDING' || lesson.studentId !== null) {
      return NextResponse.json(
        { error: 'This lesson is no longer available' },
        { status: 409 }
      );
    }

    // Check if lesson is in the future
    if (new Date(lesson.scheduledAt) < new Date()) {
      return NextResponse.json(
        { error: 'Cannot book past lessons' },
        { status: 400 }
      );
    }

    // Check for student scheduling conflicts
    const conflictingLessons = await prisma.lesson.findMany({
      where: {
        studentId: userId,
        scheduledAt: {
          gte: new Date(new Date(lesson.scheduledAt).getTime() - lesson.duration * 60000),
          lte: new Date(new Date(lesson.scheduledAt).getTime() + lesson.duration * 60000)
        },
        status: {
          not: 'CANCELLED'
        }
      }
    });

    if (conflictingLessons.length > 0) {
      return NextResponse.json(
        { error: 'You have a scheduling conflict at this time' },
        { status: 409 }
      );
    }

    // Book the lesson
    const bookedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        studentId: userId,
        status: 'SCHEDULED'
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
            trainerProfile: true
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            studentProfile: true
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Lesson booked successfully',
      lesson: bookedLesson
    }, { status: 200 });

  } catch (error) {
    console.error('Book lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to book lesson' },
      { status: 500 }
    );
  }
}
