import {useEffect} from 'react';
import {useBlocker} from 'react-router-dom';

export function useUnsavedChanges(dirty: boolean) {
  const blocker = useBlocker(dirty);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {if (dirty) {event.preventDefault(); event.returnValue = '';}};
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('Discard your unsaved profile changes?')) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
}
