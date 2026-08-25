import { Navigate, createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { DiscoveryPage } from '../pages/DiscoveryPage';
import { EditProfilePage } from '../pages/EditProfilePage';
import { HelpRequestsPage } from '../pages/HelpRequestsPage';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { ProfileDetailPage } from '../pages/ProfileDetailPage';
import { SavedProfilesPage } from '../pages/SavedProfilesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ConnectionsPage } from '../pages/ConnectionsPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';

export const router = createBrowserRouter([
  {
    path: "/",
    Component: PublicLayout,
    children: [
      {
        index: true,
        Component: LandingPage,
      },
      {
        path: "login",
        Component: LoginPage,
      },
    ],
  },
  {
    path: "/",
    Component: ProtectedRoute,
    children: [
      {
        path: "/",
        Component: AppLayout,
        children: [
          {
            path: "dashboard",
            Component: DashboardPage,
          },
          {
            path: "discover",
            Component: DiscoveryPage,
          },
          {
            path: "profiles/:id",
            Component: ProfileDetailPage,
          },
          {
            path: "onboarding",
            Component: OnboardingPage,
          },
          {
            path: "profile/edit",
            Component: EditProfilePage,
          },
          {
            path: "saved",
            Component: SavedProfilesPage,
          },
          {
            path: "connections",
            Component: ConnectionsPage,
          },
          {
            path: "requests",
            Component: HelpRequestsPage,
          },
          {
            path: "settings",
            Component: SettingsPage,
          },
          {
            path: "analytics",
            Component: AnalyticsPage,
          },
        ],
      },
    ],
  },
  {
    path: "/app/*",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/404",
    Component: NotFoundPage,
  },
  {
    path: "*",
    Component: NotFoundPage,
  },
]);
