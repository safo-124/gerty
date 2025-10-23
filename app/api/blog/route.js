import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

function slugify(str) {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function uniqueSlug(base) {
  let slug = slugify(base);
  let i = 1;
  while (true) {
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${slugify(base)}-${++i}`;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const take = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const skip = (page - 1) * take;
    const category = searchParams.get('category') || undefined;
    const tag = searchParams.get('tag') || undefined;

    // Only published posts for public endpoint
    const where = {
      published: true,
      ...(category ? { category } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take,
        skip,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          category: true,
          tags: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize: take });
  } catch (error) {
    console.error('Blog GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const me = await prisma.user.findUnique({ where: { id: auth.payload.userId }, select: { role: true } });
    if (!me || me.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { title, content, excerpt, coverImage, published, category, tags } = body || {};
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const slug = await uniqueSlug(title);

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        content,
        excerpt: excerpt || null,
        coverImage: coverImage || null,
        published: !!published,
        publishedAt: published ? new Date() : null,
        category: category || null,
        tags: Array.isArray(tags)
          ? tags
          : (typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : []),
        authorId: auth.payload.userId,
      },
      select: { id: true, title: true, slug: true, published: true },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Blog POST error:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
