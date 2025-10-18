import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const REQUEST_STUDENT_SELECT = {
  id: true,
  name: true,
  email: true,
  studentProfile: {
    select: {
      currentRating: true,
      targetRating: true,
    },
  },
};

const REQUEST_LESSON_SELECT = {
  id: true,
  scheduledAt: true,
  status: true,
  meetingLink: true,
  duration: true,
  title: true,
};

const parseDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export async function POST(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.payload.userId;
    const requestId = params?.id;

    if (!requestId) {
      return NextResponse.json({ error: 'Training request ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Only trainers can accept requests' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      scheduledAt,
      durationMinutes,
      meetingLink,
      title,
    } = body || {};

    const trainingRequest = await prisma.trainingRequest.findUnique({
      where: { id: requestId },
      include: {
        student: { select: REQUEST_STUDENT_SELECT },
        lesson: { select: { id: true, status: true } },
      },
    });

    if (!trainingRequest) {
      return NextResponse.json({ error: 'Training request not found' }, { status: 404 });
    }

    if (trainingRequest.trainerId !== userId) {
      return NextResponse.json({ error: 'You are not allowed to accept this request' }, { status: 403 });
    }

    if (trainingRequest.paymentStatus !== 'PAID') {
      return NextResponse.json({ error: 'Request has not been paid yet' }, { status: 400 });
    }

    if (trainingRequest.status !== 'PENDING_TRAINER_CONFIRMATION') {
      return NextResponse.json({ error: 'Request cannot be accepted in its current status' }, { status: 400 });
    }

    if (trainingRequest.lesson) {
      return NextResponse.json({ error: 'Lesson already created for this request' }, { status: 409 });
    }

    const parsedScheduledDate = parseDate(scheduledAt);
    const scheduledDate = parsedScheduledDate || trainingRequest.preferredSchedule;

    if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'A valid scheduled date is required' }, { status: 400 });
    }

    const lessonDuration = durationMinutes !== undefined && durationMinutes !== null
      ? Number(durationMinutes)
      : trainingRequest.duration || 60;

    if (!Number.isFinite(lessonDuration) || lessonDuration <= 0) {
      return NextResponse.json({ error: 'Lesson duration must be greater than 0' }, { status: 400 });
    }

    const normalizedTitle = typeof title === 'string' && title.trim().length > 0
      ? title.trim()
      : 'Personalized Chess Training Session';

    const normalizedMeetingLink = typeof meetingLink === 'string' && meetingLink.trim().length > 0
      ? meetingLink.trim()
      : null;

    const [lesson, updatedRequest] = await prisma.$transaction([
      prisma.lesson.create({
        data: {
          studentId: trainingRequest.studentId,
          trainerId: trainingRequest.trainerId,
          title: normalizedTitle,
          description: trainingRequest.focusAreas || trainingRequest.message || 'Custom training session',
          scheduledAt: scheduledDate,
          duration: lessonDuration,
          status: 'SCHEDULED',
          meetingLink: normalizedMeetingLink,
          trainingRequestId: trainingRequest.id,
        },
        include: {
          student: {
            select: { id: true, name: true, email: true },
          },
          trainer: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.trainingRequest.update({
        where: { id: trainingRequest.id },
        data: {
          status: 'SCHEDULED',
        },
        include: {
          student: { select: REQUEST_STUDENT_SELECT },
          lesson: { select: REQUEST_LESSON_SELECT },
        },
      }),
    ]);

    return NextResponse.json({ request: updatedRequest, lesson });
  } catch (error) {
    console.error('Trainer accept training request error:', error);
    return NextResponse.json({ error: 'Failed to accept training request' }, { status: 500 });
  }
}
