import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { lessonSchema } from '@/lib/validation';

export async function GET(request) {
  try {
    const userData = getUserFromRequest(request);
    
    if (!userData) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const role = searchParams.get('role'); // 'student' or 'trainer'

    const where = {
      ...(status && { status }),
      ...(role === 'student' && { studentId: userData.userId }),
      ...(role === 'trainer' && { trainerId: userData.userId }),
      ...(!role && {
        OR: [
          { studentId: userData.userId },
          { trainerId: userData.userId },
        ],
      }),
    };

    const lessons = await prisma.lesson.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error('Get lessons error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const userData = getUserFromRequest(request);
    
    if (!userData || userData.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can book lessons' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = lessonSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if trainer exists
    const trainer = await prisma.user.findUnique({
      where: { id: data.trainerId, role: 'TRAINER' },
    });

    if (!trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }

    const lesson = await prisma.lesson.create({
      data: {
        ...data,
        studentId: userData.userId,
        scheduledAt: new Date(data.scheduledAt),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update trainer's total lessons count
    await prisma.trainerProfile.update({
      where: { userId: data.trainerId },
      data: {
        totalLessons: { increment: 1 },
      },
    });

    return NextResponse.json({
      message: 'Lesson booked successfully',
      lesson,
    }, { status: 201 });
  } catch (error) {
    console.error('Create lesson error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
