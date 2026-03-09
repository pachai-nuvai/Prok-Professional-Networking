/**
 * Layout.tsx
 * ──────────
 * Root layout component that wraps every page with:
 *  • Navbar (hides itself on /login and /signup via useLocation)
 *  • <Outlet /> – where React Router renders the active child route
 *
 * By making Layout the parent route in routes/index.tsx, every page
 * automatically gets the Navbar without repeating it in each component.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
// Outlet is a placeholder rendered by React Router where child routes go.
// When the route is /posts, React Router renders <PostList /> into <Outlet />.

import Navbar from './navigation/Navbar';

const Layout: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    {/* Navbar checks useLocation() internally and hides on /login, /signup */}
    <Navbar />
    {/* Every child route is rendered here */}
    <main>
      <Outlet />
    </main>
  </div>
);

export default Layout;
