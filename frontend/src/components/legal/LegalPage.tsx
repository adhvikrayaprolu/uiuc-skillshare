import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Logo } from '../ui/Logo';

const docs = [
  { to: '/guidelines', label: 'Community guidelines' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
];

export interface LegalSection {
  heading: string;
  body: ReactNode;
}

export function LegalPage({ title, intro, updated, sections }: { title: string; intro: ReactNode; updated: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/" aria-label="Illini SkillShare home"><Logo /></Link>
          <nav aria-label="Policies" className="flex flex-wrap gap-1 text-sm">
            {docs.map((doc) => (
              <NavLink key={doc.to} to={doc.to} className={({ isActive }) => `rounded-lg px-3 py-1.5 font-medium ${isActive ? 'bg-[#E8EEF7] text-[#13294B]' : 'text-[#475569] hover:text-[#0F172A]'}`}>
                {doc.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="mb-2 text-3xl font-bold text-[#0F172A] sm:text-4xl">{title}</h1>
        <p className="mb-6 text-sm text-[#64748B]">Last updated {updated}</p>
        <div className="mb-8 text-[#334155]">{intro}</div>
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-2 text-xl font-semibold text-[#0F172A]">{section.heading}</h2>
              <div className="space-y-3 text-[#334155] [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">{section.body}</div>
            </section>
          ))}
        </div>
        <p className="mt-12 border-t border-[#E2E8F0] pt-6 text-sm text-[#64748B]">
          Illini SkillShare is an independent student project, not affiliated with or endorsed by the University of Illinois.
        </p>
      </article>
    </div>
  );
}
