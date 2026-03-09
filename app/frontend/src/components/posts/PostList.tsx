/**
 * PostList.tsx
 * ─────────────
 * Displays all posts in a social feed with:
 *   • Paginated loading (load-more button)
 *   • Like / unlike toggle with optimistic UI update
 *   • Delete own post
 *   • Skeleton loading states while fetching
 *   • Empty state + error state
 *   • Link to create a new post
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { postsApi, type Post } from './api';
import { PostCard } from './PostPreview';

// ─── Skeleton loader ───────────────────────────────────────────────────────

const PostSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-gray-200" />
      <div className="space-y-1.5">
        <div className="h-3 bg-gray-200 rounded w-24" />
        <div className="h-2 bg-gray-100 rounded w-16" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-4/5" />
      <div className="h-3 bg-gray-100 rounded w-3/5" />
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────

const PostList: React.FC = () => {
  const navigate = useNavigate();
  const { user }  = useAuth();

  // ── State ─────────────────────────────────────────────────────────────
  const [posts,    setPosts]    = useState<Post[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadMore, setLoadMore] = useState(false);
  const [error,    setError]    = useState('');
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(false);

  // ── Fetch posts ────────────────────────────────────────────────────────

  /**
   * loadPosts fetches one page of posts and either sets or appends them.
   *
   * @param pageNum  – which page to fetch
   * @param append   – true when "Load more" is clicked; false for initial load
   */
  const loadPosts = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadMore(true);
    else        setLoading(true);
    setError('');

    try {
      const result = await postsApi.getPosts(pageNum, 10);

      if (result.error) {
        setError(result.error);
        return;
      }

      const newPosts = result.posts ?? [];
      setPosts(prev => append ? [...prev, ...newPosts] : newPosts);
      setHasMore((result.page ?? 1) < (result.pages ?? 1));
    } catch {
      setError('Failed to load posts. Is the backend running?');
    } finally {
      setLoading(false);
      setLoadMore(false);
    }
  }, []);

  // Load page 1 on mount
  useEffect(() => {
    loadPosts(1, false);
  }, [loadPosts]);

  // ── Like toggle ────────────────────────────────────────────────────────

  /**
   * Optimistic like toggle:
   *   1. Update the post in local state immediately (feels instant).
   *   2. Send the request to the backend.
   *   3. If the request fails, roll back to the previous state.
   */
  const handleLike = useCallback(async (postId: number) => {
    // Snapshot the old post for rollback
    const oldPosts = posts;

    // Optimistic update
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? {
              ...p,
              liked_by_user: !p.liked_by_user,
              likes_count: p.liked_by_user
                ? Math.max(0, p.likes_count - 1)
                : p.likes_count + 1,
            }
          : p
      )
    );

    // Send to backend
    const result = await postsApi.toggleLike(postId);

    if (result.error) {
      // Roll back if the request failed
      setPosts(oldPosts);
    } else if (result.likes_count !== undefined) {
      // Sync the exact count from the server (in case of race conditions)
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, liked_by_user: result.liked ?? p.liked_by_user, likes_count: result.likes_count! }
            : p
        )
      );
    }
  }, [posts]);

  // ── Delete post ────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (postId: number) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;

    const result = await postsApi.deletePost(postId);
    if (!result.error) {
      // Remove from local state immediately (no need to re-fetch)
      setPosts(prev => prev.filter(p => p.id !== postId));
    } else {
      alert(result.error);
    }
  }, []);

  // ── Load more ──────────────────────────────────────────────────────────

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPosts(nextPage, true);
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
        <button
          type="button"
          onClick={() => navigate('/posts/create')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Post
        </button>
      </div>

      {/* ── Loading skeletons ── */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
        </div>
      )}

      {/* ── Error state ── */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-6 text-center">
          <p className="font-medium">{error}</p>
          <button
            type="button"
            onClick={() => loadPosts(1, false)}
            className="mt-3 text-sm text-red-500 underline hover:text-red-700"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && posts.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">✍️</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No posts yet</h2>
          <p className="text-gray-500 text-sm mb-6">Be the first to share something with the network!</p>
          <button
            type="button"
            onClick={() => navigate('/posts/create')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Create First Post
          </button>
        </div>
      )}

      {/* ── Posts feed ── */}
      {!loading && !error && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              onLike={handleLike}
              onDelete={handleDelete}
            />
          ))}

          {/* Load more button */}
          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadMore}
              className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {loadMore ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading more…
                </span>
              ) : (
                'Load more posts'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PostList;
