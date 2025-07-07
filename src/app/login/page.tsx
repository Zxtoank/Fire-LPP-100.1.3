
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { AuthForm } from "@/components/auth-form";
import { Spinner } from '@/components/spinner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const handleAnonymousSignIn = async () => {
    if (!auth) {
        toast({ variant: "destructive", title: "Authentication Error", description: "Firebase is not configured." });
        return;
    }
    setIsGuestLoading(true);
    try {
        await signInAnonymously(auth);
        toast({ title: "Welcome, Guest!", description: "You are signed in anonymously." });
        router.push('/');
    } catch (error: any) {
        toast({ variant: "destructive", title: "Sign-in Error", description: "Could not sign in as a guest. Please try again." });
    } finally {
        setIsGuestLoading(false);
    }
  };

  return (
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-card rounded-lg shadow-lg border">
          <div className="text-center">
             <h1 className="text-3xl font-bold text-primary">Welcome</h1>
             <p className="text-muted-foreground mt-2">
                 Sign in or create an account to get started.
             </p>
          </div>
          
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="pt-4">
                <AuthForm mode="signin" />
            </TabsContent>
            <TabsContent value="signup" className="pt-4">
                <AuthForm mode="signup" />
            </TabsContent>
          </Tabs>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                Or
                </span>
            </div>
          </div>
            
          <Button variant="outline" className="w-full" onClick={handleAnonymousSignIn} disabled={isGuestLoading}>
            {isGuestLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Continue as Guest
          </Button>
        </div>
      </main>
  );
}
