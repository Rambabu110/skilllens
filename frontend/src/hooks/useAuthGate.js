import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";

/**
 * useAuthGate — call `requireAuth()` before any protected action.
 * Returns a promise that resolves when the user is authenticated.
 * If already authed, resolves immediately.
 * If not authed, opens the AuthModal and resolves after successful login.
 */
export function useAuthGate() {
  const { token } = useAuth();
  const { openAuthModal } = useAuthModal();

  const requireAuth = useCallback(
    (callback) => {
      return new Promise((resolve) => {
        if (token) {
          resolve(true);
          if (typeof callback === "function") callback();
        } else {
          openAuthModal(() => {
            resolve(true);
            if (typeof callback === "function") callback();
          });
        }
      });
    },
    [token, openAuthModal]
  );

  return { requireAuth, isAuthenticated: !!token };
}
