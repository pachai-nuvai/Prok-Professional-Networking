/**
 * MediaUpload.tsx
 * ────────────────
 * Drag-and-drop media uploader for posts (images AND videos).
 *
 * Flow:
 *   1. User drops or picks a file.
 *   2. react-dropzone validates type and size client-side.
 *   3. postsApi.uploadMedia() sends POST /posts/media with FormData.
 *   4. Progress bar simulates upload (fetch doesn't provide real progress).
 *   5. On success the returned URL is passed to the parent via onUploadDone().
 *   6. The parent stores the URL and includes it when creating the post.
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { postsApi } from './api';

// ─── Types ─────────────────────────────────────────────────────────────────

interface MediaUploadProps {
  onUploadDone: (url: string, mediaType: string) => void;
  onRemove:     () => void;
  previewUrl:   string;
  mediaType:    string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 50;

// Accept object for react-dropzone: maps MIME types to extensions.
const ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png':  ['.png'],
  'image/gif':  ['.gif'],
  'image/webp': ['.webp'],
  'video/mp4':  ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],
};

// ─── Component ─────────────────────────────────────────────────────────────

const MediaUpload: React.FC<MediaUploadProps> = ({
  onUploadDone,
  onRemove,
  previewUrl,
  mediaType,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [error,     setError]     = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const maxMB   = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    const maxBytes = maxMB * 1024 * 1024;

    // Extra client-side size guard (react-dropzone maxSize is set below,
    // but explicit check gives a better error message).
    if (file.size > maxBytes) {
      setError(`File too large. Max ${maxMB} MB for ${isVideo ? 'videos' : 'images'}.`);
      return;
    }

    setError('');
    setUploading(true);
    setProgress(10);

    // Simulate progress 10→70% while the fetch is in flight
    const timer = setInterval(() => {
      setProgress(prev => (prev >= 70 ? prev : prev + 10));
    }, 250);

    try {
      const result = await postsApi.uploadMedia(file);
      clearInterval(timer);

      if (result.error) {
        setError(result.error);
        setProgress(0);
      } else if (result.url) {
        setProgress(100);
        onUploadDone(result.url, result.media_type ?? (isVideo ? 'video' : 'image'));
        setTimeout(() => setProgress(0), 1200);
      }
    } catch {
      clearInterval(timer);
      setError('Upload failed. Please try again.');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  }, [onUploadDone]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPT,
    multiple: false,
    maxSize: MAX_VIDEO_MB * 1024 * 1024,   // react-dropzone hard limit (video max)
    onDropRejected: (rejections) => {
      const code = rejections[0]?.errors[0]?.code;
      if (code === 'file-too-large') setError(`File too large.`);
      else if (code === 'file-invalid-type') setError('Invalid file type.');
      else setError('File rejected.');
    },
  });

  // ── If a file is already uploaded, show the preview + remove button ──────
  if (previewUrl) {
    return (
      <div className="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
        {mediaType === 'image' ? (
          <img
            src={previewUrl}
            alt="Post media"
            className="w-full max-h-72 object-cover"
          />
        ) : (
          <video
            src={previewUrl}
            controls
            preload="metadata"
            className="w-full max-h-72"
          />
        )}

        {/* Remove button in the top-right corner */}
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          title="Remove media"
        >
          ×
        </button>
        <div className="absolute bottom-2 left-2">
          <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded">
            {mediaType === 'video' ? '🎬 Video' : '🖼 Image'}
          </span>
        </div>
      </div>
    );
  }

  // ── Drop zone ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-3">
            {/* Image icon */}
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {/* Video icon */}
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>

          {isDragActive ? (
            <p className="text-blue-600 font-medium text-sm">Drop your media here</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Drag & drop an image or video, or{' '}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); open(); }}
                  className="text-blue-600 underline hover:text-blue-700"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-gray-400">
                Images (JPG PNG GIF WEBP) up to {MAX_IMAGE_MB} MB · Videos (MP4 MOV WEBM) up to {MAX_VIDEO_MB} MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(uploading || progress > 0) && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{uploading ? 'Uploading…' : 'Done!'}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress === 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default MediaUpload;
