
"use client";

import { AuthProvider } from "@/context/AuthContext";
import { isFirebaseConfigured } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ConfigErrorScreen = () => (
    <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-lg shadow-lg">
            <CardHeader>
                <CardTitle>Configuration Error</CardTitle>
                <CardDescription>
                    The application is not properly configured.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800">
                  <p className="font-semibold mb-2">Action Required</p>
                  <p>Firebase credentials are missing or incomplete. Please copy your web app's Firebase configuration into the <code>.env</code> file at the root of your project to enable all features.</p>
                  <p className="mt-2 text-sm">You can find these keys in your Firebase project settings under "General".</p>
                </div>
            </CardContent>
        </Card>
    </main>
);

export function AppProviders({ children }: { children: React.ReactNode }) {
    if (!isFirebaseConfigured) {
        return <ConfigErrorScreen />;
    }

    return (
        <AuthProvider>
            {children}
        </AuthProvider>
    );
}
