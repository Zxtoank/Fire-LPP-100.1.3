
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { AuthForm } from "@/components/auth-form";
import { Spinner } from '@/components/spinner';

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Checking for sign-in link...");

  useEffect(() => {
    const completeSignIn = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
          // This can happen if the link is opened on a different device/browser.
          // For simplicity, we'll show an error and let them re-enter their email.
          toast({
            variant: "destructive",
            title: "Sign-in session expired",
            description: "Please enter your email again to receive a new sign-in link."
          });
          setIsLoading(false);
          return;
        }

        try {
          setMessage("Signing you in...");
          await signInWithEmailLink(auth, email, window.location.href);
          window.localStorage.removeItem('emailForSignIn');
          router.push('/');
          toast({ title: "Success!", description: "You are now logged in." });
        } catch (error: any) {
          toast({ variant: "destructive", title: "Sign-in Error", description: "The sign-in link may be expired or invalid. Please try again." });
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    if (auth) {
        completeSignIn();
    }
  }, [router, toast]);

  if (isLoading) {
    return (
        <main className="flex-grow flex items-center justify-center p-4">
             <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg border text-center">
                 <Spinner className="w-8 h-8 mx-auto text-primary"/>
                 <p className="text-muted-foreground">{message}</p>
             </div>
        </main>
    )
  }

  return (
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg border">
          <div className="text-center">
             <h1 className="text-3xl font-bold text-primary">Sign In or Sign Up</h1>
             <p className="text-muted-foreground mt-2">
                 Enter your email to receive a secure sign-in link.
             </p>
          </div>
          <AuthForm />
        </div>
      </main>
  );
}
