import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const userData = getUserFromRequest(request);
    
    if (!userData) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Check if registration is still open
    if (new Date() > tournament.registrationEnd) {
      return NextResponse.json(
        { error: 'Registration has closed' },
        { status: 400 }
      );
    }

    // Check if tournament is full
    if (tournament.maxParticipants && tournament._count.participants >= tournament.maxParticipants) {
      return NextResponse.json(
        { error: 'Tournament is full' },
        { status: 400 }
      );
    }

    // Check if already registered
    const existingParticipant = await prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: id,
          userId: userData.userId,
        },
      },
    });

    if (existingParticipant) {
      return NextResponse.json(
        { error: 'Already registered for this tournament' },
        { status: 400 }
      );
    }

    // Register participant
    const participant = await prisma.tournamentParticipant.create({
      data: {
        tournamentId: id,
        userId: userData.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Successfully registered for tournament',
      participant,
    }, { status: 201 });
  } catch (error) {
    console.error('Register tournament error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const userData = getUserFromRequest(request);
    
    if (!userData) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if registered
    const participant = await prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: id,
          userId: userData.userId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Not registered for this tournament' },
        { status: 404 }
      );
    }

    // Unregister
    await prisma.tournamentParticipant.delete({
      where: {
        tournamentId_userId: {
          tournamentId: id,
          userId: userData.userId,
        },
      },
    });

    return NextResponse.json({
      message: 'Successfully unregistered from tournament',
    });
  } catch (error) {
    console.error('Unregister tournament error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
