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
  const bio = settings?.aboutBio || `Hi, I'm Your Name. I built this platform to make chess learning fun, practical, and accessible—whether you're picking up fundamentals or sharpening your competitive edge.`;
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
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 relative overflow-hidden">
      {/* Animated background patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">About Me</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent mb-4 animate-gradient">
            {title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 font-light">{subtitle}</p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-start max-w-7xl mx-auto">
          {/* Left: Content */}
          <div className="space-y-8">
            {/* Bio Card */}
            <div className="group relative rounded-3xl bg-white/80 backdrop-blur-sm border border-purple-100 p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
              <div className="absolute -top-4 -left-4 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    ♔
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">My Story</h2>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{bio}</p>
              </div>
            </div>

            {/* Philosophy Cards */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="group relative rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity"></div>
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-white text-lg font-bold mb-2">Training Philosophy</h3>
                  <p className="text-purple-100 text-sm">Pattern recognition, calculation discipline, and practical plans you can apply immediately in your games.</p>
                </div>
              </div>

              <div className="group relative rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity"></div>
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <h3 className="text-white text-lg font-bold mb-2">How We Learn</h3>
                  <p className="text-pink-100 text-sm">Puzzles tuned to your level, live games and previews, and data-driven feedback to track your progress.</p>
                </div>
              </div>
            </div>

            {/* Stats/Achievements */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-purple-100 shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">1000+</div>
                <div className="text-xs text-gray-600 mt-1 uppercase tracking-wide">Students Trained</div>
              </div>
              <div className="text-center p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-purple-100 shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">2400+</div>
                <div className="text-xs text-gray-600 mt-1 uppercase tracking-wide">Peak Rating</div>
              </div>
              <div className="text-center p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-purple-100 shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">10+</div>
                <div className="text-xs text-gray-600 mt-1 uppercase tracking-wide">Years Experience</div>
              </div>
            </div>
          </div>

          {/* Right: Visual Gallery */}
          <div className="space-y-6">
            {/* Main Image with floating effect */}
            <div className="group relative rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
              <div className="relative aspect-[4/3] bg-white p-3">
                <Image 
                  src={mainImg} 
                  alt="About main" 
                  width={1200} 
                  height={800} 
                  className="w-full h-full rounded-2xl object-cover transform group-hover:scale-105 transition-transform duration-700" 
                />
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow group">
                <div className="aspect-square bg-white p-2">
                  <Image 
                    src={altImg} 
                    alt="About alt" 
                    width={800} 
                    height={600} 
                    className="w-full h-full rounded-xl object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {gallery.slice(0, 4).map((src, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow group">
                    <div className="aspect-square bg-white p-1.5">
                      <Image 
                        src={src} 
                        alt={`Gallery ${i + 1}`} 
                        width={300} 
                        height={300} 
                        className="w-full h-full rounded-lg object-cover group-hover:scale-110 transition-transform duration-500" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Decorative Chess Piece Pattern */}
            <div className="rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 p-8 text-center">
              <div className="text-6xl mb-3 opacity-80">♔ ♕ ♗ ♘</div>
              <p className="text-sm text-purple-700 font-medium">Master the game, one move at a time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="relative container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
            Why Choose <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">This Platform</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {highlights.map((h, i) => (
              <div 
                key={i} 
                className="group relative rounded-2xl bg-white/80 backdrop-blur-sm border border-purple-100 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-lg">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 leading-relaxed">{h}</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 w-0 group-hover:w-full transition-all duration-500 rounded-b-2xl"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 p-12 shadow-2xl relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Elevate Your Game?</h2>
              <p className="text-purple-100 text-lg mb-8 max-w-2xl mx-auto">
                Whether you&apos;re seeking personalized coaching or want to support the platform, I&apos;m here to help you reach your chess goals.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link 
                  href="/trainers" 
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-purple-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <span>Find a Trainer</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link 
                  href="/fund-me" 
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white/10 backdrop-blur-sm text-white font-semibold border-2 border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  <span>Support Me</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Note */}
      <section className="relative container mx-auto px-4 py-12 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-2xl bg-white/60 backdrop-blur-sm border border-purple-100 p-8 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-3">A Living Platform</h3>
            <p className="text-gray-700 leading-relaxed">
              This site is constantly evolving—expect more learning tools, deeper analytics, and curated study plans as we continue to iterate based on your feedback. Your journey to mastery starts here.
            </p>
          </div>
        </div>
      </section>

    </main>
  );
}
