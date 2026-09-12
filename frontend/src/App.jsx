import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { useAuth } from "./context/AuthContext";

// Redirect authenticated users away from /login and /register
function AuthRedirect({ children }) {
  const { token } = useAuth();
  if (token) return <Navigate to="/" replace />;
  return children;
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

        {/* All app routes — publicly accessible (auth gated per-action) */}
        <Route path="/" element={<Layout><DashboardPage /></Layout>} />
        <Route path="/gaps" element={<Layout><GapsPage /></Layout>} />
        <Route path="/learn" element={<Layout><LearnPage /></Layout>} />
        <Route path="/quiz" element={<Layout><QuizPage /></Layout>} />
        <Route path="/viva" element={<Layout><VivaPage /></Layout>} />
        <Route path="/admin" element={<Layout><AdminPage /></Layout>} />
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
