import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Eraser } from 'lucide-react';

export interface SignaturePadRef {
  clear: () => void;
  toDataURL: () => string | null;
  isEmpty: () => boolean;
}

const SignaturePad = forwardRef<SignaturePadRef, {}>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setHasSignature(false);
        }
      }
    },
    toDataURL: () => {
      if (!hasSignature || !canvasRef.current) return null;
      return canvasRef.current.toDataURL('image/png');
    },
    isEmpty: () => !hasSignature
  }));

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true); // Assuming they will draw something
    
    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Prevent scrolling on touch devices while drawing
    if (e.type === 'touchmove') {
      // e.preventDefault(); // Note: handled via CSS touch-action usually, or passive listener issue in React
    }

    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.closePath();
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Resize observer to handle responsiveness if needed, 
  // currently we set static width/height attributes but map via CSS
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set actual canvas size to match display size for sharpness
      // For simplicity in this implementation, we assume a fixed internal resolution
      // but display it responsively.
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
  }, []);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="border-2 border-slate-300 rounded-lg overflow-hidden bg-white relative touch-none">
        <canvas
          ref={canvasRef}
          className="w-full h-48 block cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="absolute top-2 right-2">
             <button 
               type="button" 
               onClick={() => {
                 const canvas = canvasRef.current;
                 if(canvas) {
                   const ctx = canvas.getContext('2d');
                   ctx?.clearRect(0,0, canvas.width, canvas.height);
                   setHasSignature(false);
                 }
               }}
               className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-500 hover:text-red-500 transition-colors"
               title="Bersihkan Tanda Tangan"
             >
               <Eraser size={18} />
             </button>
        </div>
      </div>
      <p className="text-xs text-slate-500 text-center">Silakan tanda tangan di kotak atas</p>
    </div>
  );
});

export default SignaturePad;