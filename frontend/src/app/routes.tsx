import { Navigate, createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { RedirectIfAuthenticated } from '../components/layout/RedirectIfAuthenticated';
import { PublicLayout } from '../layouts/PublicLayout';
import { RootLayout } from '../layouts/RootLayout';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { LegacyRedirect as Redirect } from '../components/layout/LegacyRedirect';
import { APP_HOME, EDIT_PROFILE, SETUP_HOME } from '../lib/routes';
import type { ComponentType } from 'react';

// Every screen except the landing and sign-in pages loads on demand, so a first visit downloads
// only what it shows. A chunk that fails to load reaches RouteErrorPage's recovery screen.
function lazyScreen<Name extends string>(load: () => Promise<Record<Name, ComponentType>>, name: Name) {
  return async () => ({ Component: (await load())[name] });
}

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: "/",
        Component: PublicLayout,
        children: [
          {
            Component: RedirectIfAuthenticated,
            children: [
              { index: true, Component: LandingPage },
              { path: "login", Component: LoginPage },
            ],
          },
          { path: "guidelines", lazy: lazyScreen(() => import('../pages/legal/GuidelinesPage'), 'GuidelinesPage') },
          { path: "privacy", lazy: lazyScreen(() => import('../pages/legal/PrivacyPage'), 'PrivacyPage') },
          { path: "terms", lazy: lazyScreen(() => import('../pages/legal/TermsPage'), 'TermsPage') },
        ],
      },
      {
        path: "/",
        Component: ProtectedRoute,
        children: [
          {
            path: "welcome",
            lazy: lazyScreen(() => import('../layouts/SetupLayout'), 'SetupLayout'),
            children: [
              { index: true, lazy: lazyScreen(() => import('../pages/SetupPage'), 'SetupPage') },
              { path: "matches", lazy: lazyScreen(() => import('../pages/WelcomeMatchesPage'), 'WelcomeMatchesPage') },
            ],
          },
          {
            path: "/",
            lazy: lazyScreen(() => import('../layouts/AppLayout'), 'AppLayout'),
            children: [
              { path: "home", lazy: lazyScreen(() => import('../pages/HomePage'), 'HomePage') },
              { path: "discover", lazy: lazyScreen(() => import('../pages/DiscoveryPage'), 'DiscoveryPage') },
              { path: "profiles/:id", lazy: lazyScreen(() => import('../pages/ProfileDetailPage'), 'ProfileDetailPage') },
              { path: "me", lazy: lazyScreen(() => import('../pages/MyProfilePage'), 'MyProfilePage') },
              { path: "me/edit", lazy: lazyScreen(() => import('../pages/EditProfilePage'), 'EditProfilePage') },
              { path: "requests", lazy: lazyScreen(() => import('../pages/HelpRequestsPage'), 'HelpRequestsPage') },
              { path: "requests/:id", lazy: lazyScreen(() => import('../pages/RequestDetailPage'), 'RequestDetailPage') },
              { path: "settings", lazy: lazyScreen(() => import('../pages/SettingsPage'), 'SettingsPage') },
              { path: "analytics", lazy: lazyScreen(() => import('../pages/AnalyticsPage'), 'AnalyticsPage') },
            ],
          },
        ],
      },
      { path: "/dashboard", element: <Redirect to={APP_HOME} /> },
      { path: "/onboarding", element: <Redirect to={SETUP_HOME} /> },
      { path: "/profile/edit", element: <Redirect to={EDIT_PROFILE} /> },
      { path: "/saved", element: <Navigate to="/discover?tab=saved" replace /> },
      { path: "/connections", element: <Navigate to="/requests?tab=active" replace /> },
      { path: "/app/*", element: <Navigate to={APP_HOME} replace /> },
      { path: "/404", lazy: lazyScreen(() => import('../pages/NotFoundPage'), 'NotFoundPage') },
      { path: "*", lazy: lazyScreen(() => import('../pages/NotFoundPage'), 'NotFoundPage') },
    ],
  },
]);
