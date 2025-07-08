// Optimized Image Loader - Implements image loading best practices
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { storage } from '../../lib/firebase';

interface OptimizedImageLoaderProps {
  src?: string;
  storagePath?: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: 'low' | 'medium' | 'high';
  lazy?: boolean;
  placeholder?: 'blur' | 'skeleton' | 'color';
  placeholderColor?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

// Image compression utility
const compressImage = (file: File, quality: number = 0.8): Promise<Blob> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      const maxWidth = 1200;
      const maxHeight = 800;
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Blur placeholder generator
const generateBlurPlaceholder = (width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = width;
  canvas.height = height;
  
  // Create gradient blur effect
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(0.5, '#e5e7eb');
  gradient.addColorStop(1, '#d1d5db');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL();
};

// Skeleton placeholder component
const SkeletonPlaceholder: React.FC<{ width?: number; height?: number; className?: string }> = ({ 
  width = 300, 
  height = 200, 
  className = '' 
}) => (
  <div 
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    style={{ width, height }}
  >
    <div className="flex items-center justify-center h-full">
      <svg 
        className="w-12 h-12 text-gray-400" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path 
          fillRule="evenodd" 
          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" 
          clipRule="evenodd" 
        />
      </svg>
    </div>
  </div>
);

// Image cache
const imageCache = new Map<string, string>();
const loadingPromises = new Map<string, Promise<string>>();

const OptimizedImageLoader: React.FC<OptimizedImageLoaderProps> = ({
  src,
  storagePath,
  alt,
  className = '',
  width = 300,
  height = 200,
  quality = 'medium',
  lazy = true,
  placeholder = 'skeleton',
  placeholderColor = '#f3f4f6',
  onLoad,
  onError
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [inView, setInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || inView) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, inView]);

  // Load image from Firebase Storage
  const loadFromStorage = useCallback(async (path: string): Promise<string> => {
    // Check cache first
    if (imageCache.has(path)) {
      return imageCache.get(path)!;
    }

    // Check if already loading
    if (loadingPromises.has(path)) {
      return loadingPromises.get(path)!;
    }

    // Start loading
    const loadPromise = (async () => {
      try {
        console.time(`Firebase Storage Load: ${path}`);
        
        const firebaseStorageRef = storageRef(storage, path);
        const url = await getDownloadURL(firebaseStorageRef);
        
        console.timeEnd(`Firebase Storage Load: ${path}`);
        
        // Cache the URL
        imageCache.set(path, url);
        return url;
      } catch (err) {
        console.error('Failed to load image from storage:', err);
        throw err;
      } finally {
        loadingPromises.delete(path);
      }
    })();

    loadingPromises.set(path, loadPromise);
    return loadPromise;
  }, []);

  // Load image
  useEffect(() => {
    if (!inView) return;

    const loadImage = async () => {
      setLoading(true);
      setError(null);

      try {
        let finalUrl: string;

        if (src) {
          // Direct URL
          finalUrl = src;
        } else if (storagePath) {
          // Firebase Storage path
          finalUrl = await loadFromStorage(storagePath);
        } else {
          throw new Error('Either src or storagePath must be provided');
        }

        // Preload the image
        const img = new Image();
        img.onload = () => {
          setImageUrl(finalUrl);
          setLoading(false);
          onLoad?.();
        };
        img.onerror = () => {
          const err = new Error('Failed to load image');
          setError(err);
          setLoading(false);
          onError?.(err);
        };
        img.src = finalUrl;

      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        setLoading(false);
        onError?.(error);
      }
    };

    loadImage();
  }, [inView, src, storagePath, loadFromStorage, onLoad, onError]);

  // Render placeholder
  const renderPlaceholder = () => {
    switch (placeholder) {
      case 'blur':
        return (
          <img
            src={generateBlurPlaceholder(width, height)}
            alt={`${alt} placeholder`}
            className={`${className} filter blur-sm`}
            style={{ width, height }}
          />
        );
      
      case 'color':
        return (
          <div
            className={`${className} flex items-center justify-center`}
            style={{ 
              width, 
              height, 
              backgroundColor: placeholderColor 
            }}
          >
            <svg 
              className="w-12 h-12 text-gray-400" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" 
                clipRule="evenodd" 
              />
            </svg>
          </div>
        );
      
      case 'skeleton':
      default:
        return <SkeletonPlaceholder width={width} height={height} className={className} />;
    }
  };

  // Show error state
  if (error) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-red-50 border border-red-200 rounded`}
        style={{ width, height }}
      >
        <div className="text-center text-red-600">
          <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path 
              fillRule="evenodd" 
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
          <p className="text-xs">Failed to load</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading || !imageUrl) {
    return (
      <div ref={imgRef}>
        {renderPlaceholder()}
      </div>
    );
  }

  // Show loaded image
  return (
    <img
      ref={imgRef}
      src={imageUrl}
      alt={alt}
      className={`${className} transition-opacity duration-300`}
      style={{ width, height }}
      loading={lazy ? 'lazy' : 'eager'}
    />
  );
};

// Higher-order component for batch image loading
interface BatchImageLoaderProps {
  addToImageQueue: (imagePath: string) => void;
  isImageLoaded: (imagePath: string) => boolean;
}

export const withBatchImageLoading = <P extends object>(
  Component: React.ComponentType<P & BatchImageLoaderProps>
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const [imageQueue, setImageQueue] = useState<string[]>([]);
    const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

    const addToQueue = useCallback((imagePath: string) => {
      setImageQueue(prev => [...prev, imagePath]);
    }, []);

    const markAsLoaded = useCallback((imagePath: string) => {
      setLoadedImages(prev => new Set([...prev, imagePath]));
    }, []);

    // Process image queue in batches
    useEffect(() => {
      if (imageQueue.length === 0) return;

      const batchSize = 3; // Load 3 images at a time
      const batch = imageQueue.slice(0, batchSize);
      
      Promise.all(
        batch.map(async (path) => {
          try {
            const firebaseStorageRef = storageRef(storage, path);
            const url = await getDownloadURL(firebaseStorageRef);
            imageCache.set(path, url);
            markAsLoaded(path);
          } catch (error) {
            console.error(`Failed to preload image: ${path}`, error);
          }
        })
      ).then(() => {
        setImageQueue(prev => prev.slice(batchSize));
      });
    }, [imageQueue, markAsLoaded]);

    return (
      <Component
        {...(props as P)}
        ref={ref}
        addToImageQueue={addToQueue}
        isImageLoaded={(path: string) => loadedImages.has(path)}
      />
    );
  });
};

// Utility functions
export const preloadImages = async (imagePaths: string[]): Promise<void> => {
  const batchSize = 5;
  
  for (let i = 0; i < imagePaths.length; i += batchSize) {
    const batch = imagePaths.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (path) => {
        try {
          if (!imageCache.has(path)) {
            const firebaseStorageRef = storageRef(storage, path);
            const url = await getDownloadURL(firebaseStorageRef);
            imageCache.set(path, url);
          }
        } catch (error) {
          console.warn(`Failed to preload image: ${path}`, error);
        }
      })
    );
    
    // Small delay between batches to avoid overwhelming the network
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};

export const clearImageCache = (): void => {
  imageCache.clear();
  loadingPromises.clear();
  console.log('🧹 Image cache cleared');
};

export const getImageCacheStats = () => {
  return {
    cachedImages: imageCache.size,
    loadingImages: loadingPromises.size,
    cacheEntries: Array.from(imageCache.keys())
  };
};

export { compressImage };
export default OptimizedImageLoader;