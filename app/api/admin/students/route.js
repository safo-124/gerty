import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
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

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        studentProfile: {
          select: {
            currentRating: true,
            targetRating: true,
            preferredStyle: true,
            country: true,
          },
        },
      },
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error('Admin students GET error:', error);
    return NextResponse.json({ error: 'Failed to load students' }, { status: 500 });
  }
}
