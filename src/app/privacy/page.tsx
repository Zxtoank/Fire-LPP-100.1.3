"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  const [date, setDate] = React.useState('');
  React.useEffect(() => {
    setDate(new Date().toLocaleDateString());
  }, []);

  return (
    <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none text-card-foreground space-y-4">
          <p>Last updated: {date}</p>
          
          <div>
            <h2 className="font-semibold text-lg">1. Introduction</h2>
            <p>Welcome to Locket Photo Print. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information, please contact us.</p>
          </div>

          <div>
            <h2 className="font-semibold text-lg">2. Information We Collect</h2>
            <p>We collect personal information that you voluntarily provide to us when you register on the app, express an interest in obtaining information about us or our products and services, when you participate in activities on the app or otherwise when you contact us.</p>
            <p>The personal information we collect may include the following:</p>
            <ul className="list-disc list-inside space-y-1 pl-4">
              <li><strong>Personal Information Provided by You.</strong> We collect names; email addresses; passwords; and other similar information.</li>
              <li><strong>Payment Data.</strong> We may collect data necessary to process your payment if you make purchases, such as your payment instrument number, and the security code associated with your payment instrument. All payment data is stored by our payment processor (e.g., PayPal) and you should review its privacy policies and contact the payment processor directly to respond to your questions.</li>
              <li><strong>Image Data.</strong> We collect the images you upload to our service for the sole purpose of providing the photo printing and editing services. We do not use your images for any other purpose without your explicit consent.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-lg">3. How We Use Your Information</h2>
            <p>We use personal information collected via our app for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.</p>
          </div>
          
          <div>
            <h2 className="font-semibold text-lg">4. Will Your Information Be Shared With Anyone?</h2>
            <p>We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.</p>
          </div>

          <div>
            <h2 className="font-semibold text-lg">5. How We Keep Your Information Safe</h2>
            <p>We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure.</p>
          </div>
          
          <div>
            <h2 className="font-semibold text-lg">6. Changes to This Privacy Notice</h2>
            <p>We may update this privacy notice from time to time. The updated version will be indicated by an updated "Last updated" date and the updated version will be effective as soon as it is accessible.</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
