
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus, Download } from 'lucide-react';
import { Spinner } from '@/components/spinner';
import { EditorCanvas } from './editor-canvas';
import { EditorControls } from './editor-controls';
import { PrintPreview } from './print-preview';
import { ExportOptions } from './export-options';

export type CropShape = 'square' | 'circle' | 'heart' | 'oval';

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

export default function ImageEditor() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [cropShape, setCropShape] = useState<CropShape>('square');

  const [showPrintLayout, setShowPrintLayout] = useState(false);

  const getSourceRect = useCallback(() => {
    if (!image) return { sx: 0, sy: 0, sw: 0, sh: 0 };
    
    // This is an approximation for the canvas dimensions, assuming a square aspect ratio for simplicity
    // A more robust solution might involve a ref to the canvas or a shared context
    const editorW = 500; 
    const editorH = 500;

    let cropAR = 1.0;
    if (cropShape === 'oval') {
        cropAR = 0.7; // Vertical oval
    }
    
    const editorAR = editorW / editorH;
    
    let sourceViewWidth, sourceViewHeight;
    if (editorAR > cropAR) {
      sourceViewHeight = editorH / scale;
      sourceViewWidth = sourceViewHeight * cropAR;
    } else {
      sourceViewWidth = editorW / scale;
      sourceViewHeight = sourceViewWidth / cropAR;
    }
    
    const sourceCenterX = image.width / 2 - offset.x / scale;
    const sourceCenterY = image.height / 2 - offset.y / scale;

    return {
      sx: sourceCenterX - sourceViewWidth / 2,
      sy: sourceCenterY - sourceViewHeight / 2,
      sw: sourceViewWidth,
      sh: sourceViewHeight,
    };
  }, [image, scale, offset, cropShape]);

  const resetCanvasState = useCallback((img: HTMLImageElement) => {
    // This is an approximation. A better way would be to get actual canvas dimensions.
    const canvasWidth = 500; 
    const canvasHeight = 500;

    const scaleX = canvasWidth / img.width;
    const scaleY = canvasHeight / img.height;
    const initialScale = Math.max(scaleX, scaleY);
    
    setScale(initialScale);
    setOffset({ x: 0, y: 0 });
    setShowPrintLayout(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast({ variant: "destructive", title: "Invalid File", description: "Please upload an image file." });
        return;
      }

      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          resetCanvasState(img);
          setIsLoading(false);
          toast({ title: "Success", description: "Image uploaded successfully." });
        };
        img.onerror = () => {
          setIsLoading(false);
          toast({ variant: "destructive", title: "Error", description: "Could not load the image." });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleZoom = (direction: 'in' | 'out') => { const newScale = direction === 'in' ? scale * 1.2 : scale / 1.2; setScale(Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE))); };
  const handleReset = () => { if(image) { resetCanvasState(image); toast({ title: "Canvas Reset", description: "Image position and zoom have been reset." }); } };
  const handleGeneratePreview = () => setShowPrintLayout(true);
  
  return (
    <Card className="w-full max-w-xl mx-auto shadow-xl bg-card border">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary">Locket Photo Editor</CardTitle>
        <CardDescription>1. Upload and position your photo for the perfect print.</CardDescription>
      </CardHeader>
      <CardContent>
        {!image ? (
          <div className="relative w-full aspect-square bg-white rounded-lg overflow-hidden touch-none border">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <ImagePlus className="w-16 h-16 text-gray-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-700">Upload Your Photo</h3>
              <p className="text-gray-500 mb-4">Click below to select an image from your device.</p>
              <Button onClick={handleUploadClick} disabled={isLoading}>
                {isLoading ? <Spinner className="mr-2" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                {isLoading ? 'Loading...' : 'Upload Image'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <EditorCanvas 
              image={image}
              scale={scale}
              offset={offset}
              cropShape={cropShape}
              setScale={setScale}
              setOffset={setOffset}
              isLoading={isLoading}
            />
            <EditorControls 
              cropShape={cropShape}
              setCropShape={setCropShape}
              onZoomIn={() => handleZoom('in')}
              onZoomOut={() => handleZoom('out')}
              onReset={handleReset}
              onUploadClick={handleUploadClick}
            />
          </>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
      </CardContent>

      {image && !showPrintLayout && (
        <CardFooter className="flex-col gap-4 border-t pt-6">
            <CardDescription className="text-center text-muted-foreground">2. When you're happy with the crop, generate the print preview.</CardDescription>
            <Button size="lg" onClick={handleGeneratePreview}>
                <Download className="mr-2" />
                Generate Print Preview
            </Button>
        </CardFooter>
      )}
      
      {showPrintLayout && image && (
        <>
          <CardHeader className="border-t">
            <CardTitle className="text-2xl font-bold text-primary">Print Preview</CardTitle>
            <CardDescription>Your photos are laid out on a 4x6 inch sheet.</CardDescription>
          </CardHeader>
          <CardContent>
            <PrintPreview 
                image={image}
                cropShape={cropShape}
                getSourceRect={getSourceRect}
            />
          </CardContent>
          <CardContent>
            <ExportOptions
                image={image}
                cropShape={cropShape}
                getSourceRect={getSourceRect}
            />
          </CardContent>
        </>
      )}
    </Card>
  );
}
