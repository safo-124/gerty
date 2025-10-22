import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  goalAmount: z.number().positive().nullable().optional(),
  image: z.string().url().nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.payload?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const updated = await prisma.cause.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ cause: updated });
  } catch (error) {
    console.error('Admin cause PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update cause' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.payload?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'soft';

    if (mode === 'soft') {
      await prisma.cause.update({ where: { id }, data: { active: false } });
      return NextResponse.json({ ok: true, softDeleted: true });
    }

    if (mode === 'hard') {
      const donationCount = await prisma.donation.count({ where: { causeId: id } });
      if (donationCount > 0) {
        return NextResponse.json({ error: 'Cannot hard delete a cause with donations. Use soft delete.' }, { status: 409 });
      }
      await prisma.cause.delete({ where: { id } });
      return NextResponse.json({ ok: true, hardDeleted: true });
    }

    return NextResponse.json({ error: 'Invalid delete mode' }, { status: 400 });
  } catch (error) {
    console.error('Admin cause DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete cause' }, { status: 500 });
  }
}
