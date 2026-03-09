/**
 * ImageUpload.tsx
 * ───────────────
 * Drag-and-drop profile photo uploader.
 *
 * Features:
 *  • react-dropzone for drag-and-drop + file picker
 *  • Client-side validation (type, size) before hitting the server
 *  • Calls profileApi.uploadImage() which POSTs to POST /profile/image
 *  • Shows a progress bar while uploading
 *  • Live preview of the selected/uploaded image
 *  • Remove button to clear the photo
 *  • Graceful offline fallback (blob: URL preview when backend is down)
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
// useDropzone – the main hook from react-dropzone.
// It wires up all drag events, click-to-open, and file filtering.

import { profileApi } from './api';
// Our unified API module; uploadImage() handles the fetch to Flask.

// ─── Types ─────────────────────────────────────────────────────────────────

interface ImageUploadProps {
  currentImage?: string;   // existing profile_picture URL (to show on load)
  username?: string;       // used to generate initials for the avatar placeholder
  /** Called when the upload succeeds. Parent stores the returned URL. */
  onImageChange: (url: string, file: File) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_SIZE_MB  = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;   // 5 × 1024 × 1024 = 5,242,880 bytes

// MIME types the dropzone will accept.
// Keys are MIME types; values are arrays of allowed extensions (for the
// OS file picker). The server does its own validation too.
const ACCEPT_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png':  ['.png'],
  'image/gif':  ['.gif'],
  'image/webp': ['.webp'],
};

// ─── Component ──────────────────────────────────────────────────────────────

const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImage,
  username,
  onImageChange,
}) => {
  // ── State ────────────────────────────────────────────────────────────────

  /**
   * preview – the URL shown in the <img> tag.
   * Starts as currentImage (loaded from the backend), then updated after upload.
   */
  const [preview, setPreview]     = useState<string>(currentImage ?? '');
  const [uploading, setUploading] = useState(false);    // true while the HTTP request is in flight
  const [progress, setProgress]   = useState(0);        // 0–100, drives the progress bar
  const [error, setError]         = useState('');       // validation / server error message

  /** Two-letter initials shown when there's no photo (e.g. "PA" for "pachai"). */
  const initials = (username ?? 'ME').slice(0, 2).toUpperCase();

  // ── Drop handler ─────────────────────────────────────────────────────────

  /**
   * onDrop is called by useDropzone when the user drops or selects files.
   * acceptedFiles contains files that passed the accept/maxSize filters.
   *
   * useCallback prevents recreating the function on every render.
   * The dependency array [onImageChange] means it only recreates when
   * the parent changes the callback reference.
   */
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];   // we set multiple=false, so at most 1 file
    if (!file) return;

    setError('');        // clear any previous error
    setUploading(true);  // show spinner / progress bar
    setProgress(10);     // show immediate progress feedback (not 0)

    try {
      // Simulate progress going to 60% while the request is in flight.
      // We can't get real upload progress with fetch(), so we fake it.
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 60) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;   // increment by 10% every 200ms
        });
      }, 200);

      // ── Actual upload ─────────────────────────────────────────────────
      // profileApi.uploadImage() sends POST /profile/image with FormData.
      // On success it returns { url: "http://localhost:5000/uploads/..." }.
      // On failure (or backend down) it returns a blob: URL fallback.
      const result = await profileApi.uploadImage(file);

      clearInterval(progressInterval);   // stop the fake progress

      if (result.error) {
        // Server rejected the file (bad type, too large, corrupted, etc.)
        setError(result.error);
        setProgress(0);
      } else if (result.url) {
        // Upload succeeded – show the returned URL as the avatar
        setProgress(100);
        setPreview(result.url);
        onImageChange(result.url, file);   // notify parent component
      }
    } catch {
      setError('Upload failed. Please try again.');
      setProgress(0);
    } finally {
      setUploading(false);
      // Reset progress bar after a short delay so the user sees 100%
      setTimeout(() => setProgress(0), 1200);
    }
  }, [onImageChange]);

  // ── Dropzone config ──────────────────────────────────────────────────────

  const {
    getRootProps,    // spread onto the drop zone <div> to wire up drag events
    getInputProps,   // spread onto a hidden <input type="file">
    isDragActive,    // true when the user is hovering a file over the drop zone
    open,            // function to programmatically open the OS file picker
  } = useDropzone({
    onDrop,
    accept: ACCEPT_TYPES,         // only allow image files
    maxSize: MAX_SIZE_BYTES,      // react-dropzone will reject larger files before onDrop
    multiple: false,               // only one file at a time
    onDropRejected: (rejections) => {
      // react-dropzone calls this with files that failed its own validation.
      const firstError = rejections[0]?.errors[0];
      if (firstError?.code === 'file-too-large') {
        setError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
      } else if (firstError?.code === 'file-invalid-type') {
        setError('Invalid file type. Allowed: JPG, PNG, GIF, WEBP.');
      } else {
        setError('File rejected. Please try a different file.');
      }
    },
  });

  // ── Remove handler ───────────────────────────────────────────────────────

  const handleRemove = () => {
    setPreview('');
    setError('');
    // Notify parent with empty string so it clears profile_picture
    onImageChange('', new File([], ''));
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-5">

      {/* ── Avatar preview ── */}
      <div className="relative">
        {preview ? (
          /*
           * Show the uploaded/existing profile picture.
           * onError hides broken images (e.g. a blob: URL after reload).
           */
          <img
            src={preview}
            alt="Profile"
            className="w-28 h-28 rounded-full object-cover border-4 border-blue-200 shadow-md"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          /* Coloured circle with initials when no photo is set */
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-md">
            {initials}
          </div>
        )}

        {/* Remove button – only shown when there's a photo */}
        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow transition-colors"
            title="Remove photo"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Drop Zone ── */}
      {/*
        getRootProps() returns event handlers for:
          onDrop, onDragOver, onDragEnter, onDragLeave, onClick
        Spreading them onto the <div> makes the entire div a drop target.

        isDragActive switches the styling when the user hovers a file over it.
      */}
      <div
        {...getRootProps()}
        className={`
          w-full max-w-sm border-2 border-dashed rounded-xl p-6 text-center
          cursor-pointer transition-all duration-200
          ${isDragActive
            ? 'border-blue-500 bg-blue-50 scale-[1.02]'       // active drag style
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'  // idle style
          }
        `}
      >
        {/* Hidden native file input – react-dropzone manages this */}
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-2">
          {/* Upload icon */}
          <svg
            className={`w-10 h-10 transition-colors ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>

          {isDragActive ? (
            <p className="text-blue-600 font-medium">Drop your image here</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Drag & drop your photo here, or{' '}
                {/*
                  stopPropagation() prevents the click bubbling to the parent
                  div (which would open the file picker twice – once via
                  getRootProps().onClick and once via our manual open() call).
                */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); open(); }}
                  className="text-blue-600 underline hover:text-blue-700 font-medium"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-gray-400">
                JPG, PNG, GIF, WEBP · max {MAX_SIZE_MB} MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Upload progress bar ── */}
      {(uploading || progress > 0) && (
        <div className="w-full max-w-sm">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{uploading ? 'Uploading to server…' : 'Upload complete!'}</span>
            <span>{progress}%</span>
          </div>
          {/*
            The progress bar width is driven by the `progress` state variable.
            Tailwind's transition-all animates the width change smoothly.
          */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress === 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Error message ── */}
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-red-500">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default ImageUpload;
