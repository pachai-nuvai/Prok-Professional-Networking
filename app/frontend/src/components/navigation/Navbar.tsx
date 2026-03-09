/**
 * Navbar.tsx
 * ──────────
 * Responsive top navigation bar.
 *
 * Features:
 *  • Prok branding (left)
 *  • Nav links: Feed, Posts, Jobs, Messages (centre)
 *  • Profile avatar + username + logout button (right)
 *  • Active link highlight using useLocation()
 *  • Mobile hamburger menu (collapses on small screens)
 *
 * Auth:
 *  • Hidden when user is not logged in (Login / Signup pages have no nav)
 *  • Clicking the avatar goes to /profile
 *  • Logout clears auth state and redirects to /login
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// ─── Nav link definition ───────────────────────────────────────────────────

interface NavItem {
  to:    string;
  label: string;
  icon:  React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    to:    '/feed',
    label: 'Feed',
    icon:  (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
  },
  {
    to:    '/posts',
    label: 'Posts',
    icon:  (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    to:    '/jobs',
    label: 'Jobs',
    icon:  (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to:    '/messages',
    label: 'Messages',
    icon:  (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Don't render the navbar on auth pages
  const hideOn = ['/', '/login', '/signup'];
  if (hideOn.includes(location.pathname)) return null;
  // Also hide if not logged in
  if (!user) return null;

  const initials = user.username.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // useLocation gives us the current URL path so we can highlight the active link
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          {/* ── Logo ── */}
          <Link to="/posts" className="flex items-center gap-2 font-bold text-blue-600 text-lg">
            <span className="bg-blue-600 text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black">P</span>
            Prok
          </Link>

          {/* ── Desktop nav links ── */}
          <div className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive(item.to)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>

          {/* ── Right side: avatar + logout ── */}
          <div className="flex items-center gap-2">

            {/* Create post shortcut */}
            <button
              type="button"
              onClick={() => navigate('/posts/create')}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Post
            </button>

            {/* Profile avatar */}
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold hover:opacity-80 transition-opacity"
              title={`${user.username} – View profile`}
            >
              {initials}
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              className="sm:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown menu ── */}
        {menuOpen && (
          <div className="sm:hidden border-t border-gray-100 py-2 space-y-1 pb-3">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive(item.to)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => { setMenuOpen(false); navigate('/posts/create'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Post
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
