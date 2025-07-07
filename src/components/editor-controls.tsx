
"use client";

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ZoomIn, ZoomOut, RefreshCw, Replace, Square, Circle, Heart } from 'lucide-react';
import type { CropShape } from './image-editor';

const OvalIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <ellipse cx="12" cy="12" rx="6" ry="9" />
    </svg>
);

interface EditorControlsProps {
  cropShape: CropShape;
  setCropShape: (shape: CropShape) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onUploadClick: () => void;
}

function EditorControlsComponent({ cropShape, setCropShape, onZoomIn, onZoomOut, onReset, onUploadClick }: EditorControlsProps) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col items-center gap-2 border-b pb-4">
        <p className="text-sm font-medium text-muted-foreground">Crop Shape</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant={cropShape === 'square' ? 'secondary' : 'outline'} size="icon" className="text-primary" onClick={() => setCropShape('square')}> <Square /> </Button>
          <Button variant={cropShape === 'circle' ? 'secondary' : 'outline'} size="icon" className="text-primary" onClick={() => setCropShape('circle')}> <Circle /> </Button>
          <Button variant={cropShape === 'heart' ? 'secondary' : 'outline'} size="icon" className="text-primary" onClick={() => setCropShape('heart')}> <Heart /> </Button>
          <Button variant={cropShape === 'oval' ? 'secondary' : 'outline'} size="icon" className="text-primary" onClick={() => setCropShape('oval')}> <OvalIcon className="w-6 h-6" /> </Button>
        </div>
      </div>
      <TooltipProvider>
        <div className="flex flex-wrap gap-2 justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="text-primary" onClick={onZoomIn}><ZoomIn /></Button>
            </TooltipTrigger>
            <TooltipContent><p>Zoom In</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="text-primary" onClick={onZoomOut}><ZoomOut /></Button>
            </TooltipTrigger>
            <TooltipContent><p>Zoom Out</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="text-primary" onClick={onReset}><RefreshCw /></Button>
            </TooltipTrigger>
            <TooltipContent><p>Reset</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="text-primary" onClick={onUploadClick}><Replace /></Button>
            </TooltipTrigger>
            <TooltipContent><p>Change Image</p></TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}

export const EditorControls = memo(EditorControlsComponent);
