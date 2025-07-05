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
        damageRegions.forEach((region, index) => {
          // Calculate actual pixel coordinates from percentages
          const x = (region.x / 100) * canvasWidth;
          const y = (region.y / 100) * canvasHeight;
          const width = (region.width / 100) * canvasWidth;
          const height = (region.height / 100) * canvasHeight;
          
          // Enhanced visual styling based on damage type and confidence
          const confidence = region.confidence || 0.5;
          const alpha = Math.max(0.3, confidence * 0.6); // More visible with higher confidence
          
          // Color coding based on damage type
          let baseColor = 'rgba(239, 68, 68'; // Default red
          if (region.damageType?.toLowerCase().includes('scratch')) {
            baseColor = 'rgba(249, 115, 22'; // Orange for scratches
          } else if (region.damageType?.toLowerCase().includes('dent')) {
            baseColor = 'rgba(168, 85, 247'; // Purple for dents
          } else if (region.damageType?.toLowerCase().includes('crack')) {
            baseColor = 'rgba(239, 68, 68'; // Red for cracks
          } else if (region.damageType?.toLowerCase().includes('paint')) {
            baseColor = 'rgba(34, 197, 94'; // Green for paint issues
          }
          
          // Draw semi-transparent fill
          ctx.fillStyle = `${baseColor}, ${alpha})`;
          ctx.fillRect(x, y, width, height);
          
          // Draw animated border for better visibility
          ctx.strokeStyle = `${baseColor}, 0.9)`;
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]); // Dashed line for better visibility
          ctx.strokeRect(x, y, width, height);
          ctx.setLineDash([]); // Reset dash pattern
          
          // Add corner markers for precise boundary indication
          const markerSize = 8;
          ctx.fillStyle = `${baseColor}, 1)`;
          // Top-left corner
          ctx.fillRect(x - 2, y - 2, markerSize, 4);
          ctx.fillRect(x - 2, y - 2, 4, markerSize);
          // Top-right corner
          ctx.fillRect(x + width - markerSize + 2, y - 2, markerSize, 4);
          ctx.fillRect(x + width - 2, y - 2, 4, markerSize);
          // Bottom-left corner
          ctx.fillRect(x - 2, y + height - 2, markerSize, 4);
          ctx.fillRect(x - 2, y + height - markerSize + 2, 4, markerSize);
          // Bottom-right corner
          ctx.fillRect(x + width - markerSize + 2, y + height - 2, markerSize, 4);
          ctx.fillRect(x + width - 2, y + height - markerSize + 2, 4, markerSize);
          
          // Prepare enhanced label text with more details
          const confidence_pct = Math.round(confidence * 100);
          const label = `${region.damageType || 'Damage'} (${confidence_pct}%)`;
          const regionNum = `#${index + 1}`;
          
          // Measure text dimensions
          ctx.font = 'bold 12px Inter, sans-serif';
          const labelWidth = ctx.measureText(label).width;
          const regionNumWidth = ctx.measureText(regionNum).width;
          const maxWidth = Math.max(labelWidth, regionNumWidth);
          
          // Position label to avoid going off-screen
          let labelX = x;
          let labelY = y - 35;
          
          // Adjust label position if it would go off the top of the canvas
          if (labelY < 0) {
            labelY = y + height + 25;
          }
          
          // Adjust label position if it would go off the right edge
          if (labelX + maxWidth + 12 > canvasWidth) {
            labelX = canvasWidth - maxWidth - 12;
          }
          
          // Draw enhanced label background with rounded corners effect
          const labelBgHeight = 40;
          const labelBgWidth = maxWidth + 16;
          
          // Background with gradient effect
          const gradient = ctx.createLinearGradient(labelX, labelY - 5, labelX, labelY + labelBgHeight - 5);
          gradient.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
          gradient.addColorStop(1, 'rgba(30, 41, 59, 0.95)');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(labelX, labelY - 5, labelBgWidth, labelBgHeight);
          
          // Border around label
          ctx.strokeStyle = `${baseColor}, 0.7)`;
          ctx.lineWidth = 2;
          ctx.strokeRect(labelX, labelY - 5, labelBgWidth, labelBgHeight);
          
          // Draw region number
          ctx.fillStyle = '#94a3b8'; // Gray text for region number
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.fillText(regionNum, labelX + 8, labelY + 8);
          
          // Draw main label text
          ctx.fillStyle = '#f1f5f9'; // Light text
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.fillText(label, labelX + 8, labelY + 24);
          
          // Add confidence indicator bar
          const barWidth = 60;
          const barHeight = 4;
          const barX = labelX + 8;
          const barY = labelY + 28;
          
          // Background bar
          ctx.fillStyle = 'rgba(71, 85, 105, 0.5)';
          ctx.fillRect(barX, barY, barWidth, barHeight);
          
          // Confidence bar
          ctx.fillStyle = confidence > 0.7 ? '#22c55e' : confidence > 0.4 ? '#f59e0b' : '#ef4444';
          ctx.fillRect(barX, barY, barWidth * confidence, barHeight);
        });
      } else {
        // Enhanced "no regions" message
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 18px Inter, sans-serif';
        const message = 'No damage regions identified';
        const subMessage = 'Analysis complete - no visible damage detected';

        const textMetrics = ctx.measureText(message);
        const subTextMetrics = ctx.measureText(subMessage);
        const maxTextWidth = Math.max(textMetrics.width, subTextMetrics.width);
        const bgHeight = 60;
        const padding = 20;

        const rectX = canvas.width / 2 - maxTextWidth / 2 - padding;
        const rectY = canvas.height / 2 - bgHeight / 2;
        const rectWidth = maxTextWidth + padding * 2;
        const rectHeight = bgHeight;

        // Enhanced background with gradient
        const gradient = ctx.createLinearGradient(rectX, rectY, rectX, rectY + rectHeight);
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.9)'); // Green gradient
        gradient.addColorStop(1, 'rgba(22, 163, 74, 0.9)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(22, 163, 74, 1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
        
        // Main message
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 8);
        
        // Sub message
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(subMessage, canvas.width / 2, canvas.height / 2 + 12);
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