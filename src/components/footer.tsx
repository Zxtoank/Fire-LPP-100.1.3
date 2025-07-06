import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-auto py-4 px-6 text-center text-sm text-muted-foreground border-t bg-card">
      <div className="flex justify-center gap-4">
        <Link href="/terms" className="hover:text-primary hover:underline">
          Terms of Service
        </Link>
        <span>&bull;</span>
        <Link href="/privacy" className="hover:text-primary hover:underline">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
