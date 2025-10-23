import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

function isValidEmail(email) {
  return typeof email === 'string' && /.+@.+\..+/.test(email);
}

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const sub = await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email },
      update: {},
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      // Fire and forget; don't block success on email issues
      resend.emails.send({
        from: 'ChessMaster <noreply@resend.dev>',
        to: email,
        subject: 'Welcome to our newsletter',
        text: 'Thanks for subscribing! You will receive updates from ChessMaster.'
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, id: sub.id });
  } catch (e) {
    console.error('Newsletter subscribe error', e);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
