"use client";

import { createContext, useState, useEffect, ReactNode, useContext } from "react";
import { onAuthStateChanged, User, getRedirectResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Spinner } from "@/components/spinner";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up the listener that will react to all auth state changes.
    // This will handle login, logout, and token refresh.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // This async function processes the result of a sign-in redirect.
    // It should only run once when the app first loads.
    const handleAuthRedirect = async () => {
      try {
        await getRedirectResult(auth);
        // If getRedirectResult resolves, onAuthStateChanged has already been or will be
        // triggered with the user, so we don't need to do anything with the result here.
      } catch (error: any) {
        console.error("Google Sign-In Error from getRedirectResult:", error);
        let description = "An unknown error occurred during sign-in.";
        if (error.code) {
          switch (error.code) {
            case 'auth/account-exists-with-different-credential':
              description = 'An account already exists with the same email. Please sign in using the original method.';
              break;
            case 'auth/unauthorized-domain':
              description = "This app's domain is not authorized. Check your Firebase and Google Cloud settings.";
              break;
            default:
              description = error.message;
              break;
          }
        }
        toast({ variant: "destructive", title: "Sign-In Failed", description });
      } finally {
        // No matter what, after checking for a redirect, we can stop the loading screen.
        setLoading(false);
      }
    };
    
    handleAuthRedirect();

    // The cleanup function for useEffect will run when the component unmounts.
    return () => unsubscribe();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

  const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const isPaypalConfigured = PAYPAL_CLIENT_ID && !PAYPAL_CLIENT_ID.includes('HERE');


  const initialOptions = {
    clientId: PAYPAL_CLIENT_ID || "",
    currency: "USD",
    intent: "capture",
  };

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {isPaypalConfigured ? (
        <PayPalScriptProvider options={initialOptions}>
          {children}
        </PayPalScriptProvider>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
