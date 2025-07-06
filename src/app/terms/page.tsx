"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfServicePage() {
    const [date, setDate] = React.useState('');
    React.useEffect(() => {
        setDate(new Date().toLocaleDateString());
    }, []);
    
  return (
    <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none text-card-foreground space-y-4">
          <p>Last updated: {date}</p>

          <div>
            <h2 className="font-semibold text-lg">1. Agreement to Terms</h2>
            <p>By using our services, you agree to be bound by these Terms. If you do not agree to be bound by these Terms, do not use the services.</p>
          </div>

          <div>
            <h2 className="font-semibold text-lg">2. User Accounts</h2>
            <p>When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our service.</p>
          </div>

          <div>
            <h2 className="font-semibold text-lg">3. User Content</h2>
            <p>You are responsible for the content, including photos and other materials, that you upload to the service ("User Content"). You retain all of your rights to any User Content you submit, post or display on or through the service and you are responsible for protecting those rights.</p>
            <p>You grant us a non-exclusive, worldwide, royalty-free license to use, copy, reproduce, process, adapt, modify, publish, transmit, display and distribute such User Content in any and all media or distribution methods now known or later developed, solely for the purpose of providing and improving the service.</p>
          </div>

          <div>
            <h2 className="font-semibold text-lg">4. Purchases</h2>
            <p>If you wish to purchase any product or service made available through the service ("Purchase"), you may be asked to supply certain information relevant to your Purchase including, without limitation, your credit card number, the expiration date of your credit card, your billing address, and your shipping information. All payments for physical goods are handled by third-party payment processors like PayPal. For digital goods, you must use the platform's native In-App Purchase system as required.</p>
          </div>

          <div>
            <h2 className="font-semibold text-lg">5. Termination</h2>
            <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
          </div>
          
          <div>
            <h2 className="font-semibold text-lg">6. Limitation of Liability</h2>
            <p>In no event shall Locket Photo Print, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.</p>
          </div>
          
          <div>
            <h2 className="font-semibold text-lg">7. Governing Law</h2>
            <p>These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which the company is based, without regard to its conflict of law provisions.</p>
          </div>
          
          <div>
            <h2 className="font-semibold text-lg">8. Changes</h2>
            <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion.</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
