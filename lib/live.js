import { prisma } from '@/lib/prisma';

// Delete match if it is human vs human and has finished (status !== 'ONGOING')
export async function deleteIfFinishedHumanMatch(match) {
  try {
    if (!match) return false;
    const finished = match.status && match.status !== 'ONGOING';
    const aiWhite = match.whiteToken?.startsWith?.('AI:');
    const aiBlack = match.blackToken?.startsWith?.('AI:');
    const isHumanVsHuman = !aiWhite && !aiBlack;
    if (finished && isHumanVsHuman) {
      await prisma.liveMatch.delete({ where: { id: match.id } });
      return true;
    }
    return false;
  } catch {
    // Swallow errors to avoid breaking the response path
    return false;
  }
}
