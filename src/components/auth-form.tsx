
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { auth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const signUpSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const logInSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
    <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 398.2 0 256S111.8 0 244 0c69.8 0 130.8 28.1 176.2 72.9l-63.1 61.9C333.5 102.4 291.1 80 244 80 149.6 80 71.5 153.3 71.5 256s78.1 176 172.5 176c98.2 0 150-70.2 155.1-106.2H244v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path>
  </svg>
);

export function AuthForm({ isSignUp }: { isSignUp: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // State for phone authentication
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const form = useForm({
    resolver: zodResolver(isSignUp ? signUpSchema : logInSchema),
    defaultValues: isSignUp ? { name: "", email: "", password: "" } : { email: "", password: "" },
  });
  
  // Setup invisible reCAPTCHA verifier
  useEffect(() => {
    if (!auth) return;
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  }, []);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        await updateProfile(userCredential.user, { displayName: data.name });
      } else {
        await signInWithEmailAndPassword(auth, data.email, data.password);
      }
      router.push("/");
      toast({ title: "Success!", description: isSignUp ? "Your account has been created." : "You are now logged in." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Authentication Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/");
      toast({ title: "Success!", description: "You are now logged in." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Authentication Error", description: error.message });
    } finally {
      setIsGoogleLoading(false);
    }
  };
  
  const handleSendOtp = async () => {
    if (!auth) return;
    setIsPhoneLoading(true);
    try {
      if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
        toast({ variant: "destructive", title: "Invalid Phone Number", description: "Please use E.164 format (e.g., +14155552671)." });
        setIsPhoneLoading(false);
        return;
      }
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setIsOtpSent(true);
      toast({ title: "Verification Code Sent", description: "Please check your phone for the 6-digit code." });
    } catch (error: any) {
      let description = "An unknown error occurred.";
      if (error.code === 'auth/invalid-phone-number') {
        description = "The phone number is not valid. Please ensure it's in E.164 format (e.g., +14155552671).";
      } else if (error.code === 'auth/too-many-requests') {
        description = "You've requested an OTP too many times. Please try again later.";
      } else {
        console.error("Phone Sign-In Error:", error);
        description = "Failed to send OTP. Please check the number and reCAPTCHA setup.";
      }
      toast({ variant: "destructive", title: "Error", description });
    } finally {
      setIsPhoneLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmationResult || otp.length !== 6) {
      toast({ variant: "destructive", title: "Invalid OTP", description: "Please enter the 6-digit code." });
      return;
    }
    setIsPhoneLoading(true);
    try {
      await confirmationResult.confirm(otp);
      router.push("/");
      toast({ title: "Success!", description: "You are now logged in." });
    } catch (error: any) {
      let description = "Failed to verify OTP.";
      if (error.code === 'auth/invalid-verification-code') {
        description = "The code you entered is incorrect. Please try again.";
      } else if (error.code === 'auth/code-expired') {
        description = "The verification code has expired. Please request a new one.";
      }
      toast({ variant: "destructive", title: "Verification Failed", description });
    } finally {
      setIsPhoneLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {isSignUp && (
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
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
          <Button type="submit" className="w-full" disabled={isLoading || isPhoneLoading || isGoogleLoading}>
            {isLoading && <Spinner className="mr-2 h-4 w-4" />}
            {isSignUp ? "Sign Up" : "Log In"} with Email
          </Button>
        </form>
      </Form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or</span>
        </div>
      </div>

       <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isPhoneLoading || isGoogleLoading}>
        {isGoogleLoading ? <Spinner className="mr-2 h-4 w-4" /> : <GoogleIcon />}
        Sign in with Google
      </Button>

      <div className="space-y-2">
        {!isOtpSent ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+14155552671"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isPhoneLoading || isLoading || isGoogleLoading}
              />
            </div>
            <Button variant="outline" className="w-full" onClick={handleSendOtp} disabled={isLoading || isPhoneLoading || isGoogleLoading}>
              {isPhoneLoading && <Spinner className="mr-2 h-4 w-4" />}
              Send Verification Code
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                disabled={isPhoneLoading || isLoading || isGoogleLoading}
              />
            </div>
            <Button className="w-full" onClick={handleVerifyOtp} disabled={isLoading || isPhoneLoading || isGoogleLoading}>
              {isPhoneLoading && <Spinner className="mr-2 h-4 w-4" />}
              Verify & {isSignUp ? "Sign Up" : "Log In"}
            </Button>
            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => {setIsOtpSent(false); setOtp("");}}>
                Use a different phone number
            </Button>
          </div>
        )}
         <p className="text-xs text-center text-muted-foreground px-4 pt-1">
          Phone sign-in must be enabled in your Firebase project.
        </p>
      </div>
      <div id="recaptcha-container"></div>
    </div>
  );
}
