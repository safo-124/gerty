import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        organizer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            { rank: 'asc' },
            { score: 'desc' },
          ],
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ tournament });
  } catch (error) {
    console.error('Get tournament error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const userData = getUserFromRequest(request);
    
    if (!userData || userData.role !== 'TRAINER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Get trainer profile
    const trainerProfile = await prisma.trainerProfile.findUnique({
      where: { userId: userData.userId },
    });

    // Check if tournament exists and belongs to this trainer
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    if (tournament.organizerId !== trainerProfile.id) {
      return NextResponse.json(
        { error: 'You can only update your own tournaments' },
        { status: 403 }
      );
    }

    const updatedTournament = await prisma.tournament.update({
      where: { id },
      data: {
        ...body,
        ...(body.startDate && { startDate: new Date(body.startDate) }),
        ...(body.endDate && { endDate: new Date(body.endDate) }),
        ...(body.registrationEnd && { registrationEnd: new Date(body.registrationEnd) }),
      },
      include: {
        organizer: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Tournament updated successfully',
      tournament: updatedTournament,
    });
  } catch (error) {
    console.error('Update tournament error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const userData = getUserFromRequest(request);
    
    if (!userData || userData.role !== 'TRAINER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Get trainer profile
    const trainerProfile = await prisma.trainerProfile.findUnique({
      where: { userId: userData.userId },
    });

    // Check if tournament exists and belongs to this trainer
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    if (tournament.organizerId !== trainerProfile.id) {
      return NextResponse.json(
        { error: 'You can only delete your own tournaments' },
        { status: 403 }
      );
    }

    await prisma.tournament.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Tournament deleted successfully',
    });
  } catch (error) {
    console.error('Delete tournament error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
