import { createContext, useContext, useState, useEffect, useCallback } from "react";
import client from "../api/client";
import {
  auth,
  firebaseLogin,
  firebaseRegister,
  firebaseLoginWithGoogle,
  firebaseLogout,
  firebaseResetPassword,
  firebaseResendVerification,
  onAuthStateChanged,
} from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("skilllens_token"));
  const [learner, setLearner] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Monitor Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Sync token with backend learner profile
  useEffect(() => {
    if (token) {
      client
        .get("/auth/me")
        .then((res) => {
          setLearner(res.data);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem("skilllens_token");
          setToken(null);
          setLearner(null);
          setLoading(false);
        });
    } else {
      setLearner(null);
      setLoading(false);
    }
  }, [token]);

  // Sync Firebase authenticated user with backend to obtain SkillLens JWT session
  const syncWithBackend = useCallback(async (fbUser, extraData = {}) => {
    // ALWAYS force refresh the ID token (pass true) so Google issues a fresh JWT with updated claims (notably email_verified: true)
    const idToken = await fbUser.getIdToken(true);
    const res = await client.post("/auth/firebase", {
      firebase_id_token: idToken,
      position_id: extraData.position_id || null,
      qualification: extraData.qualification || "",
      experience_years: extraData.experience_years || 0,
    });
    const accessToken = res.data.access_token;
    localStorage.setItem("skilllens_token", accessToken);
    setToken(accessToken);

    try {
      const meRes = await client.get("/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setLearner(meRes.data);
      return meRes.data;
    } catch {
      return { email: fbUser.email, name: fbUser.displayName };
    }
  }, []);

  // Genuine Firebase Authentication Login with Verification Guard
  const login = useCallback(
    async (email, password) => {
      const cred = await firebaseLogin(email, password);
      
      // Crucial: reload user profile from Firebase to fetch updated emailVerified status
      if (cred.user) {
        try {
          await cred.user.reload();
        } catch {
          // ignore
        }
      }

      // If still not verified, retry once after a brief 600ms delay in case of remote Firebase replication delay
      if (cred.user && !cred.user.emailVerified) {
        await new Promise((r) => setTimeout(r, 600));
        try {
          await cred.user.reload();
        } catch {
          // ignore
        }
      }

      // Strictly enforce email verification
      if (!cred.user.emailVerified) {
        await firebaseLogout();
        const err = new Error(
          "Your email address has not been verified yet. Please check your Gmail Inbox or Spam folder and click the verification link before signing in."
        );
        err.code = "auth/unverified-email";
        throw err;
      }

      // Restore any pending registration data (position, qualification, experience)
      let extraData = {};
      const regKey = `skilllens_reg_${email.toLowerCase().trim()}`;
      try {
        const saved = localStorage.getItem(regKey);
        if (saved) {
          extraData = JSON.parse(saved);
        }
      } catch {
        // ignore
      }

      const user = await syncWithBackend(cred.user, extraData);
      try {
        localStorage.removeItem(regKey);
      } catch {
        // ignore
      }
      return user;
    },
    [syncWithBackend]
  );

  // Genuine Firebase Authentication Registration (sends verification email and logs out)
  const register = useCallback(
    async (payload) => {
      // Save pending registration metadata so when the user signs in after email verification,
      // their position, qualification, and experience are linked
      try {
        const regKey = `skilllens_reg_${payload.email.toLowerCase().trim()}`;
        localStorage.setItem(
          regKey,
          JSON.stringify({
            position_id: payload.position_id,
            qualification: payload.qualification,
            experience_years: payload.experience_years,
          })
        );
      } catch {
        // ignore
      }

      await firebaseRegister(payload.email, payload.password, payload.name);
      // Log out immediately so unverified account is not kept in active session
      await firebaseLogout();
      return {
        email: payload.email,
        needsVerification: true,
      };
    },
    []
  );

  // Google Sign-In with Firebase (Google accounts are automatically email-verified)
  const loginWithGoogle = useCallback(async () => {
    const cred = await firebaseLoginWithGoogle();
    return await syncWithBackend(cred.user);
  }, [syncWithBackend]);

  // Resend Email Verification
  const resendVerification = useCallback(async (email, password) => {
    return await firebaseResendVerification(email, password);
  }, []);

  // Reset Password via Firebase
  const resetPassword = useCallback(async (email) => {
    return await firebaseResetPassword(email);
  }, []);

  // Logout from both Firebase and SkillLens session
  const logout = useCallback(async () => {
    try {
      await firebaseLogout();
    } catch {
      // Ignore if not logged in to Firebase
    }
    localStorage.removeItem("skilllens_token");
    setToken(null);
    setLearner(null);
    setFirebaseUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        learner,
        firebaseUser,
        loading,
        setLearner,
        login,
        register,
        loginWithGoogle,
        resendVerification,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
