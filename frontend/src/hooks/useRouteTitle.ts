import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pageTitle } from '../lib/pageTitles';

export function useRouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => { document.title = pageTitle(pathname); }, [pathname]);
}
