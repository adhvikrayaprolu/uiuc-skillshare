import { useId, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import type { SkillCategory, SkillTag } from '../../types/api';

interface SkillPickerProps {
  label: string;
  skills: SkillTag[];
  categories: SkillCategory[];
  selected: number[];
  onToggle: (id: number) => void;
  disabledIds?: number[];
  disabledHint?: string;
}

const categoryId = (skill: SkillTag) => (typeof skill.category === 'number' ? skill.category : skill.category.id);

export function SkillPicker({ label, skills, categories, selected, onToggle, disabledIds = [], disabledHint }: SkillPickerProps) {
  const [query, setQuery] = useState('');
  const searchId = useId();
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const visible = skills.filter((skill) => !needle || skill.name.toLowerCase().includes(needle));
    const named = categories.map((category) => ({ name: category.name, skills: visible.filter((skill) => categoryId(skill) === category.id) }));
    const known = new Set(categories.map((category) => category.id));
    const other = visible.filter((skill) => !known.has(categoryId(skill)));
    return [...named, { name: 'Other', skills: other }].filter((group) => group.skills.length);
  }, [categories, query, skills]);

  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="sr-only">{label}</legend>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
        <label htmlFor={searchId} className="sr-only">Filter skills</label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter skills, e.g. Python, Resume Review"
          className="w-full rounded-xl border border-[#E2E8F0] bg-white py-2.5 pl-9 pr-3 text-sm focus:border-[#13294B] focus:outline-none"
        />
      </div>
      <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
        {groups.map((group) => (
          <div key={group.name} role="group" aria-label={`${label}: ${group.name}`}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#475569]">{group.name}</p>
            <div className="flex flex-wrap gap-2">
              {group.skills.map((skill) => {
                const isSelected = selected.includes(skill.id);
                const isDisabled = !isSelected && disabledIds.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={isDisabled}
                    title={isDisabled ? disabledHint : undefined}
                    onClick={() => onToggle(skill.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      isSelected ? 'border-[#13294B] bg-[#13294B] text-white' : 'border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#13294B]'
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    {skill.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {!groups.length && <p className="text-sm text-[#475569]">No skills match “{query}”. Try another word or suggest a new skill below.</p>}
      </div>
    </fieldset>
  );
}
