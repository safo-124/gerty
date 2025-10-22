import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { tournamentSchema } from '@/lib/validation';

const partialTournamentSchema = tournamentSchema.partial();

export async function PATCH(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.payload?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const parsed = partialTournamentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid tournament data', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.tournament.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.organizerId !== auth.payload.userId) {
      return NextResponse.json({ error: 'You can only edit your own tournaments' }, { status: 403 });
    }

    const data = parsed.data;
    const updateData = {
      ...(data.name != null ? { name: data.name } : {}),
      ...(data.description != null ? { description: data.description } : {}),
      ...(data.startDate != null ? { startDate: new Date(data.startDate) } : {}),
      ...(data.endDate != null ? { endDate: new Date(data.endDate) } : {}),
      ...(data.registrationEnd != null ? { registrationEnd: new Date(data.registrationEnd) } : {}),
      ...(data.maxParticipants != null ? { maxParticipants: data.maxParticipants } : {}),
      ...(data.prizePool != null ? { prizePool: data.prizePool } : {}),
      ...(data.format != null ? { format: data.format } : {}),
      ...(data.timeControl != null ? { timeControl: data.timeControl } : {}),
      ...(data.mode != null ? { mode: data.mode } : {}),
      ...(data.image != null ? { image: data.image || null } : {}),
      ...(data.rules != null ? { rules: data.rules || null } : {}),
      ...(data.registrationFree != null ? { registrationFree: !!data.registrationFree, entryFee: data.registrationFree ? 0 : existing.entryFee } : {}),
      ...(data.entryFee != null && !data.registrationFree ? { entryFee: data.entryFee } : {}),
      ...(data.status != null ? { status: data.status } : {}),
    };

    const updated = await prisma.tournament.update({ where: { id }, data: updateData });
    return NextResponse.json({ tournament: updated });
  } catch (error) {
    console.error('Admin tournaments PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update tournament' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.payload?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const existing = await prisma.tournament.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.organizerId !== auth.payload.userId) {
      return NextResponse.json({ error: 'You can only delete your own tournaments' }, { status: 403 });
    }

    await prisma.tournament.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin tournaments DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete tournament' }, { status: 500 });
  }
}
