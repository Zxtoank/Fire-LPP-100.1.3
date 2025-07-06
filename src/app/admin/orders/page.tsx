
"use client";

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collectionGroup, getDocs, orderBy, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { Spinner } from '@/components/spinner';
import { ShieldX } from 'lucide-react';

interface Order {
  id: string;
  userId: string;
  orderedAt: any;
  total: number;
  status: 'processing' | 'shipped' | 'delivered';
  shippingAddress: {
    name: string;
  };
}

export default function AdminOrdersPage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<ReactNode | string | null>(null);

  const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      setIsDataLoading(false);
      return;
    }

    const fetchOrders = async () => {
      setIsDataLoading(true);
      try {
        const ordersQuery = query(collectionGroup(db, 'orders'), orderBy('orderedAt', 'desc'));
        const querySnapshot = await getDocs(ordersQuery);
        const fetchedOrders = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const userId = doc.ref.parent.parent?.id || 'unknown';
          return {
            id: doc.id,
            userId: userId,
            ...data
          } as Order;
        });
        setOrders(fetchedOrders);
      } catch (err: any) {
        console.error("Error fetching orders:", err);
        if (err.code === 'failed-precondition') {
          const detailedError = (
            <div className="space-y-4">
               <p>My apologies, my previous instructions were incorrect. The error message you saw in the Firebase console was a key clue. We need to create a **Single-field index exemption**, not a composite one.</p>

                <div>
                    <h4 className="font-semibold text-md mb-2">Step 1: Go to Firestore Indexes</h4>
                     <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>Open your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Firebase Console</a> and go to the **Firestore Database** section.</li>
                        <li>Click the **Indexes** tab at the top.</li>
                    </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-md mb-2">Step 2: Create a Single-Field Exemption</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Click on the **Single Field** tab (this is the important part).</li>
                      <li>Under the "Single-field index exemptions" section, click **Add exemption**.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-md mb-2">Step 3: Configure the Exemption</h4>
                  <p className="text-sm text-muted-foreground mb-2">A panel will open. Enter the following settings exactly:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                      <li>**Collection Path:** `orders`</li>
                      <li>**Field Path:** `orderedAt`</li>
                      <li>**Query scope:** Select **Collection group**.</li>
                      <li>**Query options:** Check both **Ascending** and **Descending**.</li>
                  </ul>
                </div>
                 <div className="mt-4">
                    <h4 className="font-semibold text-md mb-2">Step 4: Save and Wait</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>Click **Save**. The index exemption will take a few minutes to build.</li>
                        <li>Once it's finished, this page will load correctly.</li>
                    </ul>
                </div>
            </div>
          );
          setError(detailedError);
        } else {
          setError('Failed to fetch orders. See console for details.');
        }
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchOrders();
  }, [user, loading, isAdmin]);

  if (loading || isDataLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <CardTitle className="flex justify-center items-center gap-2"><ShieldX className="text-destructive" />Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You do not have permission to view this page.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Customer Orders</CardTitle>
          <CardDescription>A complete history of all physical print orders placed in the app.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
             typeof error === 'string' ? (
                <div className="p-4 rounded-md bg-destructive/10 border border-destructive/50 text-destructive">
                    <h4 className="font-bold">Error Loading Orders</h4>
                    <p>{error}</p>
                </div>
             ) : (
                <div className="p-4 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800/50 dark:text-yellow-200">
                    <h4 className="font-bold mb-3 text-lg">Action Required: Create Database Index</h4>
                    <div>{error}</div>
                </div>
             )
          ) : orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id.substring(0, 8).toUpperCase()}</TableCell>
                    <TableCell>{order.shippingAddress?.name || 'N/A'}</TableCell>
                    <TableCell>{order.orderedAt ? format(order.orderedAt.toDate(), "MMM d, yyyy") : 'N/A'}</TableCell>
                    <TableCell>${order.total.toFixed(2)}</TableCell>
                    <TableCell><span className="font-medium capitalize">{order.status}</span></TableCell>
                    <TableCell className="text-right">
                      <Link href={`/orders/${order.id}?userId=${order.userId}`} passHref>
                        <Button variant="outline" size="sm">View Details</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">No orders have been placed yet.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
