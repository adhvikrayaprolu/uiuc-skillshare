import { Link } from 'react-router-dom';
import { Search, Users, Shield, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#13294B] to-[#1a3a6b] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold mb-6 leading-tight">
                Find the right student to learn from, collaborate with, or connect to
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                Discover verified student profiles by skills, experiences, interests, and availability
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/login"
                  className="px-8 py-4 bg-[#FF5F05] text-white font-semibold rounded-xl hover:bg-[#e55505] transition-colors inline-flex items-center justify-center gap-2"
                >
                  Sign in with Illinois Google
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button className="px-8 py-4 bg-white bg-opacity-10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-opacity-20 transition-colors">
                  Explore how it works
                </button>
              </div>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 border border-white border-opacity-20">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search for skills..."
                    className="flex-1 bg-white bg-opacity-20 rounded-lg px-4 py-2 text-white placeholder-blue-200 border-none outline-none"
                    disabled
                  />
                </div>

                <div className="space-y-3">
                  {['Riya Patel', 'Daniel Kim'].map((name, i) => (
                    <div key={i} className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4">
                      <div className="flex gap-3 items-start">
                        <div className="w-10 h-10 rounded-full bg-[#FF5F05] flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{name}</p>
                          <p className="text-xs text-blue-100">Computer Science · Junior</p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <span className="px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs">Figma</span>
                            <span className="px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs">React</span>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-[#FF5F05] bg-opacity-90 rounded-full text-xs font-semibold">Top Match</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[#0F172A] mb-4">How it works</h2>
          <p className="text-center text-[#64748B] mb-12">Connect with peers in three simple steps</p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: 'Create your profile',
                description: 'Share your skills, experiences, availability, and contact preferences'
              },
              {
                icon: Search,
                title: 'Discover peers',
                description: 'Search by skill, interest, experience, major, year, or topic'
              },
              {
                icon: Sparkles,
                title: 'Connect directly',
                description: 'Reach out through approved contact methods or send a help request'
              }
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="text-center">
                  <div className="w-16 h-16 bg-[#E8EEF7] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-[#13294B]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#0F172A] mb-2">{step.title}</h3>
                  <p className="text-[#64748B]">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[#0F172A] mb-12">What students can find</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Career Guidance', items: ['Resume Review', 'Interview Prep', 'LinkedIn Feedback', 'Networking Advice'] },
              { title: 'Technical Tools', items: ['Python', 'React', 'GitHub', 'Data Analysis', 'SQL'] },
              { title: 'Design & Creative', items: ['Figma', 'Graphic Design', 'Portfolio Review', 'Public Speaking'] },
              { title: 'Project Collaboration', items: ['Hackathon Teams', 'Research Partners', 'Study Groups'] },
              { title: 'Research & Startups', items: ['Research Experience', 'Startup Advice', 'Lab Opportunities'] },
              { title: 'Campus Support', items: ['RSO Leadership', 'Housing Advice', 'Course Planning'] }
            ].map((category, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
                <h3 className="text-lg font-semibold text-[#0F172A] mb-3">{category.title}</h3>
                <ul className="space-y-2">
                  {category.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-[#64748B]">
                      <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[#0F172A] mb-12">Trust & Privacy</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Illinois email verification',
                description: 'Only verified Illinois student emails are allowed'
              },
              {
                icon: Shield,
                title: 'Control your privacy',
                description: 'Choose what contact information appears on your profile'
              },
              {
                icon: Shield,
                title: 'Optional credentials',
                description: 'Share your portfolio, resume, or GitHub only if you want to'
              }
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="text-center">
                  <div className="w-16 h-16 bg-[#FFF3EA] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-[#FF5F05]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-2">{item.title}</h3>
                  <p className="text-[#64748B]">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#13294B] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to connect with your peers?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join Illini SkillSwap and discover your student network
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#FF5F05] text-white font-semibold rounded-xl hover:bg-[#e55505] transition-colors"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F172A] text-[#64748B] py-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm">© 2026 Illini SkillSwap. A student networking platform for the University of Illinois.</p>
        </div>
      </footer>
    </div>
  );
}
