import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.payload.userId;
    const { id } = params;

    const body = await request.json().catch(() => ({}));
    const { paymentReference } = body || {};

    const trainingRequest = await prisma.trainingRequest.findUnique({
      where: { id },
      include: {
        student: { select: { id: true } },
        trainer: {
          select: {
            id: true,
            name: true,
            trainerProfile: { select: { hourlyRate: true } },
          },
        },
        lesson: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
          },
        },
      },
    });

    if (!trainingRequest) {
      return NextResponse.json({ error: 'Training request not found' }, { status: 404 });
    }

    if (trainingRequest.student.id !== userId) {
      return NextResponse.json({ error: 'You are not allowed to pay for this request' }, { status: 403 });
    }

    if (trainingRequest.paymentStatus !== 'PENDING') {
      return NextResponse.json({ error: 'This request has already been processed' }, { status: 400 });
    }

    if (trainingRequest.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ error: 'Request is not awaiting payment' }, { status: 400 });
    }

    const updatedRequest = await prisma.trainingRequest.update({
      where: { id },
      data: {
        paymentStatus: 'PAID',
        status: 'PENDING_TRAINER_CONFIRMATION',
        paidAt: new Date(),
        paymentReference:
          paymentReference || `PAY-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
            trainerProfile: {
              select: { hourlyRate: true, title: true },
            },
          },
        },
        lesson: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            meetingLink: true,
          },
        },
      },
    });

    return NextResponse.json({ request: updatedRequest });
  } catch (error) {
    console.error('Student training request payment error:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}
