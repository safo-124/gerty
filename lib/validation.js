import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['STUDENT', 'TRAINER'], {
    errorMap: () => ({ message: 'Role must be either STUDENT or TRAINER' }),
  }),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const trainerProfileSchema = z.object({
  title: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  experience: z.number().int().positive().optional(),
  rating: z.number().int().positive().optional(),
  hourlyRate: z.number().positive().optional(),
  availability: z.string().optional(),
  profileImage: z.string().url().optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
  videoUrl: z.string().url().optional().or(z.literal('')),
});

export const tournamentSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  registrationEnd: z.string().datetime(),
  maxParticipants: z.number().int().positive().optional(),
  entryFee: z.number().nonnegative().optional(),
  registrationFree: z.boolean().optional(),
  prizePool: z.number().nonnegative().optional(),
  format: z.string(),
  timeControl: z.string(),
  mode: z.enum(['IN_PERSON', 'ONLINE']).optional(),
  image: z.string().url().optional().or(z.literal('')),
  rules: z.string().optional(),
});

export const lessonSchema = z.object({
  trainerId: z.string(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  scheduledAt: z.string().datetime(),
  duration: z.number().int().positive(),
  meetingLink: z.string().url().optional().or(z.literal('')),
});

export const notificationPreferenceSchema = z.object({
  lessonRemindersEnabled: z.boolean().optional(),
  tournamentRemindersEnabled: z.boolean().optional(),
  reminderOffsetMinutes: z
    .number({ invalid_type_error: 'Reminder offset must be a number' })
    .int('Reminder offset must be an integer')
    .min(5, 'Reminder offset must be at least 5 minutes')
    .max(1440, 'Reminder offset cannot exceed 24 hours')
    .optional(),
});

export const donationSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .trim()
    .email('Please provide a valid email address')
    .optional()
    .or(z.literal('')),
  amount: z
    .number({ invalid_type_error: 'Donation amount must be a number' })
    .positive('Donation amount must be greater than zero'),
  currency: z
    .string({ invalid_type_error: 'Currency must be a string' })
    .trim()
    .length(3, 'Currency must be a 3-letter code')
    .optional(),
  message: z
    .string({ invalid_type_error: 'Message must be text' })
    .optional()
    .or(z.literal('')),
  causeId: z.string().min(1).optional(),
});
