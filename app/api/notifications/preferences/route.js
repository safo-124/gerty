import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notificationPreferenceSchema } from '@/lib/validation';
import {
  DEFAULT_REMINDER_OFFSET_MINUTES,
  withPreferenceDefaults,
} from '@/lib/reminders';

function coerceBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

function coerceNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.payload.userId;

    const preference = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

  return NextResponse.json({ preference: withPreferenceDefaults(preference) });
  } catch (error) {
    console.error('Notification preferences GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch notification preferences' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.payload.userId;
    const rawBody = await request.json().catch(() => ({}));

    const coerced = {
      lessonRemindersEnabled: coerceBoolean(rawBody.lessonRemindersEnabled),
      tournamentRemindersEnabled: coerceBoolean(rawBody.tournamentRemindersEnabled),
      reminderOffsetMinutes: coerceNumber(rawBody.reminderOffsetMinutes),
    };

    const data = notificationPreferenceSchema.parse(
      Object.fromEntries(
        Object.entries(coerced).filter(([, value]) => value !== undefined),
      ),
    );

    const payload = {
      lessonRemindersEnabled: data.lessonRemindersEnabled,
      tournamentRemindersEnabled: data.tournamentRemindersEnabled,
      reminderOffsetMinutes: data.reminderOffsetMinutes,
    };

    const preference = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        ...payload,
        reminderOffsetMinutes:
          payload.reminderOffsetMinutes ?? DEFAULT_REMINDER_OFFSET_MINUTES,
      },
      create: {
        userId,
        lessonRemindersEnabled: payload.lessonRemindersEnabled ?? true,
        tournamentRemindersEnabled: payload.tournamentRemindersEnabled ?? true,
        reminderOffsetMinutes:
          payload.reminderOffsetMinutes ?? DEFAULT_REMINDER_OFFSET_MINUTES,
      },
    });

    return NextResponse.json({
      preference: withPreferenceDefaults(preference),
      message: 'Notification preferences updated',
    });
  } catch (error) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 },
      );
    }

    console.error('Notification preferences PUT error:', error);
    return NextResponse.json({ error: 'Failed to update notification preferences' }, { status: 500 });
  }
}
