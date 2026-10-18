import { useEffect, useRef, type RefObject } from 'react';

export function useDialogFocus(open: boolean, ref: RefObject<HTMLElement>, close: () => void, pending = false) {
  const closeRef = useRef(close);
  useEffect(() => {closeRef.current = close;}, [close]);
  useEffect(() => {
    if (!open || !ref.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') || []);
    (focusable().find(element => element.tagName === 'INPUT') || focusable()[0] || ref.current).focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const elements = focusable(), first = elements[0], last = elements[elements.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open, ref, pending]);
}
