import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const me = await prisma.user.findUnique({
      where: { id: authResult.payload.userId },
      select: { role: true },
    });
    if (!me || me.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const trainerCount = await prisma.user.count({ where: { role: 'TRAINER' } });

    // Students present today: distinct students with a lesson today (scheduled or completed)
    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const lessonsToday = await prisma.lesson.findMany({
      where: {
        scheduledAt: { gte: todayStart, lte: todayEnd },
        status: { in: ['SCHEDULED', 'COMPLETED'] },
      },
      select: { studentId: true },
      distinct: ['studentId'],
    });
    const studentsPresentToday = lessonsToday.length;

    return NextResponse.json({ trainerCount, studentsPresentToday });
  } catch (error) {
    console.error('Admin stats GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
