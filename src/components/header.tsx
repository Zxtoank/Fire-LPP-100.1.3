
"use client";
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { User, LogOut, ChevronLeft, RefreshCw, ShieldCheck, LogIn } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;

  const handleSignOut = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      router.push('/');
    } catch (error) {
        console.error("Error signing out: ", error);
    }
  };
  
  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <header className="p-2 sm:p-4 border-b shrink-0 flex justify-between items-center bg-card">
      <div className="flex items-center gap-1 sm:gap-2">
        {pathname !== '/' && (
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
            <span className="sr-only">Back</span>
          </Button>
        )}
        <Link href="/" className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-primary cursor-pointer truncate">
            Locket Photo Print
          </h1>
        </Link>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={handleRefresh} className="h-10 w-10 shrink-0 md:hidden">
            <RefreshCw className="h-5 w-5" />
            <span className="sr-only">Refresh</span>
        </Button>
        {isAdmin && pathname !== '/admin/orders' && (
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/orders')} className="hidden sm:inline-flex">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Admin
            </Button>
        )}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />}
                  <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => router.push('/admin/orders')}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    <span>View Orders</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button onClick={() => router.push('/login')}>
            <LogIn className="mr-2 h-4 w-4" />
            Login / Sign Up
          </Button>
        )}
      </div>
    </header>
  );
}
