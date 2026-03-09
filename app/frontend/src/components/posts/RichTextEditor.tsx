/**
 * RichTextEditor.tsx
 * ──────────────────
 * A lightweight markdown-toolbar textarea editor.
 *
 * Why not a full RTE library?
 *   Libraries like react-quill or TipTap are powerful but heavy and
 *   require extra setup. This editor uses a plain <textarea> with a
 *   toolbar that wraps selected text in markdown syntax.
 *   The PostPreview component renders that markdown to styled HTML.
 *
 * Toolbar buttons and what they insert:
 *   Bold       **selected**
 *   Italic     *selected*
 *   Code       `selected`
 *   Bullet     - selected  (on new line)
 *   Heading    ## selected (on new line)
 *   Link       [selected](url)
 *   Quote      > selected  (on new line)
 */

import React, { useRef } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  value:       string;
  onChange:    (value: string) => void;
  placeholder?: string;
  maxLength?:  number;
  error?:      string;
}

// ─── Toolbar definition ────────────────────────────────────────────────────

interface ToolbarButton {
  label:   string;   // aria-label and tooltip
  icon:    string;   // rendered as text / emoji / symbol
  prefix:  string;   // text inserted BEFORE selection
  suffix:  string;   // text inserted AFTER selection
  newLine: boolean;  // if true, ensure the insertion is on its own line
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { label: 'Bold',        icon: 'B',  prefix: '**', suffix: '**', newLine: false },
  { label: 'Italic',      icon: 'I',  prefix: '*',  suffix: '*',  newLine: false },
  { label: 'Code',        icon: '`',  prefix: '`',  suffix: '`',  newLine: false },
  { label: 'Bullet list', icon: '•',  prefix: '- ', suffix: '',   newLine: true  },
  { label: 'Heading',     icon: 'H',  prefix: '## ',suffix: '',   newLine: true  },
  { label: 'Quote',       icon: '❝',  prefix: '> ', suffix: '',   newLine: true  },
  { label: 'Link',        icon: '🔗', prefix: '[',  suffix: '](url)', newLine: false },
];

// ─── Helper ────────────────────────────────────────────────────────────────

/**
 * Insert markdown syntax around the currently selected text in a textarea.
 *
 * Steps:
 *   1. Read selectionStart and selectionEnd from the textarea element.
 *   2. Split text into: before + selected + after.
 *   3. Build the new value with prefix + selected + suffix inserted.
 *   4. Call onChange() so React state is updated.
 *   5. Restore the cursor/selection position.
 */
function wrapSelection(
  textarea: HTMLTextAreaElement,
  btn:      ToolbarButton,
  onChange: (v: string) => void
) {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end);

  let insertText: string;
  let newStart:   number;
  let newEnd:     number;

  if (btn.newLine) {
    // Ensure the insertion starts at the beginning of a line.
    // If the character before start is NOT a newline (and we're not at pos 0),
    // prepend a newline so the bullet/heading is on its own line.
    const needsNewlineBefore =
      start > 0 && value[start - 1] !== '\n';
    const linePrefix = needsNewlineBefore ? '\n' : '';
    insertText = `${linePrefix}${btn.prefix}${selected}${btn.suffix}`;
    newStart   = start + linePrefix.length + btn.prefix.length;
    newEnd     = newStart + selected.length;
  } else {
    insertText = `${btn.prefix}${selected}${btn.suffix}`;
    newStart   = start + btn.prefix.length;
    newEnd     = newStart + selected.length;
  }

  // Build the new full text value
  const newValue = value.slice(0, start) + insertText + value.slice(end);
  onChange(newValue);

  // Re-focus and restore selection after React re-renders the textarea value.
  // requestAnimationFrame waits one frame so the DOM is updated first.
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(newStart, newEnd);
  });
}

// ─── Component ─────────────────────────────────────────────────────────────

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'What\'s on your mind? Use the toolbar for formatting…',
  maxLength   = 3000,
  error,
}) => {
  // ref gives us direct access to the underlying <textarea> DOM node,
  // which we need to read selectionStart / selectionEnd.
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleToolbarClick = (btn: ToolbarButton) => {
    if (!textareaRef.current) return;
    wrapSelection(textareaRef.current, btn, onChange);
  };

  const remaining = maxLength - value.length;
  const isNearLimit = remaining < 200;

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200 flex-wrap">
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.label}
            type="button"
            title={btn.label}
            aria-label={btn.label}
            onMouseDown={(e) => {
              // preventDefault stops the textarea from losing focus when
              // the toolbar button is clicked.
              e.preventDefault();
              handleToolbarClick(btn);
            }}
            className={`
              w-8 h-8 flex items-center justify-center rounded text-sm font-medium
              transition-colors hover:bg-gray-200 active:bg-gray-300 text-gray-600
              ${btn.label === 'Bold'   ? 'font-bold'   : ''}
              ${btn.label === 'Italic' ? 'italic'      : ''}
            `}
          >
            {btn.icon}
          </button>
        ))}

        {/* Separator */}
        <div className="flex-1" />

        {/* Character counter */}
        <span className={`text-xs font-mono transition-colors ${
          isNearLimit ? (remaining < 0 ? 'text-red-500' : 'text-orange-500') : 'text-gray-400'
        }`}>
          {remaining < 0 ? `${Math.abs(remaining)} over limit` : `${value.length}/${maxLength}`}
        </span>
      </div>

      {/* ── Textarea ── */}
      {/*
        The textarea is the actual editing surface.
        - ref        → so wrapSelection() can read selection positions
        - value      → controlled by parent state (React one-way data flow)
        - onChange   → updates parent state on every keystroke
        - rows={10}  → visible height (user can resize via CSS resize handle)
      */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={10}
        className={`
          w-full p-4 text-sm text-gray-800 bg-white resize-y
          focus:outline-none leading-relaxed font-mono
          ${error ? 'bg-red-50' : ''}
        `}
        style={{ minHeight: '200px' }}
        maxLength={maxLength + 500}   // soft limit enforced by API; hard DOM limit gives buffer
      />

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
