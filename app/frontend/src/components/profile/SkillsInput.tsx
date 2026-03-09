import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';

interface SkillsInputProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  error?: string;
}

const SkillsInput: React.FC<SkillsInputProps> = ({ skills, onChange, error }) => {
  const [inputValue, setInputValue] = useState('');

  const addSkill = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
    }
    setInputValue('');
  };

  const removeSkill = (skill: string) => {
    onChange(skills.filter((s) => s !== skill));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && skills.length > 0) {
      removeSkill(skills[skills.length - 1]);
    }
  };

  return (
    <div>
      <div
        className={`min-h-[48px] flex flex-wrap gap-2 items-center p-2 border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white transition-all
          ${error ? 'border-red-400' : 'border-gray-300'}`}
      >
        {skills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="ml-1 text-blue-500 hover:text-blue-800 font-bold leading-none"
              aria-label={`Remove ${skill}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => inputValue.trim() && addSkill(inputValue)}
          placeholder={skills.length === 0 ? 'Add skills (press Enter or comma to add)' : 'Add more...'}
          className="flex-1 min-w-[140px] outline-none text-sm text-gray-700 bg-transparent py-1 px-1"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <p className="mt-1 text-xs text-gray-400">Press Enter or comma to add a skill. Backspace to remove the last one.</p>
    </div>
  );
};

export default SkillsInput;
