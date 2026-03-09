import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from './api';
import type { ProfileUser, SocialLinks } from './api';
import ImageUpload from './ImageUpload';
import SkillsInput from './SkillsInput';

// ─── Validation ───────────────────────────────────────────────────────────────

interface FormErrors {
  username?: string;
  email?: string;
  bio?: string;
  title?: string;
  location?: string;
}

const validateField = (name: string, value: string): string => {
  switch (name) {
    case 'username':
      if (!value.trim()) return 'Username is required.';
      if (value.length < 3) return 'Username must be at least 3 characters.';
      if (value.length > 30) return 'Username cannot exceed 30 characters.';
      if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Letters, numbers, and underscores only.';
      return '';
    case 'email':
      if (!value.trim()) return 'Email is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.';
      return '';
    case 'bio':
      if (value.length > 500) return 'Bio cannot exceed 500 characters.';
      return '';
    case 'title':
      if (value.length > 80) return 'Title cannot exceed 80 characters.';
      return '';
    case 'location':
      if (value.length > 100) return 'Location cannot exceed 100 characters.';
      return '';
    default:
      return '';
  }
};

// ─── Small reusable field ─────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  hint?: string;
}

const FormField: React.FC<FieldProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  type = 'text',
  hint,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.name, e.target.value)}
      placeholder={placeholder}
      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all
        ${error ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'}`}
    />
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
  </div>
);

// ─── Section wrapper ─────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({
  title,
  icon,
  children,
}) => (
  <div className="bg-white rounded-2xl shadow px-6 py-6">
    <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-4">
      <span>{icon}</span>
      {title}
    </h2>
    {children}
  </div>
);

// ─── Toast ────────────────────────────────────────────────────────────────────

