
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
    // This function will be unsubscribed on component unmount.
    // We define it here so it's available in the cleanup function.
    let unsubscribe = () => {};

    const checkRedirectResultAndSetListener = async () => {
      try {
        const result = await getRedirectResult(auth);
        // If a redirect was just completed, the result object will not be null.
        if (result) {
          toast({ title: "Welcome!", description: `Signed in as ${result.user.displayName || result.user.email}` });
        }
      } catch (error: any) {
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
      } finally {
        // After awaiting the redirect result (or if it failed), we set up the listener.
        // This is now the definitive source of truth for the user's auth state.
        // It will fire once immediately with the current state.
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setLoading(false); // Stop loading after we get the first auth state.
        });
      }
    };
    
    checkRedirectResultAndSetListener();

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
