import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.payload.userId;
    const { id } = params;

    // Verify user is a trainer
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Only trainers can add notes' }, { status: 403 });
    }

    const body = await request.json();
    const { notes } = body;

    // Verify the lesson belongs to this trainer
    const lesson = await prisma.lesson.findUnique({
      where: { id },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (lesson.trainerId !== userId) {
      return NextResponse.json({ error: 'You can only add notes to your own lessons' }, { status: 403 });
    }

    // Update the lesson notes
    const updatedLesson = await prisma.lesson.update({
      where: { id },
      data: { notes },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Notes updated successfully',
      lesson: updatedLesson
    });

  } catch (error) {
    console.error('Update lesson notes error:', error);
    return NextResponse.json(
      { error: 'Failed to update notes' },
      { status: 500 }
    );
  }
}
