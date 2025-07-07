"use client";
import { AuthForm } from "@/components/auth-form";
import Link from 'next/link';

export default function SignUpPage() {
  return (
        <main className="flex-grow flex items-center justify-center p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg border">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-center text-primary">Create an Account</h1>
                    <p className="text-center text-muted-foreground mt-2">
                        Join Locket Photo Print to save and order your photos.
                    </p>
                </div>
                <AuthForm isSignUp={true} />
                <p className="text-sm text-center text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                    Log In
                </Link>
                </p>
            </div>
        </main>
  );
}