const Toast: React.FC<{ message: string; type: 'success' | 'error' }> = ({ message, type }) => (
  <div
    className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
      ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
  >
    {type === 'success' ? '✓' : '✕'} {message}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ProfileEdit: React.FC = () => {
  const navigate = useNavigate();

  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [profilePicture, setProfilePicture] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    github: '',
    linkedin: '',
    twitter: '',
    website: '',
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load profile
  useEffect(() => {
    profileApi
      .getProfile()
      .then((res) => {
        if (res.user) {
          const u: ProfileUser = res.user;
          setUsername(u.username || '');
          setEmail(u.email || '');
          setTitle(u.title || '');
          setLocation(u.location || '');
          setBio(u.bio || '');
          setPhone(u.phone || '');
          setSkills(u.skills || []);
          setProfilePicture(u.profile_picture || '');
          setSocialLinks(
            u.social_links ?? { github: '', linkedin: '', twitter: '', website: '' }
          );
        }
      })
      .catch(() => {/* use empty defaults */})
      .finally(() => setLoading(false));
  }, []);

  // Real-time validation
  const handleFieldChange = useCallback((name: string, value: string) => {
    switch (name) {
      case 'username': setUsername(value); break;
      case 'email':    setEmail(value);    break;
      case 'title':    setTitle(value);    break;
      case 'location': setLocation(value); break;
      case 'bio':      setBio(value);      break;
      case 'phone':    setPhone(value);    break;
    }
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  }, []);

  const handleSocialChange = useCallback((key: keyof SocialLinks, value: string) => {
    setSocialLinks((prev) => ({ ...prev, [key]: value }));
  }, []);

  const validateAll = (): boolean => {
    const fields = { username, email, bio, title, location };
    const newErrors: FormErrors = {};
    let valid = true;
    for (const [name, value] of Object.entries(fields)) {
      const err = validateField(name, value);
      if (err) {
        newErrors[name as keyof FormErrors] = err;
        valid = false;
      }
    }
    setErrors(newErrors);
    setTouched({ username: true, email: true, bio: true, title: true, location: true });
    return valid;
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!validateAll()) return;

    setSaving(true);
    try {
      const res = await profileApi.updateProfile({
        bio,
        skills,
        profile_picture: profilePicture,
        title,
        location,
        phone,
        social_links: socialLinks,
      });
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast('Profile saved successfully!', 'success');
        setTimeout(() => navigate('/profile'), 1200);
      }
    } catch {
      showToast('Failed to save profile. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 mt-8">
        <div className="bg-white rounded-2xl shadow p-8 flex flex-col items-center gap-4 animate-pulse">
          <div className="w-24 h-24 rounded-full bg-gray-200" />
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="h-3 bg-gray-100 rounded w-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">Update your public profile information</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      </div>

      {/* ── Profile Photo ── */}
      <Section title="Profile Photo" icon="📷">
        <ImageUpload
          currentImage={profilePicture}
          username={username}
          onImageChange={(url) => setProfilePicture(url)}
        />
      </Section>

      {/* ── Basic Info ── */}
      <Section title="Basic Information" icon="👤">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Username"
            name="username"
            value={username}
            onChange={handleFieldChange}
            error={touched.username ? errors.username : undefined}
            placeholder="e.g. pachai_dev"
            hint="Only letters, numbers, and underscores."
          />
          <FormField
            label="Email"
            name="email"
            value={email}
            onChange={handleFieldChange}
            error={touched.email ? errors.email : undefined}
            placeholder="you@example.com"
            type="email"
          />
          <FormField
            label="Professional Title"
            name="title"
            value={title}
            onChange={handleFieldChange}
            error={touched.title ? errors.title : undefined}
            placeholder="e.g. Full Stack Developer"
          />
          <FormField
            label="Location"
            name="location"
            value={location}
            onChange={handleFieldChange}
            error={touched.location ? errors.location : undefined}
            placeholder="e.g. Chennai, India"
          />
          <div className="sm:col-span-2">
            <FormField
              label="Phone Number"
              name="phone"
              value={phone}
              onChange={handleFieldChange}
              placeholder="+91 98765 43210"
              type="tel"
            />
          </div>
        </div>
      </Section>

      {/* ── About / Bio ── */}
      <Section title="About" icon="📝">
        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => handleFieldChange('bio', e.target.value)}
          onFocus={() => setTouched((prev) => ({ ...prev, bio: true }))}
          rows={4}
          placeholder="Tell people about yourself, your experience, and what you're passionate about..."
          className={`w-full border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 transition-all
            ${touched.bio && errors.bio ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'}`}
        />
        <div className="flex justify-between mt-1">
          {touched.bio && errors.bio ? (
            <p className="text-xs text-red-500">{errors.bio}</p>
          ) : (
            <span />
          )}
          <span className={`text-xs ml-auto ${bio.length > 480 ? 'text-orange-500' : 'text-gray-400'}`}>
            {bio.length}/500
          </span>
        </div>
      </Section>

      {/* ── Skills ── */}
      <Section title="Skills" icon="🛠️">
        <SkillsInput
          skills={skills}
          onChange={setSkills}
        />
      </Section>

      {/* ── Social Links ── */}
      <Section title="Social Links" icon="🔗">
        <div className="space-y-3">
          {(
            [
              { key: 'github',   label: 'GitHub',   placeholder: 'https://github.com/username',     icon: '⌥' },
              { key: 'linkedin', label: 'LinkedIn',  placeholder: 'https://linkedin.com/in/username', icon: 'in' },
              { key: 'twitter',  label: 'Twitter/X', placeholder: 'https://twitter.com/username',    icon: '𝕏' },
              { key: 'website',  label: 'Website',   placeholder: 'https://yoursite.com',            icon: '🌐' },
            ] as { key: keyof SocialLinks; label: string; placeholder: string; icon: string }[]
          ).map(({ key, label, placeholder, icon }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-sm font-bold text-gray-600 flex-shrink-0">
                {icon}
              </span>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input
                  type="url"
                  value={socialLinks[key]}
                  onChange={(e) => handleSocialChange(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Form Actions ── */}
      <div className="flex items-center gap-3 pb-8">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 sm:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          disabled={saving}
          className="flex-1 sm:flex-none px-8 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors text-center"
        >
          Cancel
        </button>
      </div>

      {/* ── Toast notification ── */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

export default ProfileEdit;
