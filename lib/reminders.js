export const DEFAULT_REMINDER_OFFSET_MINUTES = Number.parseInt(
  process.env.DEFAULT_REMINDER_OFFSET_MINUTES ||
    process.env.NEXT_PUBLIC_DEFAULT_REMINDER_OFFSET_MINUTES ||
    '60',
  10,
);

export const DEFAULT_NOTIFICATION_PREFERENCE = {
  lessonRemindersEnabled: true,
  tournamentRemindersEnabled: true,
  reminderOffsetMinutes: DEFAULT_REMINDER_OFFSET_MINUTES,
};

export function withPreferenceDefaults(preference) {
  if (!preference) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCE };
  }

  return {
    lessonRemindersEnabled:
      preference.lessonRemindersEnabled ?? DEFAULT_NOTIFICATION_PREFERENCE.lessonRemindersEnabled,
    tournamentRemindersEnabled:
      preference.tournamentRemindersEnabled ?? DEFAULT_NOTIFICATION_PREFERENCE.tournamentRemindersEnabled,
    reminderOffsetMinutes:
      preference.reminderOffsetMinutes ?? DEFAULT_NOTIFICATION_PREFERENCE.reminderOffsetMinutes,
  };
}
