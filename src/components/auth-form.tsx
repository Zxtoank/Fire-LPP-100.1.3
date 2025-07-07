
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { auth } from "@/lib/firebase";
import { sendSignInLinkToEmail } from "firebase/auth";
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

const emailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

export function AuthForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: z.infer<typeof emailSchema>) => {
    if (!auth) {
        toast({ variant: "destructive", title: "Authentication Error", description: "Firebase is not configured." });
        return;
    }
    setIsLoading(true);
    setIsSubmitted(false);
    try {
      const actionCodeSettings = {
        // URL you want to redirect back to. The domain must be
        // authorized in the Firebase console.
        url: `${window.location.origin}/login`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, data.email, actionCodeSettings);
      
      // Save the email locally so you don't need to ask the user for it again
      // if they open the link on the same device.
      window.localStorage.setItem('emailForSignIn', data.email);
      
      toast({
        title: "Check Your Email",
        description: `A sign-in link has been sent to ${data.email}.`,
      });
      setIsSubmitted(true);
      form.reset();

    } catch (error: any) {
      if (error.code === 'auth/unauthorized-domain') {
        console.error("Firebase Auth Error: The domain is not allowlisted.", error);
        toast({
          variant: "destructive",
          title: "Domain Not Allowlisted",
          description: "This app's domain is not authorized. Please check two things: 1) The domain is in your Firebase project's 'Authorized domains' list. 2) The 'authDomain' in your .env file matches the project you're editing.",
          duration: 9000,
        });
      } else {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isSubmitted) {
    return (
        <div className="text-center p-4 bg-primary/10 rounded-md border border-primary/20">
            <h3 className="font-semibold text-primary">Email Sent!</h3>
            <p className="text-sm text-muted-foreground mt-1">Please check your inbox and click the link to sign in.</p>
        </div>
    )
  }

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
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Spinner className="mr-2 h-4 w-4" />}
          Send Sign-in Link
        </Button>
      </form>
    </Form>
  );
}
