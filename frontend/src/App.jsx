import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AuthModal from "./components/AuthModal";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import GapsPage from "./pages/GapsPage";
import LearnPage from "./pages/LearnPage";
import QuizPage from "./pages/QuizPage";
import VivaPage from "./pages/VivaPage";
import AdminPage from "./pages/AdminPage";
import VerifyCertificatePage from "./pages/VerifyCertificatePage";
import OnboardingPage from "./pages/OnboardingPage";
import DiagnosticPage from "./pages/DiagnosticPage";
import HubPage from "./pages/HubPage";
import CinematicLandingPage from "./pages/CinematicLandingPage";
import { useAuth } from "./context/AuthContext";
import { useEffect } from "react";

// Redirect authenticated users away from /login and /register
function AuthRedirect({ children }) {
  const { token, learner, loading } = useAuth();
  if (token) {
    if (loading || !learner) {
      return (
        <div className="min-h-screen bg-[#060218] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Loading your profile...</p>
          </div>
        </div>
      );
    }
    if (!learner.onboarding_completed) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return children;
}

// After login, if a user hasn't completed onboarding,
// synchronously redirect them to /onboarding.
function OnboardingGuard({ children }) {
  const { token, learner, loading } = useAuth();
  const location = useLocation();

  // If not logged in, don't guard
  if (!token) return children;

  // While loading learner state, show loader so dashboard never flashes
  if (loading || !learner) {
    return (
      <div className="min-h-screen bg-[#060218] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // If onboarding is not completed, redirect to /onboarding
  if (
    !learner.onboarding_completed &&
    location.pathname !== "/onboarding" &&
    location.pathname !== "/login" &&
    location.pathname !== "/register" &&
    !location.pathname.startsWith("/verify")
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

// When unauthenticated, / shows the Landing Page. When logged in, it shows the Passbook Dashboard.
function RootRoute() {
  const { token } = useAuth();
  if (!token) {
    return <CinematicLandingPage />;
  }
  return (
    <OnboardingGuard>
      <Layout>
        <DashboardPage />
      </Layout>
    </OnboardingGuard>
  );
}

function AppRoutes() {
  return (
    <>
      {/* Global Auth Modal — renders on top of any page */}
      <AuthModal />

      <Routes>
        {/* Auth pages — redirect to home if already logged in */}
        <Route path="/login" element={<AuthRedirect><LoginPage /></AuthRedirect>} />
        <Route path="/register" element={<AuthRedirect><LoginPage /></AuthRedirect>} />

        {/* Onboarding wizard — full-screen, no layout shell */}
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Dedicated Cinematic Hero Landing Page */}
        <Route path="/landing" element={<CinematicLandingPage />} />
        <Route path="/cinematic" element={<CinematicLandingPage />} />

        {/* Root: Landing page if logged out, Dashboard if logged in */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/dashboard" element={<OnboardingGuard><Layout><DashboardPage /></Layout></OnboardingGuard>} />
        <Route path="/gaps" element={<OnboardingGuard><Layout><GapsPage /></Layout></OnboardingGuard>} />
        <Route path="/learn" element={<OnboardingGuard><Layout><LearnPage /></Layout></OnboardingGuard>} />
        <Route path="/quiz" element={<OnboardingGuard><Layout><QuizPage /></Layout></OnboardingGuard>} />
        <Route path="/viva" element={<OnboardingGuard><Layout><VivaPage /></Layout></OnboardingGuard>} />
        <Route path="/diagnostic" element={<OnboardingGuard><Layout><DiagnosticPage /></Layout></OnboardingGuard>} />
        <Route path="/admin" element={<OnboardingGuard><Layout><AdminPage /></Layout></OnboardingGuard>} />
        <Route path="/hub" element={<OnboardingGuard><Layout><HubPage /></Layout></OnboardingGuard>} />
        <Route path="/verify" element={<Layout><VerifyCertificatePage /></Layout>} />
        <Route path="/verify/certificate/:id" element={<Layout><VerifyCertificatePage /></Layout>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
