
"use client";

import { createContext, useState, useEffect, ReactNode, useContext } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { Spinner } from "@/components/spinner";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    
    // This listener will fire once immediately with the current user state
    // and then again on any future auth changes.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


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
