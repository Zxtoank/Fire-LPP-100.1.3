
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "./spinner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useRouter } from "next/navigation";

const signUpSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

const signInSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type AuthFormProps = {
  mode: 'signin' | 'signup';
};

export function AuthForm({ mode }: AuthFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const schema = mode === 'signup' ? signUpSchema : signInSchema;

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      ...(mode === 'signup' && { confirmPassword: "" }),
    },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!auth) {
        toast({ variant: "destructive", title: "Authentication Error", description: "Firebase is not configured." });
        return;
    }
    setIsLoading(true);
    
    try {
        if (mode === 'signup') {
            await createUserWithEmailAndPassword(auth, data.email, data.password);
            toast({ title: "Account Created!", description: "You have successfully signed up. Welcome!" });
        } else {
            await signInWithEmailAndPassword(auth, data.email, data.password);
            toast({ title: "Signed In", description: "Welcome back!" });
        }
        router.push('/');
    } catch (error: any) {
        let description = "An unexpected error occurred. Please try again.";
        switch (error.code) {
            case 'auth/email-already-in-use':
                description = 'This email address is already in use by another account.';
                break;
            case 'auth/invalid-email':
                description = 'The email address is not valid.';
                break;
            case 'auth/operation-not-allowed':
                description = 'Email/password accounts are not enabled. Please contact support.';
                break;
            case 'auth/weak-password':
                description = 'The password is too weak.';
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                description = 'Invalid email or password. Please try again.';
                break;
            default:
                console.error("Firebase Auth Error:", error);
        }
        toast({ variant: "destructive", title: "Authentication Error", description });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {mode === 'signup' && (
            <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Spinner className="mr-2 h-4 w-4" />}
          {mode === 'signup' ? 'Create Account' : 'Sign In'}
        </Button>
      </form>
    </Form>
  );
}
