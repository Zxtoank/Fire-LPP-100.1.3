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
    // First, try to process any pending redirect result. This is crucial for when
    // the app is reopened by the Google Sign-In flow from an external browser.
    getRedirectResult(auth)
      .then((result) => {
        // If 'result' is not null, a sign-in via redirect has just completed.
        // The onAuthStateChanged listener below will be triggered with the new user.
        // We can toast a welcome message.
        if (result) {
            toast({ title: "Welcome!", description: `Signed in as ${result.user.displayName || result.user.email}` });
        }
      })
      .catch((error) => {
        // Handle any errors that occurred during the redirect.
        console.error("Google Sign-In Error from getRedirectResult:", error);
        let description = "An unknown error occurred during sign-in.";
        if (error.code) {
          switch (error.code) {
            case 'auth/account-exists-with-different-credential':
              description = 'An account already exists with this email. Please sign in using the original method.';
              break;
            case 'auth/unauthorized-domain':
              description = "This app's domain is not authorized. Check your Firebase and Google Cloud settings.";
              break;
            default:
              description = "An unexpected error occurred during Google Sign-In. Please check your configuration and try again.";
              break;
          }
        }
        toast({ variant: "destructive", title: "Sign-In Failed", description });
      });

    // Set up the primary listener that will react to all auth state changes.
    // This is the single source of truth for the user's auth state.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // Once we get the first update (either a user or null), we can stop loading.
      setLoading(false);
    });

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
