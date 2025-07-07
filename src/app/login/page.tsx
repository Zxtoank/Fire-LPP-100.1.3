"use client";
import { AuthForm } from "@/components/auth-form";
import Link from 'next/link';

export default function LoginPage() {
  return (
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg border">
          <div className="text-center">
             <h1 className="text-3xl font-bold text-primary">Log In</h1>
             <p className="text-muted-foreground mt-2">
                 Welcome back to Locket Photo Print!
             </p>
          </div>
          <AuthForm isSignUp={false} />
          <p className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </main>
  );
}
