import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { requestErrorMessage } from '../../lib/requests';

export type ReportReason = 'spam' | 'inappropriate_content' | 'harassment' | 'fake_profile' | 'misleading_credentials' | 'other';

const reportReasons: { value: ReportReason; label: string; hint: string }[] = [
  { value: 'harassment', label: 'Harassment or threats', hint: 'Insults, intimidation or unwanted contact.' },
  { value: 'inappropriate_content', label: 'Inappropriate content', hint: 'Offensive, sexual or hateful material.' },
  { value: 'spam', label: 'Spam or selling', hint: 'Ads, paid services or repeated unwanted messages.' },
  { value: 'fake_profile', label: 'Fake or impersonating profile', hint: 'Not a real student, or pretending to be someone else.' },
  { value: 'misleading_credentials', label: 'Misleading skills or credentials', hint: 'Claims that seem false or exaggerated.' },
  { value: 'other', label: 'Something else', hint: 'Including requests to do graded work for someone.' },
];

interface ReportDialogProps {
  open: boolean;
  subjectName: string;
  onSubmit: (report: { reason: ReportReason; description: string }) => Promise<void>;
  onClose: () => void;
}

export function ReportDialog(props: ReportDialogProps) {
  return props.open ? <ReportDialogBody {...props} /> : null;
}

function ReportDialogBody({ subjectName, onSubmit, onClose }: ReportDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useDialogFocus(true, ref, onClose, busy);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason) return setError('Choose the reason that fits best.');
    if (description.trim().length < 10) return setError('Tell the moderators what happened in a sentence or two.');
    setError('');
    setBusy(true);
    try {
      await onSubmit({ reason, description: description.trim() });
      onClose();
    } catch (caught) {
      setError(requestErrorMessage(caught, 'Your report was not sent. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="report-title" tabIndex={-1} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] px-6 py-4">
          <div>
            <h2 id="report-title" className="text-lg font-semibold text-[#0F172A]">Report {subjectName}</h2>
            <p className="text-sm text-[#475569]">Reports go to the moderators and are never shown to {subjectName.split(' ')[0]}.</p>
          </div>
          <button type="button" aria-label="Close report" disabled={busy} onClick={onClose} className="rounded-lg p-2 text-[#475569] hover:bg-[#F8FAFC]"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <form onSubmit={submit} noValidate className="space-y-4 p-6">
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          <fieldset className="min-w-0">
            <legend className="mb-2 text-sm font-medium text-[#0F172A]">What's wrong?</legend>
            <div className="space-y-2">
              {reportReasons.map((option) => (
                <label key={option.value} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${reason === option.value ? 'border-[#13294B] bg-[#E8EEF7]' : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'}`}>
                  <input type="radio" name="reason" value={option.value} checked={reason === option.value} onChange={() => setReason(option.value)} className="mt-0.5 h-4 w-4 accent-[#13294B]" />
                  <span><span className="block font-medium text-[#0F172A]">{option.label}</span><span className="block text-xs text-[#475569]">{option.hint}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="report-description" className="mb-1 block text-sm font-medium text-[#0F172A]">What happened?</label>
            <textarea id="report-description" rows={4} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm focus:border-[#13294B] focus:outline-none" placeholder="Include what was said or done and roughly when." />
          </div>
          <p className="text-xs text-[#64748B]">If you're in danger, call 911 first. See the <Link to="/guidelines" className="underline">community guidelines</Link>.</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border-2 border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-xl bg-[#13294B] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3a6b] disabled:opacity-60">{busy ? 'Sending…' : 'Send report'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
