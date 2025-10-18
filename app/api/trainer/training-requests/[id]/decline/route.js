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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Only trainers can decline requests' }, { status: 403 });
    }

    const trainingRequest = await prisma.trainingRequest.findUnique({
      where: { id },
      select: {
        id: true,
        trainerId: true,
        status: true,
      },
    });

    if (!trainingRequest) {
      return NextResponse.json({ error: 'Training request not found' }, { status: 404 });
    }

    if (trainingRequest.trainerId !== userId) {
      return NextResponse.json({ error: 'You are not allowed to decline this request' }, { status: 403 });
    }

    if (trainingRequest.status === 'DECLINED' || trainingRequest.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Request already handled' }, { status: 400 });
    }

    const updatedRequest = await prisma.trainingRequest.update({
      where: { id },
      data: {
        status: 'DECLINED',
      },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ request: updatedRequest });
  } catch (error) {
    console.error('Trainer decline training request error:', error);
    return NextResponse.json({ error: 'Failed to decline training request' }, { status: 500 });
  }
}
