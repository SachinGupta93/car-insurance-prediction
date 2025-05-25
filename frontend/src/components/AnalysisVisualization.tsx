import React, { useRef, useEffect } from 'react';

interface DamageRegion {
  x: number; // x-coordinate as percentage of image width
  y: number; // y-coordinate as percentage of image height
  width: number; // width as percentage of image width
  height: number; // height as percentage of image height
  damageType: string;
  confidence: number;
}

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
  highlightColor = 'rgba(255, 0, 0, 0.3)'
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
    
    // Draw damage regions if overlay is enabled
    if (showOverlay && damageRegions.length > 0) {
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
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Draw label
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.font = '14px sans-serif';
        
        const label = `${region.damageType} (${Math.round(region.confidence * 100)}%)`;
        
        // Draw text stroke for better readability
        ctx.strokeText(label, x, y - 5);
        // Draw actual text
        ctx.fillText(label, x, y - 5);
      });
    }
  };

  // Handle image loading
  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.crossOrigin = "anonymous"; // Handle CORS if needed
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
    img.onerror = () => {
      console.error('Error loading image for analysis visualization');
    };
    
    return () => {
      img.onload = null;
      img.onerror = null;
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
    <div className="relative" ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '300px' }}>
      <canvas 
        ref={canvasRef}
        className="max-w-full h-auto"
      />
      
      {damageRegions.length > 0 && (
        <div className="absolute bottom-2 right-2 bg-white px-3 py-1 rounded shadow text-sm">
          <label className="flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={showOverlay} 
              onChange={() => {}} // This would typically be handled by a parent component
              className="mr-1"
            />
            Show damage overlay
          </label>
        </div>
      )}
    </div>
  );
};

export default AnalysisVisualization;