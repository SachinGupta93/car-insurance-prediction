import React, { useRef, useEffect } from 'react';
import { DamageRegion } from '@/types'; // Import DamageRegion from types

interface AnalysisVisualizationProps {
  imageUrl: string;
  damageRegions?: DamageRegion[];
  showOverlay?: boolean;
  highlightColor?: string;
}

const AnalysisVisualization: React.FC<AnalysisVisualizationProps> = ({
  imageUrl,
  damageRegions = [],
  showOverlay = true,
  highlightColor = 'rgba(239, 68, 68, 0.3)'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Draw the image and damage regions on the canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container || !imageRef.current) return;

    // Set canvas dimensions to match the container
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate aspect ratio to maintain image proportions
    const imageAspectRatio = imageRef.current.naturalWidth / imageRef.current.naturalHeight;
    
    // Set canvas size based on container and image aspect ratio
    let canvasWidth = containerWidth;
    let canvasHeight = containerWidth / imageAspectRatio;
    
    // If height exceeds container, adjust dimensions
    if (canvasHeight > containerHeight) {
      canvasHeight = containerHeight;
      canvasWidth = containerHeight * imageAspectRatio;
    }
    
    // Update canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw the image
    ctx.drawImage(imageRef.current, 0, 0, canvasWidth, canvasHeight);
    
    // Draw damage regions or "no regions" message if overlay is enabled
    if (showOverlay) {
      if (damageRegions && damageRegions.length > 0) {
        damageRegions.forEach(region => {
          // Calculate actual pixel coordinates from percentages
          const x = (region.x / 100) * canvasWidth;
          const y = (region.y / 100) * canvasHeight;
          const width = (region.width / 100) * canvasWidth;
          const height = (region.height / 100) * canvasHeight;
            // Draw rectangle
          ctx.fillStyle = highlightColor;
          ctx.fillRect(x, y, width, height);
          
          // Draw border
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)'; // Modern red
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);
          
          // Prepare label text
          const label = `${region.damageType} (${Math.round(region.confidence * 100)}%)`;
          
          // Draw label background
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; // Dark background
          ctx.fillRect(x, y - 25, ctx.measureText(label).width + 12, 20);
          
          // Draw label text
          ctx.fillStyle = '#f1f5f9'; // Light text
          ctx.font = 'bold 12px Inter, sans-serif';
          
          // Draw actual text
          ctx.fillText(label, x + 6, y - 8);
        });
      } else {
        // No regions to draw, but overlay is requested: show message
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 16px Inter, sans-serif';
        const message = 'No damage regions identified';

        const textMetrics = ctx.measureText(message);
        const textWidth = textMetrics.width;
        const approxCharHeight = 16; // font size
        const bgHeight = approxCharHeight * 1.5; // Background box height
        const padding = 10;

        const rectX = canvas.width / 2 - textWidth / 2 - padding;
        const rectY = canvas.height / 2 - bgHeight / 2 - padding;
        const rectWidth = textWidth + padding * 2;
        const rectHeight = bgHeight + padding * 2;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'; // Dark slate, slightly transparent background
        ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
        
        ctx.fillStyle = '#e2e8f0'; // Light slate text
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
      }
    }
  };
  // Handle image loading
  useEffect(() => {
    if (!imageUrl) {
      console.error('No image URL provided to AnalysisVisualization');
      return;
    }

    const img = new Image();
    
    // Set crossOrigin before setting the src
    if (!imageUrl.startsWith('data:')) {
      img.crossOrigin = "anonymous"; // Handle CORS for non-data URLs
    }
    
    img.src = imageUrl;
    
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
    
    img.onerror = (e) => {
      console.error('Error loading image for analysis visualization', e);
    };
    
    return () => {
      img.onload = null;
      img.onerror = null;
      // If it's a blob URL and we're managing it ourselves, we could revoke it here
      // But we expect the parent component to handle URL lifecycle management
    };
  }, [imageUrl]);
  
  // Redraw on damage regions or overlay change
  useEffect(() => {
    if (imageRef.current) {
      drawCanvas();
    }
  }, [damageRegions, showOverlay, highlightColor]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) {
        drawCanvas();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  return (
    <div className="relative bg-white/10 backdrop-blur-lg p-4 rounded-xl border border-rose-200/30 shadow-sm" ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '300px' }}>
      <canvas 
        ref={canvasRef}
        className="max-w-full h-auto rounded-xl"
      />
      
      {damageRegions.length > 0 && (
        <div className="absolute bottom-6 right-6 bg-white/10 backdrop-blur-lg px-4 py-2 rounded-lg border border-rose-200/30">
          <label className="flex items-center cursor-pointer text-black">
            <input 
              type="checkbox" 
              checked={showOverlay} 
              onChange={() => {}} // This would typically be handled by a parent component
              className="mr-2 accent-emerald-200"
            />
            <span className="text-sm">Show damage overlay</span>
          </label>
        </div>
      )}
    </div>
  );
};

export default AnalysisVisualization;