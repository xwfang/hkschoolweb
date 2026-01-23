import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import './styles/App.css'
import AppLayout from "./layouts/app-layout";
import AuthLayout from "./layouts/auth-layout";

// Lazy load pages for performance
const LoginPage = lazy(() => import("./pages/auth/login"));
const HomePage = lazy(() => import("./pages/app/home"));
const TrackingPage = lazy(() => import("./pages/app/tracking"));
const ProfilePage = lazy(() => import("./pages/app/profile"));
const AddChildPage = lazy(() => import("@/pages/app/add-child"));
const SchoolDetailPage = lazy(() => import("@/pages/app/school-detail"));
const ChatPage = lazy(() => import("@/pages/app/chat"));
const SettingsPage = lazy(() => import("@/pages/app/settings"));
const SubscriptionPage = lazy(() => import("@/pages/app/subscription"));

// Admin Pages
const AdminLayout = lazy(() => import("./layouts/admin-layout"));
const AdminDashboardPage = lazy(() => import("./pages/admin/dashboard"));
const AdminSchoolsPage = lazy(() => import("./pages/admin/schools"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-gray-500 text-sm">Loading...</div>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/app" replace />} />

            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* Parent App Routes (Protected) */}
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="tracking" element={<TrackingPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            <Route path="/app/profile/add-child" element={<AddChildPage />} />
            <Route path="/app/profile/edit-child/:id" element={<AddChildPage />} />
            <Route path="/app/profile/settings" element={<SettingsPage />} />
            <Route path="/app/subscription" element={<SubscriptionPage />} />
            <Route path="/app/school/:id" element={<SchoolDetailPage />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="schools" element={<AdminSchoolsPage />} />
              <Route path="settings" element={<div>Settings (Coming Soon)</div>} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
