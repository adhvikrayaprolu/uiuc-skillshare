import type { KeyboardEvent, ReactNode } from 'react';

export interface TabItem<T extends string> {
  key: T;
  label: ReactNode;
}

interface TabsProps<T extends string> {
  label: string;
  idPrefix: string;
  tabs: TabItem<T>[];
  active: T;
  onSelect: (key: T) => void;
}

export function Tabs<T extends string>({ label, idPrefix, tabs, active, onSelect }: TabsProps<T>) {
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!offset) return;
    const next = tabs[(index + offset + tabs.length) % tabs.length];
    onSelect(next.key);
    document.getElementById(`${idPrefix}-tab-${next.key}`)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="mb-6 flex gap-1 overflow-x-auto border-b border-[#E2E8F0]">
      {tabs.map((tab, index) => (
        <button
          key={tab.key}
          id={`${idPrefix}-tab-${tab.key}`}
          role="tab"
          type="button"
          aria-selected={active === tab.key}
          aria-controls={`${idPrefix}-panel-${tab.key}`}
          tabIndex={active === tab.key ? 0 : -1}
          onClick={() => onSelect(tab.key)}
          onKeyDown={(event) => move(event, index)}
          className={`-mb-px flex flex-shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${active === tab.key ? 'border-[#B83E00] text-[#13294B]' : 'border-transparent text-[#475569] hover:text-[#0F172A]'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ idPrefix, active, children }: { idPrefix: string; active: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${active}`} aria-labelledby={`${idPrefix}-tab-${active}`}>
      {children}
    </div>
  );
}
