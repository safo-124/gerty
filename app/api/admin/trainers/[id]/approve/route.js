import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.payload.userId },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const trainerId = params.id;

    const trainer = await prisma.trainerProfile.update({
      where: { id: trainerId },
      data: { approved: true },
    });

    return NextResponse.json({ trainer });
  } catch (error) {
    console.error('Admin trainer approve POST error:', error);
    return NextResponse.json({ error: 'Failed to approve trainer' }, { status: 500 });
  }
}
