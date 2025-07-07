"use client";

import dynamic from 'next/dynamic';
import { Spinner } from '@/components/spinner';
import { Card, CardContent } from '@/components/ui/card';

const ImageEditor = dynamic(() => import('@/components/image-editor'), {
  ssr: false,
  loading: () => (
    <Card className="w-full max-w-xl mx-auto shadow-xl bg-card border">
        <CardContent className="h-[500px] flex items-center justify-center">
            <Spinner className="w-12 h-12 text-primary" />
        </CardContent>
    </Card>
  ),
});

export default function Home() {
  return (
    <main className="flex-grow flex items-center justify-center p-4 sm:p-6 md:p-8">
      <ImageEditor />
    </main>
  );
}
