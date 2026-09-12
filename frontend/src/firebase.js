import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCqm8iIbxM-4Dty6f1Nb70rliWuDaybVqU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "skilllenss.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "skilllenss",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "skilllenss.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "937910733335",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:937910733335:web:6c433feccd879f2f8f6a52"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google Provider prompt
googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Helper functions for auth operations
export async function firebaseLogin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  if (cred.user) {
    try {
      await cred.user.reload();
    } catch {
      // ignore network reload glitch
    }
  }
  return cred;
}

export async function firebaseRegister(email, password, displayName = "") {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  // Send email verification link to user's real email address
  await sendEmailVerification(userCredential.user);
  return userCredential;
}

export async function firebaseSendVerificationEmail(user) {
  if (user) {
    return await sendEmailVerification(user);
  }
}

export async function firebaseLoginWithGoogle() {
  return await signInWithPopup(auth, googleProvider);
}

export async function firebaseLogout() {
  return await signOut(auth);
}

export async function firebaseResetPassword(email) {
  return await sendPasswordResetEmail(auth, email);
}

export async function firebaseResendVerification(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  if (cred.user) {
    try {
      await cred.user.reload();
    } catch {
      // ignore
    }
    if (cred.user.emailVerified) {
      return { alreadyVerified: true, user: cred.user };
    }
    await sendEmailVerification(cred.user);
    await signOut(auth);
    return { alreadyVerified: false };
  }
  return { alreadyVerified: false };
}

export { onAuthStateChanged };
