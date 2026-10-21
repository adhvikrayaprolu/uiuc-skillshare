import { useRef, useState, type ReactNode } from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  return props.open ? <ConfirmDialogBody {...props} /> : null;
}

function ConfirmDialogBody({ title, description, confirmLabel, cancelLabel = 'Cancel', tone = 'default', onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  useDialogFocus(true, ref, onCancel, busy);
  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" tabIndex={-1} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="confirm-title" className="mb-2 text-lg font-semibold text-[#0F172A]">{title}</h2>
        <div id="confirm-description" className="mb-6 text-sm text-[#475569]">{description}</div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border-2 border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-60">{cancelLabel}</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirm()}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${tone === 'danger' ? 'bg-[#B91C1C] hover:bg-[#991B1B]' : 'bg-[#13294B] hover:bg-[#1a3a6b]'}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
