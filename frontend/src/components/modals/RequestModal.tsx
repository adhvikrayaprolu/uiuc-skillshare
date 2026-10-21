import { useRef, useState } from 'react';
import { ArrowLeftRight, Send, X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import type { RequestKind, Urgency } from '../../types/api';

export interface RequestSubmission {
  kind: RequestKind;
  topic: string;
  relatedSkill: string;
  offeredSkill: string;
  message: string;
  urgency: Urgency;
  preferredContactMethod: string;
}

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientSkills: string[];
  offerSkills: string[];
  initialKind?: RequestKind;
  suggestedLearn?: string;
  suggestedOffer?: string;
  onSubmitRequest: (payload: RequestSubmission) => Promise<void>;
  isSubmitting?: boolean;
}

const inputClass = 'w-full rounded-xl border border-[#E2E8F0] px-4 py-3 transition-colors focus:border-[#13294B] focus:outline-none';

export function RequestModal(props: RequestModalProps) {
  return props.isOpen ? <RequestDialog {...props} /> : null;
}

function RequestDialog({
  onClose, recipientName, recipientSkills, offerSkills, initialKind = 'help', suggestedLearn = '', suggestedOffer = '', onSubmitRequest, isSubmitting = false,
}: RequestModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(true, dialogRef, onClose, isSubmitting);
  const [kind, setKind] = useState<RequestKind>(initialKind);
  const [topic, setTopic] = useState('');
  const [relatedSkill, setRelatedSkill] = useState(suggestedLearn);
  const [offeredSkill, setOfferedSkill] = useState(suggestedOffer || offerSkills.find((skill) => skill !== suggestedLearn) || '');
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('medium');
  const [preferredContact, setPreferredContact] = useState('email');
  const [error, setError] = useState('');

  const isSwap = kind === 'swap';
  const canSwap = offerSkills.length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (isSwap && (!relatedSkill || !offeredSkill || relatedSkill === offeredSkill)) {
      setError('Choose what you want to learn and what you will teach in return.');
      return;
    }
    try {
      await onSubmitRequest({
        kind, relatedSkill, message, urgency, preferredContactMethod: preferredContact,
        offeredSkill: isSwap ? offeredSkill : '',
        topic: topic.trim() || (isSwap ? `${relatedSkill} for ${offeredSkill}` : ''),
      });
      setTopic('');
      setMessage('');
      onClose();
    } catch {
      setError(isSwap ? 'The swap proposal was not sent. Check the details and try again.' : 'The request was not sent. Check the details and try again.');
    }
  };

  return (
    <div onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="request-title" tabIndex={-1} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E2E8F0] bg-white px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <InitialsAvatar name={recipientName} size="sm" />
            <div className="min-w-0">
              <h2 id="request-title" className="text-xl font-bold text-[#0F172A]">{isSwap ? 'Propose a skill swap' : 'Ask for help'}</h2>
              <p className="truncate text-sm text-[#475569]">to {recipientName}</p>
            </div>
          </div>
          <button type="button" aria-label="Close request" disabled={isSubmitting} onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-[#F8FAFC]">
            <X className="h-5 w-5 text-[#64748B]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-[#0F172A]">Request type</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['help', 'swap'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={kind === option}
                  disabled={option === 'swap' && !canSwap}
                  onClick={() => setKind(option)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${kind === option ? 'bg-[#13294B] text-white' : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#E8EEF7]'}`}
                >
                  {option === 'help' ? 'Ask for help' : 'Propose a swap'}
                </button>
              ))}
            </div>
            {!canSwap && <p className="mt-2 text-xs text-[#475569]">Add a skill you can teach to your profile to propose swaps.</p>}
          </fieldset>

          {isSwap ? (
            <div className="grid gap-4 rounded-xl bg-[#F8FAFC] p-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
              <div>
                <label htmlFor="swap-learn" className="mb-2 block text-sm font-medium text-[#0F172A]">You want to learn <span className="text-[#B91C1C]">*</span></label>
                <select id="swap-learn" required value={relatedSkill} onChange={(event) => setRelatedSkill(event.target.value)} className={`${inputClass} bg-white`}>
                  <option value="">Choose a skill</option>
                  {recipientSkills.map((skill) => <option key={skill} value={skill}>{skill}</option>)}
                </select>
              </div>
              <ArrowLeftRight className="mx-auto mb-3 hidden h-5 w-5 text-[#B83E00] sm:block" aria-hidden="true" />
              <div>
                <label htmlFor="swap-offer" className="mb-2 block text-sm font-medium text-[#0F172A]">You'll teach in return <span className="text-[#B91C1C]">*</span></label>
                <select id="swap-offer" required value={offeredSkill} onChange={(event) => setOfferedSkill(event.target.value)} className={`${inputClass} bg-white`}>
                  <option value="">Choose one of your skills</option>
                  {offerSkills.filter((skill) => skill !== relatedSkill).map((skill) => <option key={skill} value={skill}>{skill}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="help-skill" className="mb-2 block text-sm font-medium text-[#0F172A]">Related Skill <span className="font-normal text-[#475569]">(optional)</span></label>
              <select id="help-skill" value={relatedSkill} onChange={(event) => setRelatedSkill(event.target.value)} className={inputClass}>
                <option value="">General / not listed</option>
                {recipientSkills.map((skill) => <option key={skill} value={skill}>{skill}</option>)}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="help-topic" className="mb-2 block text-sm font-medium text-[#0F172A]">
              Topic {isSwap ? <span className="font-normal text-[#475569]">(optional)</span> : <span className="text-[#B91C1C]">*</span>}
            </label>
            <input
              id="help-topic" type="text" maxLength={180} required={!isSwap} value={topic} onChange={(event) => setTopic(event.target.value)}
              placeholder={isSwap && relatedSkill && offeredSkill ? `${relatedSkill} for ${offeredSkill}` : 'e.g. Resume review for internship applications'}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="help-message" className="mb-2 block text-sm font-medium text-[#0F172A]">Message <span className="text-[#B91C1C]">*</span></label>
            <textarea
              id="help-message" maxLength={4000} required rows={5} value={message} onChange={(event) => setMessage(event.target.value)}
              placeholder={isSwap ? 'Say what you would like to learn, what you can offer, and when you are free.' : 'Describe what you need help with...'}
              className={`${inputClass} resize-none`}
            />
          </div>

          {!isSwap && (
            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-[#0F172A]">Urgency</legend>
              <div className="flex gap-3">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button key={level} type="button" aria-pressed={urgency === level} onClick={() => setUrgency(level)} className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium capitalize transition-colors ${urgency === level ? 'bg-[#13294B] text-white' : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#E8EEF7]'}`}>
                    {level}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div>
            <label htmlFor="help-contact" className="mb-2 block text-sm font-medium text-[#0F172A]">Your preferred contact method</label>
            <select id="help-contact" value={preferredContact} onChange={(event) => setPreferredContact(event.target.value)} className={inputClass}>
              <option value="email">Email</option>
              <option value="linkedin">LinkedIn</option>
              <option value="phone">Phone</option>
              <option value="other">Other</option>
            </select>
          </div>

          <p className="rounded-xl bg-[#E8EEF7] p-4 text-sm text-[#13294B]">
            If {recipientName} accepts, you both see each other's shared contact details and arrange the rest directly.
          </p>

          {error && <p role="alert" className="text-sm text-[#B91C1C]">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" disabled={isSubmitting} onClick={onClose} className="flex-1 rounded-xl border-2 border-[#E2E8F0] px-6 py-3 font-medium text-[#475569] transition-colors hover:bg-[#F8FAFC]">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#13294B] px-6 py-3 font-medium text-white transition-colors hover:bg-[#1a3a6b] disabled:opacity-60">
              <Send className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'Sending...' : isSwap ? 'Send swap proposal' : 'Send request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
