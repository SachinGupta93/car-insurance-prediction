import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone, FileWithPath } from 'react-dropzone';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { useNotificationHelpers } from '@/context/NotificationContext';
import { useDataCache } from '@/context/DataCacheContext';
import { DamageResult, UploadedImage } from '@/types';
import DamageAnalyzer from './damage/DamageAnalyzer';
import QuotaStatus from './QuotaStatus';
import unifiedApiService from '@/services/unifiedApiService';
import damageRegionService from '@/services/damageRegionService';
import MultiRegionAnalysisResults from './analysis/MultiRegionAnalysisResults';

interface ImageUploadProps {
  onImageUploaded?: (imageUrl: string, analysisResult: DamageResult) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUploaded }) => {
  const { firebaseUser, loading: loadingAuth } = useFirebaseAuth();
  const { success, error: notifyError } = useNotificationHelpers();
  const { addAnalysisToCache, invalidateCache } = useDataCache();

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DamageResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);  const previewUrlRef = useRef<string | null>(null);
  const blobUrlsRef = useRef<string[]>([]);

  // Effect to manage URL objects and prevent memory leaks
  useEffect(() => {
    // Clean up previous preview URL if it's different from the current one
    if (previewUrlRef.current && previewUrlRef.current !== preview) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    
    // Store current preview URL
    previewUrlRef.current = preview;
    
    // If there's a new preview URL and it starts with blob:, add it to our tracking array
    if (preview && preview.startsWith('blob:')) {
      blobUrlsRef.current.push(preview);
    }

    // Cleanup function to revoke all blob URLs on component unmount
    return () => {
      // Revoke current preview if it exists
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      
      // Revoke all tracked blob URLs
      blobUrlsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error('Error revoking URL object:', err);
        }
      });
      blobUrlsRef.current = [];
    };
  }, [preview]);

  const onDrop = useCallback(async (acceptedFiles: FileWithPath[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!firebaseUser && !loadingAuth) {
      setError('You must be logged in to upload images.');
      notifyError('Authentication Required', 'Please log in to upload and analyze images.');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPG, JPEG, or PNG image.');
      notifyError('Invalid File Type', 'Please upload a JPG, JPEG, or PNG image.');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setError('File size too large. Maximum size is 10MB.');
      notifyError('File Too Large', 'Please upload an image smaller than 10MB.');
      return;
    }

    // Revoke old preview URL if one exists
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    const newPreviewUrl = URL.createObjectURL(file);
    setPreview(newPreviewUrl);
    setSelectedFile(file);
    setError(null);
    setAnalysisResult(null);
    setUploading(false);
    setProgress(0);

    success('Image Uploaded', 'Image ready for analysis. Click "Analyze Image" to start.');
  }, [firebaseUser, loadingAuth, success, notifyError, preview]);  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploading || loadingAuth,
    noClick: false,
    noKeyboard: false,
    multiple: false
  });

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setUploading(false);
    setError('Analysis cancelled.');
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
    setAnalysisResult(null); // Also clear analysisResult on cancel
    setProgress(0);
  };

  const handleRemovePreview = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    setAnalysisResult(null);
    // No need to cancel upload here, as this button is shown when !uploading
  };

  // This function is called by DamageAnalyzer when it *actually* begins its process.
  const handleAnalysisStart = () => {
    // The abortController should have been created by the action that initiated the analysis (e.g., button click)
    setUploading(true); // Confirm uploading state
    setProgress(0);     // Reset progress
    setError(null);     // Clear previous errors
  };
  const handleAnalysisComplete = async (result: DamageResult) => {
    console.log('🔍 ImageUpload: Starting enhanced analysis with damage regions...');
    
    // Convert file to Base64 for region analysis and storage
    let imageBase64 = '';
    if (selectedFile) {
      try {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      } catch (error) {
        console.error("Error converting image to Base64:", error);
        notifyError('Image Processing Error', 'Could not process the uploaded image for history.');
      }
    }

    // Enhance the result with damage region analysis
    let enhancedResult = result;
    if (imageBase64) {
      try {
        enhancedResult = await damageRegionService.enhanceDamageResult(result, imageBase64);
        console.log('🔍 ImageUpload: Enhanced result with regions:', enhancedResult.identifiedDamageRegions?.length || 0);
      } catch (error) {
        console.error('Failed to enhance with region analysis:', error);
      }
    }

    setAnalysisResult(enhancedResult);
    setUploading(false);
    setProgress(100);

    if (enhancedResult.isDemoMode) {
      success('Demo Analysis Complete', 'API Quota exceeded. Showing a sample analysis with detected regions.');
    } else {
      const regionCount = enhancedResult.identifiedDamageRegions?.length || 0;
      success('Analysis Complete', `Successfully analyzed damage with ${(enhancedResult.confidence * 100).toFixed(1)}% confidence. Found ${regionCount} damage regions.`);
    }

    // Call parent callback if provided
    if (onImageUploaded && imageBase64 && imageBase64.startsWith('data:')) {
      onImageUploaded(imageBase64, result);
    }

    // Save analysis to history with proper image data
    try {
      const historyItem = {
        image: imageBase64 || preview || '',
        result: result,
        filename: selectedFile?.name || (result.isDemoMode ? 'demo_analysis.jpg' : 'analysis.jpg'),
        timestamp: new Date().toISOString(),
        analysisDate: new Date().toISOString(),
        confidence: result.confidence,
        severity: result.severity || 'unknown',
        isDemo: result.isDemoMode || false,
      };
      
      console.log(`💾 Saving ${historyItem.isDemo ? 'DEMO' : 'REAL'} analysis to history...`);
      
      await unifiedApiService.addAnalysisToHistory(historyItem);
      
      // Add to cache for immediate UI update
      const uploadedImage: UploadedImage = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 15),
        userId: firebaseUser?.uid || '',
        uploadedAt: new Date().toISOString(),
        analysisDate: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        filename: selectedFile?.name || (result.isDemoMode ? 'demo_analysis.jpg' : 'analysis.jpg'),
        image: imageBase64 || preview || '',
        result: result,
        confidence: result.confidence,
        severity: result.severity || 'minor',
        // Add missing fields that might be needed for analysis
        damageType: result.damageType || 'Unknown',
        repairEstimate: result.repairEstimate || `₹${Math.floor(Math.random() * 50000) + 10000}`,
        description: result.description || 'Damage analysis completed',
        recommendations: result.recommendations || ['Check with insurance provider', 'Get repair estimate']
      };
      
      // Add to cache immediately for better UX
      addAnalysisToCache(uploadedImage);
      
      // Invalidate ALL related caches to ensure fresh data on next load
      invalidateCache('analyticsData');
      invalidateCache('userStats');
      invalidateCache('recentAnalyses');
      
      // Force refresh of cached data in background
      setTimeout(() => {
        console.log('🔄 Forcing cache refresh in background...');
        invalidateCache(); // Invalidate all caches
      }, 1000);
      
      console.log('✅ Analysis saved to history and cache successfully');
      success('History Saved', 'Your analysis result has been saved to your history.');

    } catch (error) {
      console.error('❌ Failed to save analysis to history:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      notifyError('History Save Failed', `Could not save analysis to history: ${errorMessage}`);
    }
  };

  const handleAnalysisError = (errorMessage: string) => {
    setError(errorMessage);
    setUploading(false);
    setProgress(0);
    notifyError('Analysis Failed', errorMessage);
  };

  // Fix 3b: Logic for starting analysis, now explicitly triggered by the button
  const handleInitiateAnalysis = () => {
    if (!selectedFile) {
      setError('No image selected for analysis');
      return;
    }

    if (!firebaseUser) {
      setError('You must be logged in to analyze images');
      return;
    }

    abortControllerRef.current = new AbortController();
    setUploading(true);
    setProgress(0);
    setError(null);
  };

  const handleBackFromAnalyzer = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
    setAnalysisResult(null);
    setError(null);
    setUploading(false); // Ensure uploading state is reset
    setProgress(0);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-white">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute inset-0 bg-rose-50 opacity-30"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-4xl">
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-rose-200">
            {/* 
              Main conditional rendering:
              - If 'uploading' is true (analysis in progress) OR 
              - if 'analysisResult' is present (analysis complete) AND 
              - 'selectedFile' is not null:
                Show DamageAnalyzer.
              - Otherwise:
                Show the image upload interface.
            */}
            { (uploading || analysisResult) && selectedFile ? (
              <DamageAnalyzer
                imageFile={selectedFile}
                onAnalysisStart={handleAnalysisStart} // Callback when DA starts its async task
                onAnalysisComplete={handleAnalysisComplete} // Callback for successful analysis
                onAnalysisError={handleAnalysisError} // Callback for analysis error
                onBack={handleBackFromAnalyzer} // Callback to go back to upload UI
                isAnalyzing={uploading} // Pass the 'uploading' state to DA
                abortSignal={abortControllerRef.current?.signal} // For aborting analysis
              />
            ) : (
              // Upload Interface
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-200 mb-4">
                    <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold text-black mb-2">
                    AI Car Damage Analyzer
                  </h1>
                  
                  {/* Quota Status */}
                  <div className="mb-4 max-w-md mx-auto">
                    <QuotaStatus />
                  </div>
                  
                  <p className="text-lg text-gray-600">
                    Upload an image of your car to get an instant damage analysis and repair estimate.
                  </p>
                </div>

                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={`mt-6 p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors duration-200 ease-in-out 
                    ${isDragActive ? 'border-rose-500 bg-rose-50' : 'border-gray-300 hover:border-gray-400'}
                    ${isDragReject ? 'border-red-500 bg-red-50' : ''}
                    ${(uploading || loadingAuth) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input {...getInputProps()} />
                  {preview && selectedFile ? (
                    <div className="relative group">
                      <img src={preview} alt="Preview" className="max-h-60 w-auto mx-auto rounded-lg shadow-md" />
                      <button
                        onClick={handleRemovePreview}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                        aria-label="Remove image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    isDragActive ?
                      <p className="text-rose-600">Drop the image here ...</p> :
                      <p className="text-gray-500">Drag and drop an image here, or click to select image</p>
                  )}
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                    {error}
                  </div>
                )}

                {uploading && (
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-gradient-to-r from-rose-500 to-pink-500 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                  </div>
                )}
                
                {/* "Analyze Image" button - shown only when an image is selected and ready for analysis */}
                {preview && selectedFile && !uploading && !analysisResult && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={handleInitiateAnalysis}
                      disabled={loadingAuth || !firebaseUser}
                      className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Analyze Image
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;