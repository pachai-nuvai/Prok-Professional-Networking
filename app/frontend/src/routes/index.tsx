/**
 * routes/index.tsx
 * ─────────────────
 * React Router v6 route configuration.
 *
 * Structure:
 *   Layout (Navbar + Outlet)
 *   ├── /              → Login
 *   ├── /login         → Login
 *   ├── /signup        → Signup
 *   ├── /profile       → ProfileView
 *   ├── /profile/edit  → ProfileEdit
 *   ├── /posts         → PostList
 *   ├── /posts/create  → PostCreate
 *   ├── /feed          → Feed
 *   ├── /jobs          → JobList
 *   └── /messages      → MessageList
 *
 * The Layout wrapper renders Navbar above every page.
 * Navbar hides itself on the auth pages (/login, /signup, /).
 */

import { createBrowserRouter } from 'react-router-dom';
import Layout       from '../components/Layout';
import Login        from '../components/auth/Login';
import Signup       from '../components/auth/Signup';
import ProfileView  from '../components/profile/ProfileView';
import ProfileEdit  from '../components/profile/ProfileEdit';
import PostCreate   from '../components/posts/PostCreate';
import PostList     from '../components/posts/PostList';
import Feed         from '../components/feed/Feed';
import JobList      from '../components/job-board/JobList';
import MessageList  from '../components/messaging/MessageList';

export const router = createBrowserRouter([
  {
    // Layout is the parent route – it renders Navbar + <Outlet />.
    // All children are rendered inside the <Outlet />.
    element: <Layout />,
    children: [
      { path: '/',              element: <Login /> },
      { path: '/login',         element: <Login /> },
      { path: '/signup',        element: <Signup /> },
      { path: '/profile',       element: <ProfileView /> },
      { path: '/profile/edit',  element: <ProfileEdit /> },
      { path: '/posts',         element: <PostList /> },
      { path: '/posts/create',  element: <PostCreate /> },
      { path: '/feed',          element: <Feed /> },
      { path: '/jobs',          element: <JobList /> },
      { path: '/messages',      element: <MessageList /> },
    ],
  },
]);
