import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { tournamentSchema } from '@/lib/validation';

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

    const tournaments = await prisma.tournament.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        organizer: { select: { id: true, name: true, email: true, role: true } },
        participants: {
          select: { id: true },
        },
      },
    });

    return NextResponse.json({
      tournaments: tournaments.map((tournament) => ({
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        status: tournament.status,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        registrationEnd: tournament.registrationEnd,
        maxParticipants: tournament.maxParticipants,
        entryFee: tournament.entryFee,
  registrationFree: tournament.registrationFree,
        prizePool: tournament.prizePool,
        format: tournament.format,
        timeControl: tournament.timeControl,
  mode: tournament.mode,
        image: tournament.image,
        rules: tournament.rules,
        createdAt: tournament.createdAt,
        organizer: tournament.organizer,
        participantsCount: tournament.participants.length,
      })),
    });
  } catch (error) {
    console.error('Admin tournaments GET error:', error);
    return NextResponse.json({ error: 'Failed to load tournaments' }, { status: 500 });
  }
}

export async function POST(request) {
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

    const body = await request.json();

    const validation = tournamentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid tournament data', details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    const tournament = await prisma.tournament.create({
      data: {
        name: data.name,
        description: data.description,
        organizerId: authResult.payload.userId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        registrationEnd: new Date(data.registrationEnd),
        maxParticipants: data.maxParticipants ?? null,
        entryFee: data.registrationFree ? 0 : (data.entryFee ?? 0),
        registrationFree: !!data.registrationFree,
        prizePool: data.prizePool ?? null,
        format: data.format,
        timeControl: data.timeControl,
        mode: data.mode || 'IN_PERSON',
        status: data.status || undefined,
        image: data.image || null,
        rules: data.rules || null,
      },
    });

    return NextResponse.json({ tournament }, { status: 201 });
  } catch (error) {
    console.error('Admin tournaments POST error:', error);
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 });
  }
}
