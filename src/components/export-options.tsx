
"use client";

import { useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { PayPalButtons } from "@paypal/react-paypal-js";
import type { OnApproveData, OnApproveActions, OrderResponseBody } from "@paypal/paypal-js";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/spinner';
import { Download, FileText, Package, Star, Lightbulb, Crown, ShoppingCart, User } from 'lucide-react';
import type { CropShape } from './image-editor';

const drawHeart = (ctx: CanvasRenderingContext2D, cx: number, y: number, width: number, height: number) => {
    ctx.save();
    ctx.beginPath();
    const svgW = 32;
    const svgH = 29.6;
    const scaleX = width / svgW;
    const scaleY = height / svgH;
    const offsetX = cx - width / 2;
    const offsetY = y;
    const t = (svgX: number, svgY: number) => ({ x: svgX * scaleX + offsetX, y: svgY * scaleY + offsetY });

    let p = t(16, 29.6);
    ctx.moveTo(p.x, p.y);
    let p1 = t(4.2, 17.2); let p2 = t(0, 13.3); let p3 = t(0, 8.4);
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    p1 = t(0, 3.8); p2 = t(3.8, 0); p3 = t(8.4, 0);
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    p1 = t(11.8, 0); p2 = t(14.8, 2.1); p3 = t(16, 5.1);
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    p1 = t(17.2, 2.1); p2 = t(20.2, 0); p3 = t(23.6, 0);
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    p1 = t(28.2, 0); p2 = t(32, 3.8); p3 = t(32, 8.4);
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    p1 = t(32, 13.3); p2 = t(27.8, 17.2); p3 = t(16, 29.6);
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    ctx.closePath();
    ctx.restore();
};

const SectionHeader = ({ icon, title }: { icon?: React.ReactNode, title: string }) => (
    <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-primary rounded-full" />
        {icon}
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
    </div>
);

interface ExportOptionsProps {
  image: HTMLImageElement | null;
  cropShape: CropShape;
  getSourceRect: () => { sx: number; sy: number; sw: number; sh: number };
}

function ExportOptionsComponent({ image, cropShape, getSourceRect }: ExportOptionsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState<string | null>(null);

  const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const paypalConfigError = !PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID.includes('HERE');

  const generateDownloadableCanvas = useCallback(async (dpi: number): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
        if (!image) return reject(new Error("No image loaded"));
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return reject(new Error("Could not create canvas context"));

        const PRINT_WIDTH_IN_WITH_BLEED = 4.25;
        const PRINT_HEIGHT_IN_WITH_BLEED = 6.25;
        const BLEED_IN = 0.125;

        tempCanvas.width = PRINT_WIDTH_IN_WITH_BLEED * dpi;
        tempCanvas.height = PRINT_HEIGHT_IN_WITH_BLEED * dpi;
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        const drawSingleImageForDownload = (ctx: CanvasRenderingContext2D, pX: number, pY: number, pW: number, pH: number) => {
            if (!image) return;
            
            ctx.save();
            ctx.translate(pX, pY);
            
            ctx.beginPath();
            switch (cropShape) {
                case 'circle': ctx.arc(pW / 2, pH / 2, Math.min(pW, pH) / 2, 0, 2 * Math.PI); break;
                case 'heart': drawHeart(ctx, pW/2, 0, pW, pH); break;
                case 'oval':
                    ctx.ellipse(pW/2, pH/2, pW / 2, pH / 2, 0, 0, 2 * Math.PI);
                    break;
                case 'square': default: ctx.rect(0, 0, pW, pH); break;
            }
            ctx.closePath();
            ctx.clip();

            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, pW, pH);

            const { sx, sy, sw, sh } = getSourceRect();
            const sourceAR = sw / sh;
            const destAR = pW / pH;
            let finalW = pW, finalH = pH, finalX = 0, finalY = 0;
            if (sourceAR > destAR) {
                finalH = pH;
                finalW = pH * sourceAR;
                finalX = (pW - finalW) / 2;
            } else {
                finalW = pW;
                finalH = pW / sourceAR;
                finalY = (pH - finalH) / 2;
            }
            
            if (sw > 0 && sh > 0) {
              ctx.drawImage(image, sx, sy, sw, sh, finalX, finalY, finalW, finalH);
            }
            ctx.restore();
        };

        let cropAspectRatio = 1.0;
        if (cropShape === 'oval') {
            cropAspectRatio = 0.7;
        }
        
        const bleedPx = BLEED_IN * dpi;
        const margin = (20 / 600) * dpi;
        let currentX = margin + bleedPx;
        let currentY = margin + bleedPx;
        let maxRowHeight = 0;

        for (let heightMm = 8; heightMm <= 35; heightMm++) {
            const heightPx = (heightMm / 25.4) * dpi;
            const widthPx = heightPx * cropAspectRatio;
            if (currentX + widthPx + margin > tempCanvas.width - bleedPx) {
                currentY += maxRowHeight + margin;
                currentX = margin + bleedPx;
                maxRowHeight = 0;
            }
            if (currentY + heightPx > tempCanvas.height - bleedPx) break;
            drawSingleImageForDownload(tempCtx, currentX, currentY, widthPx, heightPx);
            currentX += widthPx + margin;
            if (heightPx > maxRowHeight) maxRowHeight = heightPx;
        }
        resolve(tempCanvas);
    });
  }, [image, cropShape, getSourceRect]);

  const handleDownload = useCallback(async (dpi: number, format: 'png' | 'pdf') => {
    const type = `${format}${dpi}`;
    if (downloadingType) return;
    setDownloadingType(type);
    toast({ title: "Preparing Download", description: `Generating ${dpi} DPI ${format.toUpperCase()}... Please wait.` });

    try {
        const canvas = await generateDownloadableCanvas(dpi);
        const fileName = `locket-photo-print-${dpi}dpi.${format}`;
        
        const androidBridge = (window as any).AndroidBridge;

        if (androidBridge && typeof androidBridge.saveFile === 'function') {
            const toBase64 = (canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<string> => {
                return new Promise((resolve) => {
                    const dataUrl = canvas.toDataURL(mimeType, quality);
                    resolve(dataUrl.split(',')[1]);
                });
            };

            let base64Data: string;
            let mimeType: string;

            if (format === 'pdf') {
                const { default: jsPDF } = await import('jspdf');
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [4.25, 6.25] });
                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 0, 0, 4.25, 6.25);
                base64Data = pdf.output('datauristring').split(',')[1];
                mimeType = 'application/pdf';
            } else {
                base64Data = await toBase64(canvas, 'image/png');
                mimeType = 'image/png';
            }
            
            androidBridge.saveFile(base64Data, fileName, mimeType);
            
        } else {
            const link = document.createElement('a');
            link.download = fileName;

            if (format === 'pdf') {
                const { default: jsPDF } = await import('jspdf');
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [4.25, 6.25] });
                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 0, 0, 4.25, 6.25);
                const pdfBlob = pdf.output('blob');
                link.href = URL.createObjectURL(pdfBlob);
            } else {
                const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                if (!imageBlob) throw new Error("Could not create image blob");
                link.href = URL.createObjectURL(imageBlob as Blob);
            }
            
            link.click();
            URL.revokeObjectURL(link.href);
            toast({ title: "Download Started", description: `Downloading ${fileName}` });
        }

    } catch (error) {
        console.error(`${format.toUpperCase()} Download Error:`, error);
        const message = error instanceof Error ? error.message : `Failed to generate ${format.toUpperCase()} file.`;
        toast({ variant: "destructive", title: "Download Error", description: message });
    } finally {
        setDownloadingType(null);
    }
  }, [downloadingType, generateDownloadableCanvas, toast]);

  const handleOrderPhysicalClick = useCallback(() => {
    if (!user) {
        toast({ variant: "destructive", title: "Please Log In", description: "You need to be logged in to order physical prints." });
        router.push("/login");
        return;
    }
    router.push("/checkout");
  }, [user, router, toast]);

  const createDigitalOrder = useCallback(async (description: string) => {
     try {
        const response = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: "4.99",
                description: description,
                requiresShipping: false
            })
        });
        const order = await response.json();
        if (response.ok) {
            return order.id;
        }
        const errorData = order.error || 'Failed to create PayPal order.';
        toast({ variant: "destructive", title: "Error", description: errorData });
        throw new Error(errorData);
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred";
        toast({ variant: "destructive", title: "Error", description: message });
        throw error;
    }
  }, [toast]);

  const onDigitalApprove = useCallback(async (data: OnApproveData, actions: OnApproveActions, type: 'png' | 'pdf') => {
    if (!actions.order || !user) {
      toast({ variant: "destructive", title: "Order Error", description: "An issue occurred. Please try again." });
      return;
    }

    setIsSubmittingPurchase(type);
    toast({ title: "Processing Payment...", description: "Please wait." });
    
    try {
        const details: OrderResponseBody = await actions.order.capture();
        
        await addDoc(collection(db, "users", user.uid, "downloads"), {
            paypalOrderId: details.id,
            downloadedAt: serverTimestamp(),
            type: type,
        });
        
        toast({ title: "Purchase Complete!", description: "Your download will begin shortly." });
        
        await handleDownload(1200, type);

    } catch (error) {
        console.error("Order processing error:", error);
        const message = error instanceof Error ? error.message : "There was an issue processing your purchase.";
        toast({ variant: "destructive", title: "Purchase Error", description: message });
    } finally {
        setIsSubmittingPurchase(null);
    }
  }, [user, toast, handleDownload]);
  
  const PayPalPurchaseButtons = ({type}: {type: 'png' | 'pdf'}) => {
    if (!user) {
        return (
             <div className="space-y-2 pt-2">
                <Button className="w-full" onClick={() => router.push('/login')}>
                    <User className="mr-2"/> Login to Purchase
                </Button>
            </div>
        )
    }

    const description = `Locket Photo 1200DPI ${type.toUpperCase()}`;

    return (
      <div className="space-y-2 pt-2">
          {isSubmittingPurchase === type ? (
              <div className="flex items-center justify-center h-10"><Spinner /><p className="ml-2 text-sm">Processing...</p></div>
          ) : (
            <PayPalButtons
                style={{ layout: "vertical", label: 'pay', height: 40 }}
                createOrder={() => createDigitalOrder(description)}
                onApprove={(data, actions) => onDigitalApprove(data, actions, type)}
                disabled={!!isSubmittingPurchase}
            />
          )}
      </div>
    );
  }
  
  return (
    <div className="pt-6 space-y-8">
      {paypalConfigError ? (
          <div className="p-4 rounded-md bg-destructive/10 border border-destructive/50 text-destructive text-sm">
              <h4 className="font-bold">PayPal Not Configured</h4>
              <p>Purchases are disabled. Please add your PayPal Client ID to the <code>.env</code> file.</p>
          </div>
      ) : (
        <>
          {/* Export Options Section */}
          <div>
              <SectionHeader title="Export Options" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {/* 600DPI PNG */}
                  <Card className="p-4 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                              <FileText className="text-blue-500 w-5 h-5" />
                              <div>
                                  <h4 className="font-semibold">600DPI PNG</h4>
                                  <p className="text-sm text-muted-foreground mt-1">High quality for home printing</p>
                              </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(600, 'png')} disabled={!!downloadingType}>
                              {downloadingType === 'png600' ? <Spinner /> : <Download />}
                          </Button>
                      </div>
                  </Card>
                  {/* 600DPI PDF */}
                  <Card className="p-4 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                              <FileText className="text-blue-500 w-5 h-5" />
                              <div>
                                  <h4 className="font-semibold">600DPI PDF</h4>
                                  <p className="text-sm text-muted-foreground mt-1">Perfect for professional printing</p>
                              </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(600, 'pdf')} disabled={!!downloadingType}>
                              {downloadingType === 'pdf600' ? <Spinner /> : <Download />}
                          </Button>
                      </div>
                  </Card>
                  
                  {/* PAID DOWNLOADS - WEB ONLY */}
                  {!isMobile && (
                    <>
                      {/* 1200DPI PNG */}
                      <Card className="p-4 border-yellow-200 border bg-yellow-50/50 relative space-y-3">
                          <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="text-yellow-500 w-5 h-5" />
                                  <div>
                                      <h4 className="font-semibold">1200DPI PNG</h4>
                                      <p className="text-sm text-muted-foreground mt-1">Ultra-high resolution</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold bg-yellow-200/70 text-yellow-900 px-2 py-0.5 rounded-full">$4.99</span>
                              </div>
                              <div className="absolute -top-3 -right-3 text-xs font-bold text-orange-900 w-7 h-7 flex items-center justify-center rounded-full border-2 border-white shadow-lg bg-gradient-to-tr from-yellow-400 to-orange-400">
                                  <Crown className="w-4 h-4" />
                              </div>
                          </div>
                          <PayPalPurchaseButtons type="png" />
                      </Card>
                      {/* 1200DPI PDF */}
                      <Card className="p-4 border-yellow-200 border bg-yellow-50/50 relative space-y-3">
                          <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                  <FileText className="text-yellow-500 w-5 h-5" />
                                  <div>
                                      <h4 className="font-semibold">1200DPI PDF</h4>
                                      <p className="text-sm text-muted-foreground mt-1">Professional print quality</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold bg-yellow-200/70 text-yellow-900 px-2 py-0.5 rounded-full">$4.99</span>
                              </div>
                              <div className="absolute -top-3 -right-3 text-xs font-bold text-orange-900 w-7 h-7 flex items-center justify-center rounded-full border-2 border-white shadow-lg bg-gradient-to-tr from-yellow-400 to-orange-400">
                                  <Crown className="w-4 h-4" />
                              </div>
                          </div>
                          <PayPalPurchaseButtons type="pdf" />
                      </Card>
                    </>
                  )}

                  {/* PAID DOWNLOADS - MOBILE ONLY PLACEHOLDER */}
                  {isMobile && (
                    <>
                      <Card className="p-4 border-yellow-200 border bg-yellow-50/50 relative space-y-3">
                          <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="text-yellow-500 w-5 h-5" />
                                  <div>
                                      <h4 className="font-semibold">1200DPI PNG</h4>
                                      <p className="text-sm text-muted-foreground mt-1">Ultra-high resolution</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold bg-yellow-200/70 text-yellow-900 px-2 py-0.5 rounded-full">$4.99</span>
                              </div>
                              <div className="absolute -top-3 -right-3 text-xs font-bold text-orange-900 w-7 h-7 flex items-center justify-center rounded-full border-2 border-white shadow-lg bg-gradient-to-tr from-yellow-400 to-orange-400">
                                  <Crown className="w-4 h-4" />
                              </div>
                          </div>
                          <div className="space-y-2 pt-2">
                              <Button disabled className="w-full">
                                  Coming Soon
                              </Button>
                          </div>
                      </Card>
                      <Card className="p-4 border-yellow-200 border bg-yellow-50/50 relative space-y-3">
                          <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                  <FileText className="text-yellow-500 w-5 h-5" />
                                  <div>
                                      <h4 className="font-semibold">1200DPI PDF</h4>
                                      <p className="text-sm text-muted-foreground mt-1">Professional print quality</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold bg-yellow-200/70 text-yellow-900 px-2 py-0.5 rounded-full">$4.99</span>
                              </div>
                              <div className="absolute -top-3 -right-3 text-xs font-bold text-orange-900 w-7 h-7 flex items-center justify-center rounded-full border-2 border-white shadow-lg bg-gradient-to-tr from-yellow-400 to-orange-400">
                                  <Crown className="w-4 h-4" />
                              </div>
                          </div>
                          <div className="space-y-2 pt-2">
                              <Button disabled className="w-full">
                                  Coming Soon
                              </Button>
                          </div>
                      </Card>
                    </>
                  )}

              </div>
          </div>

          {/* Physical Prints */}
          <div className="pt-4">
              <SectionHeader icon={<Package className="text-green-500" />} title="Physical Prints" />
              <Card className="p-6 mt-4 border-green-200 border bg-green-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                      <h4 className="font-semibold text-lg">Professional Photo Prints</h4>
                      <p className="text-muted-foreground mt-1">Get your custom locket photos printed on high-quality photo paper and delivered to your door.</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                          <li>4" x 6" professional photo paper</li>
                          <li>Dozens of custom-sized photos per print</li>
                          <li>Delivered in 5-7 business days</li>
                      </ul>
                  </div>
                  <div className="text-center md:text-right flex-shrink-0">
                      <p className="text-3xl font-bold text-green-700">$12.99</p>
                      <p className="text-sm text-muted-foreground">per print</p>
                      <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white" size="lg" onClick={handleOrderPhysicalClick} disabled={!user}>
                          <Package className="mr-2"/> Order Physical Prints
                      </Button>
                  </div>
              </Card>
          </div>

          {/* Amazon Link Section */}
          <div className="pt-4">
              <SectionHeader icon={<ShoppingCart className="text-amber-600" />} title="Recommended Supplies" />
               <Card className="p-6 mt-4 border-amber-200 border bg-amber-50/50">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex-grow">
                          <h4 className="font-semibold text-lg">Locket Photo Paper</h4>
                          <p className="text-muted-foreground mt-1">Get the official high-gloss photo paper for perfect, vibrant locket-sized prints every time.</p>
                      </div>
                      <a href="https://www.amazon.com/gp/product/B0FBM249W3" target="_blank" rel="noopener noreferrer" className="flex-shrink-0 w-full md:w-auto">
                          <Button className="w-full md:w-auto mt-2 md:mt-0 bg-amber-500 hover:bg-amber-600 text-white" size="lg">
                              <ShoppingCart className="mr-2"/> Buy on Amazon
                          </Button>
                      </a>
                  </div>
              </Card>
          </div>

          {/* Upgrade to Premium */}
           <div className="pt-4">
              <SectionHeader icon={<Star className="text-purple-500" />} title="Upgrade to Premium" />
              <Card className="p-6 mt-4 border-purple-200 border bg-purple-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                      <div className="bg-purple-100 p-3 rounded-full">
                          <Star className="text-purple-500 w-8 h-8"/>
                      </div>
                      <div>
                          <h4 className="font-semibold text-lg">Unlimited Downloads & More</h4>
                          <p className="text-muted-foreground">Get access to exclusive features and discounts.</p>
                      </div>
                  </div>
                  <div className="text-center md:text-right flex-shrink-0">
                      <p className="text-3xl font-bold text-purple-700">$9.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                      <Button className="mt-2 bg-violet-500 hover:bg-violet-600 text-white" size="lg" disabled>
                          Coming Soon
                      </Button>
                  </div>
              </Card>
          </div>

          {/* Pro Tip */}
           <div className="pt-4">
              <SectionHeader icon={<Lightbulb className="text-blue-500" />} title="Pro Tip" />
              <Card className="p-4 mt-4 bg-blue-50/50 border-blue-200 border flex items-start gap-4">
                  <Lightbulb className="text-blue-500 mt-1 flex-shrink-0"/>
                  <div>
                      <p className="text-sm text-muted-foreground">For best results, use 600DPI for home printing and 1200DPI for professional printing services. PDF format is recommended for commercial printers.</p>
                  </div>
              </Card>
          </div>
        </>
      )}
    </div>
  );
}

export const ExportOptions = memo(ExportOptionsComponent);
