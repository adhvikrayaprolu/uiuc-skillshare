import { Link } from 'react-router-dom';
import { ArrowLeftRight, ArrowRight, BookOpen, CheckCircle, Lock, MessageSquareHeart, Search, ShieldCheck, UserCheck } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { useTaxonomy } from '../hooks/useTaxonomy';
import type { SkillTag } from '../types/api';

const fallbackCatalogue = [
  { name: 'Technical', skills: ['Python', 'React', 'GitHub', 'SQL', 'Data Analysis'] },
  { name: 'Career', skills: ['Resume Review', 'Interview Prep', 'LinkedIn Feedback', 'Internship Search'] },
  { name: 'Creative', skills: ['Figma', 'Graphic Design', 'Portfolio Review', 'Public Speaking'] },
  { name: 'Course', skills: ['Course Planning', 'Study Groups', 'Exam Prep'] },
  { name: 'Campus Life', skills: ['Housing Advice', 'RSO Leadership', 'Transfer Student Advice'] },
  { name: 'Experience', skills: ['Research Experience', 'Startup Advice', 'Hackathon Teams'] },
];

const examplePairs = [
  { teach: 'Python', learn: 'Figma' },
  { teach: 'Resume Review', learn: 'SQL' },
  { teach: 'Public Speaking', learn: 'React' },
];

const steps = [
  { icon: BookOpen, title: 'List what you know', description: 'Add the skills you can teach and the ones you want to learn. It takes about two minutes.' },
  { icon: Search, title: 'Find a match', description: 'See students who teach what you want, and who want what you teach. Propose a swap, or simply ask for help.' },
  { icon: MessageSquareHeart, title: 'Meet and swap', description: 'Contacts are shared once they accept. Meet up, swap skills, then leave each other feedback.' },
];

const trust = [
  { icon: UserCheck, title: 'Illinois email sign-in', description: 'Only people with an @illinois.edu email can join. This confirms access, not university approval or current enrollment.' },
  { icon: Lock, title: 'Contacts stay private', description: 'Your contact details are shared only with people whose request you accept, and only the ones you choose.' },
  { icon: ShieldCheck, title: 'You stay in control', description: 'Hide your profile, block or report anyone, and export or delete your account at any time.' },
];

function categoryName(skill: SkillTag) {
  if (typeof skill.category === 'object' && skill.category) return skill.category.name;
  return skill.category_detail?.name || 'Other';
}

function useCatalogue() {
  const taxonomy = useTaxonomy();
  const rawSkills = taxonomy.data?.isMock ? [] : taxonomy.data?.rawSkills ?? [];
  if (!rawSkills.length) return fallbackCatalogue;
  const groups = new Map<string, string[]>();
  for (const skill of rawSkills) {
    const name = categoryName(skill);
    groups.set(name, [...(groups.get(name) || []), skill.name]);
  }
  return [...groups.entries()].map(([name, skills]) => ({ name, skills: skills.slice(0, 5) }));
}

export function LandingPage() {
  const catalogue = useCatalogue();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link to="/" aria-label="Illini SkillShare home"><Logo showSubtitle={false} /></Link>
          <nav aria-label="Primary" className="flex items-center gap-2 sm:gap-4">
            <a href="#how-it-works" className="hidden text-sm font-medium text-[#334155] hover:text-[#13294B] sm:inline">How it works</a>
            <Link to="/login" className="rounded-xl bg-[#13294B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a3a6b]">Sign in</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#13294B] to-[#1a3a6b] text-white">
        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="mb-4 inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-medium">For Illinois students</p>
              <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl">Trade what you know for what you want to learn</h1>
              <p className="mb-8 text-lg text-white sm:text-xl">
                Find another student to swap skills with, or ask someone for a hand. Teach Python, learn Figma. Review a resume, get help with SQL.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B83E00] px-8 py-4 font-semibold text-white transition-colors hover:bg-[#9A3400]">
                  Get started
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
                <a href="#how-it-works" className="inline-flex items-center justify-center rounded-xl border border-white/40 px-8 py-4 font-semibold text-white transition-colors hover:bg-white/10">
                  See how it works
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-6" aria-label="Example skill swaps">
              <p className="mb-4 text-sm font-semibold">Example swaps</p>
              <ul className="space-y-3">
                {examplePairs.map((pair) => (
                  <li key={pair.teach} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 text-[#0F172A]">
                    <span className="min-w-0">
                      <span className="block text-xs text-[#475569]">You teach</span>
                      <span className="font-semibold">{pair.teach}</span>
                    </span>
                    <ArrowLeftRight className="h-5 w-5 flex-shrink-0 text-[#B83E00]" aria-label="in exchange for" />
                    <span className="min-w-0 text-right">
                      <span className="block text-xs text-[#475569]">You learn</span>
                      <span className="font-semibold">{pair.learn}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold text-[#0F172A]">How a swap works</h2>
          <p className="mb-12 text-center text-[#475569]">Three steps, no fees, no credits to track.</p>
          <ol className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8EEF7]">
                    <Icon className="h-8 w-8 text-[#13294B]" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-[#0F172A]"><span className="text-[#B83E00]">{index + 1}.</span> {step.title}</h3>
                  <p className="text-[#475569]">{step.description}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="bg-[#F8FAFC] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold text-[#0F172A]">Skills students share</h2>
          <p className="mb-12 text-center text-[#475569]">A few of the skills you can teach or learn.</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {catalogue.map((category) => (
              <div key={category.name} className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
                <h3 className="mb-3 text-lg font-semibold text-[#0F172A]">{category.name}</h3>
                <ul className="space-y-2">
                  {category.skills.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-[#475569]">
                      <CheckCircle className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-[#0F172A]">Safe by design</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {trust.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF3EA]">
                    <Icon className="h-8 w-8 text-[#B83E00]" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">{item.title}</h3>
                  <p className="text-[#475569]">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#13294B] py-20 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">What could you learn this semester?</h2>
          <p className="mb-8 text-lg text-white">Join Illini SkillShare with your Illinois email.</p>
          <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-[#B83E00] px-8 py-4 font-semibold text-white transition-colors hover:bg-[#9A3400]">
            Get started
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="bg-[#0F172A] py-8 text-[#CBD5E1]">
        <div className="mx-auto max-w-6xl space-y-3 px-6 text-center text-sm">
          <nav aria-label="Policies" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link to="/guidelines" className="hover:text-white">Community guidelines</Link>
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/terms" className="hover:text-white">Terms</Link>
          </nav>
          <p>© 2026 Illini SkillShare. An independent student project, not affiliated with or endorsed by the University of Illinois.</p>
        </div>
      </footer>
    </div>
  );
}
