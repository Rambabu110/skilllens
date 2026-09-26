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
  const { token } = useAuth();
  if (token) return <Navigate to="/" replace />;
  return children;
}

// After login, if a user has no position and hasn't completed onboarding,
// redirect them to /onboarding. Skip for admins and the onboarding page itself.
function OnboardingGuard({ children }) {
  const { token, learner } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (
      token &&
      learner &&
      !learner.is_admin &&
      !learner.onboarding_completed &&
      !learner.position_id &&
      location.pathname !== "/onboarding" &&
      location.pathname !== "/login" &&
      location.pathname !== "/register" &&
      !location.pathname.startsWith("/verify")
    ) {
      navigate("/onboarding", { replace: true });
    }
  }, [token, learner, location.pathname, navigate]);

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
