/**
 * HEIC/HEIF to JPEG conversion utility for better browser support
 * Handles Apple's HEIC format and converts to web-compatible formats
 */

import React from 'react';

// Type definitions for heic2any library
interface ConversionOptions {
  blob: Blob;
  toType?: string;
  quality?: number;
  multiple?: boolean;
}

interface Heic2AnyLibrary {
  (options: ConversionOptions): Promise<Blob | Blob[]>;
}

interface ConversionResult {
  file: File;
  wasConverted: boolean;
  originalFormat?: string;
  convertedFormat?: string;
  compressionRatio?: number;
}

interface ConversionProgress {
  stage: 'detecting' | 'loading' | 'converting' | 'complete' | 'error';
  progress: number;
  message: string;
}

/**
 * Check if a file is in HEIC/HEIF format
 */
export const isHEICFile = (file: File): boolean => {
  const extension = file.name.toLowerCase().split('.').pop();
  const mimeType = file.type.toLowerCase();
  
  return (
    extension === 'heic' || 
    extension === 'heif' ||
    mimeType === 'image/heic' ||
    mimeType === 'image/heif'
  );
};

/**
 * Check if browser supports HEIC/HEIF natively
 */
export const browserSupportsHEIC = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    
    // Use a minimal HEIC data URL to test support
    img.src = 'data:image/heic;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
  });
};

/**
 * Load heic2any library dynamically
 */
const loadHeic2Any = async (): Promise<Heic2AnyLibrary> => {
  try {
    // Try to import heic2any from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
    document.head.appendChild(script);
    
    return new Promise<Heic2AnyLibrary>((resolve, reject) => {
      script.onload = () => {
        const heic2any = (window as any).heic2any as Heic2AnyLibrary;
        if (heic2any) {
          resolve(heic2any);
        } else {
          reject(new Error('heic2any library not loaded'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load heic2any library'));
    });
  } catch (error) {
    throw new Error('Failed to load HEIC conversion library');
  }
};

/**
 * Convert HEIC/HEIF file to JPEG with progress tracking
 */
export const convertHEICToJPEG = async (
  file: File,
  quality: number = 0.8,
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> => {
  if (!isHEICFile(file)) {
    return {
      file,
      wasConverted: false,
      originalFormat: file.type || 'unknown'
    };
  }

  try {
    onProgress?.({
      stage: 'detecting',
      progress: 0,
      message: 'Detecting HEIC format...'
    });

    // Check if browser supports HEIC natively
    const nativeSupport = await browserSupportsHEIC();
    if (nativeSupport) {
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Browser supports HEIC natively'
      });
      return {
        file,
        wasConverted: false,
        originalFormat: file.type || 'image/heic'
      };
    }

    onProgress?.({
      stage: 'loading',
      progress: 20,
      message: 'Loading conversion library...'
    });

    // Load heic2any library
    const heic2any = await loadHeic2Any();

    onProgress?.({
      stage: 'converting',
      progress: 50,
      message: 'Converting to JPEG...'
    });

    // Convert the file
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: quality
    }) as Blob;

    onProgress?.({
      stage: 'converting',
      progress: 80,
      message: 'Finalizing conversion...'
    });

    // Create new File object with converted data
    const convertedFile = new File(
      [convertedBlob],
      file.name.replace(/\.(heic|heif)$/i, '.jpg'),
      {
        type: 'image/jpeg',
        lastModified: file.lastModified
      }
    );

    const compressionRatio = convertedFile.size / file.size;

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Conversion complete'
    });

    return {
      file: convertedFile,
      wasConverted: true,
      originalFormat: file.type || 'image/heic',
      convertedFormat: 'image/jpeg',
      compressionRatio
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
    
    onProgress?.({
      stage: 'error',
      progress: 0,
      message: errorMessage
    });

    // Fallback: return original file if conversion fails
    console.warn('HEIC conversion failed, using original file:', errorMessage);
    return {
      file,
      wasConverted: false,
      originalFormat: file.type || 'image/heic'
    };
  }
};

/**
 * Batch convert multiple files
 */
export const convertHEICFiles = async (
  files: File[],
  quality: number = 0.8,
  onProgress?: (fileIndex: number, progress: ConversionProgress) => void
): Promise<ConversionResult[]> => {
  const results: ConversionResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = await convertHEICToJPEG(
      file,
      quality,
      (progress) => onProgress?.(i, progress)
    );
    results.push(result);
  }
  
  return results;
};

/**
 * Create a file input that automatically converts HEIC files
 */
export const createHEICCompatibleInput = (
  onFilesSelected: (files: File[]) => void,
  onConversionProgress?: (fileIndex: number, progress: ConversionProgress) => void
): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*,.heic,.heif';
  input.multiple = true;

  input.addEventListener('change', async (event) => {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    
    if (files.length === 0) return;

    try {
      const results = await convertHEICFiles(files, 0.8, onConversionProgress);
      const convertedFiles = results.map(result => result.file);
      onFilesSelected(convertedFiles);
    } catch (error) {
      console.error('Error processing files:', error);
      // Fallback to original files
      onFilesSelected(files);
    }
  });

  return input;
};

/**
 * HEIC conversion hook for React components
 */
export const useHEICConversion = () => {
  const [isConverting, setIsConverting] = React.useState(false);
  const [conversionProgress, setConversionProgress] = React.useState<ConversionProgress | null>(null);

  const convertFile = React.useCallback(async (
    file: File,
    quality: number = 0.8
  ): Promise<ConversionResult> => {
    setIsConverting(true);
    setConversionProgress(null);

    try {
      const result = await convertHEICToJPEG(file, quality, setConversionProgress);
      return result;
    } finally {
      setIsConverting(false);
      setConversionProgress(null);
    }
  }, []);

  const convertFiles = React.useCallback(async (
    files: File[],
    quality: number = 0.8
  ): Promise<ConversionResult[]> => {
    setIsConverting(true);
    setConversionProgress(null);

    try {
      const results = await convertHEICFiles(
        files,
        quality,
        (fileIndex, progress) => {
          setConversionProgress({
            ...progress,
            message: `File ${fileIndex + 1}/${files.length}: ${progress.message}`
          });
        }
      );
      return results;
    } finally {
      setIsConverting(false);
      setConversionProgress(null);
    }
  }, []);

  return {
    convertFile,
    convertFiles,
    isConverting,
    conversionProgress,
    isHEICFile,
    browserSupportsHEIC
  };
};

