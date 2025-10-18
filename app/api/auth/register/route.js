import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';

export async function POST(request) {
  try {
    const raw = await request.json();
    // Normalize inputs to be lenient with client variations
    const body = {
      name: (raw?.name ?? '').toString().trim(),
      email: (raw?.email ?? '').toString().trim(),
      password: (raw?.password ?? '').toString(),
      role: (raw?.role ?? '').toString().trim().toUpperCase(),
    };
    
    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json(
        { error: 'Validation failed', details: fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, name, role } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with profile based on role
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        ...(role === 'TRAINER' && {
          trainerProfile: {
            create: {},
          },
        }),
        ...(role === 'STUDENT' && {
          studentProfile: {
            create: {},
          },
        }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: 'User registered successfully',
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
