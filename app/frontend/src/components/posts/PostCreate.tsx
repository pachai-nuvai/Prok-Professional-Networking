/**
 * PostCreate.tsx
 * ──────────────
 * Full-featured post creation form.
 *
 * Sections:
 *   1. Header  – user avatar + page title
 *   2. Editor  – RichTextEditor (markdown toolbar + textarea)
 *   3. Tags    – comma-separated hashtag input (max 10 tags)
 *   4. Media   – MediaUpload drag-and-drop (image or video)
 *   5. Preview – toggleable live preview of how the post will look
 *   6. Actions – Submit / Cancel buttons with loading states
 *
 * State machine:
 *   idle → submitting → success  (navigates to /posts after 1.2 s)
 *                     → error    (shows toast, stays on form)
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { postsApi } from './api';
import RichTextEditor from './RichTextEditor';
import MediaUpload from './MediaUpload';
import PostPreview from './PostPreview';

// ─── Constants ─────────────────────────────────────────────────────────────

const MAX_CONTENT = 3000;   // characters
const MAX_TAGS    = 10;

// ─── Toast sub-component ───────────────────────────────────────────────────

const Toast: React.FC<{ message: string; type: 'success' | 'error' }> = ({ message, type }) => (
  <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in
    ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
    <span>{type === 'success' ? '✓' : '✕'}</span>
    {message}
  </div>
);

// ─── Tags input sub-component ─────────────────────────────────────────────

interface TagsInputProps {
  tags:     string[];
  onChange: (tags: string[]) => void;
}

const TagsInput: React.FC<TagsInputProps> = ({ tags, onChange }) => {
  const [raw, setRaw] = useState('');

  const add = (val: string) => {
    const clean = val.trim().replace(/^#/, '').toLowerCase();
    if (clean && !tags.includes(clean) && tags.length < MAX_TAGS) {
      onChange([...tags, clean]);
    }
    setRaw('');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center min-h-[40px] p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 bg-white">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            #{tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter(t => t !== tag))}
              className="text-blue-400 hover:text-blue-700 font-bold"
            >×</button>
          </span>
        ))}
        <input
          value={raw}
          onChange={e => setRaw(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(raw); }
            if (e.key === 'Backspace' && raw === '' && tags.length > 0) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={() => raw.trim() && add(raw)}
          placeholder={tags.length === 0 ? 'Add tags (press Enter or comma)' : 'Add more…'}
          className="flex-1 min-w-[160px] outline-none text-sm bg-transparent"
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">{tags.length}/{MAX_TAGS} tags · No # needed</p>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────

const PostCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user }  = useAuth();

  // ── Form state ──────────────────────────────────────────────────────────
  const [content,   setContent]   = useState('');
  const [tags,      setTags]      = useState<string[]>([]);
  const [mediaUrl,  setMediaUrl]  = useState('');
  const [mediaType, setMediaType] = useState('');

  // ── UI state ────────────────────────────────────────────────────────────
  const [showPreview, setShowPreview] = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [contentError, setContentError] = useState('');

  // ── Media upload callbacks ──────────────────────────────────────────────
  const handleMediaDone = useCallback((url: string, type: string) => {
    setMediaUrl(url);
    setMediaType(type);
  }, []);

  const handleMediaRemove = useCallback(() => {
    setMediaUrl('');
    setMediaType('');
  }, []);

  // ── Content change with real-time validation ────────────────────────────
  const handleContentChange = (value: string) => {
    setContent(value);
    if (value.trim() === '') {
      setContentError('Post content is required.');
    } else if (value.length > MAX_CONTENT) {
      setContentError(`Content exceeds ${MAX_CONTENT} characters.`);
    } else {
      setContentError('');
    }
  };

  // ── Toast helper ─────────────────────────────────────────────────────────
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Form submit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Client-side validation before hitting the API
    if (!content.trim()) {
      setContentError('Post content is required.');
      return;
    }
    if (content.length > MAX_CONTENT) {
      setContentError(`Content exceeds ${MAX_CONTENT} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await postsApi.createPost(content, mediaUrl, mediaType, tags);

      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Post created successfully! 🎉', 'success');
        // Clear form
        setContent('');
        setTags([]);
        setMediaUrl('');
        setMediaType('');
        // Navigate to post list after a short delay
        setTimeout(() => navigate('/posts'), 1200);
      }
    } catch {
      showToast('Failed to create post. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = content.trim().length > 0 &&
                    content.length <= MAX_CONTENT &&
                    !submitting;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Author avatar */}
          {user ? (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
          ) : null}
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create Post</h1>
            <p className="text-sm text-gray-500">Share your thoughts with the network</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/posts')}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Cancel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Section helper ── */}
      {/* Each section is a white card with a label */}

      {/* ── 1. Rich Text Editor ── */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Post Content <span className="text-red-500">*</span>
        </label>
        <RichTextEditor
          value={content}
          onChange={handleContentChange}
          maxLength={MAX_CONTENT}
          error={contentError}
        />
        <p className="mt-2 text-xs text-gray-400">
          Supports <strong>**bold**</strong>, <em>*italic*</em>, `code`, ## headings, - bullets, &gt; quotes
        </p>
      </div>

      {/* ── 2. Tags ── */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Tags <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <TagsInput tags={tags} onChange={setTags} />
      </div>

      {/* ── 3. Media Upload ── */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Media <span className="text-gray-400 font-normal">(optional – image or video)</span>
        </label>
        <MediaUpload
          onUploadDone={handleMediaDone}
          onRemove={handleMediaRemove}
          previewUrl={mediaUrl}
          mediaType={mediaType}
        />
      </div>

      {/* ── 4. Preview toggle + panel ── */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <button
          type="button"
          onClick={() => setShowPreview(prev => !prev)}
          className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform ${showPreview ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>

        {showPreview && (
          <div className="mt-4">
            <PostPreview
              content={content}
              mediaUrl={mediaUrl}
              mediaType={mediaType}
              tags={tags}
              username={user?.username ?? 'You'}
              avatar={''}
            />
          </div>
        )}
      </div>

      {/* ── 5. Actions ── */}
      <div className="flex items-center gap-3 pb-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 sm:flex-none px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Publishing…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Publish Post
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate('/posts')}
          disabled={submitting}
          className="flex-1 sm:flex-none px-8 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* ── Toast notification ── */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

export default PostCreate;
