import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        width: z.number().int().optional(),
        height: z.number().int().optional(),
      }),
    )
    .optional(),
});

export async function PATCH(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.payload?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const data = parsed.data;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Build update payload, handling optional image replacement
    const { images, ...rest } = data;
    const updateData = { ...rest };
    if (images) {
      updateData.images = {
        deleteMany: {},
        create: images.map((img) => ({ url: img.url, width: img.width, height: img.height })),
      };
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { images: true },
    });

    return NextResponse.json({ product: updated });
  } catch (error) {
    console.error('Admin update product error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
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
      const updated = await prisma.product.update({
        where: { id },
        data: { active: false, deletedAt: new Date() },
      });
      return NextResponse.json({ ok: true, softDeleted: true, id: updated.id });
    }

    if (mode === 'hard') {
      // Ensure no order items reference this product before hard delete
      const count = await prisma.orderItem.count({ where: { productId: id } });
      if (count > 0) {
        return NextResponse.json(
          { error: 'Cannot hard delete a product with existing orders. Consider soft deleting instead.' },
          { status: 409 },
        );
      }

      await prisma.product.delete({ where: { id } });
      return NextResponse.json({ ok: true, hardDeleted: true, id });
    }

    return NextResponse.json({ error: 'Invalid delete mode' }, { status: 400 });
  } catch (error) {
    console.error('Admin delete product error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
