
"use client";

import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/spinner';
import type { CropShape } from './image-editor';

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const ZOOM_SENSITIVITY = 0.001;

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

interface EditorCanvasProps {
  image: HTMLImageElement | null;
  scale: number;
  offset: { x: number; y: number };
  cropShape: CropShape;
  setScale: (scale: number) => void;
  setOffset: (offset: { x: number; y: number }) => void;
  isLoading: boolean;
}

function EditorCanvasComponent({ image, scale, offset, cropShape, setScale, setOffset, isLoading }: EditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pinchStart, setPinchStart] = useState({ dist: 0, scale: 1 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
    }
    
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    if (w === 0 || h === 0) return;

    const centerX = w / 2;
    const centerY = h / 2;
    
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, h);

    const shapeSize = Math.min(w, h) * 0.9;
    const shapeX = (w - shapeSize) / 2;
    const shapeY = (h - shapeSize) / 2;
    
    ctx.beginPath();
    switch (cropShape) {
        case 'circle':
            ctx.arc(centerX, centerY, shapeSize / 2, 0, 2 * Math.PI);
            break;
        case 'heart':
             const heartYForDraw = centerY - shapeSize / 2;
             drawHeart(ctx, centerX, heartYForDraw, shapeSize, shapeSize);
            break;
        case 'oval':
            ctx.ellipse(centerX, centerY, (shapeSize/2) * 0.7, shapeSize/2, 0, 0, 2 * Math.PI);
            break;
        case 'square':
        default:
             ctx.rect(shapeX, shapeY, shapeSize, shapeSize);
            break;
    }
    ctx.closePath();
    ctx.clip();
    
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, w, h);
    
    ctx.translate(centerX + offset.x, centerY + offset.y);
    ctx.scale(scale, scale);
    
    ctx.drawImage(image, -image.width / 2, -image.height / 2, image.width, image.height);
    
    ctx.restore();
  }, [image, scale, offset, cropShape]);

  useEffect(() => {
    draw();
  }, [draw]);
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => { setIsDragging(true); setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y }); };
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => { if (isDragging) { setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); } };
  const handleMouseUpOrLeave = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => { e.preventDefault(); const newScale = scale - e.deltaY * ZOOM_SENSITIVITY; setScale(Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE))); };
  const getDistance = (touches: React.TouchList) => Math.sqrt(Math.pow(touches[1].clientX - touches[0].clientX, 2) + Math.pow(touches[1].clientY - touches[0].clientY, 2));
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => { if (e.touches.length === 1) { setIsDragging(true); setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y }); } else if (e.touches.length === 2) { setPinchStart({ dist: getDistance(e.touches), scale: scale }); } };
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => { e.preventDefault(); if (e.touches.length === 1 && isDragging) { const touch = e.touches[0]; setOffset({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y }); } else if (e.touches.length === 2) { const newDist = getDistance(e.touches); const newScale = pinchStart.scale * (newDist / pinchStart.dist); setScale(Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE))); } };
  const handleTouchEnd = () => setIsDragging(false);

  return (
    <div className="relative w-full aspect-square bg-white rounded-lg overflow-hidden touch-none border">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100/80 flex items-center justify-center">
          <Spinner className="w-8 h-8" />
        </div>
      )}
    </div>
  );
}

export const EditorCanvas = memo(EditorCanvasComponent);
