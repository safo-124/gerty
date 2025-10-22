import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().min(1).default('USD'),
  stock: z.number().int().nonnegative().default(0),
  images: z.array(z.object({ url: z.string().url(), width: z.number().int().optional(), height: z.number().int().optional() })).default([]),
});

export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.payload?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }
    const { name, description, price, currency, stock, images } = parsed.data;

    const created = await prisma.product.create({
      data: {
        name,
        description,
        price,
        currency,
        stock,
        images: { create: images.map((img) => ({ url: img.url, width: img.width, height: img.height })) },
      },
      include: { images: true },
    });

    return NextResponse.json({ product: created });
  } catch (error) {
    console.error('Admin create product error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.payload?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Optionally include deleted via ?includeDeleted=1
    const url = new URL(request.url);
    const includeDeleted = url.searchParams.get('includeDeleted') === '1';

    const products = await prisma.product.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { images: true },
    });
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Admin list products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
