import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reviewerName, reviewerEmail, rating, comment } = body;

    // Validate input
    if (!reviewerName || !reviewerEmail || !rating || !comment) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if trainer exists
    const trainer = await prisma.trainerProfile.findUnique({
      where: { id },
    });

    if (!trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        trainerId: id,
        reviewerName,
        reviewerEmail,
        rating,
        comment,
      },
    });

    // Update trainer's average rating
    const reviews = await prisma.review.findMany({
      where: { trainerId: id },
    });

    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await prisma.trainerProfile.update({
      where: { id },
      data: { averageRating },
    });

    return NextResponse.json({
      message: 'Review added successfully',
      review,
    }, { status: 201 });
  } catch (error) {
    console.error('Add review error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const reviews = await prisma.review.findMany({
      where: { trainerId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
