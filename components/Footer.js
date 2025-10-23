import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import SocialIcons from '@/components/footer/SocialIcons';
import NewsletterForm from '@/components/footer/NewsletterForm';

export const dynamic = 'force-dynamic';

export default async function Footer() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'site' } });
  // Pass only serializable fields needed by client components (avoid Date objects)
  const socialSettings = {
    facebookUrl: settings?.facebookUrl || null,
    twitterUrl: settings?.twitterUrl || null,
    instagramUrl: settings?.instagramUrl || null,
    youtubeUrl: settings?.youtubeUrl || null,
    linkedinUrl: settings?.linkedinUrl || null,
    tiktokUrl: settings?.tiktokUrl || null,
    githubUrl: settings?.githubUrl || null,
    contactEmail: settings?.contactEmail || null,
  };
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 border-t bg-white">
      <div className="container mx-auto px-4 py-6">
        {/* Row 1: Brand, quick links, socials */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">ChessMaster</div>
            <span className="hidden md:inline text-xs text-gray-500">{settings?.footerText || 'Train, compete, excel.'}</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-700">
            <Link href="/play" className="hover:text-purple-700">Play</Link>
            <Link href="/live" className="hover:text-purple-700">Live</Link>
            <Link href="/tournaments" className="hover:text-purple-700">Tournaments</Link>
            <Link href="/blog" className="hover:text-purple-700">Blog</Link>
            <Link href="/resources" className="hover:text-purple-700">Resources</Link>
            {settings?.contactEmail && (
              <a href={`mailto:${settings.contactEmail}`} className="hover:text-purple-700">Contact</a>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <SocialIcons settings={socialSettings} />
            <div className="hidden md:block">
              <NewsletterForm compact />
            </div>
          </div>
        </div>

        {/* Row 2: Newsletter (mobile) + copyright */}
        <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="md:hidden">
            <NewsletterForm compact />
          </div>
          <div className="text-xs text-gray-500">© {year} ChessMaster. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
