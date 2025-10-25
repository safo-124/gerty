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
    <footer className="mt-16 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500 rounded-full blur-3xl"></div>
      </div>

      <div className="relative container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">♔</span>
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                ChessMaster
              </div>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              {settings?.footerText || 'Train with expert coaches, compete in tournaments, and excel at chess.'}
            </p>
            <div className="flex items-center gap-2">
              <SocialIcons settings={socialSettings} />
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Links
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/play" className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2 group">
                <span className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                Play Now
              </Link>
              <Link href="/live" className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2 group">
                <span className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                Live Games
              </Link>
              <Link href="/tournaments" className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2 group">
                <span className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                Tournaments
              </Link>
              <Link href="/trainers" className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2 group">
                <span className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                Find Trainers
              </Link>
            </nav>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Resources
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/blog" className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2 group">
                <span className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                Blog
              </Link>
              <Link href="/resources" className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2 group">
                <span className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                Learning Resources
              </Link>
              <Link href="/puzzles" className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2 group">
                <span className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                Puzzles
              </Link>
              <Link href="/leaderboard" className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2 group">
                <span className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                Leaderboard
              </Link>
            </nav>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Stay Updated
            </h3>
            <p className="text-sm text-gray-300">
              Get the latest chess tips, tournament updates, and exclusive content.
            </p>
            <NewsletterForm compact />
            {settings?.contactEmail && (
              <a 
                href={`mailto:${settings.contactEmail}`} 
                className="text-sm text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-2 group"
              >
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {settings.contactEmail}
              </a>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-purple-800/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span>© {year} ChessMaster. All rights reserved.</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/about" className="hover:text-purple-400 transition-colors">About</Link>
              <span className="text-gray-600">•</span>
              <Link href="/fund-me" className="hover:text-purple-400 transition-colors">Fund Me</Link>
              <span className="text-gray-600">•</span>
              <Link href="/store" className="hover:text-purple-400 transition-colors">Store</Link>
              <span className="text-gray-600">•</span>
              <span className="text-gray-500">Made with ♟️ by chess enthusiasts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative chess pieces at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"></div>
    </footer>
  );
}
