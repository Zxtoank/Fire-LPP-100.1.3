
"use client";

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/spinner';
import { ZoomIn, ZoomOut } from 'lucide-react';
import type { CropShape } from './image-editor';
import { useToast } from '@/hooks/use-toast';

const PRINT_DPI_PREVIEW = 600;
const PRINT_WIDTH_IN_WITH_BLEED = 4.25;
const PRINT_HEIGHT_IN_WITH_BLEED = 6.25;
const BLEED_IN = 0.125;
const PRINT_WIDTH_PX = PRINT_WIDTH_IN_WITH_BLEED * PRINT_DPI_PREVIEW;
const PRINT_HEIGHT_PX = PRINT_HEIGHT_IN_WITH_BLEED * PRINT_DPI_PREVIEW;

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

interface PrintPreviewProps {
    image: HTMLImageElement;
    cropShape: CropShape;
    getSourceRect: () => { sx: number; sy: number; sw: number; sh: number };
}

function PrintPreviewComponent({ image, cropShape, getSourceRect }: PrintPreviewProps) {
    const printCanvasRef = useRef<HTMLCanvasElement>(null);
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(true);
    const [printScale, setPrintScale] = useState(0.2);
    
    const drawPrintLayout = useCallback(() => {
        setIsGenerating(true);

        const drawSingleCroppedImage = (
        ctx: CanvasRenderingContext2D,
        printX: number,
        printY: number,
        printW: number,
        printH: number
        ) => {
        if (!image) return;
        
        ctx.save();
        ctx.translate(printX, printY);
        
        ctx.beginPath();
        switch (cropShape) {
            case 'circle':
            ctx.arc(printW / 2, printH / 2, Math.min(printW, printH) / 2, 0, 2 * Math.PI);
            break;
            case 'heart':
            drawHeart(ctx, printW / 2, 0, printW, printH);
            break;
            case 'oval':
            ctx.ellipse(printW / 2, printH / 2, printW / 2, printH / 2, 0, 0, 2 * Math.PI);
            break;
            case 'square':
            default:
            ctx.rect(0, 0, printW, printH);
            break;
        }
        ctx.closePath();
        ctx.clip();
        
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, printW, printH);
        
        const { sx, sy, sw, sh } = getSourceRect();
        const sourceAR = sw / sh;
        const destAR = printW / printH;

        let finalW = printW, finalH = printH, finalX = 0, finalY = 0;
        if (sourceAR > destAR) {
            finalH = printH;
            finalW = printH * sourceAR;
            finalX = (printW - finalW) / 2;
        } else {
            finalW = printW;
            finalH = printW / sourceAR;
            finalY = (printH - finalH) / 2;
        }
        
        if (sw > 0 && sh > 0) {
            ctx.drawImage(image, sx, sy, sw, sh, finalX, finalY, finalW, finalH);
        }
        
        ctx.restore();
        };

        const printCanvas = printCanvasRef.current;
        if (!printCanvas) return;
        const ctx = printCanvas.getContext('2d');
        if (!ctx) return;

        printCanvas.width = PRINT_WIDTH_PX;
        printCanvas.height = PRINT_HEIGHT_PX;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, printCanvas.width, printCanvas.height);

        let cropAspectRatio = 1.0;
        if (cropShape === 'oval') {
            cropAspectRatio = 0.7;
        }
        
        const bleedPx = BLEED_IN * PRINT_DPI_PREVIEW;
        const margin = 20;
        let currentX = margin + bleedPx;
        let currentY = margin + bleedPx;
        let maxRowHeight = 0;

        for (let heightMm = 8; heightMm <= 35; heightMm++) {
        const heightPx = (heightMm / 25.4) * PRINT_DPI_PREVIEW;
        const widthPx = heightPx * cropAspectRatio;

        if (currentX + widthPx + margin > printCanvas.width - bleedPx) {
            currentY += maxRowHeight + margin;
            currentX = margin + bleedPx;
            maxRowHeight = 0;
        }

        if (currentY + heightPx > printCanvas.height - bleedPx) {
            break; 
        }

        drawSingleCroppedImage(ctx, currentX, currentY, widthPx, heightPx);

        currentX += widthPx + margin;
        if (heightPx > maxRowHeight) {
            maxRowHeight = heightPx;
        }
        }

        try {
            const previewCanvas = document.createElement('canvas');
            const previewCtx = previewCanvas.getContext('2d');
            if (!previewCtx) throw new Error("Could not create preview canvas context");

            const previewWidth = 408;
            const previewHeight = 600;
            previewCanvas.width = previewWidth;
            previewCanvas.height = previewHeight;
            
            previewCtx.drawImage(printCanvas, 0, 0, previewWidth, previewHeight);

            const dataUrl = previewCanvas.toDataURL('image/jpeg', 0.9);
            localStorage.setItem('printPreviewDataUrl', dataUrl);
        } catch(e) {
            console.error("Could not save print preview to local storage", e);
            toast({variant: 'destructive', title: 'Storage Error', description: 'Could not save print preview for checkout.'});
        }

        setIsGenerating(false);

    }, [image, cropShape, getSourceRect, toast]);

    useEffect(() => {
        // A short delay to allow the canvas to be in the DOM
        const timeoutId = setTimeout(drawPrintLayout, 50);
        return () => clearTimeout(timeoutId);
    }, [drawPrintLayout]);

    const handlePrintZoom = (direction: 'in' | 'out') => {
        const newScale = direction === 'in' ? printScale * 1.2 : printScale / 1.2;
        setPrintScale(Math.max(0.05, Math.min(newScale, 2)));
    };

    return (
        <div>
            <div className="flex justify-end items-center mb-2">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => handlePrintZoom('out')}><ZoomOut className="h-4 w-4"/></Button>
                    <Button variant="outline" size="icon" onClick={() => handlePrintZoom('in')}><ZoomIn className="h-4 w-4"/></Button>
                </div>
            </div>
            <div className="w-full h-96 overflow-auto bg-gray-200/50 rounded-lg border relative">
                {isGenerating && (
                    <div className="absolute inset-0 bg-gray-100/80 flex items-center justify-center z-10">
                        <Spinner />
                        <p className="ml-2">Generating layout...</p>
                    </div>
                )}
                <canvas
                    ref={printCanvasRef}
                    style={{ transform: `scale(${printScale})`, transformOrigin: 'top left' }}
                />
            </div>
        </div>
    );
}

export const PrintPreview = memo(PrintPreviewComponent);
