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

    // Verify user is a trainer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { trainerProfile: true }
    });

    if (!user || user.role !== 'TRAINER' || !user.trainerProfile) {
      return NextResponse.json({ error: 'Only trainers can create lessons' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      duration, // in minutes
      scheduledAt,
      maxStudents = 1,
      lessonType = 'PRIVATE', // PRIVATE or GROUP
      studentId, // optional - for pre-assigned lessons
    } = body;

    // Validation
    if (!title || !duration || !scheduledAt) {
      return NextResponse.json(
        { error: 'Title, duration, and scheduled time are required' },
        { status: 400 }
      );
    }

    if (duration < 15 || duration > 300) {
      return NextResponse.json(
        { error: 'Duration must be between 15 and 300 minutes' },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduled date' },
        { status: 400 }
      );
    }

    if (scheduledDate < new Date()) {
      return NextResponse.json(
        { error: 'Cannot schedule lessons in the past' },
        { status: 400 }
      );
    }

    // Check for scheduling conflicts
    const conflictingLessons = await prisma.lesson.findMany({
      where: {
        trainerId: userId,
        scheduledAt: {
          gte: new Date(scheduledDate.getTime() - duration * 60000),
          lte: new Date(scheduledDate.getTime() + duration * 60000)
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

    // Create the lesson
    const lesson = await prisma.lesson.create({
      data: {
        title,
        description: description || '',
        duration,
        scheduledAt: scheduledDate,
        status: studentId ? 'SCHEDULED' : 'PENDING', // PENDING if no student assigned yet
        trainerId: userId,
        studentId: studentId || null,
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
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Lesson created successfully',
      lesson
    }, { status: 201 });

  } catch (error) {
    console.error('Create lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson' },
      { status: 500 }
    );
  }
}
