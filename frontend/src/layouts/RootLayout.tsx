import { Outlet } from 'react-router-dom';
import { useRouteTitle } from '../hooks/useRouteTitle';

export function RootLayout() {
  useRouteTitle();
  return <Outlet />;
}
