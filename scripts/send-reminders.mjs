#!/usr/bin/env node
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import {
  sendLessonReminderEmail,
  sendTrainerLessonReminderEmail,
  isNotificationsConfigured,
} from '../lib/notifications.js';
import { DEFAULT_REMINDER_OFFSET_MINUTES, withPreferenceDefaults } from '../lib/reminders.js';

const LOOKAHEAD_MINUTES = Number.parseInt(process.env.REMINDER_LOOKAHEAD_MINUTES || '180', 10);

const now = new Date();
const lookaheadBoundary = new Date(now.getTime() + LOOKAHEAD_MINUTES * 60 * 1000);

async function main() {
  console.log(`[reminders] Running at ${now.toISOString()} with lookahead ${LOOKAHEAD_MINUTES} minutes.`);

  const lessons = await prisma.lesson.findMany({
    where: {
      status: 'SCHEDULED',
      reminderSentAt: null,
      scheduledAt: {
        gt: now,
        lte: lookaheadBoundary,
      },
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          notificationPreference: {
            select: {
              lessonRemindersEnabled: true,
              tournamentRemindersEnabled: true,
              reminderOffsetMinutes: true,
            },
          },
        },
      },
      trainer: {
        select: {
          id: true,
          name: true,
          email: true,
          notificationPreference: {
            select: {
              lessonRemindersEnabled: true,
              tournamentRemindersEnabled: true,
              reminderOffsetMinutes: true,
            },
          },
        },
      },
    },
    orderBy: {
      scheduledAt: 'asc',
    },
  });

  if (!lessons.length) {
    console.log('[reminders] No lessons found in lookahead window.');
    return;
  }

  console.log(`[reminders] Found ${lessons.length} lesson(s) requiring evaluation.`);

  const notificationsConfigured = isNotificationsConfigured();
  if (!notificationsConfigured) {
    console.warn('[reminders] Notification provider is not fully configured (missing API key or from email).');
  }

  for (const lesson of lessons) {
  const { student, trainer } = lesson;
  const studentPref = withPreferenceDefaults(student?.notificationPreference);
  const trainerPref = withPreferenceDefaults(trainer?.notificationPreference);

  const reminderOffsetMinutes = studentPref.reminderOffsetMinutes || DEFAULT_REMINDER_OFFSET_MINUTES;
    const reminderTime = new Date(lesson.scheduledAt.getTime() - reminderOffsetMinutes * 60 * 1000);

    if (now < reminderTime) {
      continue;
    }

    const recipients = [];
    const actions = [];

    if (student?.email && studentPref.lessonRemindersEnabled) {
      recipients.push('student');
      actions.push(
        sendLessonReminderEmail({
          to: student.email,
          studentName: student.name,
          trainerName: trainer?.name,
          scheduledAt: lesson.scheduledAt,
          meetingLink: lesson.meetingLink,
          durationMinutes: lesson.duration,
          lessonTitle: lesson.title,
        }).then((result) => ({ recipient: 'student', result })).catch((error) => ({ recipient: 'student', error }))
      );
    }

    if (trainer?.email && trainerPref.lessonRemindersEnabled) {
      recipients.push('trainer');
      actions.push(
        sendTrainerLessonReminderEmail({
          to: trainer.email,
          trainerName: trainer.name,
          studentName: student?.name,
          scheduledAt: lesson.scheduledAt,
          lessonTitle: lesson.title,
        }).then((result) => ({ recipient: 'trainer', result })).catch((error) => ({ recipient: 'trainer', error }))
      );
    }

    let delivered = false;
    let attempted = false;

    if (actions.length === 0) {
      console.log(`[reminders] No recipients opted-in for lesson ${lesson.id}. Marking as handled.`);
    } else {
      attempted = true;
      const outcomes = await Promise.all(actions);

      for (const outcome of outcomes) {
        if (outcome.error) {
          console.error(`[reminders] Failed to send ${outcome.recipient} reminder for lesson ${lesson.id}`, outcome.error);
        } else if (outcome.result?.delivered || outcome.result?.skipped) {
          delivered = delivered || Boolean(outcome.result.delivered || outcome.result.skipped);
          console.log(`[reminders] Reminder processed for ${outcome.recipient} on lesson ${lesson.id}.`);
        }
      }
    }

    const updateData = {
      reminderLastAttemptAt: new Date(),
    };

    if (!attempted || delivered) {
      updateData.reminderSentAt = new Date();
    }

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: updateData,
    });
  }
}

main()
  .catch((error) => {
    console.error('[reminders] Fatal error', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
