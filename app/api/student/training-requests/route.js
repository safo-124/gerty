import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const TRAINER_SELECT = {
  id: true,
  name: true,
  email: true,
  trainerProfile: {
    select: {
      title: true,
      hourlyRate: true,
      rating: true,
      totalStudents: true,
      specialties: true,
      profileImage: true,
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

    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can view training requests' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const requests = await prisma.trainingRequest.findMany({
      where: {
        studentId: userId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        trainer: { select: TRAINER_SELECT },
        lesson: { select: LESSON_SELECT },
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Student training requests GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch training requests' }, { status: 500 });
  }
}

export async function POST(request) {
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

    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can create training requests' }, { status: 403 });
    }

    const body = await request.json();
    const {
      trainerId,
      preferredSchedule,
      durationMinutes,
      focusAreas,
      message,
    } = body || {};

    if (!trainerId) {
      return NextResponse.json({ error: 'Trainer is required' }, { status: 400 });
    }

    if (!durationMinutes || Number(durationMinutes) <= 0) {
      return NextResponse.json({ error: 'Duration must be greater than 0' }, { status: 400 });
    }

    const trainerProfile = await prisma.trainerProfile.findUnique({
      where: { userId: trainerId },
      select: { hourlyRate: true, userId: true },
    });

    if (!trainerProfile) {
      return NextResponse.json({ error: 'Trainer profile not found' }, { status: 404 });
    }

    if (trainerProfile.hourlyRate == null) {
      return NextResponse.json({ error: 'Trainer has not set an hourly rate yet' }, { status: 400 });
    }

    const amount = Number(
      ((trainerProfile.hourlyRate * Number(durationMinutes)) / 60).toFixed(2)
    );

    if (amount <= 0) {
      return NextResponse.json({ error: 'Calculated amount is invalid' }, { status: 400 });
    }

    let scheduleDate = null;
    if (preferredSchedule) {
      const parsed = new Date(preferredSchedule);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Preferred schedule is invalid' }, { status: 400 });
      }
      scheduleDate = parsed;
    }

    const requestRecord = await prisma.trainingRequest.create({
      data: {
        studentId: userId,
        trainerId,
        amount,
        currency: 'USD',
        preferredSchedule: scheduleDate,
        duration: Number(durationMinutes),
        focusAreas: focusAreas ? String(focusAreas) : null,
        message: message ? String(message) : null,
      },
      include: {
        trainer: { select: TRAINER_SELECT },
        lesson: { select: LESSON_SELECT },
      },
    });

    return NextResponse.json({ request: requestRecord }, { status: 201 });
  } catch (error) {
    console.error('Student training requests POST error:', error);
    return NextResponse.json({ error: 'Failed to create training request' }, { status: 500 });
  }
}
