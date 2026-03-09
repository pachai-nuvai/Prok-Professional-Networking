import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImageUploadProps {
  currentImage?: string;
  username?: string;
  onImageChange: (previewUrl: string, file: File) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ currentImage, username, onImageChange }) => {
  const [preview, setPreview] = useState<string>(currentImage || '');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const initials = username ? username.slice(0, 2).toUpperCase() : 'ME';

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setError('');
      setUploading(true);
      setProgress(0);

      // Simulate upload progress
      let prog = 0;
      const interval = setInterval(() => {
        prog += 25;
        setProgress(prog);
        if (prog >= 100) {
          clearInterval(interval);
          setUploading(false);
          const url = URL.createObjectURL(file);
          setPreview(url);
          onImageChange(url, file);
        }
      }, 200);
    },
    [onImageChange]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
    noClick: false,
    onDropRejected: (files) => {
      const err = files[0]?.errors[0];
      if (err?.code === 'file-too-large') setError('File must be less than 5MB.');
      else if (err?.code === 'file-invalid-type') setError('Only image files are allowed.');
      else setError('Invalid file. Please try again.');
    },
  });

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar preview */}
      <div className="relative">
        {preview ? (
          <img
            src={preview}
            alt="Profile"
            className="w-28 h-28 rounded-full object-cover border-4 border-blue-200 shadow-md"
          />
        ) : (
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-blue-200 shadow-md">
            {initials}
          </div>
        )}
        {preview && (
          <button
            type="button"
            onClick={() => { setPreview(''); onImageChange('', new File([], '')); }}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow"
            title="Remove photo"
          >
            ×
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`w-full max-w-sm border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <p className="text-gray-600 font-medium">
                Drag & drop your photo here, or{' '}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); open(); }}
                  className="text-blue-600 underline hover:text-blue-700"
                >
                  browse
                </button>
              </p>
              <p className="text-gray-400 text-xs">PNG, JPG, GIF, WEBP – max 5MB</p>
            </>
          )}
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="w-full max-w-sm">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default ImageUpload;
