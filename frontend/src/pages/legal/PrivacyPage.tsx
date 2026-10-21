import { Link } from 'react-router-dom';
import { LegalPage } from '../../components/legal/LegalPage';

export function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      updated="October 18, 2026"
      intro={<p>This page explains what Illini SkillShare stores, who can see it and how to take it with you or delete it. We don't sell your data and we don't show ads.</p>}
      sections={[
        {
          heading: 'What we collect',
          body: (
            <ul>
              <li><strong>Account:</strong> your Illinois email address, and the name Google provides if you sign in with Google.</li>
              <li><strong>Profile:</strong> what you enter. That includes your display name, major, year, headline, bio, photo, the skills you teach, the skills you want to learn, availability, links, and the contact details you add.</li>
              <li><strong>Activity:</strong> requests and swaps you send or receive with their messages, replies and timeline. Also the reviews and endorsements you give, the profiles you save, the members you block, your reports and your notifications.</li>
              <li><strong>Usage events:</strong> simple counts such as profile views, searches and saves, linked to record IDs. We don't store your IP address or browser details with these events.</li>
              <li><strong>Cookies:</strong> a session cookie that keeps you signed in, and a security cookie that protects forms. We don't use advertising or tracking cookies.</li>
            </ul>
          ),
        },
        {
          heading: 'Who can see what',
          body: (
            <ul>
              <li>Your profile is only visible to other signed-in, verified Illinois members, and only while it's published. It isn't on the public web. You can unpublish it in Settings at any time.</li>
              <li>The skills you want to learn are only shown on your profile if you turn on "Show my learning goals". Otherwise they're used only to suggest matches to you.</li>
              <li>Your contact details are never shown on your profile. When you accept a request, the other member sees the contact details you chose to share, if you've turned sharing on.</li>
              <li>Reviews and endorsements you leave appear on the other member's profile with your display name.</li>
              <li>Members you block can't see your profile, and you can't see theirs.</li>
              <li>Moderators can see reports and the content they mention so they can act on them.</li>
            </ul>
          ),
        },
        {
          heading: 'How we use it',
          body: (
            <ul>
              <li>To run the service: show profiles, suggest matches, deliver requests and send notifications.</li>
              <li>To send sign-in codes and, if you turn on "Email me request and feedback updates" in Settings, emails about your requests.</li>
              <li>To send skill alerts when someone new teaches a skill you want to learn, and, only if you turn it on, a weekly digest email. You can turn either off in Settings.</li>
            <li>To keep the community safe: rate limits, spam prevention, moderation and suspensions.</li>
              <li>To understand overall usage, such as how many swaps are completed, so we can improve the product.</li>
            </ul>
            ),
        },
        {
          heading: 'Search and AI',
          body: <p>Search and matching run on our own servers using the words in profiles. AI-assisted search is turned off. If it's ever turned on, only the published skill text of members who opted in through "Allow published skill text for AI-assisted matching" in Settings would be used. We'll update this page before any profile text is sent to an outside provider.</p>,
        },
        {
          heading: 'Your choices',
          body: (
            <ul>
              <li><strong>Export:</strong> download a copy of your account, profile, requests, saved profiles, notifications, blocks and feedback from Settings → Your data.</li>
              <li><strong>Delete:</strong> permanently delete your account from Settings. This removes your profile, photo, search data, contact details and interactions, and signs you out everywhere. A minimal moderation record that no longer identifies you is kept so we can show that the deletion happened.</li>
              <li><strong>Edit:</strong> change or remove anything on your profile at any time.</li>
            </ul>
          ),
        },
        {
          heading: 'Retention',
          body: <p>We keep your data while your account exists. Requests that expire stay in your history until you delete your account. Reports and moderation records are kept as long as needed to keep the community safe.</p>,
        },
        {
          heading: 'Changes',
          body: <p>If we change how we handle your data, we'll update this page and the date at the top. For significant changes, we'll let members know in the app. See also the <Link to="/terms" className="font-medium text-[#13294B] underline">Terms</Link> and <Link to="/guidelines" className="font-medium text-[#13294B] underline">Community guidelines</Link>.</p>,
        },
      ]}
    />
  );
}
