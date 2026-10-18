import {useState} from 'react';
import {suggestSkill} from '../../lib/taxonomyApi';
import type {SkillCategory} from '../../types/api';

export function SkillSuggestion({categories}: {categories: SkillCategory[]}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async () => {
    setPending(true);
    try {
      await suggestSkill(Number(category), name.trim());
      setName('');
      setMessage('Thanks. Staff will review it, and it appears for everyone once approved.');
    } catch {
      setMessage('Could not submit. This skill may already be listed or pending review.');
    } finally {
      setPending(false);
    }
  };
  return (
    <details className="rounded-xl border border-[#E2E8F0] p-3 text-sm">
      <summary className="cursor-pointer font-medium text-[#13294B]">Can't find a skill? Suggest one</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
        <label className="block">Skill name<input maxLength={120} className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2" value={name} onChange={event => setName(event.target.value)}/></label>
        <label className="block">Category<select className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2" value={category} onChange={event => setCategory(event.target.value)}><option value="">Choose a category</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <button type="button" disabled={pending || !name.trim() || !category} className="rounded-lg border border-[#13294B] px-4 py-2 font-medium text-[#13294B] disabled:opacity-50" onClick={() => void submit()}>Submit suggestion</button>
      </div>
      <p role="status" className="mt-2 text-[#475569]">{message}</p>
    </details>
  );
}
