
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Spinner } from '@/components/spinner';
import { format } from 'date-fns';
import { Package, Home, CheckCircle, Truck, Circle, Edit } from 'lucide-react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  orderedAt: any;
  total: number;
  status: 'processing' | 'shipped' | 'delivered';
  items: { description: string; amount: { value: string } }[];
  shippingAddress: {
    name: string;
    address_line_1: string;
    address_line_2?: string;
    admin_area_2: string;
    admin_area_1: string;
    postal_code: string;
    country: string;
  };
  trackingNumber?: string;
  carrier?: string;
}

const updateOrderSchema = z.object({
  status: z.enum(["processing", "shipped", "delivered"]),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
}).refine(data => {
    if (data.status === 'shipped') {
        return !!data.carrier && !!data.trackingNumber;
    }
    return true;
}, {
    message: "Carrier and tracking number are required when status is 'shipped'.",
    path: ["trackingNumber"],
});

type UpdateOrderValues = z.infer<typeof updateOrderSchema>;

function UpdateOrderForm({ order, customerId, onOrderUpdate }: { order: Order, customerId: string, onOrderUpdate: (data: Partial<Order>) => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<UpdateOrderValues>({
        resolver: zodResolver(updateOrderSchema),
        defaultValues: {
            status: order.status || 'processing',
            carrier: order.carrier || '',
            trackingNumber: order.trackingNumber || '',
        },
    });

    const onSubmit = async (data: UpdateOrderValues) => {
        setIsSubmitting(true);
        try {
            const orderRef = doc(db, 'users', customerId, 'orders', order.id);
            await updateDoc(orderRef, {
                status: data.status,
                carrier: data.carrier,
                trackingNumber: data.trackingNumber,
            });
            onOrderUpdate(data);
            toast({ title: "Success", description: "Order has been updated." });
        } catch (error) {
            console.error("Error updating order:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to update the order." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="shadow-md mt-8 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Edit />Update Order</CardTitle>
                <CardDescription>Update the status and add tracking information for this order.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Order Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="processing">Processing</SelectItem>
                                            <SelectItem value="shipped">Shipped</SelectItem>
                                            <SelectItem value="delivered">Delivered</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="carrier"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Carrier</FormLabel>
                                    <FormControl><Input placeholder="e.g., USPS, FedEx" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="trackingNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tracking Number</FormLabel>
                                    <FormControl><Input placeholder="e.g., 9400111202555821528111" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Spinner className="mr-2" /> : null}
                            Update Order
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

const statusSteps = [
    { id: 'processing', label: 'Processing', icon: Circle },
    { id: 'shipped', label: 'Shipped', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle },
];

export default function OrderDetailsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.orderId as string;
  const customerId = searchParams.get('userId');

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && orderId) {
      const fetchOrder = async () => {
        setIsLoading(true);
        const targetUid = isAdmin && customerId ? customerId : user.uid;

        if (!targetUid) {
            setError("Could not determine user for this order.");
            setIsLoading(false);
            return;
        }

        try {
          const orderRef = doc(db, 'users', targetUid, 'orders', orderId);
          const orderSnap = await getDoc(orderRef);
          if (orderSnap.exists()) {
            setOrder({ id: orderSnap.id, ...orderSnap.data() } as Order);
          } else {
            setError('Order not found.');
          }
        } catch (err) {
          setError('Failed to fetch order details.');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchOrder();
    }
  }, [user, orderId, isAdmin, customerId]);
  
  const handleOrderUpdate = (data: Partial<Order>) => {
      setOrder(prevOrder => prevOrder ? { ...prevOrder, ...data } : null);
  };


  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }
  
  if (error) {
     return (
        <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8 flex items-center justify-center">
            <p className="text-red-500">{error}</p>
        </main>
    );
  }

  if (!order) {
    return (
       <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8 flex items-center justify-center">
            <p className="text-muted-foreground">Order not found.</p>
       </main>
    )
  }

  const currentStatusIndex = statusSteps.findIndex(step => step.id === order.status);

  return (
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>
              Order #{order.id.substring(0, 8).toUpperCase()} &bull; Placed on {order.orderedAt ? format(order.orderedAt.toDate(), "PPP") : 'N/A'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <h3 className="font-semibold mb-6 text-lg">Order Status</h3>
              <div className="relative flex items-center justify-between w-full max-w-2xl mx-auto">
                 <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full bg-border"></div>
                 <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary" style={{width: `${(currentStatusIndex / (statusSteps.length - 1)) * 100}%`}}></div>
                {statusSteps.map((step, index) => {
                  const isActive = index <= currentStatusIndex;
                  const Icon = step.icon;
                  return (
                    <div key={step.id} className="z-10 flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${isActive ? 'bg-primary border-primary text-white' : 'bg-background border-border text-muted-foreground'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className={`mt-2 text-sm font-medium text-center ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Package />Items Summary</h3>
                    <div className="p-4 border rounded-md bg-muted/50">
                        {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between">
                                <p>{item.description}</p>
                                <p>${Number(item.amount.value).toFixed(2)}</p>
                            </div>
                        ))}
                         <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                            <p>Total</p>
                            <p>${order.total.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                     <h3 className="font-semibold text-lg flex items-center gap-2"><Home />Shipping Address</h3>
                     <div className="p-4 border rounded-md bg-muted/50 leading-relaxed">
                        <p className="font-medium">{order.shippingAddress.name}</p>
                        <p>{order.shippingAddress.address_line_1}</p>
                        {order.shippingAddress.address_line_2 && <p>{order.shippingAddress.address_line_2}</p>}
                        <p>{order.shippingAddress.admin_area_2}, {order.shippingAddress.admin_area_1} {order.shippingAddress.postal_code}</p>
                        <p>{order.shippingAddress.country}</p>
                     </div>
                </div>
            </div>

            {order.status !== 'processing' && order.carrier && order.trackingNumber && (
                 <div className="pt-6 border-t">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Truck />Tracking Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p><strong>Carrier:</strong> {order.carrier}</p>
                            <p><strong>Tracking Number:</strong> {order.trackingNumber}</p>
                        </CardContent>
                        <CardFooter>
                             <a href={`https://www.google.com/search?q=${encodeURIComponent(order.carrier + ' ' + order.trackingNumber)}`} target="_blank" rel="noopener noreferrer">
                                <Button>Track Package</Button>
                            </a>
                        </CardFooter>
                    </Card>
                 </div>
            )}

          </CardContent>
        </Card>

        {isAdmin && customerId && <UpdateOrderForm order={order} customerId={customerId} onOrderUpdate={handleOrderUpdate} />}
      </main>
  );
}
