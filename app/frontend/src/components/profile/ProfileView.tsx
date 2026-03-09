import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { profileApi } from './api';
import type { ProfileUser } from './api';
import CollapsibleSection from './CollapsibleSection';
import { mockActivity, type ActivityItem } from '../../data/mockData';

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatBadge: React.FC<{ value: number | string; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center px-4">
    <span className="text-xl font-bold text-gray-900">{value}</span>
    <span className="text-xs text-gray-500 mt-0.5">{label}</span>
  </div>
);

const SocialLink: React.FC<{ href: string; title: string; children: React.ReactNode }> = ({
  href,
  title,
  children,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    title={title}
    className="text-gray-400 hover:text-blue-600 transition-colors"
  >
    {children}
  </a>
);

const ActivityIcon: React.FC<{ type: ActivityItem['type'] }> = ({ type }) => {
  const icons: Record<ActivityItem['type'], string> = {
    post: '📝',
    connection: '🤝',
    like: '❤️',
    comment: '💬',
  };
  return <span className="text-lg">{icons[type]}</span>;
};

const timeAgo = (isoString: string): string => {
  const diff = Date.now() - new Date(isoString).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} week${Math.floor(d / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(d / 30)} month${Math.floor(d / 30) > 1 ? 's' : ''} ago`;
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ACTIVITY_PAGE_SIZE = 3;

const ProfileView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activityPage, setActivityPage] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    profileApi
      .getProfile()
      .then((res) => {
        if (res.error) setError(res.error);
        else if (res.user) setProfile(res.user);
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const loadMoreActivity = useCallback(() => {
    setActivityLoading(true);
    setTimeout(() => {
      setActivityPage((p) => p + 1);
      setActivityLoading(false);
    }, 600);
  }, []);

  const visibleActivity = mockActivity.slice(0, activityPage * ACTIVITY_PAGE_SIZE);
  const hasMoreActivity = visibleActivity.length < mockActivity.length;

  const initials = (profile?.username || user?.username || '??').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 mt-8">
        <div className="bg-white rounded-2xl shadow p-8 flex flex-col items-center gap-4 animate-pulse">
          <div className="w-24 h-24 rounded-full bg-gray-200" />
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="h-3 bg-gray-100 rounded w-36" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4 mt-8">
        <div className="bg-white rounded-2xl shadow p-8 text-center text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">

      {/* ── Profile Card ── */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {/* Cover gradient */}
        <div className="h-28 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600" />

        <div className="px-6 pb-6 -mt-12">
          {/* Avatar */}
          <div className="flex items-end justify-between mb-4">
            <div>
              {profile?.profile_picture ? (
                <img
                  src={profile.profile_picture}
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                  {initials}
                </div>
              )}
            </div>
            <button
              onClick={() => navigate('/profile/edit')}
              className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
          </div>

          {/* Name & Title */}
          <h1 className="text-2xl font-bold text-gray-900">
            {profile?.username || user?.username}
          </h1>
          {profile?.title && (
            <p className="text-gray-600 font-medium mt-0.5">{profile.title}</p>
          )}

          {/* Location */}
          {profile?.location && (
            <p className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {profile.location}
            </p>
          )}

          {/* Email */}
          <p className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {profile?.email || user?.email}
          </p>

          {/* Social Links */}
          {profile?.social_links && (
            <div className="flex items-center gap-4 mt-3">
              {profile.social_links.github && (
                <SocialLink href={profile.social_links.github} title="GitHub">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                  </svg>
                </SocialLink>
              )}
              {profile.social_links.linkedin && (
                <SocialLink href={profile.social_links.linkedin} title="LinkedIn">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </SocialLink>
              )}
              {profile.social_links.twitter && (
                <SocialLink href={profile.social_links.twitter} title="Twitter / X">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </SocialLink>
              )}
              {profile.social_links.website && (
                <SocialLink href={profile.social_links.website} title="Personal Website">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </SocialLink>
              )}
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-around border-t border-gray-100 py-4 bg-gray-50">
          <StatBadge value={profile?.connections_count ?? 0} label="Connections" />
          <div className="w-px h-8 bg-gray-200" />
          <StatBadge value={profile?.mutual_connections ?? 0} label="Mutual" />
          <div className="w-px h-8 bg-gray-200" />
          <StatBadge value={profile?.posts_count ?? 0} label="Posts" />
        </div>
      </div>

      {/* ── About / Bio ── */}
      <div className="bg-white rounded-2xl shadow px-5 py-5">
        <h2 className="text-base font-semibold text-gray-800 mb-2">About</h2>
        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
          {profile?.bio || <span className="italic text-gray-400">No bio yet. Click Edit Profile to add one.</span>}
        </p>
      </div>

      {/* ── Skills ── */}
      <div className="bg-white rounded-2xl shadow px-5 py-5">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Skills</h2>
        {profile?.skills && profile.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-gray-400">No skills listed yet.</p>
        )}
      </div>

      {/* ── Experience (collapsible) ── */}
      <CollapsibleSection title="Experience" icon="💼">
        {profile?.experience && profile.experience.length > 0 ? (
          <ul className="space-y-5 pt-4">
            {profile.experience.map((exp) => (
              <li key={exp.id} className="flex gap-4">
                <div className="mt-1 flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{exp.title}</p>
                  <p className="text-sm text-gray-600">{exp.company} · {exp.location}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{exp.start_date} – {exp.end_date}</p>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{exp.description}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic text-gray-400 pt-4">No experience added yet.</p>
        )}
      </CollapsibleSection>

      {/* ── Education (collapsible) ── */}
      <CollapsibleSection title="Education" icon="🎓">
        {profile?.education && profile.education.length > 0 ? (
          <ul className="space-y-5 pt-4">
            {profile.education.map((edu) => (
              <li key={edu.id} className="flex gap-4">
                <div className="mt-1 flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{edu.school}</p>
                  <p className="text-sm text-gray-600">{edu.degree} · {edu.field}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{edu.start_date} – {edu.end_date}</p>
                  {edu.grade && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-medium">
                      {edu.grade}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic text-gray-400 pt-4">No education added yet.</p>
        )}
      </CollapsibleSection>

      {/* ── Contact Info ── */}
      <CollapsibleSection title="Contact Information" icon="📬" defaultOpen={false}>
        <ul className="space-y-3 pt-4">
          <li className="flex items-center gap-3 text-sm text-gray-700">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <a href={`mailto:${profile?.email}`} className="text-blue-600 hover:underline">
              {profile?.email || user?.email}
            </a>
          </li>
          {profile?.phone && (
            <li className="flex items-center gap-3 text-sm text-gray-700">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {profile.phone}
            </li>
          )}
        </ul>
      </CollapsibleSection>

      {/* ── Activity Feed ── */}
      <div className="bg-white rounded-2xl shadow px-5 py-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Recent Activity</h2>
        <ul className="space-y-4">
          {visibleActivity.map((item) => (
            <li key={item.id} className="flex gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <ActivityIcon type={item.type} />
              </div>
              <div className="flex-1 min-w-0">
                {(item.type === 'post') ? (
                  <p className="text-sm text-gray-700 line-clamp-2">{item.content}</p>
                ) : (
                  <p className="text-sm text-gray-700">
                    {item.content}{' '}
                    <span className="font-medium text-gray-900">{item.target}</span>
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400">{timeAgo(item.timestamp)}</span>
                  {item.likes !== undefined && (
                    <span className="text-xs text-gray-400">❤️ {item.likes}</span>
                  )}
                  {item.comments !== undefined && (
                    <span className="text-xs text-gray-400">💬 {item.comments}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Load more (lazy load) */}
        {hasMoreActivity && (
          <button
            onClick={loadMoreActivity}
            disabled={activityLoading}
            className="mt-5 w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {activityLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </span>
            ) : (
              'Show more activity'
            )}
          </button>
        )}
      </div>

    </div>
  );
};

export default ProfileView;
