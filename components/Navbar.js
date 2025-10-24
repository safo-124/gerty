'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useRef, useState } from 'react';

const NavLink = ({ href, children, onClick }) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300 ${
        isActive
          ? 'text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-200'
          : 'text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50/50'
      }`}
    >
      {children}
    </Link>
  );
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [openExplore, setOpenExplore] = useState(false);
  const [openWatch, setOpenWatch] = useState(false);
  const [openLearn, setOpenLearn] = useState(false);
  const [openAdmin, setOpenAdmin] = useState(false);
  const watchTimer = useRef(null);
  const exploreTimer = useRef(null);
  const learnTimer = useRef(null);
  const adminTimer = useRef(null);

  const clearTimer = (ref) => { if (ref.current) { clearTimeout(ref.current); ref.current = null; } };
  const delayClose = (ref, closeFn, ms = 160) => { clearTimer(ref); ref.current = setTimeout(() => closeFn(false), ms); };

  const dashboardHref = user
    ? user.role === 'TRAINER'
      ? '/dashboard/trainer'
      : user.role === 'ADMIN'
        ? '/dashboard/admin'
        : '/dashboard/student'
    : '/dashboard/student';

  const dashboardLabel = user?.role === 'ADMIN' ? 'Admin Console' : 'Dashboard';

  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b-2 border-purple-200/40 shadow-lg shadow-purple-100/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <span className="text-4xl leading-none group-hover:scale-110 transition-transform duration-300">♔</span>
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity"></div>
            </div>
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-2xl font-extrabold text-transparent animate-gradient">
              ChessMaster
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            <NavLink href="/play">Play</NavLink>
            <NavLink href="/about">About</NavLink>

            {/* Watch dropdown: Live + Leaderboard */}
            <div
              className="relative"
              onMouseEnter={() => { clearTimer(watchTimer); setOpenWatch(true); }}
              onMouseLeave={() => { delayClose(watchTimer, setOpenWatch); }}
            >
              <button aria-haspopup="menu" aria-expanded={openWatch} className="relative rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:text-purple-700 hover:bg-purple-50/50 transition-all duration-300 flex items-center gap-1">
                Watch
                <svg className={`w-4 h-4 transition-transform duration-300 ${openWatch ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openWatch && (
                <div
                  className="absolute z-50 mt-3 w-52 rounded-2xl border-2 border-purple-100 bg-white/95 backdrop-blur-xl p-3 shadow-2xl shadow-purple-200/50 animate-scale-in"
                  onMouseEnter={() => { clearTimer(watchTimer); setOpenWatch(true); }}
                  onMouseLeave={() => { delayClose(watchTimer, setOpenWatch); }}
                  role="menu"
                >
                  <Link href="/live" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300">
                    <span className="text-red-500 text-lg">●</span>
                    <span className="text-gray-700 group-hover:text-purple-700">Live</span>
                  </Link>
                  <Link href="/leaderboard" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300">
                    <span className="text-lg">🏆</span>
                    <span className="text-gray-700 group-hover:text-purple-700">Leaderboard</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Explore dropdown: Trainers, Tournaments, Store */}
            <div
              className="relative"
              onMouseEnter={() => { clearTimer(exploreTimer); setOpenExplore(true); }}
              onMouseLeave={() => { delayClose(exploreTimer, setOpenExplore); }}
            >
              <button aria-haspopup="menu" aria-expanded={openExplore} className="relative rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:text-purple-700 hover:bg-purple-50/50 transition-all duration-300 flex items-center gap-1">
                Explore
                <svg className={`w-4 h-4 transition-transform duration-300 ${openExplore ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openExplore && (
                <div
                  className="absolute z-50 mt-3 w-56 rounded-2xl border-2 border-purple-100 bg-white/95 backdrop-blur-xl p-3 shadow-2xl shadow-purple-200/50 animate-scale-in"
                  onMouseEnter={() => { clearTimer(exploreTimer); setOpenExplore(true); }}
                  onMouseLeave={() => { delayClose(exploreTimer, setOpenExplore); }}
                  role="menu"
                >
                  <Link href="/trainers" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300">
                    <span className="text-lg">👨‍🏫</span>
                    <span className="text-gray-700 group-hover:text-purple-700">Trainers</span>
                  </Link>
                  <Link href="/tournaments" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300">
                    <span className="text-lg">🎯</span>
                    <span className="text-gray-700 group-hover:text-purple-700">Tournaments</span>
                  </Link>
                  <Link href="/store" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300">
                    <span className="text-lg">🛒</span>
                    <span className="text-gray-700 group-hover:text-purple-700">Store</span>
                  </Link>
                  <Link href="/blog" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300">
                    <span className="text-lg">📝</span>
                    <span className="text-gray-700 group-hover:text-purple-700">Blog</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Learn dropdown (students) */}
            {user?.role === 'STUDENT' && (
              <div
                className="relative"
                onMouseEnter={() => { clearTimer(learnTimer); setOpenLearn(true); }}
                onMouseLeave={() => { delayClose(learnTimer, setOpenLearn); }}
              >
                <button aria-haspopup="menu" aria-expanded={openLearn} className="relative rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:text-purple-700 hover:bg-purple-50/50 transition-all duration-300 flex items-center gap-1">
                  Learn
                  <svg className={`w-4 h-4 transition-transform duration-300 ${openLearn ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openLearn && (
                  <div
                    className="absolute z-50 mt-3 w-56 rounded-2xl border-2 border-purple-100 bg-white/95 backdrop-blur-xl p-3 shadow-2xl shadow-purple-200/50 animate-scale-in"
                    onMouseEnter={() => { clearTimer(learnTimer); setOpenLearn(true); }}
                    onMouseLeave={() => { delayClose(learnTimer, setOpenLearn); }}
                    role="menu"
                  >
                    <Link href="/puzzles" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300">
                      <span className="text-lg">🧩</span>
                      <span className="text-gray-700 group-hover:text-purple-700">Puzzles</span>
                    </Link>
                    <Link href="/resources" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300">
                      <span className="text-lg">📚</span>
                      <span className="text-gray-700 group-hover:text-purple-700">Resources</span>
                    </Link>
                    <Link href="/dashboard/student/analytics/puzzles" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300">
                      <span className="text-lg">📊</span>
                      <span className="text-gray-700 group-hover:text-purple-700">Analytics</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Admin dropdown */}
            {user?.role === 'ADMIN' && (
              <div
                className="relative"
                onMouseEnter={() => { clearTimer(adminTimer); setOpenAdmin(true); }}
                onMouseLeave={() => { delayClose(adminTimer, setOpenAdmin); }}
              >
                <button aria-haspopup="menu" aria-expanded={openAdmin} className="relative rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50/50 transition-all duration-300 flex items-center gap-1">
                  Admin
                  <svg className={`w-4 h-4 transition-transform duration-300 ${openAdmin ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openAdmin && (
                  <div
                    className="absolute z-50 mt-3 w-64 rounded-2xl border-2 border-red-100 bg-white/95 backdrop-blur-xl p-3 shadow-2xl shadow-red-200/50 animate-scale-in"
                    onMouseEnter={() => { clearTimer(adminTimer); setOpenAdmin(true); }}
                    onMouseLeave={() => { delayClose(adminTimer, setOpenAdmin); }}
                    role="menu"
                  >
                    <Link href="/dashboard/admin" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all duration-300">
                      <span className="text-lg">⚙️</span>
                      <span className="text-gray-700 group-hover:text-red-600">Admin Console</span>
                    </Link>
                    <Link href="/dashboard/admin/live" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all duration-300">
                      <span className="text-lg">🎮</span>
                      <span className="text-gray-700 group-hover:text-red-600">Admin Live</span>
                    </Link>
                    <Link href="/dashboard/admin/puzzles" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all duration-300">
                      <span className="text-lg">🧩</span>
                      <span className="text-gray-700 group-hover:text-red-600">Admin Puzzles</span>
                    </Link>
                    <Link href="/dashboard/admin/resources" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all duration-300">
                      <span className="text-lg">📚</span>
                      <span className="text-gray-700 group-hover:text-red-600">Admin Resources</span>
                    </Link>
                    <Link href="/dashboard/admin/blog" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all duration-300">
                      <span className="text-lg">📝</span>
                      <span className="text-gray-700 group-hover:text-red-600">Admin Blog</span>
                    </Link>
                    <div className="my-2 h-px bg-red-100"></div>
                    <Link href="/dashboard/admin/settings/site" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all duration-300">
                      <span className="text-lg">🔧</span>
                      <span className="text-gray-700 group-hover:text-red-600">Site Settings</span>
                    </Link>
                    <Link href="/dashboard/admin/analytics/site" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all duration-300">
                      <span className="text-lg">📈</span>
                      <span className="text-gray-700 group-hover:text-red-600">Site Analytics</span>
                    </Link>
                    <Link href="/dashboard/admin/analytics/puzzles" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all duration-300">
                      <span className="text-lg">📊</span>
                      <span className="text-gray-700 group-hover:text-red-600">Puzzles Analytics</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <NavLink href={dashboardHref}>{dashboardLabel}</NavLink>
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white text-xs font-bold">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{user.name}</span>
                </div>
                <Button variant="outline" size="sm" onClick={logout} className="border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold">Logout</Button>
              </>
            ) : (
              <>
                <Link href="/login"><Button variant="outline" size="sm" className="border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 font-semibold">Login</Button></Link>
                <Link href="/fund-me"><Button variant="outline" size="sm" className="border-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 font-semibold">💝 Donate</Button></Link>
                <Link href="/register"><Button variant="gradient" size="sm" className="shadow-lg shadow-purple-200 font-semibold">Get Started</Button></Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="md:hidden inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-purple-300 bg-white/80 hover:bg-purple-50 text-gray-700 dark:text-gray-200 transition-all duration-300 shadow-lg hover:shadow-xl"
            onClick={() => setOpen((v) => !v)}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {open ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden border-t-2 border-purple-200/60 bg-gradient-to-b from-white to-purple-50/30 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3">
              <NavLink href="/play" onClick={closeMenu}>Play</NavLink>
              <NavLink href="/about" onClick={closeMenu}>About</NavLink>

              {/* Watch collapsible */}
              <button
                className="text-left rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-purple-50/50 transition-all flex items-center justify-between"
                onClick={() => setOpenWatch((v) => !v)}
              >
                <span className="flex items-center gap-2">
                  <span>👀</span>
                  Watch
                </span>
                <svg className={`w-4 h-4 transition-transform duration-300 ${openWatch ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openWatch && (
                <div className="ml-4 flex flex-col gap-2 rounded-xl bg-purple-50/50 p-3">
                  <NavLink href="/live" onClick={closeMenu}>Live</NavLink>
                  <NavLink href="/leaderboard" onClick={closeMenu}>Leaderboard</NavLink>
                </div>
              )}

              {/* Explore collapsible */}
              <button
                className="text-left rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-purple-50/50 transition-all flex items-center justify-between"
                onClick={() => setOpenExplore((v) => !v)}
              >
                <span className="flex items-center gap-2">
                  <span>🗺️</span>
                  Explore
                </span>
                <svg className={`w-4 h-4 transition-transform duration-300 ${openExplore ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openExplore && (
                <div className="ml-4 flex flex-col gap-2 rounded-xl bg-purple-50/50 p-3">
                  <NavLink href="/trainers" onClick={closeMenu}>Trainers</NavLink>
                  <NavLink href="/tournaments" onClick={closeMenu}>Tournaments</NavLink>
                  <NavLink href="/store" onClick={closeMenu}>Store</NavLink>
                  <NavLink href="/blog" onClick={closeMenu}>Blog</NavLink>
                </div>
              )}

              {/* Student Learn collapsible */}
              {user?.role === 'STUDENT' && (
                <>
                  <button
                    className="text-left rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-purple-50/50 transition-all flex items-center justify-between"
                    onClick={() => setOpenLearn((v) => !v)}
                  >
                    <span className="flex items-center gap-2">
                      <span>📖</span>
                      Learn
                    </span>
                    <svg className={`w-4 h-4 transition-transform duration-300 ${openLearn ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openLearn && (
                    <div className="ml-4 flex flex-col gap-2 rounded-xl bg-purple-50/50 p-3">
                      <NavLink href="/puzzles" onClick={closeMenu}>Puzzles</NavLink>
                      <NavLink href="/resources" onClick={closeMenu}>Resources</NavLink>
                      <NavLink href="/dashboard/student/analytics/puzzles" onClick={closeMenu}>Analytics</NavLink>
                    </div>
                  )}
                </>
              )}

              {/* Admin collapsible */}
              {user?.role === 'ADMIN' && (
                <>
                  <button
                    className="text-left rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50/50 transition-all flex items-center justify-between"
                    onClick={() => setOpenAdmin((v) => !v)}
                  >
                    <span className="flex items-center gap-2">
                      <span>⚙️</span>
                      Admin
                    </span>
                    <svg className={`w-4 h-4 transition-transform duration-300 ${openAdmin ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openAdmin && (
                    <div className="ml-4 flex flex-col gap-2 rounded-xl bg-red-50/50 p-3">
                      <NavLink href="/dashboard/admin" onClick={closeMenu}>Admin Console</NavLink>
                      <NavLink href="/dashboard/admin/live" onClick={closeMenu}>Admin Live</NavLink>
                      <NavLink href="/dashboard/admin/puzzles" onClick={closeMenu}>Admin Puzzles</NavLink>
                      <NavLink href="/dashboard/admin/resources" onClick={closeMenu}>Admin Resources</NavLink>
                      <NavLink href="/dashboard/admin/blog" onClick={closeMenu}>Admin Blog</NavLink>
                      <NavLink href="/dashboard/admin/settings/site" onClick={closeMenu}>Site Settings</NavLink>
                      <NavLink href="/dashboard/admin/analytics/site" onClick={closeMenu}>Site Analytics</NavLink>
                      <NavLink href="/dashboard/admin/analytics/puzzles" onClick={closeMenu}>Puzzles Analytics</NavLink>
                    </div>
                  )}
                </>
              )}
              <div className="h-0.5 w-full bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200 my-3 rounded-full" />
              {user ? (
                <>
                  <NavLink href={dashboardHref} onClick={closeMenu}>{dashboardLabel}</NavLink>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white text-sm font-bold">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{user.name}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { logout(); closeMenu(); }} className="border-2 border-red-200 text-red-600 hover:bg-red-50 font-semibold">Logout</Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link href="/login" onClick={closeMenu}><Button variant="outline" size="sm" className="w-full border-2 border-purple-200 hover:bg-purple-50 font-semibold">Login</Button></Link>
                  <Link href="/fund-me" onClick={closeMenu}><Button variant="outline" size="sm" className="w-full border-2 border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold">💝 Donate</Button></Link>
                  <Link href="/register" onClick={closeMenu}><Button variant="gradient" size="sm" className="w-full shadow-lg font-semibold">Get Started</Button></Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
