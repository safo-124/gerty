import { Suspense } from 'react';
import nextDynamic from 'next/dynamic';

const TrainersClient = nextDynamic(() => import('./TrainersClient'), { ssr: false });

export const dynamic = 'force-dynamic';

export default function TrainersPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-12"><div className="h-40 animate-pulse rounded-xl bg-purple-100" /></div>}>
      <TrainersClient />
    </Suspense>
  );
}
