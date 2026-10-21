import { Link } from 'react-router-dom';
import { LegalPage } from '../../components/legal/LegalPage';

export function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="October 18, 2026"
      intro={<p>By creating an account or using Illini SkillShare, you agree to these terms, the <Link to="/guidelines" className="font-medium text-[#13294B] underline">Community guidelines</Link> and the <Link to="/privacy" className="font-medium text-[#13294B] underline">Privacy</Link> page. They're written in plain language. If something is unclear, the guidelines explain what we expect in practice.</p>}
      sections={[
        {
          heading: 'Who can use SkillShare',
          body: <p>You need an active Illinois email address and must be a current member of the University of Illinois community. Keep your account to yourself and don't share sign-in codes.</p>,
        },
        {
          heading: 'What SkillShare is, and isn\'t',
          body: (
            <>
              <p>SkillShare helps students find each other to swap skills and ask for help. It's free. We don't employ, vet or certify members, and we don't take part in the sessions you arrange.</p>
              <p>Skills, levels, reviews and endorsements are self-reported by members and reflect individual experiences, not verified qualifications.</p>
            </>
          ),
        },
        {
          heading: 'Your responsibilities',
          body: (
            <ul>
              <li>Follow the Community guidelines, your course policies and the University's academic integrity rules.</li>
              <li>Don't use SkillShare to sell services, advertise, scrape data, or send spam or automated requests.</li>
              <li>Don't try to get around blocks, rate limits, suspensions or privacy settings.</li>
              <li>You're responsible for your own safety and choices when meeting other members. Use common sense, and meet in public places or online.</li>
            </ul>
          ),
        },
        {
          heading: 'Your content',
          body: <p>You keep ownership of what you post. You allow SkillShare to store it and show it to other members as described on the Privacy page, so the service can work. Only post content you have the right to share.</p>,
        },
        {
          heading: 'Moderation and suspension',
          body: <p>Moderators may remove content, unpublish profiles, cancel requests, or suspend accounts that break these terms or the guidelines, or that put members at risk. Suspension signs you out and hides your profile. Where we can, we'll explain why.</p>,
        },
        {
          heading: 'Leaving',
          body: <p>You can delete your account at any time from Settings. We may close the service or change features. If we plan to shut down, we'll give members notice and a chance to export their data.</p>,
        },
        {
          heading: 'No warranty',
          body: <p>SkillShare is provided as is, by a student project team. We can't promise it will always be available or error-free, or that any member will be a good fit. To the extent the law allows, we aren't responsible for what members say or do, or for arrangements you make with each other.</p>,
        },
        {
          heading: 'Changes to these terms',
          body: <p>We may update these terms. When we do, we'll change the date at the top, and for significant changes we'll tell members in the app. If you keep using SkillShare after a change, you accept the updated terms.</p>,
        },
      ]}
    />
  );
}
