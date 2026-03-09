// ─── Mock Data for Day 3 – Profile UI ───────────────────────────────────────

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

export interface ActivityItem {
  id: number;
  type: 'post' | 'connection' | 'like' | 'comment';
  content: string;
  timestamp: string;
  likes?: number;
  comments?: number;
  target?: string; // person connected with, post liked, etc.
}

export interface MockProfileUser {
  id: number;
  username: string;
  email: string;
  title: string;
  location: string;
  bio: string;
  profile_picture: string;
  skills: string[];
  social_links: SocialLinks;
  experience: ExperienceItem[];
  education: EducationItem[];
  connections_count: number;
  mutual_connections: number;
  posts_count: number;
  phone: string;
}

export const mockProfileUser: MockProfileUser = {
  id: 1,
  username: 'pachai_dev',
  email: 'pachai@example.com',
  title: 'Full Stack Developer',
  location: 'Chennai, Tamil Nadu, India',
  bio: 'Passionate full-stack developer with 3+ years of experience building scalable web applications. I love working with React, TypeScript, and Python. Always eager to learn new technologies and contribute to open-source projects.',
  profile_picture: '',
  skills: ['React', 'TypeScript', 'Python', 'Flask', 'PostgreSQL', 'Docker', 'Git', 'REST APIs', 'TailwindCSS'],
  social_links: {
    github: 'https://github.com/pachai-dev',
    linkedin: 'https://linkedin.com/in/pachai-dev',
    twitter: 'https://twitter.com/pachai-dev',
    website: 'https://pachai.dev',
  },
  experience: [
    {
      id: 1,
      title: 'Full Stack Developer',
      company: 'Tech Solutions Pvt Ltd',
      location: 'Chennai, India',
      start_date: 'Jan 2022',
      end_date: 'Present',
      description:
        'Built and maintained React frontends and Flask backends for B2B SaaS products. Led migration from REST to GraphQL APIs. Improved page load time by 40% through code-splitting and lazy loading.',
    },
    {
      id: 2,
      title: 'Junior Frontend Developer',
      company: 'StartupHub Technologies',
      location: 'Remote',
      start_date: 'Jun 2021',
      end_date: 'Dec 2021',
      description:
        'Developed responsive UI components for a social networking platform using Vue.js and Tailwind CSS. Collaborated with backend team to integrate REST APIs.',
    },
  ],
  education: [
    {
      id: 1,
      school: 'Anna University',
      degree: 'B.E.',
      field: 'Computer Science and Engineering',
      start_date: '2018',
      end_date: '2022',
      grade: '8.7 CGPA',
    },
  ],
  connections_count: 342,
  mutual_connections: 12,
  posts_count: 28,
  phone: '+91 98765 43210',
};

export const mockActivity: ActivityItem[] = [
  {
    id: 1,
    type: 'post',
    content: 'Excited to share my new article on React 18 concurrent features! The transition from legacy rendering to concurrent mode has been a game-changer for our app\'s performance.',
    timestamp: '2024-01-15T10:30:00Z',
    likes: 24,
    comments: 8,
  },
  {
    id: 2,
    type: 'connection',
    content: 'Connected with',
    target: 'Priya Sharma – Senior Engineer at Google',
    timestamp: '2024-01-14T14:20:00Z',
  },
  {
    id: 3,
    type: 'post',
    content: 'Just deployed my first Dockerized Flask app on AWS ECS. Here\'s what I learned about container orchestration and environment management in production...',
    timestamp: '2024-01-12T09:15:00Z',
    likes: 41,
    comments: 13,
  },
  {
    id: 4,
    type: 'like',
    content: 'Liked a post by',
    target: 'Rahul Kumar – "10 Python tricks every developer should know"',
    timestamp: '2024-01-11T16:45:00Z',
  },
  {
    id: 5,
    type: 'post',
    content: 'TypeScript generics might look scary at first, but once you get the hang of them, they\'re incredibly powerful. Here\'s a simple guide I wrote to demystify them.',
    timestamp: '2024-01-10T11:00:00Z',
    likes: 37,
    comments: 9,
  },
  {
    id: 6,
    type: 'comment',
    content: 'Commented on',
    target: 'Ananya Iyer\'s post about "Building accessible web apps"',
    timestamp: '2024-01-09T13:30:00Z',
  },
  {
    id: 7,
    type: 'connection',
    content: 'Connected with',
    target: 'Vijay Mohan – CTO at CloudSpark',
    timestamp: '2024-01-08T10:00:00Z',
  },
  {
    id: 8,
    type: 'post',
    content: 'Open to new opportunities! Looking for Senior Full Stack Developer roles where I can work on impactful products. DM or connect if you have something exciting.',
    timestamp: '2024-01-07T09:00:00Z',
    likes: 62,
    comments: 21,
  },
];

// ─── Mock Validation Rules ───────────────────────────────────────────────────

export interface ValidationRule {
  field: string;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  message: string;
}

export const mockValidationRules: ValidationRule[] = [
  {
    field: 'username',
    required: true,
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: 'Username must be 3–30 characters, letters/numbers/underscores only.',
  },
  {
    field: 'email',
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address.',
  },
  {
    field: 'bio',
    required: false,
    maxLength: 500,
    message: 'Bio cannot exceed 500 characters.',
  },
  {
    field: 'title',
    required: false,
    maxLength: 80,
    message: 'Title cannot exceed 80 characters.',
  },
  {
    field: 'location',
    required: false,
    maxLength: 100,
    message: 'Location cannot exceed 100 characters.',
  },
];

// ─── Mock API Responses ──────────────────────────────────────────────────────

export const mockApiResponses = {
  getProfile: {
    success: true,
    user: mockProfileUser,
  },
  updateProfile: {
    success: true,
    message: 'Profile updated successfully.',
  },
  uploadImage: {
    success: true,
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pachai',
  },
};
