/**
 * PostPreview.tsx
 * ───────────────
 * Renders a post content string as formatted HTML.
 *
 * Supported markdown syntax (the same set the RichTextEditor toolbar produces):
 *
 *   **text**        → <strong>text</strong>
 *   *text*          → <em>text</em>
 *   `code`          → <code>code</code>
 *   ## Heading      → <h2>Heading</h2>
 *   > Quote         → <blockquote>Quote</blockquote>
 *   - Bullet        → <ul><li>Bullet</li></ul>
 *   https://url     → <a href="...">url</a>
 *   \n              → line break
 *
 * Security note:
 *   We use dangerouslySetInnerHTML which bypasses React's XSS protection.
 *   The input is sanitised by escaping HTML entities BEFORE applying
 *   the markdown replacements, so user-supplied <script> tags are
 *   harmless after escaping.
 */

import React from 'react';
import type { Post } from './api';

// ─── Markdown → HTML ────────────────────────────────────────────────────────

/**
 * Convert a subset of markdown to HTML.
 *
 * Processing order matters:
 *   1. Escape HTML entities first (security – prevents XSS).
 *   2. Apply block-level rules (headings, blockquotes, bullets).
 *   3. Apply inline rules (bold, italic, code, links).
 *   4. Convert remaining newlines to <br>.
 */
function markdownToHtml(text: string): string {
  // ── Step 1: Escape HTML special characters ─────────────────────────────
  // This turns '<script>' into '&lt;script&gt;' so it's displayed as text,
  // not executed as HTML.
  let html = text
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');

  // ── Step 2: Block-level rules (full-line patterns) ─────────────────────

  // ## Heading (line starting with ##)
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-3 mb-1 text-gray-900">$1</h2>');

  // > Blockquote
  html = html.replace(/^&gt; (.+)$/gm,
    '<blockquote class="border-l-4 border-blue-400 pl-3 italic text-gray-600 my-1">$1</blockquote>'
  );

  // - Bullet list item (consecutive lines each wrapped in <li> later)
  // We mark bullet lines with a placeholder and wrap at the end.
  html = html.replace(/^- (.+)$/gm, '%%LI%%$1%%/LI%%');

  // Wrap consecutive %%LI%% blocks in <ul>
  html = html.replace(/(%%LI%%.*?%%\/LI%%(\n|$))+/g, (match) => {
    const items = match
      .split('\n')
      .filter(line => line.includes('%%LI%%'))
      .map(line =>
        `<li class="ml-4 list-disc">${line.replace(/%%LI%%/, '').replace(/%%\/LI%%/, '')}</li>`
      )
      .join('');
    return `<ul class="my-2 space-y-0.5">${items}</ul>`;
  });

  // ── Step 3: Inline rules ───────────────────────────────────────────────

  // **Bold**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // *Italic*  (single asterisks)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // `inline code`
  html = html.replace(/`(.+?)`/g,
    '<code class="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-xs font-mono">$1</code>'
  );

  // Auto-link URLs  (starts with http:// or https://)
  // The URL regex stops at whitespace or common trailing punctuation.
  html = html.replace(
    /(https?:\/\/[^\s"'<>&,)]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">$1</a>'
  );

  // [link text](url)
  html = html.replace(
    /\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">$1</a>'
  );

  // ── Step 4: Newlines → <br> ────────────────────────────────────────────
  // Replace \n not already inside a block tag with <br>.
  html = html.replace(/\n/g, '<br />');

  return html;
}

// ─── Time formatter ────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── PostCard (used in PostList) ───────────────────────────────────────────

interface PostCardProps {
  post:          Post;
  currentUserId?: number;
  onLike:        (postId: number) => void;
  onDelete?:     (postId: number) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onLike,
  onDelete,
}) => {
  const initials = post.author.username.slice(0, 2).toUpperCase();
  const isOwner  = currentUserId === post.user_id;
  const htmlContent = markdownToHtml(post.content);

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">

      {/* ── Author row ── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {post.author.profile_picture ? (
            <img
              src={post.author.profile_picture}
              alt={post.author.username}
              className="w-10 h-10 rounded-full object-cover border-2 border-blue-100"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 text-sm">{post.author.username}</p>
            <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
          </div>
        </div>

        {/* Delete button – only shown to the author */}
        {isOwner && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(post.id)}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="Delete post"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Post content (markdown rendered) ── */}
      {/*
        dangerouslySetInnerHTML lets us inject our markdown-converted HTML.
        It's safe here because we escaped HTML entities BEFORE converting
        markdown, so any user-supplied tags are already neutralised.
      */}
      <div
        className="text-sm text-gray-800 leading-relaxed mb-3 prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {/* ── Media ── */}
      {post.media_url && post.media_type === 'image' && (
        <div className="mb-3 rounded-xl overflow-hidden bg-gray-100">
          <img
            src={post.media_url}
            alt="Post image"
            className="w-full max-h-96 object-cover"
            loading="lazy"
          />
        </div>
      )}
      {post.media_url && post.media_type === 'video' && (
        <div className="mb-3 rounded-xl overflow-hidden bg-black">
          {/*
            controls attribute shows the browser's built-in video controls
            (play, pause, volume, fullscreen).
            preload="metadata" loads only the video dimensions and duration
            without downloading the full file – better for performance.
          */}
          <video
            src={post.media_url}
            controls
            preload="metadata"
            className="w-full max-h-96"
          />
        </div>
      )}

      {/* ── Tags ── */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
        {/* Like button – filled heart when liked */}
        <button
          type="button"
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            post.liked_by_user
              ? 'text-red-500 hover:text-red-600'
              : 'text-gray-500 hover:text-red-500'
          }`}
        >
          <svg
            className="w-5 h-5"
            fill={post.liked_by_user ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span className="font-medium">{post.likes_count}</span>
        </button>

        {/* Comment placeholder */}
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="font-medium">{post.comments_count}</span>
        </button>
      </div>
    </article>
  );
};

// ─── Inline preview inside PostCreate ─────────────────────────────────────

interface PostPreviewProps {
  content:   string;
  mediaUrl:  string;
  mediaType: string;
  tags:      string[];
  username:  string;
  avatar:    string;
}

const PostPreview: React.FC<PostPreviewProps> = ({
  content,
  mediaUrl,
  mediaType,
  tags,
  username,
  avatar,
}) => {
  const htmlContent = markdownToHtml(content);
  const initials    = username.slice(0, 2).toUpperCase();

  return (
    <div className="border border-dashed border-blue-300 rounded-xl p-4 bg-blue-50/30">
      <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-3">
        Preview
      </p>

      {/* Author row */}
      <div className="flex items-center gap-2 mb-3">
        {avatar ? (
          <img src={avatar} alt={username} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            {initials}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-gray-800">{username}</p>
          <p className="text-xs text-gray-400">just now</p>
        </div>
      </div>

      {/* Content */}
      {content.trim() ? (
        <div
          className="text-sm text-gray-800 leading-relaxed mb-3"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      ) : (
        <p className="text-sm italic text-gray-400 mb-3">Your post content will appear here…</p>
      )}

      {/* Media preview */}
      {mediaUrl && mediaType === 'image' && (
        <div className="mb-3 rounded-lg overflow-hidden">
          <img src={mediaUrl} alt="preview" className="w-full max-h-64 object-cover" />
        </div>
      )}
      {mediaUrl && mediaType === 'video' && (
        <div className="mb-3 rounded-lg overflow-hidden bg-black">
          <video src={mediaUrl} controls preload="metadata" className="w-full max-h-64" />
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map(t => (
            <span key={t} className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">#{t}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default PostPreview;
