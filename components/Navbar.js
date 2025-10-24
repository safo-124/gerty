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
      className={`relative rounded-xl px-2 py-1 text-sm font-medium transition-colors ${
        isActive
          ? 'text-purple-700 dark:text-purple-300'
          : 'text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-300'
      }`}
    >
      {children}
      {isActive && (
        <span className="absolute inset-x-1 -bottom-1 h-0.5 rounded bg-gradient-to-r from-purple-500 to-blue-500" />
      )}
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
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/80 dark:supports-[backdrop-filter]:bg-gray-900/60 dark:bg-gray-900/80 border-b border-purple-200/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl leading-none">♔</span>
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-xl font-bold text-transparent">ChessMaster</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-4">
            <NavLink href="/play">Play</NavLink>

            {/* Watch dropdown: Live + Leaderboard */}
            <div
              className="relative"
              onMouseEnter={() => { clearTimer(watchTimer); setOpenWatch(true); }}
              onMouseLeave={() => { delayClose(watchTimer, setOpenWatch); }}
            >
              <button aria-haspopup="menu" aria-expanded={openWatch} className="relative rounded-xl px-2 py-1 text-sm font-medium text-gray-700 hover:text-purple-700">
                Watch ▾
              </button>
              {openWatch && (
                <div
                  className="absolute z-50 mt-2 w-44 rounded-xl border bg-white p-2 shadow-xl"
                  onMouseEnter={() => { clearTimer(watchTimer); setOpenWatch(true); }}
                  onMouseLeave={() => { delayClose(watchTimer, setOpenWatch); }}
                  role="menu"
                >
                  <Link href="/live" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Live</Link>
                  <Link href="/leaderboard" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Leaderboard</Link>
                </div>
              )}
            </div>

            {/* Explore dropdown: Trainers, Tournaments, Store, Fund Me */}
            <div
              className="relative"
              onMouseEnter={() => { clearTimer(exploreTimer); setOpenExplore(true); }}
              onMouseLeave={() => { delayClose(exploreTimer, setOpenExplore); }}
            >
              <button aria-haspopup="menu" aria-expanded={openExplore} className="relative rounded-xl px-2 py-1 text-sm font-medium text-gray-700 hover:text-purple-700">
                Explore ▾
              </button>
              {openExplore && (
                <div
                  className="absolute z-50 mt-2 w-52 rounded-xl border bg-white p-2 shadow-xl"
                  onMouseEnter={() => { clearTimer(exploreTimer); setOpenExplore(true); }}
                  onMouseLeave={() => { delayClose(exploreTimer, setOpenExplore); }}
                  role="menu"
                >
                  <Link href="/trainers" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Trainers</Link>
                  <Link href="/tournaments" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Tournaments</Link>
                  <Link href="/store" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Store</Link>
                  <Link href="/fund-me" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Fund Me</Link>
                  <Link href="/blog" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Blog</Link>
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
                <button aria-haspopup="menu" aria-expanded={openLearn} className="relative rounded-xl px-2 py-1 text-sm font-medium text-gray-700 hover:text-purple-700">
                  Learn ▾
                </button>
                {openLearn && (
                  <div
                    className="absolute z-50 mt-2 w-48 rounded-xl border bg-white p-2 shadow-xl"
                    onMouseEnter={() => { clearTimer(learnTimer); setOpenLearn(true); }}
                    onMouseLeave={() => { delayClose(learnTimer, setOpenLearn); }}
                    role="menu"
                  >
                    <Link href="/puzzles" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Puzzles</Link>
                    <Link href="/resources" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Resources</Link>
                    <Link href="/dashboard/student/analytics/puzzles" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Analytics</Link>
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
                <button aria-haspopup="menu" aria-expanded={openAdmin} className="relative rounded-xl px-2 py-1 text-sm font-medium text-gray-700 hover:text-purple-700">
                  Admin ▾
                </button>
                {openAdmin && (
                  <div
                    className="absolute z-50 mt-2 w-56 rounded-xl border bg-white p-2 shadow-xl"
                    onMouseEnter={() => { clearTimer(adminTimer); setOpenAdmin(true); }}
                    onMouseLeave={() => { delayClose(adminTimer, setOpenAdmin); }}
                    role="menu"
                  >
                    <Link href="/dashboard/admin" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Admin Console</Link>
                    <Link href="/dashboard/admin/puzzles" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Admin Puzzles</Link>
                    <Link href="/dashboard/admin/resources" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Admin Resources</Link>
                    <Link href="/dashboard/admin/blog" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Admin Blog</Link>
                    <Link href="/dashboard/admin/settings/site" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Site Settings</Link>
                    <Link href="/dashboard/admin/analytics/site" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Site Analytics</Link>
                    <Link href="/dashboard/admin/analytics/puzzles" className="block rounded-lg px-3 py-2 text-sm hover:bg-purple-50">Puzzles Analytics</Link>
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
                <span className="text-xs text-gray-600 dark:text-gray-400">{user.name}</span>
                <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
              </>
            ) : (
              <>
                <Link href="/login"><Button variant="outline" size="sm">Login</Button></Link>
                <Link href="/register"><Button variant="gradient" size="sm">Get Started</Button></Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-purple-300/60 text-gray-700 dark:text-gray-200"
            onClick={() => setOpen((v) => !v)}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <div className="md:hidden border-t border-purple-200/60">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2">
              <NavLink href="/play" onClick={closeMenu}>Play</NavLink>

              {/* Watch collapsible */}
              <button
                className="text-left rounded-xl px-2 py-1 text-sm font-medium text-gray-700"
                onClick={() => setOpenWatch((v) => !v)}
              >
                Watch {openWatch ? '▴' : '▾'}
              </button>
              {openWatch && (
                <div className="ml-3 flex flex-col gap-1">
                  <NavLink href="/live" onClick={closeMenu}>Live</NavLink>
                  <NavLink href="/leaderboard" onClick={closeMenu}>Leaderboard</NavLink>
                </div>
              )}

              {/* Explore collapsible */}
              <button
                className="text-left rounded-xl px-2 py-1 text-sm font-medium text-gray-700"
                onClick={() => setOpenExplore((v) => !v)}
              >
                Explore {openExplore ? '▴' : '▾'}
              </button>
              {openExplore && (
                <div className="ml-3 flex flex-col gap-1">
                  <NavLink href="/trainers" onClick={closeMenu}>Trainers</NavLink>
                  <NavLink href="/tournaments" onClick={closeMenu}>Tournaments</NavLink>
                  <NavLink href="/store" onClick={closeMenu}>Store</NavLink>
                  <NavLink href="/fund-me" onClick={closeMenu}>Fund Me</NavLink>
                  <NavLink href="/blog" onClick={closeMenu}>Blog</NavLink>
                </div>
              )}

              {/* Student Learn collapsible */}
              {user?.role === 'STUDENT' && (
                <>
                  <button
                    className="text-left rounded-xl px-2 py-1 text-sm font-medium text-gray-700"
                    onClick={() => setOpenLearn((v) => !v)}
                  >
                    Learn {openLearn ? '▴' : '▾'}
                  </button>
                  {openLearn && (
                    <div className="ml-3 flex flex-col gap-1">
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
                    className="text-left rounded-xl px-2 py-1 text-sm font-medium text-gray-700"
                    onClick={() => setOpenAdmin((v) => !v)}
                  >
                    Admin {openAdmin ? '▴' : '▾'}
                  </button>
                  {openAdmin && (
                    <div className="ml-3 flex flex-col gap-1">
                      <NavLink href="/dashboard/admin" onClick={closeMenu}>Admin Console</NavLink>
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
              <div className="h-px w-full bg-purple-200/60 my-2" />
              {user ? (
                <>
                  <NavLink href={dashboardHref} onClick={closeMenu}>{dashboardLabel}</NavLink>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{user.name}</span>
                    <Button variant="outline" size="sm" onClick={() => { logout(); closeMenu(); }}>Logout</Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login" onClick={closeMenu} className="flex-1"><Button variant="outline" size="sm" className="w-full">Login</Button></Link>
                  <Link href="/register" onClick={closeMenu} className="flex-1"><Button variant="gradient" size="sm" className="w-full">Get Started</Button></Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
