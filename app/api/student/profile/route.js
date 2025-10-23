import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { isValidCountryCode } from '@/lib/countries';

export async function PUT(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.payload.userId;

    // Check if user is a student
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can access this resource' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Normalize optional fields
    let normalizedCountry = undefined;
    if (typeof body.country === 'string') {
      const code = body.country.toUpperCase();
      if (isValidCountryCode(code)) {
        normalizedCountry = code;
      } else if (body.country === '' || body.country === null) {
        normalizedCountry = null; // allow clearing
      }
    }

    const data = {
      // these fields are optional and only applied if provided
      ...(body.currentRating !== undefined ? { currentRating: parseInt(body.currentRating) } : {}),
      ...(body.targetRating !== undefined ? { targetRating: parseInt(body.targetRating) } : {}),
      ...(typeof body.preferredStyle === 'string' ? { preferredStyle: body.preferredStyle } : {}),
      ...(typeof body.goals === 'string' ? { goals: body.goals } : {}),
      ...(normalizedCountry !== undefined ? { country: normalizedCountry } : {}),
    };

    const updated = await prisma.studentProfile.update({
      where: { id: user.studentProfile.id },
      data,
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updated,
    });
  } catch (error) {
    console.error('Student profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
