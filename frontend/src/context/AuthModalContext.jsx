import { createContext, useContext, useState, useCallback, useRef } from "react";

const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMode, setInitialMode] = useState("login");
  const pendingCallbackRef = useRef(null);

  const openAuthModal = useCallback((callback = null, mode = "login") => {
    pendingCallbackRef.current = callback;
    setInitialMode(mode);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
    pendingCallbackRef.current = null;
  }, []);

  const onAuthSuccess = useCallback(() => {
    setIsOpen(false);
    const cb = pendingCallbackRef.current;
    pendingCallbackRef.current = null;
    if (typeof cb === "function") {
      // Small delay to let auth state settle
      setTimeout(cb, 100);
    }
  }, []);

  return (
    <AuthModalContext.Provider
      value={{ isOpen, initialMode, openAuthModal, closeAuthModal, onAuthSuccess }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  return useContext(AuthModalContext);
}
