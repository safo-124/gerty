import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    const { valid, payload } = await verifyAuth(request);
    if (!valid || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = params || {};
    const body = await request.json().catch(() => ({}));
    const data = {};
    if (body.title != null) data.title = body.title;
    if (body.url != null) data.url = body.url;
    if (body.type != null) data.type = body.type;
    if (body.description != null) data.description = body.description;
    if (body.studentOnly != null) data.studentOnly = !!body.studentOnly;
    const resource = await prisma.resource.update({ where: { id }, data });
    return NextResponse.json({ resource });
  } catch (e) {
    console.error('Admin update resource error:', e);
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { valid, payload } = await verifyAuth(request);
    if (!valid || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = params || {};
    await prisma.resource.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Admin delete resource error:', e);
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
  }
}
