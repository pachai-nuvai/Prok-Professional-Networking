import { mockProfileUser, type MockProfileUser } from '../../data/mockData';

const API_URL = 'http://localhost:5000';
const TOKEN_KEY = 'prok_access_token';

// ─── Extended Types ──────────────────────────────────────────────────────────

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

export interface ProfileData {
  bio: string;
  skills: string[];
  profile_picture: string;
  title?: string;
  location?: string;
  phone?: string;
  social_links?: SocialLinks;
  experience?: ExperienceItem[];
  education?: EducationItem[];
}

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
}

// ─── Merge backend user with mock extended fields ────────────────────────────

const enrichWithMockData = (backendUser: ProfileUser): ProfileUser => ({
  ...mockProfileUser,
  ...backendUser,
  // Keep mock extended fields if backend doesn't return them
  title: backendUser.title ?? mockProfileUser.title,
  location: backendUser.location ?? mockProfileUser.location,
  phone: backendUser.phone ?? mockProfileUser.phone,
  social_links: backendUser.social_links ?? mockProfileUser.social_links,
  experience: backendUser.experience ?? mockProfileUser.experience,
  education: backendUser.education ?? mockProfileUser.education,
  connections_count: backendUser.connections_count ?? mockProfileUser.connections_count,
  mutual_connections: backendUser.mutual_connections ?? mockProfileUser.mutual_connections,
  posts_count: backendUser.posts_count ?? mockProfileUser.posts_count,
});

// ─── Persist mock profile across the session ─────────────────────────────────

const MOCK_PROFILE_KEY = 'prok_mock_profile';

const getSessionMockProfile = (): MockProfileUser => {
  try {
    const stored = sessionStorage.getItem(MOCK_PROFILE_KEY);
    return stored ? JSON.parse(stored) : mockProfileUser;
  } catch {
    return mockProfileUser;
  }
};

const saveSessionMockProfile = (profile: MockProfileUser) => {
  sessionStorage.setItem(MOCK_PROFILE_KEY, JSON.stringify(profile));
};

// ─── API ─────────────────────────────────────────────────────────────────────

export const profileApi = {
  getProfile: async (): Promise<ProfileResponse> => {
    try {
      const response = await fetch(`${API_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          return { user: enrichWithMockData(data.user) };
        }
      }
    } catch {
      // Backend not available – fall through to mock
    }
    // Use session-persisted mock data
    return { user: getSessionMockProfile() as unknown as ProfileUser };
  },

  updateProfile: async (profileData: Partial<ProfileData>): Promise<ProfileResponse> => {
    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
        body: JSON.stringify(profileData),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          return { user: enrichWithMockData(data.user) };
        }
      }
    } catch {
      // Backend not available – update mock data in session
    }

    // Update session mock profile
    const current = getSessionMockProfile();
    const updated: MockProfileUser = {
      ...current,
      bio: profileData.bio ?? current.bio,
      skills: profileData.skills ?? current.skills,
      profile_picture: profileData.profile_picture ?? current.profile_picture,
      title: profileData.title ?? current.title,
      location: profileData.location ?? current.location,
      phone: profileData.phone ?? current.phone,
      social_links: profileData.social_links ?? current.social_links,
      experience: profileData.experience ?? current.experience,
      education: profileData.education ?? current.education,
    };
    saveSessionMockProfile(updated);
    return { user: updated as unknown as ProfileUser };
  },
};
