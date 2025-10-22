import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { z } from 'zod';

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  action: z.enum(['enable', 'disable', 'set']),
  price: z.number().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
});

export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.payload?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const { ids, action, price, stock } = parsed.data;

    if (action === 'enable' || action === 'disable') {
      await prisma.product.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { active: action === 'enable' },
      });
      return NextResponse.json({ ok: true, updated: ids.length });
    }

    // action === 'set'
    if (price === undefined && stock === undefined) {
      return NextResponse.json({ error: 'Provide price and/or stock to set' }, { status: 400 });
    }

    await prisma.product.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: {
        ...(price !== undefined ? { price } : {}),
        ...(stock !== undefined ? { stock } : {}),
      },
    });

    return NextResponse.json({ ok: true, updated: ids.length });
  } catch (error) {
    console.error('Admin bulk products error:', error);
    return NextResponse.json({ error: 'Failed to run bulk action' }, { status: 500 });
  }
}
