import { prisma } from '@/lib/prisma';

// Refresh tournament statuses based on current time and their start/end dates.
// Forward-only transitions:
// - UPCOMING -> ONGOING when startDate <= now <= endDate
// - UPCOMING -> COMPLETED when endDate < now
// - ONGOING  -> COMPLETED when endDate < now
// CANCELLED and COMPLETED remain unchanged.
export async function refreshTournamentStatuses() {
  const now = new Date();

  // Run updates in a transaction to avoid partial state
  const results = await prisma.$transaction([
    // Overdue UPCOMING tournaments go straight to COMPLETED
    prisma.tournament.updateMany({
      where: {
        status: 'UPCOMING',
        endDate: { lt: now },
      },
      data: { status: 'COMPLETED' },
    }),
    // UPCOMING that have started become ONGOING
    prisma.tournament.updateMany({
      where: {
        status: 'UPCOMING',
        startDate: { lte: now },
        endDate: { gte: now },
      },
      data: { status: 'ONGOING' },
    }),
    // ONGOING that have ended become COMPLETED
    prisma.tournament.updateMany({
      where: {
        status: 'ONGOING',
        endDate: { lt: now },
      },
      data: { status: 'COMPLETED' },
    }),
  ]);

  return {
    overdueToCompleted: results[0]?.count ?? 0,
    upcomingToOngoing: results[1]?.count ?? 0,
    ongoingToCompleted: results[2]?.count ?? 0,
  };
}
