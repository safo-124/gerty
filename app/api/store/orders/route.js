import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const orderSchema = z.object({
  email: z.string().email(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }
    const { email, items } = parsed.data;

    const ids = [...new Set(items.map((i) => i.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: ids }, active: true } });
    if (products.length !== ids.length) {
      return NextResponse.json({ error: 'One or more products unavailable' }, { status: 400 });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let total = 0;
    const currency = products[0]?.currency || 'USD';
    const itemData = items.map((i) => {
      const p = productMap.get(i.productId);
      const unitPrice = p.price;
      total += unitPrice * i.quantity;
      return { productId: i.productId, quantity: i.quantity, unitPrice, currency };
    });

    const order = await prisma.order.create({
      data: {
        email,
        total,
        currency,
        items: { createMany: { data: itemData } },
      },
      include: { items: true },
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
