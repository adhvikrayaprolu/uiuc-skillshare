import { Navigate, createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { RedirectIfAuthenticated } from '../components/layout/RedirectIfAuthenticated';
import { AppLayout } from '../layouts/AppLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { SetupLayout } from '../layouts/SetupLayout';
import { HomePage } from '../pages/HomePage';
import { DiscoveryPage } from '../pages/DiscoveryPage';
import { EditProfilePage } from '../pages/EditProfilePage';
import { HelpRequestsPage } from '../pages/HelpRequestsPage';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { SetupPage } from '../pages/SetupPage';
import { WelcomeMatchesPage } from '../pages/WelcomeMatchesPage';
import { MyProfilePage } from '../pages/MyProfilePage';
import { ProfileDetailPage } from '../pages/ProfileDetailPage';
import { SettingsPage } from '../pages/SettingsPage';
import { RequestDetailPage } from '../pages/RequestDetailPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { LegacyRedirect as Redirect } from '../components/layout/LegacyRedirect';
import { APP_HOME, EDIT_PROFILE, SETUP_HOME } from '../lib/routes';

export const router = createBrowserRouter([
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
    ],
  },
  {
    path: "/",
    Component: ProtectedRoute,
    children: [
      {
        path: "welcome",
        Component: SetupLayout,
        children: [
          { index: true, Component: SetupPage },
          { path: "matches", Component: WelcomeMatchesPage },
        ],
      },
      {
        path: "/",
        Component: AppLayout,
        children: [
          { path: "home", Component: HomePage },
          { path: "discover", Component: DiscoveryPage },
          { path: "profiles/:id", Component: ProfileDetailPage },
          { path: "me", Component: MyProfilePage },
          { path: "me/edit", Component: EditProfilePage },
          { path: "requests", Component: HelpRequestsPage },
          { path: "requests/:id", Component: RequestDetailPage },
          { path: "settings", Component: SettingsPage },
          { path: "analytics", Component: AnalyticsPage },
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
  { path: "/404", Component: NotFoundPage },
  { path: "*", Component: NotFoundPage },
]);
