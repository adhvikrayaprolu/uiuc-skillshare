import { useId, useRef, useState } from 'react';
import { Check, Copy, MessageSquare, Share2, UserPlus } from 'lucide-react';
import { inviteMessage, inviteUrl } from '../../lib/invite';

export function InviteCard({ heading = 'Invite a classmate', body = 'SkillShare gets better with every person who joins. Send the link to a friend, club or class group chat.', compact = false }: { heading?: string; body?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const id = useId();
  const url = inviteUrl();
  const message = inviteMessage(url);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyFailed(true);
      field.current?.select();
    }
  };

  return (
    <section aria-labelledby={`${id}-heading`} className={`rounded-2xl border border-[#E2E8F0] bg-white ${compact ? 'p-4' : 'p-5'} text-left`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#FFF3EA]"><UserPlus className="h-4 w-4 text-[#B83E00]" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-heading`} className="font-semibold text-[#0F172A]">{heading}</h2>
          <p className="mt-0.5 text-sm text-[#475569]">{body}</p>
          <label htmlFor={`${id}-link`} className="sr-only">Invite link</label>
          <input id={`${id}-link`} ref={field} readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="mt-3 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A]" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-2 rounded-lg bg-[#13294B] px-3 py-2 text-sm font-medium text-white hover:bg-[#1a3a6b]">
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? 'Link copied' : 'Copy invite link'}
            </button>
            {canShare && (
              <button type="button" onClick={() => void navigator.share({ title: 'Illini SkillShare', text: message, url }).catch(() => undefined)} className="inline-flex items-center gap-2 rounded-lg border border-[#13294B] px-3 py-2 text-sm font-medium text-[#13294B] hover:bg-[#E8EEF7]">
                <Share2 className="h-4 w-4" aria-hidden="true" /> Share
              </button>
            )}
            <a href={`sms:?&body=${encodeURIComponent(message)}`} className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]">
              <MessageSquare className="h-4 w-4" aria-hidden="true" /> Text a friend
            </a>
          </div>
          <p role="status" aria-live="polite" className="mt-2 text-xs text-[#475569]">{copied ? 'Invite link copied to your clipboard.' : copyFailed ? 'Copying is blocked here. The link is selected so you can copy it yourself.' : ''}</p>
        </div>
      </div>
    </section>
  );
}
