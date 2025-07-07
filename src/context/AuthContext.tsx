
"use client";

import { createContext, useState, useEffect, ReactNode, useContext } from "react";
import { onAuthStateChanged, User, getRedirectResult } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
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
    // This effect should only run if Firebase is configured.
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    let isHandlingRedirect = false;
    let unsubscribe = () => {};

    const checkAuthStatus = async () => {
      // Prevent this from running multiple times if the effect re-runs.
      if (isHandlingRedirect) return;
      isHandlingRedirect = true;

      try {
        const result = await getRedirectResult(auth);
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
            default:
              description = "An unexpected error occurred during Google Sign-In. Please check your configuration and try again.";
              break;
          }
        }
        toast({ variant: "destructive", title: "Sign-In Failed", description });
      } finally {
        // This listener will fire once immediately with the current user state
        // and then again on any future auth changes.
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        });
        isHandlingRedirect = false;
      }
    };
    
    checkAuthStatus();

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
    clientId: isPaypalConfigured ? PAYPAL_CLIENT_ID : "sb", // Use a placeholder if not configured
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
