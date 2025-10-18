import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const STUDENT_SELECT = {
  id: true,
  name: true,
  email: true,
  studentProfile: {
    select: {
      currentRating: true,
      targetRating: true,
      preferredStyle: true,
    },
  },
};

const LESSON_SELECT = {
  id: true,
  title: true,
  scheduledAt: true,
  duration: true,
  status: true,
  meetingLink: true,
};

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.payload.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Only trainers can view training requests' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const requests = await prisma.trainingRequest.findMany({
      where: {
        trainerId: userId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: STUDENT_SELECT },
        lesson: { select: LESSON_SELECT },
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Trainer training requests GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch training requests' }, { status: 500 });
  }
}
