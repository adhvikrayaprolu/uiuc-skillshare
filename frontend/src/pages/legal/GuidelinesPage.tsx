import { Link } from 'react-router-dom';
import { LegalPage } from '../../components/legal/LegalPage';

export function GuidelinesPage() {
  return (
    <LegalPage
      title="Community guidelines"
      updated="October 18, 2026"
      intro={<p>Illini SkillShare works because students trust each other enough to teach and learn. These guidelines apply to your profile, your requests and swaps, your messages and the feedback you leave.</p>}
      sections={[
        {
          heading: 'Be real',
          body: (
            <ul>
              <li>Use your own name and your own Illinois account. One account per person.</li>
              <li>List skills you can actually help with, and describe your level honestly. "I took CS 124 and can explain recursion" is better than "expert".</li>
              <li>Only link projects, portfolios and profiles that are yours.</li>
            </ul>
          ),
        },
        {
          heading: 'Be respectful',
          body: (
            <ul>
              <li>No harassment, threats, slurs, or sexual or hateful content.</li>
              <li>No discrimination based on race, ethnicity, religion, gender, sexual orientation, disability, nationality or any other part of who someone is.</li>
              <li>If someone declines, cancels or doesn't reply, let it go. Don't keep contacting them through other channels.</li>
            </ul>
          ),
        },
        {
          heading: 'Keep it a fair exchange',
          body: (
            <ul>
              <li>Reply to requests within a week when you can. Requests that get no answer for 14 days expire automatically.</li>
              <li>Show up when you agree to meet. If plans change, cancel from the request page and say why.</li>
              <li>SkillShare is free. Don't use it to sell tutoring, advertise or recruit.</li>
            </ul>
          ),
        },
        {
          heading: 'Protect academic integrity',
          body: (
            <>
              <p>Help each other understand material, practice and build things together. Do not use SkillShare to:</p>
              <ul>
                <li>do, write or finish someone else's graded homework, labs, projects or exams;</li>
                <li>share exam questions, answer keys or solutions that a course doesn't allow you to share;</li>
                <li>arrange anything your course policy or the University's academic integrity rules forbid.</li>
              </ul>
              <p>When in doubt, check the course syllabus or ask the instructor.</p>
            </>
          ),
        },
        {
          heading: 'Meet safely',
          body: (
            <ul>
              <li>For a first meeting, pick a public place on campus, such as a library or student union, or meet over video.</li>
              <li>Share only the contact details you're comfortable with. SkillShare only shows your contact details after you accept a request, and only the ones you chose to share.</li>
              <li>Trust your instincts. You can cancel or block at any time. If you're in danger, call 911.</li>
            </ul>
          ),
        },
        {
          heading: 'Leave honest feedback',
          body: (
            <ul>
              <li>Reviews should describe what actually happened in that request or swap. Be specific and kind.</li>
              <li>Don't trade reviews, pressure anyone for a rating, or leave a review to get back at someone.</li>
              <li>Endorse only a skill the person actually helped you with.</li>
            </ul>
          ),
        },
        {
          heading: 'Report and block',
          body: (
            <>
              <p>Use <strong>Report member</strong> on a profile to tell the moderators about anything that breaks these guidelines. Reports are never shown to the person you report. Use <strong>Block member</strong> to stop all contact: you won't see each other, and open requests between you are cancelled.</p>
              <p>Moderators review reports and may remove content, hide a profile, or suspend an account. Serious or repeated problems lead to permanent suspension. See the <Link to="/terms" className="font-medium text-[#13294B] underline">Terms</Link> for details.</p>
            </>
          ),
        },
      ]}
    />
  );
}
