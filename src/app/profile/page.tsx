
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, writeBatch } from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";
import Link from "next/link";
import { format } from "date-fns";
import { Download, Package, UserPlus, Trash2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface DownloadRecord {
  id: string;
  downloadedAt: any; // Firestore timestamp
  type: string;
}

interface OrderRecord {
  id: string;
  orderedAt: any; // Firestore timestamp
  total: number;
  status: string;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && !user.isAnonymous) {
      const fetchData = async () => {
        setIsDataLoading(true);
        try {
            // Fetch downloads
            const downloadsQuery = query(collection(db, "users", user.uid, "downloads"), orderBy("downloadedAt", "desc"));
            const downloadsSnapshot = await getDocs(downloadsQuery);
            setDownloads(downloadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DownloadRecord)));

            // Fetch orders
            const ordersQuery = query(collection(db, "users", user.uid, "orders"), orderBy("orderedAt", "desc"));
            const ordersSnapshot = await getDocs(ordersQuery);
            setOrders(ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderRecord)));
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setIsDataLoading(false);
        }
      };
      fetchData();
    } else {
        setIsDataLoading(false);
    }
  }, [user]);

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    toast({ title: "Deleting Account", description: "This may take a moment. Please wait..." });

    try {
      // Create a batch to delete all documents atomically.
      const batch = writeBatch(db);

      // Delete all documents in the 'downloads' subcollection.
      const downloadsQuery = query(collection(db, "users", user.uid, "downloads"));
      const downloadsSnapshot = await getDocs(downloadsQuery);
      downloadsSnapshot.forEach(doc => batch.delete(doc.ref));

      // Delete all documents in the 'orders' subcollection.
      const ordersQuery = query(collection(db, "users", user.uid, "orders"));
      const ordersSnapshot = await getDocs(ordersQuery);
      ordersSnapshot.forEach(doc => batch.delete(doc.ref));

      // Commit the batch to delete all Firestore data.
      await batch.commit();

      // Finally, delete the user from Firebase Authentication.
      await deleteUser(user);

      toast({ title: "Account Deleted", description: "Your account and all data have been removed." });
      router.push('/');
    } catch (error: any) {
      console.error("Error deleting account:", error);
      let description = "An unexpected error occurred. Please try again.";
      if (error.code === 'auth/requires-recent-login') {
        description = "This is a sensitive operation. Please sign out and sign back in before deleting your account.";
      }
      toast({ variant: "destructive", title: "Deletion Failed", description });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

  if (user.isAnonymous) {
    return (
        <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8 flex items-center justify-center">
            <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader>
                    <CardTitle>You're a Guest!</CardTitle>
                    <CardDescription>Your work isn't saved to an account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">Create an account to save your orders, downloads, and profile information for future visits.</p>
                    <Button onClick={() => router.push('/login')}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Sign Up or Log In
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
  }

  return (
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">My Profile</h1>
            <p className="text-lg text-muted-foreground mt-2">{user.displayName || user.email}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Download /> My Downloads</CardTitle>
                <CardDescription>Your purchased high-resolution files.</CardDescription>
              </CardHeader>
              <CardContent>
                {isDataLoading ? <div className="flex justify-center p-8"><Spinner /></div> : downloads.length > 0 ? (
                  <ul className="space-y-4">
                    {downloads.map(d => (
                      <li key={d.id} className="flex justify-between items-center p-3 bg-muted rounded-lg border">
                        <div>
                          <p className="font-semibold">1200DPI {d.type.toUpperCase()}</p>
                          <p className="text-sm text-muted-foreground">
                            Purchased on {d.downloadedAt ? format(d.downloadedAt.toDate(), "PPP") : 'N/A'}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" disabled>Re-download</Button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-muted-foreground text-center py-4">You haven&apos;t purchased any downloads yet.</p>}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package /> Order History</CardTitle>
                <CardDescription>Your physical print orders.</CardDescription>
              </CardHeader>
              <CardContent>
                 {isDataLoading ? <div className="flex justify-center p-8"><Spinner /></div> : orders.length > 0 ? (
                  <ul className="space-y-4">
                    {orders.map(o => (
                      <li key={o.id} className="flex justify-between items-center p-3 bg-muted rounded-lg border">
                        <div>
                          <p className="font-semibold">Order #{o.id.substring(0, 6).toUpperCase()}</p>
                          <p className="text-sm text-muted-foreground">
                             Placed on {o.orderedAt ? format(o.orderedAt.toDate(), "PPP") : 'N/A'} - <span className="font-medium capitalize">{o.status}</span>
                          </p>
                        </div>
                        <Link href={`/orders/${o.id}`} passHref>
                          <Button variant="outline" size="sm">View Details</Button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-muted-foreground text-center py-4">You haven&apos;t placed any orders yet.</p>}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg border-destructive/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle />Danger Zone</CardTitle>
                <CardDescription>Manage permanent actions for your account.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <div>
                        <p className="font-semibold">Delete Account</p>
                        <p className="text-sm text-muted-foreground">Permanently delete your account and all of your data. This action cannot be undone.</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isDeleting}>
                            {isDeleting ? <Spinner className="mr-2" /> : <Trash2 className="mr-2"/>}
                            Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your
                            account and remove all your data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                            Yes, delete my account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
          </Card>

        </div>
      </main>
  );
}
