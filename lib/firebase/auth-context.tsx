"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { auth, googleProvider, isValidConfig } from "./config";
import { initializeUser, getUserCredits } from "@/services/user";
import { UserCredits } from "@/lib/types/user";

interface AuthContextType {
  user: User | null;
  userData: UserCredits | null;
  loading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // Function to sync user data with Firestore
  const syncUserToFirestore = async (firebaseUser: User) => {
    try {
      console.log("[Auth] Syncing user to Firestore:", firebaseUser.uid);
      
      // Initialize user in Firestore (creates if not exists)
      await initializeUser(
        firebaseUser.uid,
        firebaseUser.email || "",
        firebaseUser.displayName,
        firebaseUser.photoURL
      );

      // Get updated user data
      const credits = await getUserCredits(firebaseUser.uid);
      if (credits) {
        setUserData(credits);
        console.log("[Auth] User data synced. Credits:", credits.credits);
      }
    } catch (err) {
      console.error("[Auth] Error syncing user to Firestore:", err);
    }
  };

  useEffect(() => {
    // Skip if Firebase is not configured
    if (!isValidConfig || !auth) {
      setLoading(false);
      if (!isValidConfig) {
        setInitError("Firebase config tidak valid");
      }
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          setUser(firebaseUser);
          
          if (firebaseUser) {
            // Auto-sync user data to Firestore on login
            await syncUserToFirestore(firebaseUser);
          } else {
            setUserData(null);
          }
          
          setLoading(false);
        },
        (error) => {
          console.error("[Auth] onAuthStateChanged error:", error);
          if (error.message?.includes("authorizedDomains")) {
            setInitError("Domain tidak diizinkan. Tambahkan localhost ke authorized domains di Firebase Console.");
          } else {
            setInitError(error.message || "Auth error");
          }
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("[Auth] Error setting up auth listener:", err);
      setLoading(false);
      setInitError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  const refreshUserData = async () => {
    if (user) {
      await syncUserToFirestore(user);
    }
  };

  const signInWithGoogle = async () => {
    if (!isValidConfig || !auth || !googleProvider) {
      setError("Firebase belum dikonfigurasi. Silakan set environment variables.");
      throw new Error("Firebase not configured");
    }

    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      
      // User data will be auto-synced by onAuthStateChanged
      console.log("[Auth] Google sign-in successful:", result.user.uid);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      if (error instanceof Error) {
        if (error.message?.includes("authorizedDomains")) {
          setError("Domain tidak diizinkan. Hubungi admin untuk menambahkan domain ke Firebase.");
        } else if (error.message?.includes("popup-closed-by-user")) {
          setError("Popup ditutup. Coba lagi.");
        } else if (error.message?.includes("popup-blocked")) {
          setError("Popup diblokir browser. Izinkan popup untuk domain ini.");
        } else {
          setError("Gagal masuk dengan Google. Coba lagi.");
        }
      }
      throw error;
    }
  };

  const logout = async () => {
    if (!isValidConfig || !auth) {
      setError("Firebase belum dikonfigurasi.");
      throw new Error("Firebase not configured");
    }

    try {
      setError(null);
      await signOut(auth);
      setUserData(null);
    } catch (error) {
      console.error("Error signing out:", error);
      setError("Gagal keluar. Coba lagi.");
      throw error;
    }
  };

  // If there's an init error, still provide auth context but with error state
  if (initError && !loading) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          userData: null,
          loading: false,
          isAuthenticated: false,
          signInWithGoogle: async () => {
            throw new Error(initError);
          },
          logout: async () => {
            throw new Error(initError);
          },
          error: initError,
          refreshUserData: async () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        isAuthenticated: !!user,
        signInWithGoogle,
        logout,
        error,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
