import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppLayout from "./layouts/app-layout";
import AuthLayout from "./layouts/auth-layout";
import LoginPage from "./pages/auth/login";
import HomePage from "./pages/app/home";
import TrackingPage from "./pages/app/tracking";
import ProfilePage from "./pages/app/profile";
import AddChildPage from "@/pages/app/add-child";
import SchoolDetailPage from "@/pages/app/school-detail";
import ChatPage from "@/pages/app/chat";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
          <Route path="/app/school/:id" element={<SchoolDetailPage />} />

          {/* Admin Routes (Placeholder) */}
          <Route path="/admin" element={<div>Admin Panel (Coming Soon)</div>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
