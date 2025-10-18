import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function PUT(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.payload.userId;

    // Check if user is a trainer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        trainerProfile: true,
      },
    });

    if (!user || user.role !== 'TRAINER') {
      return NextResponse.json(
        { error: 'Only trainers can access this resource' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Update trainer profile
    const updatedProfile = await prisma.trainerProfile.update({
      where: {
        id: user.trainerProfile.id,
      },
      data: {
        title: body.title || user.trainerProfile.title,
        bio: body.bio || user.trainerProfile.bio,
        specialties: body.specialties || user.trainerProfile.specialties,
        experience: body.experience !== undefined ? parseInt(body.experience) : user.trainerProfile.experience,
        rating: body.rating !== undefined ? parseInt(body.rating) : user.trainerProfile.rating,
        hourlyRate: body.hourlyRate !== undefined ? parseFloat(body.hourlyRate) : user.trainerProfile.hourlyRate,
        availability: body.availability || user.trainerProfile.availability,
        profileImage: body.profileImage || user.trainerProfile.profileImage,
        coverImage: body.coverImage || user.trainerProfile.coverImage,
        videoUrl: body.videoUrl || user.trainerProfile.videoUrl,
      },
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
