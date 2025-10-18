import { Resend } from 'resend';
import { format } from 'date-fns';
import { DEFAULT_REMINDER_OFFSET_MINUTES } from './reminders.js';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.NOTIFICATION_FROM_EMAIL;
const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

const resend = resendApiKey ? new Resend(resendApiKey) : null;

function formatDateTime(date) {
  return format(date, "EEEE, MMMM do 'at' h:mm a");
}

function ensureDate(value) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date provided to notification service');
  }
  return parsed;
}

export function isNotificationsConfigured() {
  return Boolean(resend && fromEmail);
}

export async function sendLessonReminderEmail({
  to,
  studentName,
  trainerName,
  scheduledAt,
  meetingLink,
  durationMinutes,
  lessonTitle,
}) {
  if (!resend || !fromEmail) {
    console.warn('Notification service not configured. Skipping email send.');
    return { skipped: true };
  }

  const scheduleDate = ensureDate(scheduledAt);
  const durationText = durationMinutes ? `${durationMinutes} minutes` : 'your scheduled time';
  const subject = `Chess lesson reminder: ${lessonTitle || 'Upcoming session'}`;
  const dashboardUrl = `${appBaseUrl}/dashboard/student`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="color: #7c3aed;">Reminder: Your chess lesson is coming up</h2>
      <p>Hi ${studentName || 'there'},</p>
      <p>This is a friendly reminder that you have a session with <strong>${trainerName || 'your trainer'}</strong>.</p>
      <ul style="padding-left: 20px;">
        <li><strong>When:</strong> ${formatDateTime(scheduleDate)}</li>
        <li><strong>Duration:</strong> ${durationText}</li>
        ${meetingLink ? `<li><strong>Meeting link:</strong> <a href="${meetingLink}">${meetingLink}</a></li>` : ''}
      </ul>
      <p>You can review details or reschedule from your <a href="${dashboardUrl}">student dashboard</a>.</p>
      <p>Good luck and enjoy your training!</p>
      <p style="margin-top: 24px; color: #6b7280;">ChessMaster Team</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    return { delivered: true };
  } catch (error) {
    console.error('Failed to send lesson reminder email', error);
    throw error;
  }
}

export async function sendTrainerLessonReminderEmail({
  to,
  trainerName,
  studentName,
  scheduledAt,
  lessonTitle,
}) {
  if (!resend || !fromEmail) {
    console.warn('Notification service not configured. Skipping email send.');
    return { skipped: true };
  }

  const scheduleDate = ensureDate(scheduledAt);
  const subject = `Upcoming lesson with ${studentName || 'a student'}`;
  const dashboardUrl = `${appBaseUrl}/dashboard/trainer`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="color: #2563eb;">Upcoming lesson reminder</h2>
      <p>Hey ${trainerName || 'coach'},</p>
      <p>You have an upcoming session with <strong>${studentName || 'a student'}</strong>.</p>
      <ul style="padding-left: 20px;">
        <li><strong>When:</strong> ${formatDateTime(scheduleDate)}</li>
        <li><strong>Session:</strong> ${lessonTitle || 'Training session'}</li>
      </ul>
      <p>Manage the session from your <a href="${dashboardUrl}">trainer dashboard</a>.</p>
      <p style="margin-top: 24px; color: #6b7280;">ChessMaster Team</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    return { delivered: true };
  } catch (error) {
    console.error('Failed to send trainer reminder email', error);
    throw error;
  }
}
