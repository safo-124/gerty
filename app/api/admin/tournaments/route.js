import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { tournamentSchema } from '@/lib/validation';
import { z } from 'zod';

const adminTournamentSchema = tournamentSchema.extend({
  organizerId: z.string(),
});

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
        organizer: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
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
        prizePool: tournament.prizePool,
        format: tournament.format,
        timeControl: tournament.timeControl,
        image: tournament.image,
        rules: tournament.rules,
        createdAt: tournament.createdAt,
        organizer: {
          id: tournament.organizer.id,
          approved: tournament.organizer.approved,
          user: tournament.organizer.user,
        },
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

    const validation = adminTournamentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid tournament data', details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    const organizer = await prisma.trainerProfile.findUnique({
      where: { id: data.organizerId },
      select: { id: true, approved: true },
    });

    if (!organizer) {
      return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
    }

    if (!organizer.approved) {
      return NextResponse.json(
        { error: 'Organizer must be an approved trainer' },
        { status: 400 },
      );
    }

    const tournament = await prisma.tournament.create({
      data: {
        name: data.name,
        description: data.description,
        organizerId: data.organizerId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        registrationEnd: new Date(data.registrationEnd),
        maxParticipants: data.maxParticipants ?? null,
        entryFee: data.entryFee ?? null,
        prizePool: data.prizePool ?? null,
        format: data.format,
        timeControl: data.timeControl,
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
