'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

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
            <NavLink href="/live">Live</NavLink>
            <NavLink href="/tournaments">Tournaments</NavLink>
            <NavLink href="/fund-me">Fund Me</NavLink>
            <NavLink href="/store">Store</NavLink>
            <NavLink href="/trainers">Trainers</NavLink>
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
              <NavLink href="/live" onClick={closeMenu}>Live</NavLink>
              <NavLink href="/tournaments" onClick={closeMenu}>Tournaments</NavLink>
              <NavLink href="/fund-me" onClick={closeMenu}>Fund Me</NavLink>
              <NavLink href="/store" onClick={closeMenu}>Store</NavLink>
              <NavLink href="/trainers" onClick={closeMenu}>Trainers</NavLink>
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
