/**
 * profile/api.ts
 * ──────────────
 * All HTTP calls related to the user profile.
 *
 * Strategy (offline-first / graceful degradation):
 *   1. Every function first tries to reach the real Flask backend.
 *   2. If the backend is unreachable (network error) OR returns a non-OK
 *      status, the function falls back to session-persisted mock data so
 *      the UI keeps working without a running backend (Day 3 / Day 4 dev).
 *   3. When the backend IS available (Day 4 onwards), real data is used and
 *      the mock fallback is silent.
 */

import { mockProfileUser, type MockProfileUser } from '../../data/mockData';

// ─── Config ────────────────────────────────────────────────────────────────

/**
 * Base URL of the Flask API.
 * Change this to your deployed server URL in production.
 */
const API_URL = 'http://localhost:5000';

/**
 * localStorage key where the JWT access token is stored after login.
 * Must match the key used in AuthContext.tsx.
 */
const TOKEN_KEY = 'prok_access_token';

/** Read the stored JWT and build the Authorization header value. */
const authHeader = (): Record<string, string> => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
});

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SocialLinks {
  github: string;
  linkedin: string;
  twitter: string;
  website: string;
}

export interface ExperienceItem {
  id: number;
  title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string;
  description: string;
}

export interface EducationItem {
  id: number;
  school: string;
  degree: string;
  field: string;
  start_date: string;
  end_date: string;
  grade: string;
}

/** Shape of the data sent to PUT /profile */
export interface ProfileData {
  bio?: string;
  skills?: string[];
  profile_picture?: string;
  title?: string;
  location?: string;
  phone?: string;
  social_links?: SocialLinks;
  experience?: ExperienceItem[];
  education?: EducationItem[];
}

/** Shape of a full user profile returned by GET /profile or PUT /profile */
export interface ProfileUser {
  id: number;
  username: string;
  email: string;
  bio: string;
  skills: string[];
  profile_picture: string;
  title?: string;
  location?: string;
  phone?: string;
  social_links?: SocialLinks;
  experience?: ExperienceItem[];
  education?: EducationItem[];
  connections_count?: number;
  mutual_connections?: number;
  posts_count?: number;
}

export interface ProfileResponse {
  user?: ProfileUser;
  error?: string;
  message?: string;
}

export interface ImageUploadResponse {
  url?: string;
  error?: string;
  message?: string;
}

// ─── Mock Data Helpers ─────────────────────────────────────────────────────

/**
 * When the backend returns extended fields, use them.
 * For any field the backend doesn't return yet, fall back to our rich
 * mock data (title, location, experience, education, etc.).
 * This way the UI looks great even before the backend supports all fields.
 */
const enrichWithMockData = (backendUser: ProfileUser): ProfileUser => ({
  ...mockProfileUser,   // start with ALL mock fields as base
  ...backendUser,       // override with real backend fields
  // For each extended field, prefer backend value; fall back to mock
  title:              backendUser.title              ?? mockProfileUser.title,
  location:           backendUser.location           ?? mockProfileUser.location,
  phone:              backendUser.phone              ?? mockProfileUser.phone,
  social_links:       backendUser.social_links       ?? mockProfileUser.social_links,
  experience:         backendUser.experience         ?? mockProfileUser.experience,
  education:          backendUser.education          ?? mockProfileUser.education,
  connections_count:  backendUser.connections_count  ?? mockProfileUser.connections_count,
  mutual_connections: backendUser.mutual_connections ?? mockProfileUser.mutual_connections,
  posts_count:        backendUser.posts_count        ?? mockProfileUser.posts_count,
});

/**
 * sessionStorage key for the offline-fallback profile.
 * sessionStorage is cleared when the tab is closed (unlike localStorage).
 * This means edits made in mock mode persist for the browser session.
 */
const MOCK_PROFILE_KEY = 'prok_mock_profile';

const getSessionMockProfile = (): MockProfileUser => {
  try {
    const stored = sessionStorage.getItem(MOCK_PROFILE_KEY);
    return stored ? (JSON.parse(stored) as MockProfileUser) : mockProfileUser;
  } catch {
    return mockProfileUser;
  }
};

const saveSessionMockProfile = (profile: MockProfileUser): void => {
  sessionStorage.setItem(MOCK_PROFILE_KEY, JSON.stringify(profile));
};

// ─── API Object ────────────────────────────────────────────────────────────

