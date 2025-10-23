import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(_req, { params }) {
  try {
    const { slug } = params;
    const post = await prisma.blogPost.findFirst({
      where: { slug, published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        coverImage: true,
        category: true,
        tags: true,
        publishedAt: true,
        createdAt: true,
        author: { select: { id: true, name: true, email: true } },
      },
    });
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error) {
    console.error('Blog by slug GET error:', error);
    return NextResponse.json({ error: 'Failed to load post' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const me = await prisma.user.findUnique({ where: { id: auth.payload.userId }, select: { role: true } });
    if (!me || me.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { slug } = params;
    const post = await prisma.blogPost.findUnique({ where: { slug } });
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const data = {};
    if (body.title) data.title = body.title;
    if (body.excerpt !== undefined) data.excerpt = body.excerpt || null;
    if (body.content) data.content = body.content;
    if (body.coverImage !== undefined) data.coverImage = body.coverImage || null;
    if (body.category !== undefined) data.category = body.category || null;
    if (body.tags !== undefined) {
      data.tags = Array.isArray(body.tags)
        ? body.tags
        : (typeof body.tags === 'string' ? body.tags.split(',').map((t) => t.trim()).filter(Boolean) : []);
    }
    if (typeof body.published === 'boolean') {
      data.published = body.published;
      data.publishedAt = body.published ? new Date() : null;
    }

    const updated = await prisma.blogPost.update({ where: { slug }, data, select: { slug: true, published: true } });
    return NextResponse.json({ post: updated });
  } catch (error) {
    console.error('Blog PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const me = await prisma.user.findUnique({ where: { id: auth.payload.userId }, select: { role: true } });
    if (!me || me.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { slug } = params;
    await prisma.blogPost.delete({ where: { slug } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Blog DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
