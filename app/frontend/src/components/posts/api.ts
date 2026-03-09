/**
 * posts/api.ts
 * ────────────
 * All HTTP calls related to posts.
 *
 * The TOKEN_KEY must match the key used in AuthContext.tsx.
 * All write endpoints require the JWT to be present in localStorage.
 */

const API_URL   = 'http://localhost:5000';
const TOKEN_KEY = 'prok_access_token';

/** Build the Authorization header from the stored JWT. */
const authHeader = (): Record<string, string> => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
});

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PostAuthor {
  id:              number;
  username:        string;
  profile_picture: string;
}

export interface Post {
  id:             number;
  user_id:        number;
  content:        string;
  media_url:      string;
  media_type:     string;   // 'image' | 'video' | ''
  likes_count:    number;
  comments_count: number;
  tags:           string[];
  liked_by_user:  boolean;
  created_at:     string;
  author:         PostAuthor;
}

export interface PostsResponse {
  posts?:    Post[];
  post?:     Post;
  total?:    number;
  page?:     number;
  per_page?: number;
  pages?:    number;
  error?:    string;
  message?:  string;
}

export interface MediaUploadResponse {
  url?:        string;
  media_type?: string;
  error?:      string;
  message?:    string;
}

// ─── API ───────────────────────────────────────────────────────────────────

export const postsApi = {

  /**
   * POST /posts
   * ───────────
   * Create a new post.
   * content   – required; the post body (max 3000 chars)
   * mediaUrl  – optional; URL returned by uploadMedia()
   * mediaType – optional; 'image' | 'video'
   * tags      – optional; array of hashtag strings (without #)
   */
  createPost: async (
    content:   string,
    mediaUrl:  string = '',
    mediaType: string = '',
    tags:      string[] = [],
  ): Promise<PostsResponse> => {
    try {
      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify({ content, media_url: mediaUrl, media_type: mediaType, tags }),
      });
      return response.json();
    } catch {
      return { error: 'Network error. Is the backend running?' };
    }
  },

  /**
   * GET /posts?page=<n>&per_page=<n>
   * ─────────────────────────────────
   * Fetch a paginated list of posts, newest first.
   */
  getPosts: async (page = 1, perPage = 20): Promise<PostsResponse> => {
    try {
      const response = await fetch(
        `${API_URL}/posts?page=${page}&per_page=${perPage}`,
        { headers: authHeader() }
      );
      return response.json();
    } catch {
      return { error: 'Network error. Is the backend running?', posts: [] };
    }
  },

  /**
   * GET /posts/<id>
   * ────────────────
   * Fetch a single post.
   */
  getPost: async (postId: number): Promise<PostsResponse> => {
    try {
      const response = await fetch(`${API_URL}/posts/${postId}`, {
        headers: authHeader(),
      });
      return response.json();
    } catch {
      return { error: 'Network error.' };
    }
  },

  /**
   * POST /posts/<id>/like
   * ──────────────────────
   * Toggle like / unlike on a post.
   * Returns { liked: boolean, likes_count: number }.
   */
  toggleLike: async (postId: number): Promise<{ liked?: boolean; likes_count?: number; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: authHeader(),
      });
      return response.json();
    } catch {
      return { error: 'Network error.' };
    }
  },

  /**
   * DELETE /posts/<id>
   * ────────────────────
   * Delete a post (only the author can do this).
   */
  deletePost: async (postId: number): Promise<{ message?: string; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      return response.json();
    } catch {
      return { error: 'Network error.' };
    }
  },

  /**
   * POST /posts/media
   * ──────────────────
   * Upload an image or video file.
   * Uses multipart/form-data with field name 'file'.
   * Returns { url, media_type } on success.
   *
   * Why FormData and no Content-Type header?
   *   The browser automatically sets Content-Type to
   *   "multipart/form-data; boundary=..." when body is FormData.
   *   Setting it manually would omit the boundary and break parsing.
   */
  uploadMedia: async (file: File): Promise<MediaUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);   // field name 'file' matches Flask's request.files['file']

    try {
      const response = await fetch(`${API_URL}/posts/media`, {
        method: 'POST',
        headers: authHeader(),    // only auth header; NOT Content-Type
        body: formData,
      });
      return response.json();
    } catch {
      // Offline fallback: create a local blob URL for preview
      const localUrl = URL.createObjectURL(file);
      const isVideo  = file.type.startsWith('video/');
      return {
        url:        localUrl,
        media_type: isVideo ? 'video' : 'image',
        message:    'Saved locally (backend offline).',
      };
    }
  },
};