export const profileApi = {

  /**
   * GET /profile
   * ─────────────
   * Fetch the logged-in user's full profile.
   *
   * Flow:
   *   1. Send GET /profile with the JWT Authorization header.
   *   2. On success (200 OK) → enrich the backend response with mock
   *      extended fields and return it.
   *   3. On any failure (network error, 401, 404, …) → return the
   *      session-stored mock profile as a silent fallback.
   */
  getProfile: async (): Promise<ProfileResponse> => {
    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: 'GET',
        headers: authHeader(),
      });

      if (response.ok) {
        const data: ProfileResponse = await response.json();
        if (data.user) {
          // Cache the real profile into session mock so future offline
          // fallbacks reflect the user's actual saved data.
          saveSessionMockProfile(data.user as unknown as MockProfileUser);
          return { user: enrichWithMockData(data.user) };
        }
        if (data.error) return { error: data.error };
      }
    } catch {
      // Network error (backend not running) – fall through silently
    }

    // ── Offline fallback ────────────────────────────────────────────────
    return { user: getSessionMockProfile() as unknown as ProfileUser };
  },

  /**
   * PUT /profile
   * ─────────────
   * Update the logged-in user's profile fields.
   *
   * @param profileData  Partial profile object – only send changed fields.
   *
   * Flow:
   *   1. Send PUT /profile with JSON body and JWT header.
   *   2. On success → enrich + return updated profile.
   *   3. On failure → patch session mock data locally and return it.
   */
  updateProfile: async (profileData: Partial<ProfileData>): Promise<ProfileResponse> => {
    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',   // tell Flask to parse body as JSON
          ...authHeader(),
        },
        body: JSON.stringify(profileData),       // serialise to JSON string
      });

      if (response.ok) {
        const data: ProfileResponse = await response.json();
        if (data.user) {
          saveSessionMockProfile(data.user as unknown as MockProfileUser);
          return { user: enrichWithMockData(data.user), message: data.message };
        }
        if (data.error) return { error: data.error };
      }

      // Server returned an error (400, 404, etc.) – parse the error body
      const errData: ProfileResponse = await response.json().catch(() => ({}));
      return { error: errData.error ?? 'Failed to update profile.' };
    } catch {
      // ── Offline fallback: update session mock locally ───────────────
    }

    const current = getSessionMockProfile();
    const updated: MockProfileUser = {
      ...current,
      bio:             profileData.bio             ?? current.bio,
      skills:          profileData.skills          ?? current.skills,
      profile_picture: profileData.profile_picture ?? current.profile_picture,
      title:           profileData.title           ?? current.title,
      location:        profileData.location        ?? current.location,
      phone:           profileData.phone           ?? current.phone,
      social_links:    profileData.social_links    ?? current.social_links,
      experience:      profileData.experience      ?? current.experience,
      education:       profileData.education       ?? current.education,
    };
    saveSessionMockProfile(updated);
    return { user: updated as unknown as ProfileUser, message: 'Saved locally (offline mode).' };
  },

  /**
   * POST /profile/image
   * ───────────────────
   * Upload a profile photo to the backend.
   *
   * Uses multipart/form-data (required for binary file upload).
   * The backend validates type + size, processes the image with Pillow,
   * and returns the public URL of the saved file.
   *
   * @param file  The File object from the drag-and-drop or file picker.
   * @returns     { url, message } on success; { error } on failure.
   *
   * Fallback: if the backend is offline, returns a local object URL
   * (blob: URL) so the UI still shows a preview – it just won't persist
   * after a page reload.
   */
  uploadImage: async (file: File): Promise<ImageUploadResponse> => {
    // FormData is the standard way to send files over HTTP.
    // The field name 'image' must match what the Flask endpoint expects.
    const formData = new FormData();
    formData.append('image', file);   // key='image', value=File object

    try {
      const response = await fetch(`${API_URL}/profile/image`, {
        method: 'POST',
        // Do NOT set Content-Type header manually for FormData –
        // the browser sets it automatically with the correct boundary string.
        headers: authHeader(),
        body: formData,
      });

      const data: ImageUploadResponse = await response.json();

      if (response.ok && data.url) {
        return { url: data.url, message: data.message };
      }
      return { error: data.error ?? 'Upload failed.' };
    } catch {
      // ── Offline fallback: create a local blob URL for preview ───────
      // URL.createObjectURL() creates a temporary URL that points to the
      // file in the browser's memory. It works for display but is lost on reload.
      const localUrl = URL.createObjectURL(file);
      return { url: localUrl, message: 'Saved locally (offline mode).' };
    }
  },
};
