import { useCallback } from 'react';
import { COVER_LABELS } from '../constants/i18n.js';

type TagsInputProps = {
  value: string[];
  placeholder?: string;
  onChange(tags: string[]): void;
};

export function TagsInput({ value, placeholder, onChange }: TagsInputProps) {
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const tags = event.target.value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    onChange(tags);
  }, [onChange]);

  return (
    <input
      type="text"
      value={value.join(', ')}
      onChange={handleChange}
      placeholder={placeholder ?? COVER_LABELS.tagsPlaceholder}
      aria-label={COVER_LABELS.tags}
    />
  );
}
