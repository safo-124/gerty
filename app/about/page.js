export const metadata = {
  title: 'About Me | ChessMaster',
  description: 'Learn more about me and the mission behind this platform.',
};

import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';

export default async function AboutPage() {
  let settings = null;
  try {
    settings = await prisma.siteSettings.findUnique({ where: { id: 'site' } });
  } catch {}
  const title = settings?.aboutTitle || 'About Me';
  const subtitle = settings?.aboutSubtitle || 'Coaching that turns patterns into points';
  const bio = settings?.aboutBio || `Hi, I’m Your Name. I built this platform to make chess learning fun, practical, and accessible—whether you’re picking up fundamentals or sharpening your competitive edge.`;
  const mainImg = settings?.aboutImageMain || '/about/hero.svg';
  const altImg = settings?.aboutImageAlt || '/about/alt.svg';
  const gallery = Array.isArray(settings?.aboutGallery) && settings.aboutGallery.length
    ? settings.aboutGallery
    : ['/about/g1.svg', '/about/g2.svg', '/about/g3.svg', '/about/g4.svg'];
  const highlights = Array.isArray(settings?.aboutHighlights) && settings.aboutHighlights.length ? settings.aboutHighlights : [
    'Rated coach with experience training beginners to advanced club players',
    'Curriculum focused on tactics, openings, and endgames',
    'Live spotlight games with AI analysis cues and tactic labels',
    'Modern UI for a distraction-free study environment',
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-purple-50">
      <section className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-wide text-purple-700">About</div>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            <p className="mt-1 text-gray-600">{subtitle}</p>
            <p className="mt-4 whitespace-pre-line text-gray-800 leading-relaxed">{bio}</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-sm uppercase tracking-wide text-purple-700">Focus</div>
                <div className="mt-1 text-lg font-semibold">Training Philosophy</div>
                <p className="mt-2 text-sm text-gray-600">I emphasize pattern recognition, calculation discipline, and practical plans you can apply immediately in your games.</p>
              </div>
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-sm uppercase tracking-wide text-purple-700">Tools</div>
                <div className="mt-1 text-lg font-semibold">How We Learn</div>
                <p className="mt-2 text-sm text-gray-600">Puzzles tuned to your level, live games and previews, and data-driven feedback to track your progress.</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="overflow-hidden rounded-2xl border bg-white p-2">
              <Image src={mainImg} alt="About main" width={1200} height={800} className="h-auto w-full rounded-xl object-cover" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="overflow-hidden rounded-2xl border bg-white p-2">
                <Image src={altImg} alt="About alt" width={800} height={600} className="h-40 w-full rounded-lg object-cover" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {gallery.slice(0, 4).map((src, i) => (
                  <div key={i} className="overflow-hidden rounded-xl border bg-white p-1">
                    <Image src={src} alt={`Gallery ${i + 1}`} width={300} height={300} className="h-20 w-full rounded object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold">Highlights</div>
            <ul className="mt-3 list-disc pl-5 text-gray-700 text-sm space-y-1">
              {highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold">Get in touch</div>
            <p className="mt-2 text-sm text-gray-700">Want personalized coaching or have a collaboration in mind? I’d love to hear from you.</p>
            <div className="mt-3">
              <Link href="/trainers" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-purple-700 hover:bg-purple-50">
                Find a Trainer
              </Link>
              <Link href="/fund-me" className="ml-2 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-purple-700 hover:bg-purple-50">
                Support / Fund Me
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 max-w-3xl">
          <div className="text-lg font-semibold">A note on this platform</div>
          <p className="mt-2 text-sm text-gray-700">
            This site is evolving—expect more learning tools, deeper analytics, and curated study plans as we continue to iterate based on your feedback.
          </p>
        </div>
      </section>
    </main>
  );
}
